import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import { addMonths, addYears } from 'date-fns';

export async function POST(req: NextRequest) {
  // Yetkilendirme kontrolü
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // Gelen veriyi al
    const body = await req.json();
    const { merchant_oid } = body;

    if (!merchant_oid) {
      return NextResponse.json({ 
        error: 'Geçersiz istek, ödeme referans kodu eksik',
        success: false
      }, { status: 400 });
    }

    // Özel karakterleri temizle
    const cleanMerchantOid = merchant_oid.replace(/[^a-zA-Z0-9]/g, '');

    // PayTR ayarlarını kontrol et - test modunda olduğundan emin ol
    const odemeAyarlari = await db.odemeAyarlari.findFirst();
    if (!odemeAyarlari || odemeAyarlari.paytrTestMode !== "1") {
      return NextResponse.json({
        error: 'Test modu aktif değil, işlem yapılamadı',
        success: false
      }, { status: 400 });
    }

    console.log('[TEST-PAYMENT] Test ödemesi işleniyor:', cleanMerchantOid);

    // OID'den subscription ID'sini çıkar
    let subscriptionId = cleanMerchantOid;
    
    // CUID genellikle 24-26 karakter uzunluğundadır
    // Alfanumerik ID'nin başındaki muhtemel abonelik ID'sini al
    if (subscriptionId.length > 30) {
      // Tahmini olarak ilk 25 karakteri abonelik ID olarak kabul et
      subscriptionId = subscriptionId.substring(0, 25);
    }

    // OrderXXXX formatında ise son aboneliği bul
    if (subscriptionId.startsWith('ORDER')) {
      const latestSubscription = await db.subscription.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            { status: SubscriptionStatus.PENDING_PAYMENT },
            { status: SubscriptionStatus.INACTIVE }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      if (latestSubscription) {
        subscriptionId = latestSubscription.id;
      } else {
        console.error('[TEST-PAYMENT] Bekleyen abonelik bulunamadı:', merchant_oid);
        return NextResponse.json({ 
          error: 'Bekleyen abonelik bulunamadı',
          success: false
        }, { status: 404 });
      }
    }

    // Transaction ile abonelik ve faturayı güncelle
    try {
      const result = await db.$transaction(async (tx) => {
        // İlgili aboneliği bul
        const subscription = await tx.subscription.findFirst({
          where: { 
            id: subscriptionId,
            userId: session.user.id
          },
          include: {
            plan: true
          }
        });

        if (!subscription) {
          throw new Error(`Abonelik bulunamadı: ${subscriptionId}`);
        }

        // Faturayı bul
        const invoice = await tx.invoice.findFirst({
          where: {
            subscriptionId: subscription.id,
            userId: session.user.id,
            status: InvoiceStatus.PENDING
          },
          orderBy: { createdAt: 'desc' }
        });

        // Dönem başlangıç ve bitiş tarihleri hesaplanıyor
        const currentPeriodStart = new Date();
        let currentPeriodEnd: Date;
        
        if (subscription.billingInterval === 'MONTH') {
          currentPeriodEnd = addMonths(currentPeriodStart, 1);
        } else {
          currentPeriodEnd = addYears(currentPeriodStart, 1);
        }

        // Aboneliği ACTIVE olarak güncelle
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            paymentProvider: 'PayTR (Test)',
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: new Date()
          }
        });

        console.log(`[TEST-PAYMENT] Abonelik "${subscription.id}" ACTIVE olarak güncellendi.`);

        // Eğer fatura yoksa oluştur
        if (!invoice) {
          if (!subscription.plan) {
            throw new Error('Plan bilgisi bulunamadı');
          }
          
          const newInvoice = await tx.invoice.create({
            data: {
              userId: session.user.id,
              subscriptionId: subscription.id,
              planName: subscription.plan.name,
              amount: subscription.billingInterval === 'MONTH' 
                ? subscription.plan.priceMonthly 
                : subscription.plan.priceYearly || 0,
              currency: subscription.plan.currency || 'TRY',
              status: InvoiceStatus.PAID,
              issueDate: new Date(),
              dueDate: new Date(),
              paidAt: new Date(),
              paymentMethod: 'PAYTR (Test)'
            }
          });
          
          console.log(`[TEST-PAYMENT] Yeni fatura oluşturuldu: ${newInvoice.id}`);
        } else {
          // Varolan faturayı güncelle
          const updatedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status: InvoiceStatus.PAID,
              paidAt: new Date(),
              paymentMethod: 'PAYTR (Test)'
            }
          });
          
          console.log(`[TEST-PAYMENT] Fatura "${invoice.id}" PAID olarak güncellendi.`);
        }

        return {
          subscriptionId: subscription.id
        };
      });

      return NextResponse.json({
        success: true,
        message: `Test ödemesi başarıyla işlendi. Abonelik: ${result.subscriptionId}`,
        subscriptionId: result.subscriptionId
      });

    } catch (error: any) {
      console.error('[TEST-PAYMENT] İşlem hatası:', error.message);
      return NextResponse.json({
        error: error.message || 'Abonelik güncellenirken bir hata oluştu',
        success: false
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[TEST-PAYMENT] Genel hata:', error);
    return NextResponse.json({
      error: 'Test ödemesi işlenirken bir hata oluştu',
      success: false
    }, { status: 500 });
  }
} 