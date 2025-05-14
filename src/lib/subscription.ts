import { db } from "@/lib/db";
import { Subscription, SubscriptionStatus } from "@prisma/client";
import { auth } from "@/lib/auth/auth"; // Oturum bilgisini almak için

/**
 * Mevcut oturumdaki kullanıcının aktif veya deneme süresindeki aboneliğini döndürür.
 * @returns Subscription | null - Aktif/Deneme aboneliği varsa Subscription nesnesi, yoksa null.
 */
export async function getActiveUserSubscription(): Promise<Subscription | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null; // Oturum yok
  }

  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return null; // Abonelik yok
    }

    const isActive = subscription.status === SubscriptionStatus.ACTIVE;
    const isTrialing =
      subscription.status === SubscriptionStatus.TRIALING &&
      subscription.trialEnd &&
      subscription.trialEnd > new Date();

    if (isActive || isTrialing) {
      return subscription; // Aktif veya geçerli deneme aboneliği var
    }

    return null; // Diğer durumlar (iptal edilmiş, süresi dolmuş vb.)
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null; // Hata durumunda null dön
  }
}

/**
 * Mevcut oturumdaki kullanıcının aktif aboneliği olup olmadığını kontrol eder.
 * @returns Promise<boolean>
 */
export async function hasActiveUserSubscription(): Promise<boolean> {
    const subscription = await getActiveUserSubscription();
    return !!subscription;
} 