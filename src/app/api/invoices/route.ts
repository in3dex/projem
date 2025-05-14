import { NextResponse } from 'next/server';
import { PrismaClient, SubscriptionStatus, InvoiceStatus } from "@prisma/client";
import { auth } from '@/lib/auth/auth';
import { addDays, isBefore, subDays } from 'date-fns';

const prisma = new PrismaClient();
const INVOICE_DUE_DAYS = 7; // Fatura son ödeme tarihi (oluşturulduktan sonraki gün sayısı)
const INVOICE_GENERATION_DAYS_BEFORE_END = 10; // Periyot bitiminden kaç gün önce fatura oluşturulmalı

// Basitleştirilmiş Fatura Oluşturma Mantığı (GET isteği içinde tetiklenecek)
async function generateInvoiceIfNeeded(userId: string, subscriptionId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId, userId: userId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan) return; // Aktif abonelik veya plan yoksa çık

    const nextBillingDate = subscription.currentPeriodEnd;
    const invoiceGenerationDate = subDays(nextBillingDate, INVOICE_GENERATION_DAYS_BEFORE_END);

    // Fatura oluşturma zamanı gelmiş mi? (ve bugün mü?)
    if (isBefore(new Date(), nextBillingDate) && isBefore(invoiceGenerationDate, new Date())) {
      // Bu periyot için zaten ödenmemiş (PENDING/OVERDUE) fatura var mı?
      const existingPendingInvoice = await prisma.invoice.findFirst({
        where: {
          subscriptionId: subscriptionId,
          dueDate: { gte: subscription.currentPeriodStart }, // Bu periyoda ait olmalı
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        },
      });

      if (!existingPendingInvoice) {
        // Fatura oluştur
        const amount = subscription.billingInterval === 'MONTH' 
            ? subscription.plan.priceMonthly 
            : subscription.plan.priceYearly;
        
        if (amount !== null && amount > 0) { // Sadece ücretli planlar için
             await prisma.invoice.create({
                data: {
                    userId: userId,
                    subscriptionId: subscriptionId,
                    planName: subscription.plan.name,
                    amount: amount,
                    currency: 'TRY', // Şimdilik sabit, plan'dan alınabilir
                    status: InvoiceStatus.PENDING,
                    issueDate: new Date(),
                    dueDate: addDays(new Date(), INVOICE_DUE_DAYS),
                    paymentMethod: subscription.paymentMethod, // Abonelikteki yöntemi al
                }
            });
            console.log(`Kullanıcı ${userId} için yeni fatura oluşturuldu (Abonelik: ${subscriptionId})`);
        }
      }
    }
  } catch (error) {
    console.error(`Fatura oluşturma hatası (Kullanıcı: ${userId}, Abonelik: ${subscriptionId}):`, error);
    // Hata durumunda işlemi durdurma, sadece logla
  }
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Aktif aboneliği bul ve gerekirse fatura oluşturmayı tetikle
    const activeSubscription = await prisma.subscription.findFirst({
        where: { userId: userId, status: SubscriptionStatus.ACTIVE }
    });
    if(activeSubscription) {
        await generateInvoiceIfNeeded(userId, activeSubscription.id);
    }
    
    // TODO: Gecikmiş fatura ve abonelik durumunu kontrol etme/güncelleme mantığı eklenebilir

    // Kullanıcının tüm faturalarını al (en yeniden eskiye)
    const invoices = await prisma.invoice.findMany({
      where: { userId: userId },
      orderBy: { issueDate: 'desc' },
      // İlişkili abonelik veya plan bilgisi gerekirse include edilebilir
      // include: { subscription: { select: { plan: { select: { name: true } } } } }
    });

    return NextResponse.json({ invoices });

  } catch (error) {
    console.error("Faturalar alınırken hata:", error);
    return NextResponse.json({ error: 'Sunucu hatası: Faturalar alınamadı.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 