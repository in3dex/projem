import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { TrendyolApiClientService } from '@/lib/services/trendyol-api-client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Helper function to validate and parse FormData
async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('invoiceFile') as File | null;
  const shipmentPackageIdValue = formData.get('shipmentPackageId'); // Önce değeri al
  const invoiceNumber = formData.get('invoiceNumber') as string | null;
  const invoiceDateTimeStr = formData.get('invoiceDateTime') as string | null;

  if (!file) {
    throw new Error('Fatura dosyası gerekli.');
  }
  if (file.type !== 'application/pdf') {
    throw new Error('Sadece PDF dosyaları yüklenebilir.');
  }
  // shipmentPackageId'yi string olarak alıp sayıya çevir
  const shipmentPackageId = shipmentPackageIdValue ? Number(shipmentPackageIdValue) : null;
  if (shipmentPackageId === null || isNaN(shipmentPackageId)){
      // Türkçe karakterleri kaldır
      throw new Error('Gecerli bir sevkiyat paket ID (sayisal) gereklidir.');
  }
  
  let invoiceDateTime: number | undefined = undefined;
  if (invoiceDateTimeStr) {
      const timestamp = parseInt(invoiceDateTimeStr, 10);
      if (!isNaN(timestamp) && timestamp > 0) {
          invoiceDateTime = timestamp; // Frontendden timestamp (ms) olarak geldiğini varsayalım
      } else {
          // Hata fırlatmak yerine null veya undefined bırakmak daha iyi olabilir
          // throw new Error('Geçerli bir fatura tarihi (timestamp) gerekli.');
          console.warn('Geçersiz fatura tarihi timestamp formatı:', invoiceDateTimeStr);
      }
  }

  return {
    file,
    shipmentPackageId: shipmentPackageId, // Artık number
    invoiceNumber: invoiceNumber || undefined,
    invoiceDateTime, // Milisaniye timestamp veya undefined
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // User modelinde sellerId alanı yok, ApiSettings üzerinden almalıyız
    const apiSettings = await db.apiSettings.findUnique({ 
      where: { userId: userId }, 
      select: { sellerID: true, apiKey: true, apiSecret: true } // sellerID, apiKey, apiSecret alalım
    });
    const sellerId = apiSettings?.sellerID;
    const apiKey = apiSettings?.apiKey;
    const apiSecret = apiSettings?.apiSecret;
    
    if (!sellerId || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Satıcı kimliği veya API bilgileri bulunamadı.' }, { status: 400 });
    }

    // 2. Form verisini al ve doğrula
    const { file, shipmentPackageId, invoiceNumber, invoiceDateTime } = await parseFormData(request);

    // 3. Dosyayı kaydet (GÜVENLİK RİSKİ DEVAM EDİYOR)
    // UYARI: Bu yöntem üretim ortamı için uygun değildir. Güvenlik açıkları oluşturabilir
    // ve ölçeklenebilir değildir. Mutlaka bir bulut depolama çözümü (S3, GCS vb.) kullanın.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Benzersiz dosya adı oluştur
    const filename = `${shipmentPackageId}-${Date.now()}.pdf`;
    // public/invoices dizinini oluşturduğunuzdan emin olun
    const uploadDir = path.join(process.cwd(), 'public', 'invoices');
    const filepath = path.join(uploadDir, filename);
    
    try {
        // Yazmadan önce dizinin var olduğundan emin ol
        await mkdir(uploadDir, { recursive: true }); 
        // Şimdi dosyayı yaz
        await writeFile(filepath, buffer);
        console.log(`Fatura kaydedildi: ${filepath}`);
    } catch (writeError) {
        console.error("Dosya yazma/dizin oluşturma hatasi:", writeError);
        return NextResponse.json({ error: 'Fatura dosyasi sunucuya kaydedilemedi.' }, { status: 500 });
    }
    
    // Yeni: Mutlak URL oluştur
    // Uygulamanızın temel URL'sini ortam değişkeninden alın
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'; // Kendi değişkeninize göre düzenleyin
    // URL'nin sonunda / olmadığından emin olun
    const cleanBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
    const invoiceLink = `${cleanBaseUrl}/invoices/${filename}`;
    console.log("Oluşturulan Fatura Linki:", invoiceLink); // Oluşan linki logla

    // 4. Trendyol API isteği hazırla
    const apiUrl = `https://api.trendyol.com/sapigw/integration/sellers/${sellerId}/seller-invoice-links`;
    
    const apiPayload = {
      invoiceLink,
      shipmentPackageId,
      ...(invoiceNumber && { invoiceNumber }),
      ...(invoiceDateTime && { invoiceDateTime: Math.floor(invoiceDateTime / 1000) }),
    };

    // Basic Auth
    // const username = process.env.TRENDYOL_API_KEY; // Ortam değişkeni yerine DB'den aldık
    // const password = process.env.TRENDYOL_API_SECRET;
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // 5. Trendyol API'sine istek gönder
    const trendyolResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': `TrendyolIntegration/${sellerId}`
      },
      body: JSON.stringify(apiPayload),
    });

    // 6. Trendyol API yanıtını işle ve Veritabanını Güncelle
    // ... (rest of the response handling and DB update logic) ...

  } catch (error: any) {
    // ... (error handling) ...
  }
}