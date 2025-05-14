import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { TrendyolApiClientService, PriceInventoryUpdateItem, TrendyolApiError } from '@/lib/services/trendyol-api-client';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// İstek gövdesi için Zod şeması
const bulkApplySchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, "En az bir ürün ID'si gereklidir"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Kimlik Doğrulama
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    // 2. İstek Gövdesini Doğrula
    let validatedProductIds: string[];
    try {
      const body = await request.json();
      const validation = bulkApplySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.flatten() }, { status: 400 });
      }
      validatedProductIds = validation.data.productIds;
    } catch (e) {
      return NextResponse.json({ error: 'İstek gövdesi okunamadı veya JSON formatında değil' }, { status: 400 });
    }

    // 3. Trendyol API Ayarlarını Al
    const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
    if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
      return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
    }

    // 4. İlgili Ürünleri Veritabanından Çek
    const productsToUpdate = await db.product.findMany({
      where: {
        id: { in: validatedProductIds },
        userId: userId, // Kullanıcıya ait ürünler
        recommendedSalePrice: { not: null, gt: 0 }, // Geçerli tavsiye fiyatı olanlar
        barcode: { not: null }, // Barkodu olanlar
      },
      select: {
        id: true,
        barcode: true,
        recommendedSalePrice: true,
      },
    });

    if (productsToUpdate.length === 0) {
      return NextResponse.json({ message: 'Seçilen ürünler arasında tavsiye fiyatı uygulanabilecek geçerli ürün bulunamadı.' }, { status: 200 }); // Hata değil, bilgi mesajı
    }

    // 5. Trendyol Payload'ını Hazırla
    const trendyolPayload: PriceInventoryUpdateItem[] = productsToUpdate.map(p => ({
      barcode: p.barcode!, // Yukarıda null kontrolü yapıldı
      salePrice: p.recommendedSalePrice!, // Yukarıda null ve > 0 kontrolü yapıldı
      listPrice: p.recommendedSalePrice!, // Liste fiyatını da tavsiye fiyatı yapıyoruz
    }));

    console.log(`[API Bulk Apply Price] ${userId} için ${trendyolPayload.length} ürüne tavsiye fiyatı uygulanıyor. Payload:`, JSON.stringify(trendyolPayload, null, 2));

    // 6. Trendyol API İstemcisini Hazırla ve Çağır
    const trendyolClient = new TrendyolApiClientService({
      sellerId: apiSettings.sellerID,
      apiKey: apiSettings.apiKey,
      apiSecret: apiSettings.apiSecret,
    });

    let batchRequestId: string;
    let trendyolErrorOccurred = false;
    let trendyolErrorMessage = '';

    try {
      batchRequestId = await trendyolClient.updatePriceAndInventory(trendyolPayload);
      console.log(`[API Bulk Apply Price] ${userId} için Trendyol güncelleme isteği gönderildi. Batch ID: ${batchRequestId}`);
    } catch (trendyolError: unknown) {
      trendyolErrorOccurred = true;
      console.error(`[API Bulk Apply Price] ${userId} için Trendyol API hatası:`, trendyolError);
      trendyolErrorMessage = trendyolError instanceof TrendyolApiError
          ? trendyolError.message
          : (trendyolError instanceof Error ? trendyolError.message : 'Bilinmeyen bir Trendyol API hatası oluştu.');
      // Hata oluştu ama devam edip veritabanı güncellemesini denemeyelim.
      // İşlemin tamamen başarısız olduğunu bildirelim.
      return NextResponse.json({ error: 'Trendyol fiyat güncelleme isteği başarısız oldu.', details: trendyolErrorMessage }, { status: 500 });
    }

    // 7. Veritabanını Güncelle (Trendyol Başarılı Olduktan Sonra)
    // Güncellenecek ürünlerin ID'lerini ve fiyatlarını al
    const updatesToPerform = productsToUpdate.map(p => ({
      id: p.id,
      price: p.recommendedSalePrice!
    }));
    
    let dbUpdateSuccessCount = 0;
    let dbUpdateErrorCount = 0;
    const dbUpdateErrors: { productId: string; error: string }[] = [];

    // Her bir ürünü ayrı ayrı güncellemek yerine, bir transaction içinde toplu güncelleme denenebilir,
    // ancak Prisma'da doğrudan bulk update by ID zor olabilir. Şimdilik döngü ile güncelleyelim.
    for (const update of updatesToPerform) {
        try {
            await db.product.update({
                where: { id: update.id }, // userId kontrolüne gerek yok, başta yaptık
                data: {
                    salePrice: update.price,
                    listPrice: update.price,
                    // lastRecommendedPriceAppliedAt: new Date(), // Opsiyonel
                },
            });
            dbUpdateSuccessCount++;
        } catch (dbError: unknown) {
            dbUpdateErrorCount++;
            const message = dbError instanceof Error ? dbError.message : 'Bilinmeyen veritabanı hatası';
            dbUpdateErrors.push({ productId: update.id, error: message });
            console.error(`[API Bulk Apply Price] ProductId: ${update.id} için veritabanı güncelleme hatası:`, dbError);
        }
    }
    
    console.log(`[API Bulk Apply Price] ${userId} için Veritabanı Güncelleme Sonucu: Başarılı=${dbUpdateSuccessCount}, Hatalı=${dbUpdateErrorCount}`);

    // 8. Yanıtı Oluştur
    let responseMessage = `Trendyol'a ${trendyolPayload.length} ürün için fiyat güncelleme isteği gönderildi (Batch ID: ${batchRequestId}). `;
    let responseStatus = 200;

    if (dbUpdateErrorCount === 0) {
        responseMessage += `Veritabanındaki ${dbUpdateSuccessCount} ürün başarıyla güncellendi.`;
    } else {
        responseMessage += `Veritabanında ${dbUpdateSuccessCount} ürün güncellendi, ${dbUpdateErrorCount} üründe hata oluştu.`;
        responseStatus = 207; // Multi-Status
    }

    return NextResponse.json({
      message: responseMessage,
      trendyolBatchRequestId: batchRequestId,
      dbUpdateSuccessCount: dbUpdateSuccessCount,
      dbUpdateErrorCount: dbUpdateErrorCount,
      dbUpdateErrors: dbUpdateErrors, // Hata detaylarını gönder (opsiyonel)
    }, { status: responseStatus });

  } catch (error: unknown) {
    // Genel Hata Yakalama
    console.error(`[API Bulk Apply Price] Genel Hata:`, error);
    const message = error instanceof Error ? error.message : 'Toplu fiyat uygulanırken sunucu hatası oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 