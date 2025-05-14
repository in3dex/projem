import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Kullanıcı kimliğini doğrula
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. İstatistikleri Hesapla (userId filtresi ile)
    const aggregations = await db.trendyolOrder.aggregate({
      _sum: {
        totalPrice: true,
      },
      _avg: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      where: {
        userId: userId
      }
    });

    // İptal edilen sipariş sayısını kullanıcı bazlı sayalım
    const cancelledCount = await db.trendyolOrder.count({
      where: {
        userId: userId,
        status: 'Cancelled',
      },
    });

    // Sadık Müşteri Sayısını Hesapla (Kullanıcı bazlı)
    const loyalCustomerCounts = await db.trendyolOrder.groupBy({
      by: ['customerId'],
      _count: {
        id: true,
      },
      where: {
        userId: userId,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    const loyalCustomerCount = loyalCustomerCounts.length;

    // Benzersiz müşteri sayısını kullanıcı bazlı sayalım (siparişler üzerinden)
    const distinctCustomers = await db.trendyolOrder.findMany({
      where: { userId: userId },
      distinct: ['customerId'],
      select: { customerId: true },
    });
    const uniqueCustomerCount = distinctCustomers.length;

    // 3. Sonuçları Hazırla
    const stats = {
      totalRevenue: aggregations._sum.totalPrice ?? 0,
      averageOrderValue: aggregations._avg.totalPrice ?? 0,
      totalOrders: aggregations._count.id ?? 0,
      totalCancelledOrders: cancelledCount ?? 0,
      loyalCustomerCount: loyalCustomerCount,
      uniqueCustomerCount: uniqueCustomerCount ?? 0,
    };

    return NextResponse.json(stats);

  } catch (error: unknown) {
    // ... (hata yönetimi aynı) ...
  }
}