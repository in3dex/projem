import { NextResponse } from 'next/server';
import { PrismaClient, SubscriptionStatus, InvoiceStatus, BillingInterval, Prisma } from "@prisma/client";
import { auth } from '@/lib/auth/auth';
import { addMonths, addYears } from 'date-fns';
import { sendMail } from '@/lib/email';
import { formatCurrency } from '@/lib/utils';

const prisma = new PrismaClient();

// Faturayı 'Ödendi' veya 'İptal Edildi' olarak işaretle
export async function PATCH(
  request: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
  }

  const { invoiceId } = params;
  if (!invoiceId) {
    return NextResponse.json({ error: 'Fatura ID gerekli' }, { status: 400 });
  }

  let status: InvoiceStatus;
  try {
    const body = await request.json();
    if (body.status !== InvoiceStatus.PAID && body.status !== InvoiceStatus.CANCELED) {
       return NextResponse.json({ error: 'Geçersiz durum değeri. Sadece PAID veya CANCELED kabul edilir.' }, { status: 400 });
    }
    status = body.status;
  } catch (e) {
    return NextResponse.json({ error: 'Geçersiz istek body' }, { status: 400 });
    }

  try {
    // Önce fatura ve ilişkili verileri çek
    const invoiceToUpdate = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
          subscription: { include: { plan: true } }, // Abonelik ve plan bilgisi dahil edildi
          user: { select: { email: true, name: true } } 
        }
    });

    if (!invoiceToUpdate) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 });
    }

    // Sadece PENDING veya OVERDUE durumundaki faturalar güncellenebilir
    if (invoiceToUpdate.status !== InvoiceStatus.PENDING && invoiceToUpdate.status !== InvoiceStatus.OVERDUE) {
      return NextResponse.json({ error: `Bu faturanın durumu (${invoiceToUpdate.status}) ${status} olarak değiştirilemez.` }, { status: 400 });
    }

    // Abonelik bilgisi kontrolü
    if (!invoiceToUpdate.subscription || !invoiceToUpdate.subscriptionId) {
      return NextResponse.json({ error: 'Bu fatura herhangi bir abonelikle ilişkilendirilmemiş.' }, { status: 400 });
    }

    // İşlem türüne göre farklı akışlar
    if (status === InvoiceStatus.PAID) {
      // --- ÖDEME ONAY AKIŞI ---
      console.log(`[Approve/PAID] Fatura ${invoiceId} ödendi olarak işaretleniyor...`);
      
      // Transaction başlat: Hem fatura hem abonelik aynı anda güncellenmeli
      const [updatedInvoice, updatedSubscription] = await prisma.$transaction(async (tx) => {
        // 1. Faturayı PAID olarak güncelle
        const currentUpdatedInvoice = await tx.invoice.update({
            where: { id: invoiceId },
          data: { 
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
            paymentMethod: 'ADMIN_APPROVE' // Manuel onay
          },
        });

        // 2. Aboneliği aktif et veya durumunu koru
        let currentUpdatedSubscription = invoiceToUpdate.subscription;
        const now = new Date();
        
        // Abonelik PENDING_PAYMENT veya INACTIVE ise aktif et
        if (
          invoiceToUpdate.subscription.status === SubscriptionStatus.PENDING_PAYMENT || 
          invoiceToUpdate.subscription.status === SubscriptionStatus.INACTIVE
        ) {
          console.log(`[Approve/PAID] Abonelik ${invoiceToUpdate.subscriptionId} aktif ediliyor...`);
          
          // Dönem başlangıç ve bitiş tarihleri hesaplanıyor
          const currentPeriodStart = now;
          let currentPeriodEnd: Date;
          
          if (invoiceToUpdate.subscription.billingInterval === BillingInterval.MONTH) {
            currentPeriodEnd = addMonths(currentPeriodStart, 1);
          } else {
            currentPeriodEnd = addYears(currentPeriodStart, 1);
          }
          
          currentUpdatedSubscription = await tx.subscription.update({
            where: { id: invoiceToUpdate.subscriptionId },
            data: {
            status: SubscriptionStatus.ACTIVE,
              currentPeriodStart,
              currentPeriodEnd,
              paymentProvider: 'ADMIN',
          },
        });
          
          console.log(`[Approve/PAID] Abonelik ${invoiceToUpdate.subscriptionId} aktif edildi. Dönem: ${currentPeriodStart.toISOString()} - ${currentPeriodEnd.toISOString()}`);
        }
        
        return [currentUpdatedInvoice, currentUpdatedSubscription];
      });

      // İşlem sonrası kullanıcıya bilgilendirme e-postası (opsiyonel)
    const user = invoiceToUpdate.user;
    if (user && user.email) {
         console.log(`[EMAIL] Kullanıcıya fatura ödeme onayı gönderiliyor: ${user.email}`);
        try {
          await sendMail({
            to: user.email,
            subject: `✅ #${invoiceId.substring(0,8)} Numaralı Faturanız Ödendi!`, 
            html: `
              <p>Merhaba ${user.name || ''},</p>
              <p><b>${formatCurrency(invoiceToUpdate.amount, invoiceToUpdate.currency)}</b> tutarındaki <b>#${invoiceId.substring(0,8)}</b> numaralı faturanız başarıyla ödenmiştir.</p>
              ${updatedSubscription.status === SubscriptionStatus.ACTIVE ? 
                `<p>Aboneliğiniz <strong>${updatedSubscription.currentPeriodEnd.toLocaleDateString('tr-TR')}</strong> tarihine kadar aktiftir.</p>` : 
                ''}
              <p>Teşekkürler,<br/>Projem Ekibi</p>
            `,
          });
        } catch (emailError) {
          console.error(`[EMAIL] E-posta gönderme hatası:`, emailError);
          // E-posta hatasını yok say, işlemi tamamla
        }
      } else {
        console.warn(`[EMAIL] Kullanıcı bulunamadı veya e-postası yok, fatura ödeme onayı gönderilemedi: User ID ${invoiceToUpdate.userId}`);
      }
      
      console.log(`[ADMIN] Fatura ${invoiceId} ödendi olarak işaretlendi, Abonelik ${updatedSubscription.id} güncellendi.`);
      return NextResponse.json({ 
        success: true,
        invoice: updatedInvoice, 
        subscription: updatedSubscription 
        });
    } else {
      // --- ÖDEME REDDİ AKIŞI ---
      console.log(`[Reject/CANCELED] Fatura ${invoiceId} iptal ediliyor...`);
      
      // Transaction başlat: Hem fatura hem abonelik aynı anda güncellenmeli
      const [rejectedInvoice, updatedSubscription] = await prisma.$transaction(async (tx) => {
        // 1. Faturayı CANCELED olarak güncelle
        const currentRejectedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: { 
            status: InvoiceStatus.CANCELED,
            updatedAt: new Date()
          },
        });

        // 2. İlişkili aboneliği güncelle (sadece PENDING_PAYMENT ise)
        let currentUpdatedSubscription = invoiceToUpdate.subscription;
        if (invoiceToUpdate.subscription.status === SubscriptionStatus.PENDING_PAYMENT) {
          console.log(`[Reject/CANCELED] İlişkili PENDING_PAYMENT abonelik (${invoiceToUpdate.subscriptionId}) iptal ediliyor...`);
          
          currentUpdatedSubscription = await tx.subscription.update({
            where: { id: invoiceToUpdate.subscriptionId },
            data: { 
              status: SubscriptionStatus.CANCELED, 
              canceledAt: new Date(),
            },
          });
          
          console.log(`[Reject/CANCELED] İlişkili abonelik (${invoiceToUpdate.subscriptionId}) iptal edildi.`);
        }
        
        return [currentRejectedInvoice, currentUpdatedSubscription];
      });

      // Kullanıcıya bilgilendirme e-postası (opsiyonel)
      const user = invoiceToUpdate.user;
      if (user && user.email) {
        console.log(`[EMAIL] Kullanıcıya fatura iptal bildirimi gönderiliyor: ${user.email}`);
        try {
          await sendMail({
            to: user.email,
            subject: `❌ #${invoiceId.substring(0,8)} Numaralı Faturanız İptal Edildi`, 
            html: `
              <p>Merhaba ${user.name || ''},</p>
              <p><b>${formatCurrency(invoiceToUpdate.amount, invoiceToUpdate.currency)}</b> tutarındaki <b>#${invoiceId.substring(0,8)}</b> numaralı faturanız iptal edilmiştir.</p>
              <p>Daha fazla bilgi için lütfen müşteri hizmetleri ile iletişime geçin.</p>
              <p>Teşekkürler,<br/>Projem Ekibi</p>
            `,
          });
        } catch (emailError) {
          console.error(`[EMAIL] E-posta gönderme hatası:`, emailError);
          // E-posta hatasını yok say, işlemi tamamla
        }
      }
      
      console.log(`[ADMIN] Fatura ${invoiceId} iptal edildi, İlişkili abonelik durumu: ${updatedSubscription.status}`);
      return NextResponse.json({ 
        success: true,
        invoice: rejectedInvoice, 
        subscription: updatedSubscription 
      });
    }
  } catch (error: any) {
    console.error(`[ADMIN] Fatura işleme hatası (${params.invoiceId}):`, error);
    const errorMessage = error.message || 'Fatura güncellenirken bir hata oluştu';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 