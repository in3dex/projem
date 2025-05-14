import { NextResponse } from "next/server";
import { PrismaClient, SubscriptionStatus, BillingInterval, EmailTemplateType } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { sendTemplatedMail } from "@/lib/email";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // let session: any = null; // Kaldırıldı
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await auth(); // Yorum kaldırıldı

    // Session kontrolü geri eklendi
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Yetkilendirme hatası" },
        { status: 401 }
      );
    }

    // İstek verilerini al
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID gerekli" },
        { status: 400 }
      );
    }

    const userId = session.user.id; // Yorum kaldırıldı
    // const userId = "clw0dn9g8000010uv10j0k84p"; // Geçici ID kaldırıldı


    // Planı kontrol et
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan bulunamadı" },
        { status: 404 }
      );
    }

    // Kullanıcının mevcut aboneliğini kontrol et
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId }, 
    });

    if (existingSubscription) {
      // Mevcut aboneliği güncelle
      const subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId,
          status: SubscriptionStatus.ACTIVE,
          // Prisma şemanı kontrol et! Bu alanlar modelde olmayabilir.
          interval: BillingInterval.MONTH, // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          startDate: new Date(), // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          // Aşağıdakiler de modelde olmayabilir, yukarıdakiler varsa bunlar gereksiz olabilir
          // currentPeriodStart: new Date(),
          // currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // --- E-posta Gönderme (Güncelleme Sonrası) ---
      if (subscription && session?.user?.email && plan) { // Yorum kaldırıldı
           try {
               await sendTemplatedMail({
                   to: session.user.email,
                   templateType: EmailTemplateType.SUBSCRIPTION_STARTED,
                   data: {
                       userName: session.user.name ?? 'Değerli Üyemiz',
                       planName: plan.name,
                       // Prisma şemanı kontrol et! startDate/endDate modelde olmayabilir.
                       startDate: subscription.startDate ? format(new Date(subscription.startDate), 'dd MMMM yyyy', { locale: tr }) : 'Bilinmiyor', // Yorum kaldırıldı
                       endDate: subscription.endDate ? format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: tr }) : 'Bilinmiyor', // Yorum kaldırıldı
                       dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                   }
               });
                console.log(`[EMAIL] Abonelik güncelleme sonrası (${subscription.id}) aktivasyon e-postası (şablonlu) gönderildi: ${session.user.email}`);
           } catch (emailError) {
               console.error(`[EMAIL] create/update içinde SUBSCRIPTION_STARTED e-postası gönderilirken hata: ${subscription.id}`, emailError);
           }
      }
      // --- E-posta Gönderme Sonu ---

      return NextResponse.json({
        success: true,
        message: "Abonelik başarıyla güncellendi.",
        subscription,
      });
    } else {
      // Yeni abonelik oluştur
      const subscription = await prisma.subscription.create({
        data: {
          userId, 
          planId,
          status: SubscriptionStatus.ACTIVE,
           // Prisma şemanı kontrol et! Bu alanlar modelde olmayabilir.
          interval: BillingInterval.MONTH, // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          startDate: new Date(), // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Yorum kaldırıldı (Prisma Şemanı Kontrol Et!)
          // Aşağıdakiler de modelde olmayabilir, yukarıdakiler varsa bunlar gereksiz olabilir
          // billingInterval: BillingInterval.MONTH, 
          // currentPeriodStart: new Date(),
          // currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // --- E-posta Gönderme (Yeni Oluşturma Sonrası) ---
      if (subscription && session?.user?.email && plan) { // Yorum kaldırıldı
           try {
               await sendTemplatedMail({
                   to: session.user.email,
                   templateType: EmailTemplateType.SUBSCRIPTION_STARTED,
                   data: {
                       userName: session.user.name ?? 'Değerli Üyemiz',
                       planName: plan.name,
                       // Prisma şemanı kontrol et! startDate/endDate modelde olmayabilir.
                       startDate: subscription.startDate ? format(new Date(subscription.startDate), 'dd MMMM yyyy', { locale: tr }) : 'Bilinmiyor', // Yorum kaldırıldı
                       endDate: subscription.endDate ? format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: tr }) : 'Bilinmiyor', // Yorum kaldırıldı
                       dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                   }
               });
                console.log(`[EMAIL] Yeni abonelik (${subscription.id}) aktivasyon e-postası (şablonlu) gönderildi: ${session.user.email}`);
           } catch (emailError) {
               console.error(`[EMAIL] create içinde SUBSCRIPTION_STARTED e-postası gönderilirken hata: ${subscription.id}`, emailError);
           }
      }
      // --- E-posta Gönderme Sonu ---

      return NextResponse.json({
        success: true,
        message: "Abonelik başarıyla oluşturuldu.",
        subscription,
      });
    }
  } catch (error) {
    console.error("Abonelik oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
} 