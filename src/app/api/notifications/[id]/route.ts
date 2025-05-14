import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Bildirim güncelleme şeması
const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

// PATCH metodu: Bildirim güncelleme
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    const notificationId = params.id;
    if (!notificationId) {
      return NextResponse.json({ error: 'Bildirim ID gerekli' }, { status: 400 });
    }

    // İsteği doğrula
    const body = await request.json();
    const validation = UpdateNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz güncelleme verisi', details: validation.error.flatten() }, { status: 400 });
    }

    // Bildirim var mı ve kullanıcıya ait mi kontrol et
    const notification = await db.notification.findUnique({
      where: { 
        id: notificationId,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 });
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Bu bildirimi güncelleme yetkiniz yok' }, { status: 403 });
    }

    // Bildirimi güncelle
    const updatedNotification = await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: validation.data.isRead !== undefined ? validation.data.isRead : notification.isRead,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error);
    return NextResponse.json({ error: 'Bildirim güncellenirken bir hata oluştu' }, { status: 500 });
  }
} 