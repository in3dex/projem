import { NextResponse } from 'next/server';
import { PrismaClient, SubscriptionStatus, InvoiceStatus, EmailTemplateType, AutomationSettings } from "@prisma/client";
import { addDays, isBefore, subDays, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { sendMail, sendTemplatedMail } from '@/lib/email';
import { formatCurrency } from '@/lib/utils';

const prisma = new PrismaClient();

// Bu endpoint'in güvenliği önemli. Sadece belirli bir token/secret ile veya belirli IP'lerden çağrılmalı.
// Örneğin, request header'ında bir `Authorization: Bearer YOUR_CRON_SECRET` kontrolü yapılabilir.
export async function POST(request: Request) {
  // Güvenlik Kontrolü (Örnek: Basit bir secret kontrolü)
  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
     return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  console.log('[CRON] Fatura ve Abonelik İşlemleri Başlatıldı...');
  let generatedInvoiceCount = 0;
  let markedOverdueCount = 0;
  let canceledSubscriptionCount = 0;

  try {
    // --- Ayarları Veritabanından Oku ---
    let settings = await prisma.automationSettings.findUnique({
        where: { id: "singleton"}
    });
    // Eğer ayar yoksa veya eksikse, varsayılan değerleri kullan veya hata fırlat
    if (!settings) {
         console.warn("[CRON] Otomasyon ayarları bulunamadı, varsayılan değerler kullanılıyor (veya oluşturulacak).");
         // İlk çalıştırmada varsayılanlarla oluştur
         settings = await prisma.automationSettings.upsert({
             where: { id: "singleton" },
             update: {}, // Mevcutsa güncelleme yapma
             create: { id: "singleton" } // Şemadaki varsayılanları kullanır
         });
    }
     // Okunan veya oluşturulan ayarları kullan
     const INVOICE_GENERATION_DAYS_BEFORE_END = settings.invoiceGenerationDaysBeforeEnd;
     const INVOICE_DUE_DAYS = settings.invoiceDueDays;
     const OVERDUE_DAYS_THRESHOLD = settings.overdueMarkDays;
     const CANCEL_SUBSCRIPTION_AFTER_OVERDUE_DAYS = settings.cancelSubscriptionAfterOverdueDays;

    // --- Yeni Fatura Oluşturma --- 
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true, user: { select: { email: true, name: true } } },
    });

    for (const sub of activeSubscriptions) {
      const nextBillingDate = sub.currentPeriodEnd;
      // Ayarlardan okunan değeri kullan
      const invoiceGenerationDate = subDays(nextBillingDate, INVOICE_GENERATION_DAYS_BEFORE_END);

      // Fatura oluşturma zamanı gelmiş mi?
      if (isBefore(invoiceGenerationDate, new Date()) && isBefore(new Date(), nextBillingDate)) {
         // Bu periyot için zaten ödenmemiş fatura var mı?
          const existingPendingInvoice = await prisma.invoice.findFirst({
            where: {
            subscriptionId: sub.id,
            // Yeni fatura dönemi başlangıcı (eski bitiş tarihi)
            issueDate: { gte: sub.currentPeriodEnd }, 
            status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
            },
         });
         
         if (!existingPendingInvoice) {
            const amount = sub.billingInterval === 'MONTH' ? sub.plan.priceMonthly : sub.plan.priceYearly;
            if (amount !== null && amount > 0 && sub.user && sub.user.email) {
                const newInvoice = await prisma.invoice.create({
                    data: {
                        userId: sub.userId,
                        subscriptionId: sub.id,
                        planName: sub.plan.name,
                        amount: amount,
                        currency: 'TRY', 
                        status: InvoiceStatus.PENDING,
                        issueDate: new Date(), // Oluşturma tarihi
                        // Ayarlardan okunan değeri kullan
                        dueDate: addDays(new Date(), INVOICE_DUE_DAYS), 
                        paymentMethod: sub.paymentMethod,
                    },
                    select: { id: true, dueDate: true }
                });
                generatedInvoiceCount++;
                console.log(`[CRON] Yeni fatura oluşturuldu: ${newInvoice.id}, Kullanıcı ${sub.userId}`);
                
                // Kullanıcıya yeni fatura e-postası gönder
                const user = sub.user;
                const invoiceRef = newInvoice.id.substring(0, 8);
                await sendMail({
                    to: user.email!,
                    subject: `🧾 Yeni Faturanız Oluşturuldu: #${invoiceRef}`,
                    html: `
                        <p>Merhaba ${user.name || ''},</p>
                        <p><b>${sub.plan.name}</b> aboneliğiniz için yeni faturanız oluşturulmuştur.</p>
                        <p><b>Fatura Numarası:</b> #${invoiceRef}</p>
                        <p><b>Tutar:</b> ${formatCurrency(amount, 'TRY')}</p>
                        <p><b>Son Ödeme Tarihi:</b> ${newInvoice.dueDate.toLocaleDateString('tr-TR')}</p>
                        <p>Faturanızı görüntülemek ve ödemek için lütfen hesabınıza giriş yapın:</p>
                        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ayarlar/faturalarim">Faturalarım Sayfasına Git</a></p>
                        <p>Teşekkürler,<br/>Projem Ekibi</p>
                    `,
                });
                 console.log(`[EMAIL] Yeni fatura bildirimi gönderildi: ${user.email}`);
            }
         }
      }
    }

    // --- Gecikmiş Faturaları İşaretleme --- 
    const pendingInvoices = await prisma.invoice.findMany({
      where: { 
        status: InvoiceStatus.PENDING, 
        // Ayarlardan okunan değeri kullan
        dueDate: { lt: subDays(new Date(), OVERDUE_DAYS_THRESHOLD) }
      },
      include: { user: { select: { email: true, name: true } } }
    });

    for (const invoice of pendingInvoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.OVERDUE }
      });
      markedOverdueCount++;
      console.log(`[CRON] Fatura gecikti olarak işaretlendi: ${invoice.id}, Kullanıcı: ${invoice.userId}`);
      
      // Kullanıcıya ödemenin geciktiği e-postasını gönder
      if (invoice.user && invoice.user.email) {
        const user = invoice.user;
        const invoiceRef = invoice.id.substring(0, 8);
        await sendMail({
            to: user.email!,
            subject: `❗️ #${invoiceRef} Numaralı Faturanızın Ödemesi Gecikti`,
            html: `
                <p>Merhaba ${user.name || ''},</p>
                <p><b>#${invoiceRef}</b> numaralı faturanızın son ödeme tarihi (${invoice.dueDate.toLocaleDateString('tr-TR')}) geçmiştir.</p>
                <p>Aboneliğinizin kesintiye uğramaması için lütfen en kısa sürede ödemenizi yapınız.</p>
                <p><b>Tutar:</b> ${formatCurrency(invoice.amount, invoice.currency)}</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ayarlar/faturalarim">Faturalarınızı Görüntüleyin ve Ödeyin</a></p>
                <p>Teşekkürler,<br/>Projem Ekibi</p>
            `,
        });
         console.log(`[EMAIL] Gecikmiş fatura bildirimi gönderildi: ${user.email}`);
      }
    }

    // --- Çok Gecikmiş Faturalar ve Abonelik İptali ---
    const overdueInvoicesToCancel = await prisma.invoice.findMany({
       where: {
          status: InvoiceStatus.OVERDUE,
          // Ayarlardan okunan değerleri kullan
          dueDate: { lt: subDays(new Date(), OVERDUE_DAYS_THRESHOLD + CANCEL_SUBSCRIPTION_AFTER_OVERDUE_DAYS) }
       },
       select: { id: true, subscriptionId: true, userId: true, subscription: { include: { user: { select: { email: true, name: true } } } } }
    });

    for (const invoice of overdueInvoicesToCancel) {
        if (!invoice.subscription?.user?.email) continue;

        const user = invoice.subscription.user;
        const invoiceRef = invoice.id.substring(0, 8);
        const subscriptionId = invoice.subscriptionId;

        // Transaction içinde yapalım
        await prisma.$transaction([
           prisma.subscription.update({
              where: { id: subscriptionId },
              data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() }
           }),
           prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: InvoiceStatus.CANCELED }
           })
        ]);
        
        canceledSubscriptionCount++;
        console.log(`[CRON] Abonelik iptal edildi (gecikmiş ödeme): ${subscriptionId}, Fatura: ${invoice.id}, Kullanıcı: ${invoice.userId}`);
        
        // Kullanıcıya aboneliğin iptal edildiği e-postasını gönder
        try {
             const updatedSubscriptionData = await prisma.subscription.findUnique({
                 where: { id: subscriptionId },
                 select: { plan: { select: { name: true } }, canceledAt: true, currentPeriodEnd: true }
             });

             if (updatedSubscriptionData) {
                 await sendTemplatedMail({
                     to: user.email!,
                     templateType: EmailTemplateType.SUBSCRIPTION_CANCELED,
                     data: {
                         userName: user.name || user.email,
                         planName: updatedSubscriptionData.plan.name,
                         cancelDate: updatedSubscriptionData.canceledAt ? format(updatedSubscriptionData.canceledAt, 'dd MMMM yyyy', { locale: tr }) : 'Bilinmiyor',
                         // currentPeriodEnd aslında aboneliğin son aktif kalacağı tarih
                         endDate: format(updatedSubscriptionData.currentPeriodEnd, 'dd MMMM yyyy', { locale: tr }) 
                     }
                 });
                 console.log(`[EMAIL] Abonelik iptal bildirimi (şablonlu) gönderildi: ${user.email}`);
            } else {
                 console.error(`[EMAIL] Abonelik verisi bulunamadı, iptal e-postası gönderilemedi: ${subscriptionId}`);
            }
        } catch (emailError) {
             console.error(`[EMAIL] Abonelik iptal bildirimi (şablonlu) GÖNDERİLEMEDİ: ${user.email}`, emailError);
        }
    }

    // --- Yaklaşan Ödeme Hatırlatma --- (Opsiyonel, eklenebilir)
    // TODO: Son ödeme tarihi X gün kalan PENDING faturaları bulup hatırlatma gönder.

    console.log(`[CRON] İşlem Tamamlandı: ${generatedInvoiceCount} fatura oluşturuldu, ${markedOverdueCount} fatura gecikti, ${canceledSubscriptionCount} abonelik iptal edildi.`);
    return NextResponse.json({ 
      message: 'Fatura ve abonelik işlemleri tamamlandı.',
      generatedInvoices: generatedInvoiceCount,
      markedOverdue: markedOverdueCount,
      canceledSubscriptions: canceledSubscriptionCount
     });

  } catch (error) {
    console.error("[CRON] Fatura/Abonelik işleme hatası:", error);
    return NextResponse.json({ error: 'Cron job sırasında sunucu hatası oluştu.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 