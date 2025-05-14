import { NextResponse } from 'next/server';
import { PrismaClient, TicketStatus, TicketPriority } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// Güncelleme için istek gövdesi şeması (Admin)
const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

interface RouteContext {
  params: {
    id: string;
  };
}

// GET - Belirli Bir Destek Talebini Getir
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const userId = session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const { id: ticketId } = await context.params;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: {
        id: ticketId,
        // Admin değilse sadece kendi talebini görebilir
        ...(isAdmin ? {} : { userId: userId }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        messages: {
          orderBy: { createdAt: 'asc' }, // Mesajları eskiden yeniye sırala
          include: {
            user: { select: { id: true, name: true, email: true, image: true, role: true } }, // Mesajı gönderenin bilgisi
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Destek talebi bulunamadı veya erişim yetkiniz yok.' }, { status: 404 });
    }

    // TODO: Kullanıcı talebi okudu olarak işaretleyebilir miyiz?

    return NextResponse.json(ticket);

  } catch (error) {
    console.error('Destek talebi getirme hatası:', error);
    return NextResponse.json({ error: 'Talep getirilirken bir hata oluştu.' }, { status: 500 });
  }
}

// PUT - Destek Talebini Güncelle (Admin Only)
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
  }
  const { id: ticketId } = await context.params;

  try {
    const body = await request.json();
    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
    }

    const { status, priority } = validation.data;

    if (!status && !priority) {
        return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi.' }, { status: 400 });
    }

    const updateData: { status?: TicketStatus; priority?: TicketPriority } = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // --- Bildirim Gönderme Başlangıcı ---
    try {
      // Güncellenen talebin sahibini bul
      const ticketOwner = await prisma.supportTicket.findUnique({
          where: { id: ticketId },
          select: { userId: true }
      });

      if (ticketOwner) {
          let message = `Destek talebiniz (#${ticketId.substring(0,8)})`;
          if (status) {
              message += ` durumu "${statusVariant[status]?.text || status}" olarak güncellendi.`;
          }
          if (priority) {
              // Öncelik değişikliği için ayrı bir mesaj veya mevcut mesaja ekleme yapılabilir.
              // Şimdilik sadece durum değişikliğini bildiriyoruz.
              // message += ` önceliği "${priorityVariant[priority]?.text || priority}" olarak güncellendi.`;
          }
          // Sadece status değiştiyse veya her ikisi de değiştiyse bildirim gönderelim
          if (status) { 
              await prisma.notification.create({
                  data: {
                      userId: ticketOwner.userId,
                      type: NotificationType.GENERAL, // Veya NotificationType.SUPPORT_STATUS_UPDATE
                      message: message,
                      relatedId: ticketId,
                      relatedUrl: `/dashboard/destek/${ticketId}` // Kullanıcı dashboard linki
                  }
              });
          }
      }
    } catch (notificationError) {
        console.error("Durum güncelleme sonrası bildirim gönderilirken hata:", notificationError);
    }
    // --- Bildirim Gönderme Sonu ---

    return NextResponse.json(updatedTicket);

  } catch (error) {
    console.error('Destek talebi güncelleme hatası:', error);
    // Prisma'nın not found hatasını yakala
    if ((error as any).code === 'P2025') { 
        return NextResponse.json({ error: 'Güncellenecek destek talebi bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Talep güncellenirken bir hata oluştu.' }, { status: 500 });
  }
} 