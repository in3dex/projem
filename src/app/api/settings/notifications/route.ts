import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // JWT fonksiyonlarını import et // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db'; // db import et
import { z } from 'zod';

// Güncelleme için istek gövdesi şeması
const updateSettingsSchema = z.object({
  notifyOnOrderStatusUpdate: z.boolean(),
});

// GET isteği: Mevcut ayarları döndürür
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    const settings = await userService.getNotificationSettings(userId);
    if (!settings) {
      return NextResponse.json({ message: 'Ayarlar bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Bildirim ayarları alınırken API hatası:', error);
    return NextResponse.json({ message: 'Bildirim ayarları alınırken bir hata oluştu.' }, { status: 500 });
  }
}

// PUT isteği: Ayarları günceller
export async function PUT(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    const body = await request.json();
    const validatedSettings = updateSettingsSchema.safeParse(body);

    if (!validatedSettings.success) {
      return NextResponse.json({ message: 'Geçersiz veri.', errors: validatedSettings.error.errors }, { status: 400 });
    }

    await userService.updateNotificationSettings(userId, validatedSettings.data);
    return NextResponse.json({ message: 'Bildirim ayarları başarıyla güncellendi.' });

  } catch (error) {
    console.error('Bildirim ayarları güncellenirken API hatası:', error);
    if (error instanceof z.ZodError) {
         return NextResponse.json({ message: 'Geçersiz veri formatı.', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bildirim ayarları güncellenirken bir hata oluştu.' }, { status: 500 });
  }
} 