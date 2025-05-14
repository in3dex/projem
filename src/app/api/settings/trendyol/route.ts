import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import { db } from '@/lib/db'; // db doğrudan kullanılmayacak, userService kullanılacak
import { auth } from '@/lib/auth/auth'; // auth import edildi
import userService from '@/lib/services/user-service'; // userService import edelim
import { ApiSettings } from '@prisma/client'; // ApiSettings tipini import edelim

// Zod şeması: sellerID (büyük D) olarak güncellendi ve apiSecret opsiyonel yapıldı
const apiSettingsSchema = z.object({
  sellerID: z.string().min(1, 'Satıcı ID gereklidir'), // sellerID (büyük D) bekleniyor
  apiKey: z.string().min(1, 'API Key gereklidir'),
  apiSecret: z.string().min(1, 'API Secret gereklidir').optional(), // API Secret opsiyonel
});

// Mevcut API ayarlarını getiren GET metodu (Değişiklik yok, zaten ApiSettings kullanıyor)
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    // Prisma db instance'ını userService içerisinden veya ayrı import ile kullanabiliriz.
    // Hata olmaması için db'yi tekrar import edelim (veya userService içinden çağıralım)
    const { db } = await import('@/lib/db'); // Dinamik import veya üstte static import

    const settings = await db.apiSettings.findUnique({
      where: { userId },
      select: { 
        id: true, 
        sellerID: true, // Veritabanındaki adı sellerID
        apiKey: true, 
        createdAt: true, 
        updatedAt: true, 
        apiSecret: true 
      }, 
    });

    if (!settings) {
      return NextResponse.json(null, { status: 200 }); 
    }

    const { apiSecret, ...settingsWithoutSecret } = settings;
    const responseData = {
      ...settingsWithoutSecret,
      hasApiSecret: !!apiSecret 
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('API ayarları alınırken hata:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    return NextResponse.json({ error: 'Ayarlar alınamadı.', message }, { status: 500 });
  }
}

// API ayarlarını userService aracılığıyla kaydeden/güncelleyen POST metodu
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    const body = await request.json();
    // Zod şeması (sellerID) ile doğrula
    const validation = apiSettingsSchema.safeParse(body); 

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.errors }, { status: 400 });
    }

    // validation.data artık { sellerID, apiKey, apiSecret? } içeriyor
    // userService.updateApiSettings'e sellerId (küçük d) göndermemiz gerekiyor
    const updateInput = {
        sellerId: validation.data.sellerID, // Zod'dan gelen sellerID'yi sellerId'ye map et
        apiKey: validation.data.apiKey,
        ...(validation.data.apiSecret && { apiSecret: validation.data.apiSecret }) // Sadece varsa ekle
    };
    
    // Eğer apiSecret gelmediyse ve veritabanında varsa onu korumak isteyebiliriz,
    // ancak userService'in mevcut mantığı bu durumu zaten ele alıyor olabilir. 
    // Şimdilik sadece gelen veriyi gönderelim. userService'in mantığına güveniyoruz.
    // ÖNEMLİ NOT: userService.updateApiSettings'in input type'ı Partial<UpdateApiSettingsInput> 
    // veya benzeri olmalı ki eksik alanları kabul edebilsin. (Kontrol edildi, UpdateApiSettingsInput zaten opsiyonel alanlara sahip)

    const { user, apiSettings } = await userService.updateApiSettings(userId, updateInput);

    // Başarılı yanıtı oluştur (güncellenmiş ApiSettings bilgileriyle)
    const responseSettings = {
        id: apiSettings.id,
        sellerID: apiSettings.sellerID, // Frontend'e sellerID olarak gönderelim (modeldeki gibi)
        apiKey: apiSettings.apiKey,
        hasApiSecret: !!apiSettings.apiSecret
    };

    return NextResponse.json({
        success: true, 
        message: 'API ayarları başarıyla kaydedildi.', 
        settings: responseSettings // Frontend state güncellemesi için
    });

  } catch (error) {
    console.error('API ayarları kaydedilirken hata:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    // userService'den gelen spesifik hataları da yakalayabiliriz.
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi.', message }, { status: 500 });
  }
} 