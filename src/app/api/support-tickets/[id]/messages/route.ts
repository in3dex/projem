import { NextResponse } from 'next/server';
import { PrismaClient, TicketStatus, NotificationType } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
// --- Dosya İşlemleri için Gerekli Olabilecek Modüller (Eğer ortam destekliyorsa) ---
import { writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
// --- --- ---

const prisma = new PrismaClient();

// Yeni mesaj için şema artık text içeriyor, dosya formData ile gelecek
const messageContentSchema = z.string().min(1, 'Mesaj boş olamaz.').max(5000, 'Mesaj en fazla 5000 karakter olabilir.');

interface RouteContext {
  params: {
    id: string; // Ticket ID
  };
}

// POST - Destek Talebine Mesaj Ekle (Dosya Yükleme ile)
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const userId = session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const { id: ticketId } = await context.params;

  try {
    const formData = await request.formData();
    const content = formData.get('content') as string | null;
    const files = formData.getAll('attachments') as File[]; // 'attachments' name ile gelen dosyalar

    // İçerik doğrulama
    const contentValidation = messageContentSchema.safeParse(content || ''); // İçerik boş olabilir mi? Şimdilik min(1) zorunlu
    if (!contentValidation.success) {
         return NextResponse.json({ error: 'Geçersiz mesaj içeriği', details: contentValidation.error.flatten() }, { status: 400 });
    }
    const validatedContent = contentValidation.data;

    // 1. Talep var mı ve kullanıcı erişebilir mi kontrol et
    const ticket = await prisma.supportTicket.findUnique({
      where: {
        id: ticketId,
        // Admin değilse sadece kendi talebine mesaj atabilir
        ...(isAdmin ? {} : { userId: userId }),
      },
      select: { id: true, status: true, userId: true }, // Sadece gerekli alanları al
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Destek talebi bulunamadı veya erişim yetkiniz yok.' }, { status: 404 });
    }

    // 2. Kapalı talebe mesaj atılamaz (opsiyonel, admin atabilsin mi?)
    if (ticket.status === TicketStatus.CLOSED && !isAdmin) {
         return NextResponse.json({ error: 'Kapalı destek taleplerine mesaj gönderilemez.' }, { status: 403 });
    }

    // 3. Dosyaları işle ve kaydet (Lokal Depolama)
    const attachmentData: { name: string; url: string }[] = [];
    if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'support-attachments');
        // TODO: Dizin yoksa oluşturma (fs.mkdir(uploadDir, { recursive: true })) - Bu ortamda yapılamayabilir

        for (const file of files) {
            if (file.size === 0 || !file.name) continue; // Boş dosyaları atla
            
            // Güvenlik: Dosya boyutu, tipi kontrolü eklenmeli
            // Örneğin: if (file.size > 5 * 1024 * 1024) continue; // 5MB limit
            // Örneğin: if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) continue;

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileExtension = path.extname(file.name);
            const uniqueFilename = `${randomUUID()}${fileExtension}`;
            const filePath = path.join(uploadDir, uniqueFilename);

            try {
                await writeFile(filePath, buffer);
                attachmentData.push({
                    name: file.name,
                    url: `/uploads/support-attachments/${uniqueFilename}` // Public URL
                });
            } catch (uploadError) {
                console.error(`Dosya yükleme hatası (${file.name}):`, uploadError);
                // Tek dosya hatası tüm işlemi durdurmalı mı? Şimdilik devam ediyor.
            }
        }
    }

    // 4. Yeni mesajı veritabanına kaydet (eklerle birlikte)
    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: userId,
        content: validatedContent,
        isAdminMessage: isAdmin,
        attachments: attachmentData.length > 0 ? attachmentData : undefined, // JSON olarak kaydet
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, role: true } }
      }
    });

    // 5. Talebin durumunu güncelle (eğer kullanıcı mesaj attıysa ve durum PENDING_USER ise OPEN yap, admin mesaj attıysa IN_PROGRESS?)
    let newStatus = ticket.status;
    if (isAdmin && ticket.status === TicketStatus.OPEN) {
        newStatus = TicketStatus.IN_PROGRESS;
    }
    // Eğer admin cevapladıysa ve durum PENDING_USER ise IN_PROGRESS yapalım?
    if (isAdmin && ticket.status === TicketStatus.PENDING_USER) {
        newStatus = TicketStatus.IN_PROGRESS;
    }
    // Eğer kullanıcı cevapladıysa ve durum PENDING_USER veya IN_PROGRESS ise OPEN yapalım?
    if (!isAdmin && (ticket.status === TicketStatus.PENDING_USER || ticket.status === TicketStatus.IN_PROGRESS)) {
        newStatus = TicketStatus.OPEN;
    }
    // Admin bir talebi kapatıp tekrar mesaj atarsa?
    if (isAdmin && ticket.status === TicketStatus.CLOSED) {
        newStatus = TicketStatus.IN_PROGRESS; // Tekrar açalım
    }

    await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
            updatedAt: new Date(), // Son güncelleme zamanını ayarla
            status: newStatus
        }
    });

    // --- Bildirim Gönderme Başlangıcı ---
    try {
        const recipientUserId = isAdmin ? ticket.userId : null; // Admin yazdıysa kullanıcıya
        const messagePreview = validatedContent.substring(0, 50) + (validatedContent.length > 50 ? '...' : '');

        if (recipientUserId) { // Kullanıcıya bildirim
            await prisma.notification.create({
                data: {
                    userId: recipientUserId,
                    type: NotificationType.GENERAL, // Enum kullanıldı
                    message: `Destek talebinize (#${ticket.id.substring(0,8)}) yeni bir yanıt geldi: "${messagePreview}"`,
                    relatedId: ticket.id,
                    relatedUrl: `/dashboard/destek/${ticket.id}` // Dashboard linki
                }
            });
        } else if (!isAdmin) { // Kullanıcı yazdıysa adminlere bildirim
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            if (admins.length > 0) {
                const notificationData = admins.map(admin => ({
                    userId: admin.id,
                    type: NotificationType.GENERAL, // Enum kullanıldı
                    message: `"${session?.user?.name || 'Kullanıcı'}" adlı kullanıcıdan destek talebine (#${ticket.id.substring(0,8)}) yeni yanıt: "${messagePreview}"`,
                    relatedId: ticket.id,
                    relatedUrl: `/admin/destek/${ticket.id}` // Admin paneli linki
                }));
                await prisma.notification.createMany({
                    data: notificationData,
                    skipDuplicates: true
                });
            }
        }
    } catch (notificationError) {
        console.error("Mesaj sonrası bildirim gönderilirken hata:", notificationError);
        // Bildirim hatası ana işlemi engellememeli
    }
    // --- Bildirim Gönderme Sonu ---

    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error('Destek mesajı ekleme hatası:', error);
    return NextResponse.json({ error: 'Mesaj eklenirken bir hata oluştu.' }, { status: 500 });
  }
} 