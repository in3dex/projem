import { NextResponse } from 'next/server';
import { PrismaClient, TicketStatus, TicketPriority } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth/auth'; // Auth.js

const prisma = new PrismaClient();

// Yeni talep için istek gövdesi şeması
const createTicketSchema = z.object({
  subject: z.string().min(5, 'Konu en az 5 karakter olmalıdır.').max(200, 'Konu en fazla 200 karakter olabilir.'),
  initialMessage: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır.').max(5000, 'Mesaj en fazla 5000 karakter olabilir.'),
  priority: z.nativeEnum(TicketPriority).optional(),
});

// POST - Yeni Destek Talebi Oluştur
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json();
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
    }

    const { subject, initialMessage, priority = TicketPriority.MEDIUM } = validation.data;

    // --- Kullanıcı Varlığını Kontrol Et ---
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true } // Sadece varlığını kontrol etmek için id yeterli
    });

    if (!userExists) {
        console.error(`Destek talebi oluşturma hatası: userId ${userId} bulunamadı.`);
        return NextResponse.json({ error: 'İlişkili kullanıcı bulunamadı. Oturumunuzu yenileyin.' }, { status: 400 });
    }
    // --- Kontrol Sonu ---

    // Veritabanında yeni talep ve ilk mesajı oluştur
    const newTicket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        priority,
        status: TicketStatus.OPEN, // Yeni talep her zaman OPEN başlar
        messages: {
          create: {
            userId,
            content: initialMessage,
            isAdminMessage: false, // İlk mesaj kullanıcıdan gelir
          },
        },
      },
      include: {
        messages: true, // Oluşturulan mesajı da döndür
      },
    });

    // --- Bildirim Ekleme Başlangıcı ---
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length > 0) {
            const notificationData = admins.map(admin => ({
                userId: admin.id,
                type: 'GENERAL', // Veya yeni bir NotificationType.NEW_SUPPORT_TICKET ekleyebilirsiniz
                message: `Yeni bir destek talebi (#${newTicket.id.substring(0,8)}) "${subject}" konusuyla oluşturuldu.`,
                relatedId: newTicket.id,
                relatedUrl: `/admin/destek/${newTicket.id}` // Admin paneli linki
            }));
            await prisma.notification.createMany({
                data: notificationData,
                skipDuplicates: true // Aynı bildirim tekrar oluşmasın
            });
        }
    } catch (notificationError) {
        console.error("Adminlere bildirim gönderilirken hata:", notificationError);
        // Bildirim hatası ana işlemi engellememeli
    }
    // --- Bildirim Ekleme Sonu ---

    return NextResponse.json(newTicket, { status: 201 });

  } catch (error) {
    console.error('Destek talebi oluşturma hatası:', error);
    if (error instanceof TypeError && error.message.includes("Cannot read properties of undefined (reading 'MEDIUM')")) {
        return NextResponse.json({ error: 'Sistem hatası: TicketPriority enum değeri yüklenemedi. Lütfen geliştirme sunucusunu yeniden başlatmayı deneyin.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Talep oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}

// GET - Destek Taleplerini Listele
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') as TicketStatus | null;
    const priority = searchParams.get('priority') as TicketPriority | null;
    const searchTerm = searchParams.get('search');

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (!isAdmin) {
      whereClause.userId = userId; // Admin değilse sadece kendi talepleri
    }

    if (status && Object.values(TicketStatus).includes(status)) {
      whereClause.status = status;
    }

    if (priority && Object.values(TicketPriority).includes(priority)) {
        whereClause.priority = priority;
    }

    if (searchTerm) {
        whereClause.OR = [
            { subject: { contains: searchTerm, mode: 'insensitive' } },
            { messages: { some: { content: { contains: searchTerm, mode: 'insensitive' } } } },
            // Admin ise kullanıcı adıyla arama yapabilir
            ...(isAdmin ? [{ user: { name: { contains: searchTerm, mode: 'insensitive' } } }] : []),
            ...(isAdmin ? [{ user: { email: { contains: searchTerm, mode: 'insensitive' } } }] : []),
        ];
    }

    try {
      const tickets = await prisma.supportTicket.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } }, // Kullanıcı bilgisini ekle (Admin için önemli)
          messages: { // Son mesajı veya okunmamış mesaj sayısını almak için optimize edilebilir
             orderBy: { createdAt: 'desc' },
             take: 1 // Sadece en son mesajı alalım (liste görünümü için)
          }
        },
        orderBy: { updatedAt: 'desc' }, // En son güncellenen üste gelsin
        skip,
        take: limit,
      });

      const totalTickets = await prisma.supportTicket.count({ where: whereClause });
      const totalPages = Math.ceil(totalTickets / limit);

      return NextResponse.json({
        tickets,
        currentPage: page,
        totalPages,
        totalTickets,
      });

    } catch (error) {
      console.error('Destek talepleri listeleme hatası:', error);
      return NextResponse.json({ error: 'Talepler listelenirken bir hata oluştu.' }, { status: 500 });
    }
} 