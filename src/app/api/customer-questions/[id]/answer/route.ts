'use server'

import { NextResponse, NextRequest } from 'next/server'
// Eski JWT importları kaldırıldı
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt' 
import { PrismaClient } from '@prisma/client'
import { CustomerQuestionService } from '@/lib/services/customer-question-service'
import { z } from 'zod'
// NextAuth session bilgisini almak için gerekli importlar
import { auth } from '@/lib/auth/auth' // Auth.js (Next Auth v5) import

const prisma = new PrismaClient()

// İstek gövdesi için şema
const bodySchema = z.object({
  answerText: z.string().min(10, "Cevap en az 10 karakter olmalıdır.").max(2000, "Cevap en fazla 2000 karakter olabilir."),
})

// Route parametresi tipi (Doğrudan context objesi içinden alacağız)
// interface RouteParams {
//   params: { id: string }
// }

// export async function POST(request: NextRequest, { params }: RouteParams) {
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  // Auth.js ile session kontrolü
  const session = await auth()

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

  // Next.js v14'de App Router yapısında params objesini güvenli bir şekilde kullanma
  // Hata düzeltildi: params objesi context objesinden alınıyor.
  const { id: questionId } = await context.params;

  if (!questionId) {
      return NextResponse.json({ error: 'Soru ID bilgisi eksik.' }, { status: 400 });
  }

  // İstek gövdesini parse et ve doğrula
  let validatedBody
  try {
    const body = await request.json()
    validatedBody = bodySchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'İstek gövdesi okunamadı' }, { status: 400 })
  }

  const { answerText } = validatedBody

  try {
    // API ayarlarını al (userId session'dan geliyor)
    const apiSettings = await prisma.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      console.warn(`API ayarları bulunamadı, Kullanıcı ID: ${userId}`); 
      return NextResponse.json({ error: 'API ayarları bulunamadı. Lütfen Ayarlar sayfasından bilgilerinizi girin.' }, { status: 400 })
    }

    const questionService = new CustomerQuestionService(userId, apiSettings)

    // Soruyu cevapla
    const updatedQuestion = await questionService.answerQuestion(questionId, answerText)

    // BigInt'i string'e çevirerek döndür
    const serializableQuestion = {
        ...updatedQuestion,
        trendyolQuestionId: updatedQuestion.trendyolQuestionId?.toString(),
        trendyolAnswerId: updatedQuestion.trendyolAnswerId?.toString(),
    };

    return NextResponse.json({ message: 'Soru başarıyla cevaplandı', data: serializableQuestion }, { status: 200 })

  } catch (error) {
    console.error(`[API/MUSTERI_SORULARI_ANSWER_POST] Hata (Soru ID: ${questionId}):`, error)

    // Hatanın TrendyolApiError olup olmadığını ve "zaten cevaplandı" durumunu kontrol et
    if (error instanceof Error && error.name === 'TrendyolApiError' && (error as any).details?.errors?.[0]?.key === 'business.rule.question.has.already.answered') {
      console.warn(`Soru (ID: ${questionId}) zaten Trendyol tarafında cevaplanmış. Yerel veritabanı güncelleniyor.`);
      try {
        // Soruyu veritabanında 'ANSWERED' olarak güncelle
        await prisma.customerQuestion.update({
          where: { id: questionId },
          data: { status: 'ANSWERED' }, // Belki answer ve answeredDate de güncellenebilir?
        });
        // Client'a başarılı yanıt dön, çünkü durum senkronize edildi.
        return NextResponse.json({ message: 'Soru zaten cevaplanmış, durum güncellendi.' }, { status: 200 });
      } catch (dbError) {
        console.error(`[API/MUSTERI_SORULARI_ANSWER_POST] Veritabanı güncelleme hatası (Soru ID: ${questionId}):`, dbError);
        // Veritabanı hatası durumunda yine de genel sunucu hatası dön
        return NextResponse.json({ error: 'Soru zaten cevaplanmış ancak yerel durum güncellenirken hata oluştu.' }, { status: 500 });
      }
    }

    let errorMessage = 'Soru cevaplanırken sunucu hatası oluştu.'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("10 ile 2000 karakter")) {
        errorMessage = error.message
        statusCode = 400
      } else if (error.message.includes("Soru bulunamadi")) {
        errorMessage = error.message
        statusCode = 404
      } else if (error.message.includes("Trendyol ID'si bulunamadi")) {
        errorMessage = "Sorunun Trendyol ile bağlantısında bir sorun var."
        statusCode = 500
      } else if (error.message.includes("Trendyol API")) {
        errorMessage = "Trendyol API ile iletişimde hata oluştu: " + error.message.split(':').pop()?.trim()
        statusCode = 502
      } else if (error.message.includes("API ayarları bulunamadı")) {
        errorMessage = error.message;
        statusCode = 400;
      }
      else if (error.message.includes("bilinmeyen bir hata olustu")) {
         errorMessage = "Soru cevaplanırken bilinmeyen bir sunucu hatası oluştu."; 
         statusCode = 500;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 