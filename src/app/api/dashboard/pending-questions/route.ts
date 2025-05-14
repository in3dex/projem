import { NextResponse } from 'next/server';
import { PrismaClient, CustomerQuestion } from '@prisma/client'; // Doğru import
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import

// Frontend'deki arayüzle eşleşen tip
interface PendingQuestion {
  id: string;
  trendyolQuestionId: string; // BigInt'i string olarak göndereceğiz
  questionText: string;
  productName: string;
  customerName?: string | null; // Schema'da nullable idi
  askedDate: string; // ISO string formatında
}

// Prisma sorgusunun döndüreceği tip (select ile)
type QuestionInfo = Pick<CustomerQuestion, 'id' | 'trendyolQuestionId' | 'questionText' | 'productName' | 'customerName' | 'askedDate'>;

export async function GET() {
  const prisma = new PrismaClient(); // Instance oluştur
  const session = await auth(); // Auth.js ile session alma

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Prisma sorgusunun döndüreceği tipi belirtelim
    const questions: QuestionInfo[] = await prisma.customerQuestion.findMany({
      where: {
        userId: userId,
        status: 'WAITING_FOR_ANSWER', // Veya API'nizdeki bekleyen durum kodu
      },
      take: 5, // Son 5 soru
      orderBy: {
        askedDate: 'desc', // Tarihe göre azalan sıralama
      },
      select: { // Sadece gerekli alanları seç
        id: true,
        trendyolQuestionId: true, // BigInt olarak gelecek
        questionText: true,
        productName: true,
        customerName: true, // showUserName'e göre API'da null gelebilir
        askedDate: true, // Date olarak gelecek
      }
    });

    // Veriyi frontend formatına dönüştür (BigInt'i string'e çevir)
    // q parametresine tipi belirtelim
    const pendingQuestions: PendingQuestion[] = questions.map((q: QuestionInfo) => ({
      id: q.id,
      trendyolQuestionId: q.trendyolQuestionId.toString(), // JSON uyumluluğu için BigInt -> String
      questionText: q.questionText,
      productName: q.productName,
      customerName: q.customerName,
      askedDate: q.askedDate.toISOString(), // Date -> ISO String
    }));

    // Frontend'deki API yanıtı { content: [...] } şeklinde bekleniyordu.
    // Sadece pendingQuestions dizisini döndürüyoruz. Frontend'i güncelleyeceğiz.
    return NextResponse.json(pendingQuestions); 

  } catch (error) {
    console.error("Pending questions error:", error);
    return NextResponse.json({ error: 'Bekleyen sorular alınırken bir hata oluştu.' }, { status: 500 });
  }
} 