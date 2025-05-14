"use server"

import { db } from "@/lib/db"
import { Subscription, SubscriptionStatus, User, EmailTemplateType, Plan, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { sendTemplatedMail } from "@/lib/email"
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import * as z from "zod"
import { auth } from "@/lib/auth/auth"

interface ActionResult {
    success: boolean;
    message?: string;
    subscription?: Subscription;
}

// Abonelik durumunu güncelleme
export async function updateSubscriptionStatus(
    subscriptionId: string,
    newStatus: SubscriptionStatus
): Promise<ActionResult> {
    if (!subscriptionId || !newStatus) {
        return { success: false, message: "Geçersiz abonelik ID veya durum." };
    }

    try {
        // Yetkilendirme kontrolü (örneğin, sadece admin yapabilir)
        // const { userId } = auth(); // Clerk veya next-auth
        // if (!userId || !isAdmin(userId)) { // isAdmin fonksiyonu varsayımsal
        //     return { success: false, message: "Yetkisiz işlem." };
        // }

        const existingSubscription = await db.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                user: true,
                plan: true,
            }
        });

        if (!existingSubscription) {
            return { success: false, message: "Abonelik bulunamadı." };
        }

        if (!existingSubscription.user) {
            console.error(`Subscription ${subscriptionId} için kullanıcı bulunamadı.`);
            return { success: false, message: "Aboneliğe bağlı kullanıcı bulunamadı." };
        }
        if (!existingSubscription.plan) {
            console.error(`Subscription ${subscriptionId} için plan bulunamadı.`);
            // Plan olmadan da devam edilebilir veya hata verilebilir
            return { success: false, message: "Aboneliğe bağlı plan bilgisi bulunamadı." };
        }

        // İptal edilmiş bir aboneliğin durumu değiştirilemez (isteğe bağlı kural)
        if (existingSubscription.status === SubscriptionStatus.CANCELED) {
             return { success: false, message: "İptal edilmiş aboneliğin durumu değiştirilemez." };
        }

        const updatedSubscription = await db.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: newStatus,
                // Gerekirse başlangıç/bitiş tarihleri burada ayarlanabilir
                // Örneğin, aktif ediliyorsa ve başlangıç tarihi yoksa:
                // startDate: newStatus === SubscriptionStatus.ACTIVE && !existingSubscription.startDate ? new Date() : undefined,
            },
            include: {
                user: true,
                plan: true,
            }
        });

        // --- E-posta Gönderme Mantığı ---
        if (newStatus === SubscriptionStatus.ACTIVE && updatedSubscription) {
            if (!updatedSubscription.user?.email || !updatedSubscription.plan?.name) {
                 console.error(`[EMAIL] Aktif abonelik e-postası için gerekli kullanıcı veya plan bilgisi eksik: Sub ID ${subscriptionId}`);
             } else {
                try {
                    await sendTemplatedMail({
                        to: updatedSubscription.user.email,
                        templateType: EmailTemplateType.SUBSCRIPTION_STARTED,
                        data: {
                            userName: updatedSubscription.user.name ?? 'Değerli Üyemiz',
                            planName: updatedSubscription.plan.name,
                            startDate: updatedSubscription.currentPeriodStart
                                ? format(new Date(updatedSubscription.currentPeriodStart), 'dd MMMM yyyy', { locale: tr })
                                : 'Bilinmiyor',
                            endDate: updatedSubscription.currentPeriodEnd
                                ? format(new Date(updatedSubscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: tr })
                                : 'Bilinmiyor',
                            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                        }
                    });
                    console.log(`[EMAIL] Abonelik (${subscriptionId}) aktivasyon e-postası (şablonlu) gönderildi: ${updatedSubscription.user.email}`);

                } catch (emailError) {
                    console.error(`[EMAIL] SUBSCRIPTION_STARTED e-postası gönderilirken hata: ${subscriptionId}`, emailError);
                }
             }
        }
        // Durum CANCELED olarak değiştirildiğinde
        else if (newStatus === SubscriptionStatus.CANCELED && updatedSubscription) {
            if (!updatedSubscription.user?.email || !updatedSubscription.plan?.name) {
                 console.error(`[EMAIL] İptal e-postası için gerekli kullanıcı veya plan bilgisi eksik: Sub ID ${subscriptionId}`);
             } else {
                try {
                    const cancelDate = updatedSubscription.canceledAt ?? new Date();
                    await sendTemplatedMail({
                        to: updatedSubscription.user.email,
                        templateType: EmailTemplateType.SUBSCRIPTION_CANCELED,
                        data: {
                            userName: updatedSubscription.user.name ?? 'Değerli Üyemiz',
                            planName: updatedSubscription.plan.name,
                            cancelDate: format(cancelDate, 'dd MMMM yyyy', { locale: tr }),
                            endDate: updatedSubscription.currentPeriodEnd
                                ? format(new Date(updatedSubscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: tr })
                                : 'Bilinmiyor',
                        }
                    });
                    console.log(`[EMAIL] Abonelik (${subscriptionId}) iptal e-postası (şablonlu) gönderildi: ${updatedSubscription.user.email}`);

                } catch (emailError) {
                    console.error(`[EMAIL] SUBSCRIPTION_CANCELED e-postası gönderilirken hata: ${subscriptionId}`, emailError);
                }
             }
        }
        // --- E-posta Gönderme Mantığı Sonu ---

        // İlgili sayfaların cache'ini temizle
        revalidatePath("/admin/subscriptions");
        if (updatedSubscription.userId) {
             revalidatePath(`/kullanici/${updatedSubscription.userId}/abonelikler`); // Kullanıcı özel sayfası varsa
        }

        return {
            success: true,
            message: `Abonelik durumu başarıyla '${getTurkishStatus(newStatus)}' olarak güncellendi.`,
            subscription: updatedSubscription,
        };
    } catch (error) {
        console.error("Abonelik durumu güncelleme hatası:", error);
        return { success: false, message: "Abonelik durumu güncellenirken bir sunucu hatası oluştu." };
    }
}

// Aboneliği iptal etme
export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
    if (!subscriptionId) {
        return { success: false, message: "Geçersiz abonelik ID." };
    }

    try {
        // Yetkilendirme kontrolü

        const existingSubscription = await db.subscription.findUnique({
            where: { id: subscriptionId },
        });

        if (!existingSubscription) {
            return { success: false, message: "Abonelik bulunamadı." };
        }

        if (existingSubscription.status === SubscriptionStatus.CANCELED) {
            return { success: false, message: "Abonelik zaten iptal edilmiş." };
        }

        // Aboneliği iptal et (durumu CANCELED yap)
        const canceledSubscription = await db.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: SubscriptionStatus.CANCELED,
                canceledAt: new Date(),
            },
            include: {
                user: { select: { email: true, name: true } },
                plan: { select: { name: true } }
            }
        });

        // --- E-posta Gönderme Mantığı ---
        if (canceledSubscription) {
            if (!canceledSubscription.user?.email || !canceledSubscription.plan?.name) {
                 console.error(`[EMAIL] İptal e-postası için gerekli kullanıcı veya plan bilgisi eksik: Sub ID ${subscriptionId}`);
             } else {
                try {
                    const cancelDate = canceledSubscription.canceledAt ?? new Date();
                    await sendTemplatedMail({
                        to: canceledSubscription.user.email,
                        templateType: EmailTemplateType.SUBSCRIPTION_CANCELED,
                        data: {
                            userName: canceledSubscription.user.name ?? 'Değerli Üyemiz',
                            planName: canceledSubscription.plan.name,
                            cancelDate: format(cancelDate, 'dd MMMM yyyy', { locale: tr }),
                            endDate: canceledSubscription.currentPeriodEnd
                                ? format(new Date(canceledSubscription.currentPeriodEnd), 'dd MMMM yyyy', { locale: tr })
                                : format(cancelDate, 'dd MMMM yyyy', { locale: tr })
                        }
                    });
                    console.log(`[EMAIL] Abonelik (${subscriptionId}) iptal e-postası (şablonlu) gönderildi: ${canceledSubscription.user.email}`);

                } catch (emailError) {
                    console.error(`[EMAIL] cancelSubscription içinde SUBSCRIPTION_CANCELED e-postası gönderilirken hata: ${subscriptionId}`, emailError);
                }
             }
        }
        // --- E-posta Gönderme Mantığı Sonu ---

        revalidatePath("/admin/subscriptions");
        // revalidatePath(`/profile/${canceledSubscription.userId}`);

        return {
            success: true,
            message: "Abonelik başarıyla iptal edildi.",
            subscription: canceledSubscription,
        };
    } catch (error) {
        console.error("Abonelik iptal etme hatası:", error);
        return { success: false, message: "Abonelik iptal edilirken bir sunucu hatası oluştu." };
    }
}

// Yardımcı fonksiyon (Durum enum'ını Türkçe metne çevirir)
function getTurkishStatus(status: SubscriptionStatus): string {
    switch (status) {
        case SubscriptionStatus.ACTIVE: return "Aktif";
        case SubscriptionStatus.INACTIVE: return "Pasif";
        case SubscriptionStatus.PAST_DUE: return "Ödeme Gecikti";
        case SubscriptionStatus.CANCELED: return "İptal Edildi";
        case SubscriptionStatus.TRIALING: return "Deneme";
        default: return status; // Beklenmeyen durumlar için
    }
}

// Admin tarafından abonelik güncelleme şeması
const updateSubscriptionSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  currentPeriodEnd: z.date().optional().nullable(), // Bitiş tarihini Date veya null yap
  // Gerekirse eklenebilecek diğer alanlar:
  // planId: z.string().optional(),
  // startDate: z.date().optional(),
});

type UpdateSubscriptionData = z.infer<typeof updateSubscriptionSchema>;

// Helper function to check for admin role (invoice-actions.ts'den alınabilir veya ortak bir lib'e taşınabilir)
async function verifyAdminRole() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Yetkisiz erişim.");
  }
  return session.user;
}

/**
 * Admin tarafından bir aboneliğin detaylarını günceller.
 * @param subscriptionId Güncellenecek aboneliğin ID'si
 * @param data Güncellenecek veriler (status, currentPeriodEnd vb.)
 */
export async function updateSubscriptionAdmin(
    subscriptionId: string,
    data: UpdateSubscriptionData
): Promise<ActionResult> {
    if (!subscriptionId) {
        return { success: false, message: "Geçersiz abonelik ID." };
    }

    try {
        await verifyAdminRole(); // Admin yetki kontrolü

        // Veriyi doğrula
        const validationResult = updateSubscriptionSchema.safeParse(data);
        if (!validationResult.success) {
            const errors = validationResult.error.flatten().fieldErrors;
            return { success: false, message: `Geçersiz veri: ${JSON.stringify(errors)}` };
        }

        const updateData = validationResult.data;

        // Güncelleme işlemi
        const updatedSubscription = await db.subscription.update({
            where: { id: subscriptionId },
            data: {
                // Sadece gönderilen alanları güncelle
                status: updateData.status,
                currentPeriodEnd: updateData.currentPeriodEnd,
                // Diğer alanlar eklendiyse buraya...
            },
        });

        revalidatePath("/admin/subscriptions");
        // Kullanıcıya ait sayfaları da yenilemek gerekebilir
        revalidatePath(`/kullanici/${updatedSubscription.userId}/abonelikler`);

        return {
            success: true,
            message: "Abonelik başarıyla güncellendi.",
            subscription: updatedSubscription,
        };
    } catch (error) {
        console.error("Admin abonelik güncelleme hatası:", error);
        // Yetki hatasını yakala
        if (error instanceof Error && error.message === "Yetkisiz erişim.") {
             return { success: false, message: error.message };
         }
        return { success: false, message: "Abonelik güncellenirken bir sunucu hatası oluştu." };
    }
} 