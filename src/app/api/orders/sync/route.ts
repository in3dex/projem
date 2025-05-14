import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { TrendyolApiClientService, TrendyolCredentials } from '@/lib/services/trendyol-api-client';
import { TrendyolOrderStorageService, OrderSaveResult } from '@/lib/services/trendyol-order-storage-service';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { LimitType, checkLimit, LimitError, getCurrentMonthlyOrderCount } from '@/lib/limits';

// Gelen istek body'sini doğrulamak için şema
const syncOrdersSchema = z.object({
    forceSync: z.boolean().optional().default(false),
    startDate: z.string().datetime().optional(), // Başlangıç tarihi (ISO 8601)
    endDate: z.string().datetime().optional(), // Bitiş tarihi (ISO 8601)
    size: z.number().int().positive().optional().default(50)
});

// Yardımcı fonksiyon: Belirli bir gün öncesinin timestamp'ini ms cinsinden al
function getTimestampDaysAgo(days: number): number {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.getTime();
}

export async function POST(request: NextRequest) {
  try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        }
        const userId = session.user.id;

        // 1. Kullanıcı API Ayarlarını Çek
        const apiSettings = await db.apiSettings.findUnique({
            where: { userId },
        });

        if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
            return NextResponse.json({ error: 'Trendyol API ayarları eksik veya bulunamadı.' }, { status: 400 });
        }

        // ---------- YENİ: Abonelik Kontrolü Başlangıç ----------
        const subscription = await db.subscription.findUnique({
          where: { userId },
          select: { status: true, plan: { select: { maxMonthlyOrders: true } } } // Limit için plan bilgisini de al
        });
    
        if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
          console.warn(`Kullanıcı ${userId} için aktif abonelik bulunamadı. Sipariş senkronizasyonu engellendi.`);
          return NextResponse.json({
            error: 'Aktif Abonelik Gerekli',
            details: 'Bu işlemi gerçekleştirmek için aktif bir aboneliğe sahip olmanız gerekmektedir.'
          }, { status: 402 }); // 402 Payment Required
        }
        console.log(`Kullanıcı ${userId} için sipariş senkronizasyonu başlatıldı (Aktif abonelik mevcut).`);
        // ---------- YENİ: Abonelik Kontrolü Bitiş ----------

        // Mevcut aylık sipariş sayısını başta bir kere alalım
        let currentOrderCount = await getCurrentMonthlyOrderCount(userId);
        console.log(`[Sync Orders] Mevcut aylık sipariş sayısı başlangıç: ${currentOrderCount}`);

        // 2. Request Body'yi Parse Et ve Doğrula
        let forceSync = false;
        let reqStartDate: Date | undefined = undefined;
        let reqEndDate: Date | undefined = undefined;
        let size = 50;
        try {
            const body = await request.json();
            const validation = syncOrdersSchema.safeParse(body);
            if (validation.success) {
                forceSync = validation.data.forceSync;
                size = validation.data.size;
                if (validation.data.startDate) reqStartDate = new Date(validation.data.startDate);
                if (validation.data.endDate) reqEndDate = new Date(validation.data.endDate);
            } else {
                 return NextResponse.json({ error: 'Geçersiz istek parametreleri', details: validation.error?.format() }, { status: 400 });
            }
        } catch (e) {
            console.warn('[Sync Orders] Request body parse edilemedi, varsayılan ayarlar kullanılıyor.');
        }

        // ----- Varsayılan Tarih Aralığı (90 Gün) -----
        const finalStartDate = reqStartDate ? reqStartDate.getTime() : getTimestampDaysAgo(90);
        const finalEndDate = reqEndDate ? reqEndDate.getTime() : Date.now();
        // ----- Bitiş: Varsayılan Tarih Aralığı -----

        console.log(`[Sync Orders] Genel Aralık Başlatılıyor... User: ${userId}, Start: ${new Date(finalStartDate).toISOString()}, End: ${new Date(finalEndDate).toISOString()}, Size: ${size}`);

        // 3. Servisleri Başlat
        const credentials: TrendyolCredentials = { sellerId: apiSettings.sellerID!, apiKey: apiSettings.apiKey!, apiSecret: apiSettings.apiSecret! };
        const apiClient = new TrendyolApiClientService(credentials);
        
        // --- Senkronizasyon Mantığı Başlangıç ---
        const overallStartTime = Date.now();
        let overallTotalProcessed = 0;
        let overallTotalSuccess = 0;
        let overallTotalFailed = 0;
        const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
        let currentChunkStartDate = finalStartDate;

        // Dış Döngü: 14 Günlük Periyotlar
        while (currentChunkStartDate < finalEndDate) {
            const currentChunkEndDate = Math.min(currentChunkStartDate + fourteenDaysInMillis, finalEndDate);
            console.log(`[Sync Orders] Periyot İşleniyor: ${new Date(currentChunkStartDate).toISOString()} - ${new Date(currentChunkEndDate).toISOString()}`);

            let page = 0;
            let hasMore = true;
            let periodTotalProcessed = 0; // Bu periyottaki işlenen

            // İç Döngü: Mevcut Periyot İçin Sayfalama
            while (hasMore) {
                try {
                    console.log(`[Sync Orders] Periyot Sayfa ${page} çekiliyor...`);
                    
                    const requestParams: Record<string, any> = {
                        sellerId: apiSettings.sellerID!,
                        page: page,
                        size: size,
                        startDate: currentChunkStartDate,
                        endDate: currentChunkEndDate
                    };
                    
                    console.log('API İsteği:', `GET https://api.trendyol.com/sapigw/suppliers/${apiSettings.sellerID}/orders`, requestParams); 
                    const apiResponse = await apiClient.getOrders(requestParams);
                    const orders = apiResponse.content || []; // content yoksa boş dizi
                    periodTotalProcessed += orders.length;
                    overallTotalProcessed += orders.length;

                    if (orders.length > 0) {
                        // Siparişleri veritabanına kaydet/güncelle
                        const saveResult = await TrendyolOrderStorageService.saveMultipleOrders(userId, orders);
                        overallTotalSuccess += saveResult.success;
                        overallTotalFailed += saveResult.failed;

                        // ---------- Limit Kontrolü (Kaydetme Sonrası ve Sadece Yeni Eklenenler İçin) ----------
                        if (saveResult.newlyInserted > 0) { // Sadece yeni sipariş eklendiyse limiti kontrol et
                            try {
                                // Kümülatif sayıyı YENİ EKLENENLERLE birlikte kontrol et
                                await checkLimit(userId, LimitType.ORDER_COUNT, currentOrderCount + saveResult.newlyInserted);
                                
                                // Limit aşılmadıysa, kümülatif sayacı SADECE yeni eklenenler kadar artır
                                currentOrderCount += saveResult.newlyInserted;
                                console.log(`[Sync Orders] Yeni ${saveResult.newlyInserted} sipariş eklendi. Kümülatif aylık sayaç: ${currentOrderCount}`);

                        } catch (limitError) {
                            if (limitError instanceof LimitError) {
                                    console.warn(`[Sync Orders] Kullanıcı ${userId} için aylık sipariş limiti (${limitError.limit ?? 'bilinmiyor'}) yeni eklenenlerle aşıldı. Senkronizasyon durduruluyor.`);
                                // Limitin aşıldığını belirten özel bir yanıt döndür
                                return NextResponse.json({
                                    success: false, 
                                    error: 'Aylık Sipariş Limiti Aşıldı', 
                                    details: limitError.message, 
                                    limit: limitError.limit,
                                        currentCountBeforeFetch: currentOrderCount - saveResult.newlyInserted, // Hata öncesi sayaç
                                        newlyInsertedInThisBatch: saveResult.newlyInserted, // Bu batch'te eklenen
                                        overallProcessed: overallTotalProcessed, 
                                        overallSuccessful: overallTotalSuccess, // Başarılı olanlar (yeni + güncellenen)
                                    overallFailed: overallTotalFailed,
                                    durationMs: Date.now() - overallStartTime
                                }, { status: 429 }); 
                                } else { 
                                    // Beklenmedik bir checkLimit hatasıysa tekrar fırlat
                                    throw limitError; 
                                }
                            }
                        } else {
                            console.log(`[Sync Orders] Bu batch'te yeni sipariş eklenmedi, sadece ${saveResult.updated} sipariş güncellendi. Limit kontrolü atlandı.`);
                        }
                        // ---------- Limit Kontrolü Bitiş ----------
                        
                        console.log(`[Sync Orders] Periyot Sayfa ${page} işlendi: Başarılı (Yeni+Güncel): ${saveResult.success}, Yeni Eklenen: ${saveResult.newlyInserted}, Güncellenen: ${saveResult.updated}, Başarısız: ${saveResult.failed}.`);

                    } else {
                        console.log(`[Sync Orders] Periyot Sayfa ${page} API\'den boş yanıt geldi.`);
                    }
                    
                    // Sayfalama sonu kontrolü (API yanıtına göre)
                    if (page >= (apiResponse.totalPages ?? 1) - 1 || orders.length === 0 || orders.length < size) {
                        hasMore = false;
                        console.log(`[Sync Orders] Periyot ${new Date(currentChunkStartDate).toISOString()} için son sayfaya ulaşıldı veya boş sayfa.`);
                    } else {
                        page++;
                    }
                } catch (apiError: any) {
                    console.error(`[Sync Orders] Periyot Sayfa ${page} işlenirken API/DB hatası:`, apiError);
                    // Hata durumunda bu periyodu atlayıp sonraki periyoda geçebilir veya tüm işlemi durdurabiliriz.
                    // Şimdilik tüm işlemi durduralım.
                    hasMore = false; // İç döngüyü bitir
                    // Dış döngüyü de bitirmek için:
                    currentChunkStartDate = finalEndDate; // Bu, dış döngü koşulunu false yapar
                     return NextResponse.json({ 
                            success: false,
                            error: 'Senkronizasyon sırasında bir API veya veritabanı hatası oluştu.', 
                            details: apiError.message || String(apiError) 
                        }, { status: 500 });
                }
            } // İç döngü sonu (while hasMore)

            // Sonraki periyoda geç
            currentChunkStartDate += fourteenDaysInMillis;

        } // Dış döngü sonu (while currentChunkStartDate < finalEndDate)
        
        const overallDurationMs = Date.now() - overallStartTime;
        // --- Senkronizasyon Mantığı Sonu ---

        console.log(`[Sync Orders] Tüm Periyotlar Tamamlandı. User: ${userId}. Süre: ${overallDurationMs}ms. Başarılı: ${overallTotalSuccess}, Başarısız: ${overallTotalFailed}`);

        // 4. Genel Sonucu döndür
        return NextResponse.json({
          success: true,
                message: 'Sipariş senkronizasyonu başarıyla tamamlandı.',
                successfulOrders: overallTotalSuccess,
                failedOrders: overallTotalFailed,
                totalOrdersProcessed: overallTotalProcessed,
                durationMs: overallDurationMs
            }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API/Orders/Sync POST] Genel Hata:', error);
        const message = error instanceof Error ? error.message : 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.';
        return NextResponse.json({ 
        success: false, 
            error: 'Sipariş senkronizasyonu başarısız oldu.', 
            details: message 
        }, { status: 500 });
  }
} 