import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // JWT fonksiyonlarını import et // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db'; // db import et
import { notificationService } from '@/lib/services/notification-service';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const onlyUnread = searchParams.get('unread') === 'true';
    const getCount = searchParams.get('count') === 'true'; // Sadece okunmamış sayısını almak için

    if (getCount) {
       const count = await notificationService.getUnreadCount(userId);
       return NextResponse.json({ count });
    } else {
        const notifications = await notificationService.getNotificationsForUser(userId, limit, onlyUnread);
        return NextResponse.json(notifications);
    }
  } catch (error) {
    console.error('Bildirimler alınırken API hatası:', error);
    return NextResponse.json({ message: 'Bildirimler alınırken bir hata oluştu.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    // ... (rest of the function using userId) ...

  } catch (error) {
    // ... existing error handling ...
  }
} 