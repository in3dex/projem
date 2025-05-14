import { NextResponse } from 'next/server';
import { PrismaClient, SubscriptionStatus } from "@prisma/client";
import { auth } from '@/lib/auth/auth';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: { subscriptionId: string } }
) {
  const session = await auth();

  // Sadece Admin rolündeki kullanıcılar güncelleyebilir
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 }); // 403 Forbidden
  }

  const { subscriptionId } = params;

  try {
    const body = await request.json();
    const { status } = body; // Sadece status alanını alıyoruz

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Abonelik ID gerekli' }, { status: 400 });
    }

    // Güncellenecek status geçerli bir SubscriptionStatus mu?
    if (!status || !Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
       return NextResponse.json({ error: 'Geçersiz durum değeri' }, { status: 400 });
    }

    // Özellikle PENDING_PAYMENT -> ACTIVE geçişini kontrol edelim
    const subscriptionToUpdate = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true } // Sadece mevcut durumu alalım
    });

    if (!subscriptionToUpdate) {
       return NextResponse.json({ error: 'Abonelik bulunamadı' }, { status: 404 });
    }

    // Mantık: Sadece PENDING_PAYMENT durumundaki abonelik ACTIVE yapılabilir (veya CANCELED)
    if (subscriptionToUpdate.status === SubscriptionStatus.PENDING_PAYMENT) {
       if (status !== SubscriptionStatus.ACTIVE && status !== SubscriptionStatus.CANCELED) {
         return NextResponse.json({ error: 'Bekleyen abonelik sadece Aktif veya İptal yapılabilir.' }, { status: 400 });
       }
    } else {
        // Diğer durumlardaki abonelikler için farklı kurallar olabilir, şimdilik engelliyoruz
         return NextResponse.json({ error: `Bu abonelik durumu (${subscriptionToUpdate.status}) şu an değiştirilemez.` }, { status: 400 });
    }
    
    // Aboneliği güncelle
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: status as SubscriptionStatus,
        // ACTIVE yaparken belki currentPeriodStart/End güncellenmeli?
        // Şimdilik sadece status güncelliyoruz.
        ...(status === SubscriptionStatus.ACTIVE && { currentPeriodStart: new Date() /* Veya ödeme onay tarihi */ }), 
      },
    });

    return NextResponse.json(updatedSubscription);

  } catch (error) {
    console.error("Abonelik güncelleme hatası:", error);
    return NextResponse.json({ error: 'Sunucu hatası: Abonelik güncellenemedi.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 