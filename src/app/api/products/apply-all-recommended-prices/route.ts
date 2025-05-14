import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { 
    TrendyolApiClientService, 
    PriceInventoryUpdateItem, 
    TrendyolApiError, 
    BatchItemResult
} from '@/lib/services/trendyol-api-client';
import { Prisma } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

// Helper: Sabit bekleme süresi
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const BATCH_CHECK_DELAY_MS = 5000; // 5 saniye bekleme süresi
const MAX_ITEMS_PER_BATCH = 500; // Trendyol API limiti (dokümandan teyit edilmeli, genelde 1000 ama daha küçük başlamak güvenli)

interface ProductForBatchUpdate {
    id: string;
    barcode: string;
    recommendedSalePrice: number;
    quantity: number;
    // Gereksiz güncelleme kontrolü için mevcut fiyatlar
    currentSalePrice: number | null;
    currentListPrice: number | null;
}

export async function POST(request: NextRequest) {
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errorDetails: { barcode: string, reason: string }[] = [];

  try {
    // 1. Kimlik Doğrulama
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    // 2. Trendyol API Ayarlarını Al
    const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
    if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
      return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
    }

        // 3. Güncellenecek Ürünleri Veritabanından Çek
        const productsToUpdateDb = await db.product.findMany({
      where: {
        userId: userId, 
                costPrice: { not: null, gt: 0 }, 
                recommendedSalePrice: { not: null, gt: 0 }, // Tavsiye fiyatı hesaplanmış
                quantity: { gte: 0 }, // Stoğu 0 veya daha fazla olanlar
                onSale: true,
      },
      select: {
        id: true,
        barcode: true,
        recommendedSalePrice: true,
                quantity: true,
                salePrice: true, // currentSalePrice
                listPrice: true, // currentListPrice
            }
        });

        if (!productsToUpdateDb || productsToUpdateDb.length === 0) {
            return NextResponse.json({ message: 'Güncellenecek uygun ürün bulunamadı.', noProducts: true }, { status: 200 });
        }

        // Gereksiz güncellemeleri filtrele
        const productsForBatch: ProductForBatchUpdate[] = productsToUpdateDb.filter(p => 
            !(p.salePrice === p.recommendedSalePrice && p.listPrice === p.recommendedSalePrice)
        ).map(p => ({
            id: p.id,
      barcode: p.barcode!, 
            recommendedSalePrice: p.recommendedSalePrice!,
            quantity: p.quantity!,
            currentSalePrice: p.salePrice,
            currentListPrice: p.listPrice,
        }));
        
        const totalProductsToAttemptUpdate = productsForBatch.length;
        if (totalProductsToAttemptUpdate === 0) {
            return NextResponse.json({ message: 'Tüm uygun ürünlerin fiyatları zaten güncel.', alreadyUpToDate: true, totalChecked: productsToUpdateDb.length }, { status: 200 });
        }

        console.log(`[API Apply All Prices] Found ${totalProductsToAttemptUpdate} products to update out of ${productsToUpdateDb.length} eligible products.`);

        // 4. Trendyol API İstemcisini Hazırla
    const trendyolClient = new TrendyolApiClientService({
      sellerId: apiSettings.sellerID,
      apiKey: apiSettings.apiKey,
      apiSecret: apiSettings.apiSecret,
    });

        // 5. Ürünleri Batch'lere Böl
        for (let i = 0; i < totalProductsToAttemptUpdate; i += MAX_ITEMS_PER_BATCH) {
            const batchSlice = productsForBatch.slice(i, i + MAX_ITEMS_PER_BATCH);
            const trendyolPayload: PriceInventoryUpdateItem[] = batchSlice.map(p => ({
                barcode: p.barcode,
                salePrice: p.recommendedSalePrice,
                listPrice: p.recommendedSalePrice,
                quantity: p.quantity,
            }));

            let batchRequestId: string | undefined;
            processedCount += batchSlice.length;

            try {
                console.log(`[API Apply All Prices] Sending batch ${Math.floor(i / MAX_ITEMS_PER_BATCH) + 1} with ${batchSlice.length} items. Payload:`, JSON.stringify(trendyolPayload, null, 2));
                batchRequestId = await trendyolClient.updatePriceAndInventory(trendyolPayload);
                console.log(`[API Apply All Prices] Batch ${Math.floor(i / MAX_ITEMS_PER_BATCH) + 1} sent. Batch ID: ${batchRequestId}`);
                
                // Batch sonucunu kontrol et
                await wait(BATCH_CHECK_DELAY_MS);
        const batchResult = await trendyolClient.getBatchRequestResult(batchRequestId);
                console.log(`[API Apply All Prices] Batch ID ${batchRequestId} Result:`, JSON.stringify(batchResult, null, 2));

                for (const productInBatch of batchSlice) {
                    const itemResult = batchResult.items?.find(item => item.requestItem?.barcode === productInBatch.barcode);
                    if (itemResult?.status === 'SUCCESS') {
          try {
              await db.product.update({
                                where: { id: productInBatch.id, userId: userId }, // userId ile güvenlik
                  data: {
                                    salePrice: productInBatch.recommendedSalePrice,
                                    listPrice: productInBatch.recommendedSalePrice,
                                    // lastPriceAppliedDate: new Date() // Opsiyonel: son güncelleme tarihi
                                }
                            });
                            successCount++;
                        } catch (dbError) {
                            console.error(`[API Apply All Prices] DB update failed for product ${productInBatch.id} (barcode: ${productInBatch.barcode}) after Trendyol success:`, dbError);
                            errorCount++;
                            errorDetails.push({ barcode: productInBatch.barcode, reason: 'Veritabanı güncelleme hatası (Trendyol başarılıydı).' });
                        }
                    } else {
                        errorCount++;
                        const reason = itemResult?.failureReasons?.map(r => r.message).join(', ') || (itemResult?.status ? `Trendyol durumu: ${itemResult.status}` : 'Bilinmeyen Trendyol hatası');
                        errorDetails.push({ barcode: productInBatch.barcode, reason: reason });
                        console.warn(`[API Apply All Prices] Trendyol update failed for barcode ${productInBatch.barcode}. Reason: ${reason}`);
                    }
                }
            } catch (batchApiError) {
                console.error(`[API Apply All Prices] Error processing batch (ID: ${batchRequestId || 'N/A'}) for items ${i} to ${i + batchSlice.length -1}:`, batchApiError);
                errorCount += batchSlice.length; // Bu batch'teki tüm ürünler hata almış sayılır
                batchSlice.forEach(p => errorDetails.push({ barcode: p.barcode, reason: batchApiError instanceof Error ? batchApiError.message : 'Toplu API çağrısı hatası' }));
            }
    }

    return NextResponse.json({
            message: `Toplu fiyat güncelleme tamamlandı. ${successCount} ürün başarıyla güncellendi, ${errorCount} üründe hata oluştu.`,
            totalAttempted: totalProductsToAttemptUpdate,
            successCount,
            errorCount,
            errors: errorDetails.length > 0 ? errorDetails : undefined
        }, { status: 200 });

  } catch (error: unknown) {
        console.error(`[API Apply All Prices] Genel Hata:`, error);
        const message = error instanceof Error ? error.message : 'Toplu fiyat güncelleme sırasında sunucu hatası oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 