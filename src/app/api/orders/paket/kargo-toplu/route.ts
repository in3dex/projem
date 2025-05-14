import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { TrendyolApiClientService } from '@/lib/services/trendyol-api-client';
import { z } from 'zod';

const updateBulkCargoSchema = z.object({
  packageIds: z.array(z.number().int().positive()).min(1),
  newCargoProvider: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth(); // Yorum kaldırıldı
    if (!session?.user?.id) { // Yorum kaldırıldı
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 }); // Yorum kaldırıldı
    } // Yorum kaldırıldı

    const userId = session.user.id; // Yorum kaldırıldı
    // const userId = "clw0dn9g8000010uv10j0k84p"; // Geçici ID kaldırıldı

    // API Ayarlarını Al
    const apiSettings = await db.apiSettings.findUnique({
      where: { userId },
    });

    if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
      return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
    }

    const apiClient = new TrendyolApiClientService({
      sellerId: apiSettings.sellerID,
      apiKey: apiSettings.apiKey,
      apiSecret: apiSettings.apiSecret,
    });

    // Gelen veriyi doğrula
    const body = await request.json();
    const validation = updateBulkCargoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.errors }, { status: 400 });
    }

    const { packageIds, newCargoProvider } = validation.data;

    console.log(`Toplu kargo güncelleme isteği: ${packageIds.length} paket, Yeni Kargo: ${newCargoProvider}`);

    // Trendyol API'sini her paket için ayrı ayrı çağırmak yerine (desteklenmiyorsa)
    // veya toplu bir endpoint varsa onu kullanmak gerekir.
    // Şimdilik, her paket için ayrı istek göndereceğiz.
    // DİKKAT: Bu, çok sayıda paket için rate limit sorunlarına yol açabilir!
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const packageId of packageIds) {
      try {
        // Trendyol API'sine gönderilecek veri formatı dökümantasyona göre ayarlanmalı.
        // Örnek varsayım: { cargoProvider: string }
        const updateData = { cargoProvider: newCargoProvider };
        
        // Trendyol API endpoint'ini çağır (varsayılan endpoint)
        // Gerçek endpoint farklı olabilir!
        const endpoint = `/suppliers/${apiClient.sellerId}/shipment-packages/${packageId}/providers`;
        await apiClient.put(endpoint, updateData);
        
        // Başarılı olursa veritabanını da güncelle (opsiyonel, webhook beklenmeli mi?)
        // await db.trendyolShipmentPackage.updateMany({
        //   where: { trendyolPackageId: BigInt(packageId), order: { customer: { userId: userId } } }, // Güvenlik için userId kontrolü
        //   data: { cargoProviderName: newCargoProvider },
        // });

        successCount++;
        results.push({ packageId, success: true });
      } catch (error: any) {
        console.error(`Paket ${packageId} için kargo güncelleme hatası:`, error.message || error);
        failureCount++;
        results.push({ packageId, success: false, error: error.message || 'Bilinmeyen hata' });
      }
    }

    console.log(`Toplu kargo güncelleme sonucu: Başarılı: ${successCount}, Hatalı: ${failureCount}`);

    return NextResponse.json({
      message: `Toplu kargo güncelleme işlemi tamamlandı.`,
      successCount,
      failureCount,
      details: results,
    });

  } catch (error: any) {
    console.error('[API_BULK_CARGO_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Toplu kargo güncelleme sırasında bir hata oluştu.', details: error.message }, { status: 500 });
  }
} 