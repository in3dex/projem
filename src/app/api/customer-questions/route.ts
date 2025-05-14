'use server'

import { NextResponse, NextRequest } from 'next/server'
// Eski JWT importları kaldırıldı
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt' 
import { PrismaClient } from '@prisma/client' 
import { CustomerQuestionService } from '@/lib/services/customer-question-service'
import { z } from 'zod'
// NextAuth session bilgisini almak için gerekli importlar
// import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Hatalı import kaldırıldı
// import { getServerSession } from "next-auth/next" // Hatalı import kaldırıldı
import { auth } from '@/lib/auth/auth'; // Doğru auth import'u
import { SubscriptionStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Sorgu parametreleri için şema
const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  size: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.string().optional(),
  searchTerm: z.string().optional(),
  sync: z.enum(['true', 'false']).optional().default('false'),
})

export async function GET(request: NextRequest) { 
  // NextAuth ile session kontrolü
  // const session = await getServerSession(authOptions) // Eski kullanım
  const session = await auth(); // Yeni kullanım

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const userId = session.user.id; // Session'dan userId'yi al

  // Eski token doğrulama kodları kaldırıldı
  /*
  const token = getTokenFromCookie(request.headers.get('cookie') || '');
  if (!token) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: 'Geçersiz veya eksik token' }, { status: 401 });
  }
  const userId = payload.userId;
  */

  const { searchParams } = new URL(request.url)

  // Sorgu parametrelerini doğrula ve parse et
  const parseResult = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Geçersiz sorgu parametreleri', details: parseResult.error.errors }, { status: 400 })
  }

  const { page, size, status, searchTerm, sync } = parseResult.data

  try {
    // ---------- YENİ: Abonelik Kontrolü Başlangıç ----------
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true } // Sadece durumu kontrol etmek yeterli
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      console.warn(`Kullanıcı ${userId} için aktif abonelik bulunamadı. Müşteri soruları senkronizasyonu engellendi.`);
      // Senkronizasyon isteği ise hata döndür
      if (sync) { 
          return NextResponse.json({
            error: 'Aktif Abonelik Gerekli',
            details: 'Bu işlemi gerçekleştirmek için aktif bir aboneliğe sahip olmanız gerekmektedir.'
          }, { status: 402 }); 
      } 
    }
    // ---------- YENİ: Abonelik Kontrolü Bitiş ----------

    // API ayarlarını al (userId session'dan geliyor)
    const apiSettings = await prisma.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      console.warn(`API ayarları bulunamadı, Kullanıcı ID: ${userId}`); 
      return NextResponse.json({ error: 'API ayarları bulunamadı. Lütfen Ayarlar sayfasından bilgilerinizi girin.' }, { status: 400 })
    }

    const questionService = new CustomerQuestionService(userId, apiSettings)

    // Senkronizasyon istenmişse ve abonelik aktifse yap
    if (sync && subscription?.status === SubscriptionStatus.ACTIVE) {
      console.log('Müşteri soruları senkronizasyonu başlatılıyor...')
      // Yeni eklediğimiz fonksiyonu kullan: Tüm soru tiplerini senkronize et
      if (status) {
        // Belirli bir durum için senkronizasyon istenirse
      const syncResult = await questionService.syncCustomerQuestions({ page: 0, size: 50, status: status })
      console.log(`Senkronizasyon tamamlandı: ${syncResult.syncedCount} soru işlendi.`)
      } else {
        // Durum belirtilmemişse tüm soru tiplerini senkronize et
        const syncResult = await questionService.syncAllQuestionTypes()
        console.log(`Tam senkronizasyon tamamlandı: ${syncResult.totalSynced} soru işlendi.`)
      }
    }

    // Veritabanından soruları al
    const { questions, totalCount } = await questionService.getCustomerQuestionsFromDb({
      page,
      size,
      status,
      searchTerm,
    })

    // BigInt alanlarını string'e çevir
    const serializableQuestions = questions.map(q => ({
      ...q,
      trendyolQuestionId: q.trendyolQuestionId?.toString(),
      trendyolAnswerId: q.trendyolAnswerId?.toString(),
    }));

    const totalPages = Math.ceil(totalCount / size)

    return NextResponse.json({
      data: serializableQuestions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: size,
      },
    })

  } catch (error) {
    console.error('[API/MUSTERI_SORULARI_GET] Hata:', error)
    let errorMessage = 'Müşteri soruları alınırken sunucu hatası oluştu.'
    let statusCode = 500

    if (error instanceof Error) {
        if (error.message.includes("Trendyol") || 
            error.message.includes("senkronizasyonu başarısız")) { 
             errorMessage = error.message 
             statusCode = 502 // Hata Trendyol kaynaklıysa veya senkronizasyon başarısızsa
         } else if (error.message.includes("API ayarları bulunamadı")) {
             errorMessage = error.message;
             statusCode = 400;
         }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 