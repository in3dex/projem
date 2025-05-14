import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { TRENDYOL_API_URLS } from '@/lib/trendyol/urls'; // Trendyol URL'lerini içeren sabitleri import et (varsayım)
import { generateInvoicePdf } from '@/lib/utils/pdf-generator'; // PDF oluşturma fonksiyonu

// İstek Body şeması
const invoiceSchema = z.object({
  shipmentPackageId: z.number().int().positive("Geçerli bir paket ID'si gereklidir."),
  invoiceLink: z.string().url("Geçerli bir fatura URL'si gereklidir."),
  invoiceNumber: z.string().optional(), // Opsiyonel, format kontrolü eklenebilir
  invoiceDateTime: z.number().int().positive().optional(), // Opsiyonel, Unix timestamp (saniye veya milisaniye)
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const user = await db.user.findUnique({ where: { id: userId }, select: { sellerId: true } });
    const sellerId = user?.sellerId;
    if (!sellerId) {
        return NextResponse.json({ error: 'Satıcı kimliği bulunamadı.' }, { status: 400 });
    }

    // 2. İstek Body'sini al ve doğrula
    const body = await request.json();
    const validation = invoiceSchema.safeParse(body);

    if (!validation.success) {
      console.error("Fatura Yükleme Zod Hataları:", JSON.stringify(validation.error.format(), null, 2));
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.format() }, { status: 400 });
    }

    const { shipmentPackageId, invoiceLink, invoiceNumber, invoiceDateTime } = validation.data;

    // 3. Trendyol API isteği hazırla
    const apiUrl = `${TRENDYOL_API_URLS.integration}/sellers/${sellerId}/seller-invoice-links`;
    const apiPayload = {
      invoiceLink,
      shipmentPackageId,
      // Opsiyonel alanları sadece varsa ekle
      ...(invoiceNumber && { invoiceNumber }),
      ...(invoiceDateTime && { invoiceDateTime }),
    };

    // Basic Auth için credentials (varsayım: ortam değişkenlerinde)
    const username = process.env.TRENDYOL_API_KEY;
    const password = process.env.TRENDYOL_API_SECRET;
    if (!username || !password) {
      console.error('Trendyol API kimlik bilgileri eksik.');
      return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 });
    }
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    // 4. Trendyol API'sine istek gönder
    const trendyolResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': `TrendyolIntegration/${sellerId}` // Önerilen User-Agent formatı
      },
      body: JSON.stringify(apiPayload),
    });

    // 5. Trendyol API yanıtını işle
    if (trendyolResponse.status === 201) {
      // Başarılı - Veritabanını güncelle
      try {
        const updatedOrder = await db.trendyolOrder.updateMany({
          where: { 
            // shipmentPackageId alanı TrendyolOrder modelinde olmalı
            shipmentPackages: { some: { id: shipmentPackageId.toString() } } // İlişki varsa bu şekilde veya direkt ID ile
            // Alternatif: Eğer shipmentPackageId direkt Order'da ise:
            // shipmentPackageId: shipmentPackageId.toString(), 
            // userId: userId // Güvenlik için kullanıcı kontrolü eklenebilir
          },
          data: {
            isInvoiceSent: true, // Varsayılan alan
            invoiceLink: invoiceLink,
            invoiceNumber: invoiceNumber,
            invoiceDateTime: invoiceDateTime ? new Date(invoiceDateTime * (invoiceDateTime.toString().length === 10 ? 1000 : 1)) : null, // Timestamp'i Date'e çevir
          },
        });
        
        // Eğer hiçbir sipariş güncellenmediyse (örn. ID bulunamadı), hata dönebiliriz.
        if (updatedOrder.count === 0) {
             console.warn(`Faturası gönderilen sipariş bulunamadı veya güncellenemedi: ${shipmentPackageId}`);
             // Yine de başarılı kabul edilebilir, Trendyol kabul etti.
        }

        return NextResponse.json({ message: "Fatura başarıyla Trendyol'a gönderildi ve kaydedildi." }, { status: 201 });

      } catch (dbError) {
        console.error("Veritabanı güncelleme hatası (fatura sonrası):", dbError);
        // Trendyol başarılı oldu ama DB hatası aldık. Durumu logla ama 201 dönebiliriz?
        // Veya kullanıcıya DB hatası olduğunu belirten bir mesaj dönebiliriz.
        return NextResponse.json({ message: "Fatura Trendyol'a gönderildi ancak veritabanına kaydedilirken hata oluştu." }, { status: 207 }); // Multi-Status
      }

    } else {
      // Başarısız - Hata detayını logla ve döndür
      const errorBody = await trendyolResponse.text();
      console.error(`Trendyol Fatura API Hatası (${trendyolResponse.status}):`, errorBody);
      let errorMessage = 'Trendyol fatura gönderme API hatası.';
      if (trendyolResponse.status === 409) {
        errorMessage = 'Bu sipariş için zaten bir fatura gönderilmiş veya bu link başka bir siparişte kullanılmış.';
      }
       try {
         const errorJson = JSON.parse(errorBody);
         errorMessage = errorJson.message || errorMessage; // Trendyol'dan gelen hata mesajı varsa onu kullan
       } catch (e) { /* Ignore parsing error */ }

      return NextResponse.json({ error: errorMessage, details: errorBody }, { status: trendyolResponse.status });
    }

  } catch (error: unknown) {
    console.error("Fatura gönderme API genel hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: 'Fatura gönderme sırasında bir hata oluştu.', details: message }, { status: 500 });
  }
}
