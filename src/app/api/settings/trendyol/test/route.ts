import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { TrendyolApiClientService, TrendyolCredentials } from '@/lib/services/trendyol-api-client';

export async function GET(request: NextRequest) {
  try {
    // 1. Kullanıcı kimliğini doğrula
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Veritabanından API ayarlarını al
    const settings = await db.apiSettings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.sellerID || !settings.apiKey || !settings.apiSecret) {
      return NextResponse.json({ success: false, error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 404 });
    }

    // 3. Trendyol API İstemci Servisini başlat
    const credentials: TrendyolCredentials = {
      sellerId: settings.sellerID,
      apiKey: settings.apiKey,
      apiSecret: settings.apiSecret,
    };
    const apiClient = new TrendyolApiClientService(credentials);

    // 4. Bağlantıyı test et
    const isConnectionSuccessful = await apiClient.testConnection();

    // 5. Sonucu döndür
    if (isConnectionSuccessful) {
      return NextResponse.json({ success: true, message: 'Trendyol API bağlantısı başarılı.' });
    } else {
      return NextResponse.json({ success: false, error: 'Trendyol API bağlantısı kurulamadı. Lütfen API bilgilerinizi kontrol edin.' }, { status: 400 });
    }

  } catch (error) {
    console.error('API bağlantı testi sırasında hata:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    // Hatanın detayını client'a göndermemek daha güvenli olabilir
    return NextResponse.json({ success: false, error: 'API bağlantı testi sırasında bir hata oluştu.', details: message }, { status: 500 });
  }
} 