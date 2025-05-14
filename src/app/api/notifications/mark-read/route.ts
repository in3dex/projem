import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // JWT fonksiyonlarını import et // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db'; // db import et
import { z } from 'zod';
import { notificationService } from '@/lib/services/notification-service';

// Belirli ID'leri okundu işaretlemek için şema
const MarkSpecificReadSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, "En az bir bildirim ID'si gerekli."),
});

// Tümünü okundu işaretle (Mevcut)
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    const result = await notificationService.markAllAsRead(userId);
    return NextResponse.json({ message: `${result.count} bildirim okundu olarak işaretlendi.` });
  } catch (error) {
    console.error('Bildirimler okunurken (POST) API hatası:', error);
    return NextResponse.json({ message: 'Bildirimler okundu olarak işaretlenirken bir hata oluştu.' }, { status: 500 });
  }
} 

// Belirli bildirimleri okundu işaretle
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) { 
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const validation = MarkSpecificReadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.flatten() }, { status: 400 });
    }

    const { ids } = validation.data;

    // Servis katmanında bu ID'leri ve userId'yi kullanarak güncelleme yap
    // Varsayım: notificationService.markSpecificAsRead(userId, ids) fonksiyonu var
    const result = await notificationService.markSpecificAsRead(userId, ids);

    return NextResponse.json({ message: `${result.count} bildirim okundu olarak işaretlendi.` });

  } catch (error) {
    console.error('Bildirimler okunurken (PATCH) API hatası:', error);
    // Belirli bir hatayı kullanıcıya döndürmek isteyebilirsiniz
    if (error instanceof Error && error.message.includes('not found')) { // Örnek hata kontrolü
         return NextResponse.json({ message: 'Bazı bildirimler bulunamadı veya güncellenemedi.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Bildirimler okundu olarak işaretlenirken bir hata oluştu.' }, { status: 500 });
  }
} 