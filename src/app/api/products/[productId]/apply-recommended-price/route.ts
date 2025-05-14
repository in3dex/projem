import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { 
    TrendyolApiClientService, 
    PriceInventoryUpdateItem, 
    TrendyolApiError, 
    BatchRequestResult,
    BatchItemResult
} from '@/lib/services/trendyol-api-client';
import { Prisma } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

// Helper: Sabit bekleme süresi
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const BATCH_CHECK_DELAY_MS = 5000; // 5 saniye bekleme süresi

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  let productId: string | undefined;
  try {
    // 1. Kimlik Doğrulama
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    // 2. Product ID Kontrolü
    const resolvedParams = await params;
    productId = resolvedParams.productId;
    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    // 3. Ürünü, Fiyatları ve Stok Miktarını Veritabanından Al (quantity eklendi)
    const product = await db.product.findUnique({
      where: { id: productId, userId: userId },
      select: { 
        id: true,
        barcode: true,
        recommendedSalePrice: true,
        salePrice: true, // Mevcut satış fiyatı kontrol için eklendi
        listPrice: true, // Mevcut liste fiyatı kontrol için eklendi
        quantity: true, // Mevcut stok miktarı eklendi
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı veya yetkiniz yok' }, { status: 404 });
    }

    // 4. Kontroller
    if (!product.barcode) {
      return NextResponse.json({ error: 'Ürünün barkodu bulunamadığından Trendyol fiyatı güncellenemez.' }, { status: 400 });
    }
    if (product.recommendedSalePrice === null || product.recommendedSalePrice === undefined || product.recommendedSalePrice <= 0) {
      return NextResponse.json({ error: 'Ürün için geçerli bir tavsiye satış fiyatı bulunamadı.' }, { status: 400 });
    }
    // quantity kontrolü (null olmamalı, Trendyol'a göndereceğiz)
     if (product.quantity === null || product.quantity === undefined) {
        // Stok bilgisi yoksa fiyat güncellemesi de riskli olabilir, hata verelim.
        return NextResponse.json({ error: 'Ürünün stok miktarı bilgisi eksik, fiyat güncellenemiyor.' }, { status: 400 });
     }
    
    const recommendedPrice = product.recommendedSalePrice; 
    const currentQuantity = product.quantity; // Mevcut stok

    // 5. Gereksiz Güncelleme Kontrolü (Yeni eklendi)
    if (product.salePrice === recommendedPrice && product.listPrice === recommendedPrice) {
      console.log(`[API Apply Recommended Price] ProductId: ${productId} için fiyatlar zaten tavsiye edilen (${recommendedPrice}) ile aynı. Güncelleme yapılmadı.`);
      return NextResponse.json({ 
          message: `Ürünün (${product.barcode}) fiyatı zaten tavsiye edilen ${formatCurrency(recommendedPrice)} fiyatta. Güncelleme yapılmadı.`,
          alreadyUpToDate: true 
       }, { status: 200 });
    }

    // 6. Trendyol API Ayarlarını Al
    const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
    if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
      return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
    }

    // 7. Trendyol API İstemcisini Hazırla
    const trendyolClient = new TrendyolApiClientService({
      sellerId: apiSettings.sellerID,
      apiKey: apiSettings.apiKey,
      apiSecret: apiSettings.apiSecret,
    });

    // 8. Trendyol Payload'ını Hazırla (quantity eklendi)
    const trendyolPayload: PriceInventoryUpdateItem[] = [{
      barcode: product.barcode,
      salePrice: recommendedPrice,
      listPrice: recommendedPrice, 
      quantity: currentQuantity, // Mevcut stok miktarı eklendi
    }];

    console.log(`[API Apply Recommended Price] ProductId: ${productId} için Trendyol'a gönderilecek payload:`, JSON.stringify(trendyolPayload, null, 2));

    let batchRequestId: string | undefined = undefined;

    let trendyolUpdateSuccessful = false; 
    let batchRequestSentToTrendyol = false; 
    let batchResultMessage = 'Batch durumu başlangıçta belirsiz.';
    let finalUserMessage = '';
    let finalStatus = 500;
    let trendyolStatusForResponse: string = 'ERROR';

    try {
      // 9. Trendyol API'sini Çağır (POST isteği)
      batchRequestId = await trendyolClient.updatePriceAndInventory(trendyolPayload);
      console.log(`[API Apply Recommended Price] ProductId: ${productId} için Trendyol güncelleme isteği gönderildi. Batch ID: ${batchRequestId}`);
      batchRequestSentToTrendyol = true; 
      batchResultMessage = `Trendyol fiyat güncelleme isteği gönderildi (Batch ID: ${batchRequestId}). Sonuç kontrol ediliyor...`;

      // POST başarılıysa batch sonucunu kontrol etmeye çalış
      // Bu iç try-catch, batch sorgulama hatalarını yakalamak için.
      try {
        console.log(`[API Apply Recommended Price] ProductId: ${productId} - Waiting ${BATCH_CHECK_DELAY_MS}ms before checking batch status...`);
        await wait(BATCH_CHECK_DELAY_MS);

        console.log(`[API Apply Recommended Price] ProductId: ${productId} - Checking batch status for ${batchRequestId} using SAPIGW endpoint...`);
        const batchResult = await trendyolClient.getBatchRequestResult(batchRequestId);
        console.log(`[API Apply Recommended Price] ProductId: ${productId} - Batch Result from SAPIGW:`, JSON.stringify(batchResult, null, 2));

        const itemResult = batchResult.items?.find(item => item.requestItem?.barcode === product.barcode);

        if (itemResult?.status === 'SUCCESS') {
          trendyolUpdateSuccessful = true; 
          batchResultMessage = `Trendyol işlemi başarıyla tamamlandı ve teyit edildi.`;
          trendyolStatusForResponse = 'SUCCESS';
        } else if (itemResult) {
          batchResultMessage = `Trendyol işlemi teyit edildi ancak başarısız oldu. Ürün Durumu: ${itemResult.status}. Neden: ${itemResult.failureReasons?.map(r => r.message).join(', ') || 'Belirtilmedi'}`;
          trendyolStatusForResponse = 'FAILED_CONFIRMED_ITEM_STATUS';
        } else if (batchResult.items && batchResult.items.length > 0 && !itemResult) {
           batchResultMessage = `Trendyol batch yanıtında ürün (${product.barcode}) bulunamadı. Diğer ürünler işlenmiş olabilir.`;
           trendyolStatusForResponse = 'FAILED_ITEM_NOT_FOUND_IN_RESPONSE';
        } else if (!batchResult.items || batchResult.items.length === 0) {
          batchResultMessage = `Trendyol batch yanıtı alındı ancak beklenen ürün bilgisi (items) bulunamadı. Batch ID: ${batchRequestId}`;
          trendyolStatusForResponse = 'FAILED_NO_ITEMS_IN_RESPONSE';
          console.warn(`[API Apply Recommended Price] ProductId: ${productId} - Batch result from SAPIGW did not contain expected items for barcode ${product.barcode}.`);
        } else {
          batchResultMessage = `Trendyol batch yanıtında beklenmedik bir yapı. Ürün durumu teyit edilemedi. Batch ID: ${batchRequestId}`;
          trendyolStatusForResponse = 'FAILED_UNEXPECTED_RESPONSE_STRUCTURE';
        }
      } catch (batchError: unknown) {
        console.error(`[API Apply Recommended Price] ProductId: ${productId} için Trendyol batch sonucu (SAPIGW) alınırken hata oluştu:`, batchError);
        const errorMessageFromError = batchError instanceof Error ? batchError.message : 'Batch sonucu alınırken bilinmeyen hata.';
        batchResultMessage = `Trendyol'a gönderilen işlem teyit edilemedi. Hata: ${errorMessageFromError}`;
        trendyolStatusForResponse = 'FAILED_CONFIRMATION_API_ERROR';
        // Bu durumda trendyolUpdateSuccessful false kalır, DB güncellenmez.
      }
    } catch (trendyolPostError: unknown) {
      // Bu catch bloğu, ilk POST isteğindeki hataları yakalar.
      console.error(`[API Apply Recommended Price] ProductId: ${productId} için Trendyol API'ye POST isteği sırasında hata:`, trendyolPostError);
      batchRequestSentToTrendyol = false;
      batchResultMessage = trendyolPostError instanceof TrendyolApiError
          ? trendyolPostError.message
          : (trendyolPostError instanceof Error ? trendyolPostError.message : 'Bilinmeyen bir Trendyol API hatası oluştu.');
      finalUserMessage = `Fiyat güncelleme isteği Trendyol'a gönderilemedi. Lütfen API ayarlarınızı kontrol edin ve tekrar deneyin.`;
      finalStatus = 500;
      trendyolStatusForResponse = 'FAILED_POST';
      return NextResponse.json({ 
        message: finalUserMessage,
        details: batchResultMessage,
        trendyolBatchRequestId: batchRequestId || null,
        trendyolStatus: trendyolStatusForResponse
      }, { status: finalStatus });
    }

    // Veritabanını Güncelleme Mantığı
    if (trendyolUpdateSuccessful) {
      try {
        await db.product.update({
          where: { id: productId },
          data: {
            salePrice: recommendedPrice,
            listPrice: recommendedPrice,
          },
        });
        console.log(`[API Apply Recommended Price] ProductId: ${productId} için veritabanı güncellendi.`);
        finalUserMessage = `Ürünün (${product.barcode}) fiyatı başarıyla ${formatCurrency(recommendedPrice)} olarak güncellendi.`;
        finalStatus = 200;
      } catch (dbError: unknown) {
        console.error(`[API Apply Recommended Price] ProductId: ${productId} için veritabanı güncelleme hatası (Trendyol işlemi başarılıydı):`, dbError);
        const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Bilinmeyen veritabanı hatası';
        finalUserMessage = `Fiyat Trendyol'da güncellendi ancak sistemimizde bir sorun oluştu. Lütfen daha sonra tekrar kontrol edin veya destek ile iletişime geçin.`;
        finalStatus = 207; 
        trendyolStatusForResponse = 'SUCCESS_DB_FAILED'; 
        batchResultMessage = `${batchResultMessage}. DB Hatası: ${dbErrorMessage}`;
      }
    } else {
      finalUserMessage = `Fiyat güncellenirken bir sorun oluştu. Lütfen tekrar deneyin veya destek ile iletişime geçin. (Detay: ${batchResultMessage})`;
      finalStatus = 400; 
      if (!batchRequestSentToTrendyol) { 
        finalUserMessage = `Fiyat güncelleme isteği Trendyol'a gönderilemedi. Lütfen API ayarlarınızı kontrol edin veya daha sonra tekrar deneyin.`;
        trendyolStatusForResponse = 'FAILED_POST_UNEXPECTED'; 
      }
    }

    // Nihai Yanıt
    console.log(`[API Apply Recommended Price] ProductId: ${productId} - Sonuç: Status ${finalStatus}, Message: ${finalUserMessage}, Trendyol Status: ${trendyolStatusForResponse}`);
    return NextResponse.json({ 
        message: finalUserMessage,
        details: batchResultMessage,
        trendyolBatchRequestId: batchRequestId || null,
        trendyolStatus: trendyolStatusForResponse
    }, { status: finalStatus });

  } catch (error: unknown) {
    // Bu en dıştaki catch bloğu, rota handler'ının genel beklenmedik hatalarını yakalar.
    console.error(`[API Apply Recommended Price] Genel Hata (ProductId: ${productId ?? 'bilinmiyor'}):`, error);
    const message = error instanceof Error ? error.message : 'Fiyat uygulanırken sunucu hatası oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 