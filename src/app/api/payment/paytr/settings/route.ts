import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { getBaseUrl } from '@/lib/utils';

export async function GET() {
  // Yetkilendirme kontrolü
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // PayTR ayarlarını veritabanından çek
    const odemeAyarlari = await db.odemeAyarlari.findFirst();

    if (!odemeAyarlari) {
      return NextResponse.json({ 
        error: 'Ödeme ayarları bulunamadı',
        success: false
      }, { status: 404 });
    }

    // Test modunda mı kontrolü
    const isTestMode = odemeAyarlari.paytrTestMode === "1";
    const callbackUrl = `${getBaseUrl()}/api/payment/paytr/callback`;
    const iframeUrl = "https://www.paytr.com/odeme/guvenli/";
    const testPaymentEndpoint = isTestMode ? `${getBaseUrl()}/api/payment/paytr/process-test-payment` : null;

    // Sadece gerekli ayarları dön (güvenlik için)
    return NextResponse.json({
      success: true,
      isTestMode,
      callbackUrl,
      iframeUrl,
      testPaymentEndpoint,
      paytrActive: odemeAyarlari.paytrAktif,
      apiEndpoints: {
        createToken: `${getBaseUrl()}/api/payment/paytr/create-token`,
        payInvoice: `${getBaseUrl()}/api/payment/paytr/pay-invoice`,
        processTestPayment: isTestMode ? `${getBaseUrl()}/api/payment/paytr/process-test-payment` : null
      },
      successPage: `${getBaseUrl()}/odeme/basarili`,
      failPage: `${getBaseUrl()}/odeme/basarisiz`,
      docs: `${getBaseUrl()}/api/payment/paytr/README.md`
    });

  } catch (error: any) {
    console.error('Ödeme ayarları alınırken hata:', error);
    return NextResponse.json({ 
      error: 'Ödeme ayarları alınırken bir hata oluştu',
      success: false 
    }, { status: 500 });
  }
} 