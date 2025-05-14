import { db } from '@/lib/db';
// @prisma/client importunu kaldırıyoruz veya sadece diğerlerini alıyoruz
import { SubscriptionStatus, Prisma } from '@prisma/client';

// LimitType enum'unu manuel olarak tanımla (schema.prisma ile aynı olmalı)
export enum LimitType {
  PRODUCT_COUNT = 'PRODUCT_COUNT',
  ORDER_COUNT = 'ORDER_COUNT',
  USER_COUNT = 'USER_COUNT', // Şemada olmasa bile burada tanımlayabiliriz
}

export class LimitError extends Error {
  limit?: number | null;
  constructor(message: string, limit?: number | null) {
    super(message);
    this.name = 'LimitError';
    this.limit = limit;
  }
}

/**
 * Verilen limit türü için kullanıcının limitini kontrol eder.
 * Limit aşılmışsa LimitError fırlatır.
 * @param userId Kullanıcı ID'si
 * @param limitType Kontrol edilecek limit türü (örn: LimitType.PRODUCT_COUNT, LimitType.ORDER_COUNT)
 * @param currentUsage Mevcut kullanım sayısı
 * @returns Promise<void> - Limit aşılmamışsa resolve olur.
 */
// limitType parametresinde manuel tanımlanan enum'u kullan
export async function checkLimit(userId: string, limitType: LimitType, currentUsage: number): Promise<void> { 
  const subscription = await db.subscription.findUnique({
    where: { userId },
    include: {
      plan: true,
    }
  });

  // Aktif abonelik yoksa veya plan bilgisi yoksa kontrol etme (veya hata fırlat? Şimdilik geç)
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE || !subscription.plan) {
    console.warn(`[checkLimit] Kullanıcı ${userId} için aktif abonelik veya plan bilgisi bulunamadı. Limit kontrolü atlandı.`);
    return;
  }

  let limit: number | null = null;

  // Limit türüne göre kontrol edilecek plan alanını belirle
  switch (limitType) {
    case LimitType.PRODUCT_COUNT:
      limit = subscription.plan.maxProducts;
      break;
    case LimitType.ORDER_COUNT:
      limit = subscription.plan.maxMonthlyOrders;
      break;
    // case LimitType.USER_COUNT: // Henüz şemada veya planda yok
    //   // limit = subscription.plan.maxUsers; 
    //   break;
    default:
      // Exhaustive check (never should happen with enum)
      // const _exhaustiveCheck: never = limitType; 
      console.warn(`[checkLimit] Bilinmeyen veya desteklenmeyen limit türü: ${limitType}`);
      return; 
  }

  // Eğer limit null değilse (yani sınırsız değilse) ve mevcut kullanım limite eşit veya büyükse hata fırlat
  if (limit !== null && currentUsage >= limit) {
    // Enum değerini daha okunabilir bir metne çevir (opsiyonel)
    const limitTypeText = limitType.toString().toLowerCase().replace('_count', '').replace('_', ' ');
    throw new LimitError(
      `${limitTypeText} için belirlenen ${limit} limitine ulaşıldı.`, 
      limit // Limit değerini hataya ekle
    );
  }
  
  // Limit aşılmadıysa veya limit yoksa (sınırsız ise) devam et
}

/**
 * Belirli bir kullanıcının veritabanındaki ürün sayısını döndürür.
 * @param userId Kullanıcı ID'si
 * @returns Promise<number> Ürün sayısı
 */
export async function getCurrentProductCount(userId: string): Promise<number> {
    // Not: Burada 'isActive' gibi bir filtreleme yapılabilir, ancak şimdilik
    // plandaki limitin tüm ürünleri mi yoksa sadece aktifleri mi kapsadığına
    // göre tümünü sayıyoruz.
    // Model adının küçük 'p' ile başladığını varsayıyoruz: 'product'
    return db.product.count({ 
        where: { userId },
    });
}

/**
 * Kullanıcının mevcut abonelik dönemindeki sipariş sayısını döndürür.
 * @param userId Kullanıcı ID'si
 * @returns Promise<number> - Mevcut aylık sipariş sayısı.
 */
export async function getCurrentMonthlyOrderCount(userId: string): Promise<number> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { currentPeriodStart: true, status: true } // Sadece başlangıç tarihi ve durumu al
  });

  // Aktif abonelik yoksa veya başlangıç tarihi yoksa 0 döndür
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE || !subscription.currentPeriodStart) {
    return 0;
  }

  // TrendyolOrder model adının 'trendyolOrder' olduğunu varsayıyoruz.
  const count = await db.trendyolOrder.count({
    where: {
      userId: userId,
      createdAt: {
        gte: subscription.currentPeriodStart, // Mevcut dönemin başlangıcından itibaren
      }
    }
  });

  return count;
}

// Gelecekte diğer limit türleri için benzer sayaç fonksiyonları eklenebilir:
// export async function getCurrentTeamMemberCount(userId: string): Promise<number> { ... } 