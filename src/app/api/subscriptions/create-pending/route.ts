import { NextResponse } from 'next/server';
import { PrismaClient, SubscriptionStatus, BillingInterval, InvoiceStatus, EmailTemplateType } from "@prisma/client";
// import { getAuth } from '@/lib/auth/utils'; // Bu satırı kaldır
import { auth } from '@/lib/auth/auth'; // Doğru auth import'u
import { addMonths, addYears, addDays } from 'date-fns'; // Periyot sonunu hesaplamak için
import { format } from 'date-fns/format'; // format import edildi
import { tr } from 'date-fns/locale/tr'; // Türkçe locale
import { sendTemplatedMail } from '@/lib/email'; // sendTemplatedMail olarak değiştirildi
import { formatCurrency } from '@/lib/utils'; // formatCurrency import edildi

const prisma = new PrismaClient();
const INVOICE_DUE_DAYS = 7; // Fatura son ödeme tarihi (eft için)

export async function POST(request: Request) {
  // const { session } = await getAuth(); // Eski kullanım
  const session = await auth(); // Yeni kullanım

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email; // Kullanıcı e-postası session'dan alınabilir
  const userName = session.user.name; // Kullanıcı adı

  try {
    const body = await request.json();
    const { planId, existingSubscriptionId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID gerekli' }, { status: 400 });
    }

    // 1. Gerekli Plan bilgilerini al
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, priceMonthly: true, priceYearly: true, isActive: true, name: true, currency: true } // Sadece gerekli alanlar ve currency eklendi
    });

    if (!plan || !plan.isActive || (!plan.priceMonthly && !plan.priceYearly) ) {
      return NextResponse.json({ error: 'Geçersiz, aktif olmayan veya ücretsiz plan' }, { status: 400 });
    }

    const now = new Date();
    // Fiyat ve faturalama aralığı seçimi (planın aylık veya yıllık fiyatı varsa ona göre ayarlayın)
    // Şu an sadece aylık fiyatı kullanıyoruz, plan objesi güncellendiğinde burası daha dinamik olabilir.
    const billingInterval = BillingInterval.MONTH; // Varsayılan: Aylık
    const amount = plan.priceMonthly; // Şimdilik sadece aylık fiyatı kullanıyoruz.

    if (amount === null || amount === undefined) {
        console.error(`[CreatePending-Error] Plan ID ${plan.id} için fiyat bulunamadı.`);
        return NextResponse.json({ error: 'Seçilen plan için fiyat bilgisi eksik.' }, { status: 400 });
    }

    // 1. Kullanıcının mevcut aboneliğini bul (durumu ne olursa olsun)
    const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: userId },
        include: {
            invoices: {
                where: { status: InvoiceStatus.PENDING },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            plan: true // Plan bilgilerini de alalım
        }
    });

    let subscriptionResult: { id: string; planId: string; status: SubscriptionStatus; amount: number | null; currency: string } | null = null;
    let invoiceResult: { id: string; amount: number; currency: string; reference: string } | null = null;

    await prisma.$transaction(async (tx) => {
        if (existingSubscription) {
            // Mevcut abonelik bulundu, güncelle
            const updatedSubscription = await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    planId: plan.id, // Yeni planı ata
                    status: SubscriptionStatus.PENDING_PAYMENT, // Durumu ödeme bekleniyor yap
                    billingInterval: billingInterval, // Yeni aralık
                    currentPeriodStart: now, // Yeni dönemi başlat
                    currentPeriodEnd: billingInterval === BillingInterval.MONTH ? addMonths(now, 1) : addYears(now, 1), // Yeni dönem sonu hesapla
                    paymentMethod: 'eft', // Ödeme yöntemi
                    paymentProvider: 'EFT', // Ödeme sağlayıcı
                    // CanceledAt, EndedAt gibi alanları temizlemek gerekebilir duruma göre
                    canceledAt: null,
                    endedAt: null,
                },
                select: { id: true, planId: true, status: true, plan: { select: { priceMonthly: true, currency: true } } }
            });
            subscriptionResult = {
                id: updatedSubscription.id,
                planId: updatedSubscription.planId,
                status: updatedSubscription.status,
                amount: updatedSubscription.plan.priceMonthly,
                currency: updatedSubscription.plan.currency
            };

            // Mevcut bekleyen fatura varsa iptal et (isteğe bağlı, ama temizlik için iyi olabilir)
            // Şu anki logic sadece PENDING olanı alıyor include ile, onu kullanabiliriz.
            // Yeni bir fatura oluşturmak daha temiz olabilir

            // Yeni Fatura Oluştur
            const invoice = await tx.invoice.create({
                data: {
                    userId: userId,
                    subscriptionId: updatedSubscription.id, // Güncellenen abonelik ID'si
                    planName: plan.name,
                    amount: amount, // plan.priceMonthly'den gelen
                    currency: plan.currency || 'TRY',
                    status: InvoiceStatus.PENDING,
                    issueDate: now,
                    dueDate: addDays(now, INVOICE_DUE_DAYS),
                    paymentMethod: 'eft',
                },
                select: { id: true, amount: true, currency: true }
            });
            invoiceResult = {
                id: invoice.id,
                amount: invoice.amount,
                currency: invoice.currency,
                reference: invoice.id.substring(0, 8).toUpperCase()
            };

            console.log(`[CreatePending-Info] Kullanıcının mevcut aboneliği (${existingSubscription.id}) bulundu ve ${updatedSubscription.status} olarak güncellendi. Yeni fatura (${invoiceResult.id}) oluşturuldu.`);

        } else {
            // Mevcut abonelik yok, yeni oluştur
            const subscription = await tx.subscription.create({
                data: {
                    userId: userId,
                    planId: plan.id,
                    status: SubscriptionStatus.PENDING_PAYMENT,
                    billingInterval: billingInterval,
                    currentPeriodStart: now,
                    currentPeriodEnd: billingInterval === BillingInterval.MONTH ? addMonths(now, 1) : addYears(now, 1),
                    paymentMethod: 'eft',
                    paymentProvider: 'EFT',
                },
                select: { id: true, planId: true, status: true, plan: { select: { priceMonthly: true, currency: true } } }
            });
            subscriptionResult = {
                id: subscription.id,
                planId: subscription.planId,
                status: subscription.status,
                amount: subscription.plan.priceMonthly,
                currency: subscription.plan.currency
            };

            const invoice = await tx.invoice.create({
                data: {
                    userId: userId,
                    subscriptionId: subscription.id,
                    planName: plan.name,
                    amount: amount, // plan.priceMonthly'den gelen
                    currency: plan.currency || 'TRY',
                    status: InvoiceStatus.PENDING,
                    issueDate: now,
                    dueDate: addDays(now, INVOICE_DUE_DAYS),
                    paymentMethod: 'eft',
                },
                select: { id: true, amount: true, currency: true }
            });
            invoiceResult = {
                id: invoice.id,
                amount: invoice.amount,
                currency: invoice.currency,
                reference: invoice.id.substring(0, 8).toUpperCase()
            };
            console.log(`[CreatePending-Info] Kullanıcı için yeni abonelik (${subscriptionResult.id}) ve fatura (${invoiceResult.id}) oluşturuldu.`);
        }
    });

    // Transaction sonrası kontrol ve yanıt
    if (!subscriptionResult || !invoiceResult) {
        console.error("[CreatePending-Error] Abonelik veya fatura işlemi transaction başarısız oldu.");
        throw new Error('Abonelik veya fatura işlemi transaction başarısız oldu.');
    }

    // 5. Ödeme Talimatları E-postasını Gönder
    if (userEmail && userName && invoiceResult.reference && activeBankAccounts.length > 0) {
      try {
        await sendTemplatedMail({
          to: userEmail,
          templateType: EmailTemplateType.PAYMENT_INSTRUCTIONS_EFT,
          data: {
            userName: userName || userEmail,
            planName: plan.name,
            amount: formatCurrency(invoiceResult.amount, invoiceResult.currency),
            currency: invoiceResult.currency,
            bankAccountName: activeBankAccounts[0].bankaAdi, 
            iban: activeBankAccounts.map(a => `${a.bankaAdi}: ${a.iban}`).join('<br>'),
            paymentReference: invoiceResult.reference,
            paymentDueDate: format(addDays(now, INVOICE_DUE_DAYS), 'dd MMMM yyyy', { locale: tr }),
          }
        });
        console.log(`[CreatePending-Info] Kullanıcıya ${userEmail} adresine YENİ EFT ödeme talimatları gönderildi.`);
      } catch (emailError) {
        console.error(`[CreatePending-Error] Kullanıcıya ${userEmail} adresine EFT ödeme talimatları GÖNDERİLEMEDİ:`, emailError);
      }
    } else {
      if (!userEmail || !userName) console.warn("[CreatePending-Warn] E-posta veya kullanıcı adı eksik, EFT talimat maili gönderilemedi.");
      if (activeBankAccounts.length === 0 && process.env.SKIP_BANK_ACCOUNT_CHECK) console.warn("[CreatePending-Warn] Aktif banka hesabı yok (atlandı), EFT talimat maili gönderilemedi.");
    }

    return NextResponse.json({
      message: 'Yeni abonelik talebiniz başarıyla oluşturuldu. Ödeme talimatları e-posta adresinize gönderildi.',
      subscription: subscriptionResult,
      invoice: invoiceResult
    }, { status: 201 });

  } catch (error) {
    console.error("[CreatePending-Error] Bekleyen abonelik ve fatura oluşturma hatası:", error);
    return NextResponse.json({ error: 'Sunucu hatası: Abonelik talebi oluşturulamadı.', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 