import { NextRequest, NextResponse } from 'next/server'
import { TrendyolOrderStorageService } from '@/lib/services/trendyol-order-storage-service'
import { notificationService } from '@/lib/services/notification-service'
import { NotificationType } from '@prisma/client'
import { headers } from 'next/headers'
import { userService } from '@/lib/services/user-service'

/**
 * Trendyol sipariş webhook'larını işleyen POST isteği yöneticisi.
 * Dinamik rota: /api/webhooks/trendyol/[userId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const headerList = headers();

  // 1. Güvenlik Kontrolü: Kullanıcıya Özel Webhook Anahtarı Doğrulaması
  const receivedWebhookSecret = headerList.get('X-Trendyol-Webhook-Secret');

  if (!receivedWebhookSecret) {
    console.warn(`Webhook isteğinde X-Trendyol-Webhook-Secret başlığı eksik. Kullanıcı: ${userId}`);
    return NextResponse.json({ success: false, message: 'Secret header missing.' }, { status: 400 });
  }

  // Kullanıcıyı ve beklenen webhook anahtarını veritabanından al
  const user = await userService.findUserByIdWithSettings(userId);
  if (!user || !user.webhookApiKey) {
    console.error(`Webhook isteği için kullanıcı bulunamadı veya webhookApiKey ayarlanmamış. Kullanıcı ID: ${userId}`);
    // Trendyol'a 404 dönmek yerine, loglayıp 200 dönmek tekrar denemeleri engelleyebilir.
    // Ancak bu durumun incelenmesi gerekir.
    return NextResponse.json({ success: true, message: 'User or webhook key not configured.' }, { status: 200 });
  }

  // Gelen anahtar ile kullanıcının anahtarını karşılaştır
  if (receivedWebhookSecret !== user.webhookApiKey) {
    console.warn(`Geçersiz webhook secret alındı. Kullanıcı: ${userId}`);
    return NextResponse.json({ success: false, message: 'Invalid secret.' }, { status: 401 });
  }

  // 2. Payload Al
  let orderData: any;
  try {
    orderData = await request.json();
  } catch (error) {
    console.error('Webhook payload okunamadı veya JSON formatında değil:', error);
    return NextResponse.json({ success: false, message: 'Invalid payload.' }, { status: 400 });
  }

  // 3. Asenkron İşleme Başlat
  try {
    const result = await TrendyolOrderStorageService.saveOrUpdateOrderFromWebhook(userId, orderData);

    if (result && result.id && result.orderNumber && result.status) {
      // 4. Bildirim Oluştur (Eğer kullanıcı bildirimleri etkinleştirdiyse)
      if (user.notifyOnOrderStatusUpdate) { 
        await notificationService.createNotification({
          userId: userId,
          type: NotificationType.ORDER_STATUS_UPDATE, // Enum'u doğru kullanalım
          message: `Sipariş #${result.orderNumber} güncellendi. Yeni durum: ${result.status}`,
          relatedId: result.id,
          relatedUrl: `/dashboard/siparisler?orderNumber=${result.orderNumber}`,
        });
        console.log(`İşlem başarılı: Sipariş ${result.orderNumber}, Bildirim oluşturuldu.`);
      } else {
        console.log(`İşlem başarılı: Sipariş ${result.orderNumber}, kullanıcı bildirim istemediği için bildirim oluşturulmadı.`);
      }
    } else {
      console.warn('saveOrUpdateOrderFromWebhook beklenen sonucu döndürmedi:', result);
    }

    // 5. Trendyol'a Başarılı Yanıtı Dön
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    const orderNumberText = orderData?.orderNumber ? `Sipariş No: ${orderData.orderNumber}` : 'Sipariş No alınamadı';
    console.error(`Webhook işlenirken hata oluştu (Kullanıcı: ${userId}, ${orderNumberText}):`, error);
    // Hata durumunda bile Trendyol'a 200 dönmek genellikle önerilir.
    return NextResponse.json({ success: true, message: 'Internal processing error, logged.' }, { status: 200 });
  }
}

// OPTIONS isteğini handle etmek (CORS preflight için gerekli olabilir)
export async function OPTIONS(request: NextRequest) {
    // Gerekli CORS header'larını ekle
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*', // Veya daha kısıtlı bir domain
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Trendyol-Webhook-Secret',
        },
    });
}

// GET, PUT, DELETE metodları genellikle webhook için gerekmez.
// export async function GET() { ... } 