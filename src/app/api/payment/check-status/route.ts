import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { InvoiceStatus, SubscriptionStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  
  // Yetkilendirme kontrolü
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // URL'den ödeme referans kodunu al
    const url = new URL(req.url);
    const merchantOid = url.searchParams.get('oid');

    if (!merchantOid) {
      return NextResponse.json({ 
        error: 'Geçersiz istek, ödeme referans kodu eksik'
      }, { status: 400 });
    }

    // OID'den subscription ID'sini çıkar (son 8 karakteri ayır)
    let subscriptionId = merchantOid;
    if (merchantOid.length > 8) {
      subscriptionId = merchantOid.substring(0, merchantOid.length - 8);
    }

    // OrderXXXX formatında ise son aboneliği bul
    if (subscriptionId.startsWith('ORDER')) {
      const latestSubscription = await db.subscription.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            { status: SubscriptionStatus.ACTIVE },
            { status: SubscriptionStatus.PENDING_PAYMENT }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      if (latestSubscription) {
        subscriptionId = latestSubscription.id;
      } else {
        return NextResponse.json({ 
          success: false, 
          isPaid: false,
          error: 'Aktif abonelik bulunamadı'
        });
      }
    }

    // Abonelik ve fatura durumunu kontrol et
    const [subscription, invoice] = await Promise.all([
      db.subscription.findFirst({
        where: { 
          id: subscriptionId,
          userId: session.user.id
        }
      }),
      db.invoice.findFirst({
        where: {
          subscriptionId: subscriptionId,
          userId: session.user.id
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Her ikisini de kontrol et
    const isSubscriptionActive = subscription?.status === SubscriptionStatus.ACTIVE;
    const isInvoicePaid = invoice?.status === InvoiceStatus.PAID;

    return NextResponse.json({
      success: true,
      isPaid: isSubscriptionActive && isInvoicePaid,
      subscriptionStatus: subscription?.status || 'NOT_FOUND',
      invoiceStatus: invoice?.status || 'NOT_FOUND'
    });

  } catch (error: any) {
    console.error('Ödeme durumu kontrolü sırasında hata:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ödeme durumu kontrol edilirken bir hata oluştu' 
    }, { status: 500 });
  }
} 