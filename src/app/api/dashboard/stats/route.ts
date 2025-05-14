import { NextResponse } from 'next/server';
// import { PrismaClient, Prisma } from '@prisma/client'; // Prisma tiplerini import et // Bu satırı kaldır
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/db'; // Paylaşılan instance'ı import et
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import

// Frontend'deki arayüzle eşleşen tip
interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  pendingQuestions: number;
  lowStockProducts: number;
  monthlyRevenue: number; 
  monthlyOrders: number; 
  revenueChangePercent: number; 
  ordersChangePercent: number; 
}

export async function GET() {
  // const prisma = new PrismaClient(); // Kendi instance'ını oluşturma kaldırıldı
  const session = await auth(); // Session bilgisini auth() ile al

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgoStart = startOfDay(subDays(new Date(), 30));
    const twoMonthsAgoStart = startOfDay(subDays(new Date(), 60));

    // Bugünkü Siparişler ve Ciro
    const todayOrdersData = await prisma.trendyolOrder.aggregate({
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      where: {
        userId: userId,
        orderDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
    console.log("[Stats API] Today's Order Data:", todayOrdersData);

    // Son 30 Günlük Siparişler ve Ciro
    const last30DaysOrdersData = await prisma.trendyolOrder.aggregate({
        _sum: {
            totalPrice: true,
        },
        _count: {
            id: true,
        },
        where: {
            userId: userId,
            orderDate: {
                gte: monthAgoStart,
                lte: todayEnd, // Bugün dahil
            },
        },
    });
    console.log("[Stats API] Last 30 Days Order Data:", last30DaysOrdersData);

    // Önceki 30 Günlük Siparişler ve Ciro (Karşılaştırma için)
    const previous30DaysOrdersData = await prisma.trendyolOrder.aggregate({
        _sum: {
            totalPrice: true,
        },
        _count: {
            id: true,
        },
        where: {
            userId: userId,
            orderDate: {
                gte: twoMonthsAgoStart,
                lt: monthAgoStart, // Son 30 gün başlangıcından önce
            },
        },
    });
    console.log("[Stats API] Previous 30 Days Order Data:", previous30DaysOrdersData);

    // Bekleyen Sorular
    const pendingQuestionsCount = await prisma.customerQuestion.count({
      where: {
        userId: userId,
        status: 'WAITING_FOR_ANSWER', // Veya API'nizdeki bekleyen durum kodu
      },
    });
    console.log("[Stats API] Pending Questions Count:", pendingQuestionsCount);

    // Stoğu Azalan Ürünler (Örnek: Stok <= 5)
    const lowStockProductsCount = await prisma.product.count({
      where: {
        userId: userId,
        quantity: {
          lte: 5,
        },
        archived: false, // Arşivlenmemiş ürünler
        onSale: true,   // Satışta olan ürünler
      },
    });
    console.log("[Stats API] Low Stock Products Count:", lowStockProductsCount);
    
    // Yüzdelik Değişim Hesaplama
    const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) {
            return current > 0 ? 100 : 0; // Eğer önceki 0 ise ve şimdi pozitifse %100 artış, yoksa 0
        }
        return ((current - previous) / previous) * 100;
    };

    const currentMonthRevenue = last30DaysOrdersData._sum.totalPrice ?? 0;
    const previousMonthRevenue = previous30DaysOrdersData._sum.totalPrice ?? 0;
    const currentMonthOrders = last30DaysOrdersData._count.id ?? 0;
    const previousMonthOrders = previous30DaysOrdersData._count.id ?? 0;

    const stats: DashboardStats = {
      todayRevenue: todayOrdersData._sum.totalPrice ?? 0,
      todayOrders: todayOrdersData._count.id ?? 0,
      pendingQuestions: pendingQuestionsCount,
      lowStockProducts: lowStockProductsCount,
      monthlyRevenue: currentMonthRevenue,
      monthlyOrders: currentMonthOrders,
      revenueChangePercent: calculatePercentageChange(currentMonthRevenue, previousMonthRevenue),
      ordersChangePercent: calculatePercentageChange(currentMonthOrders, previousMonthOrders),
    };

    return NextResponse.json(stats);

  } catch (error: unknown) {
    console.error("Dashboard stats error:", error);
    // Daha spesifik hata yönetimi eklenebilir
    // Prisma hatası kontrolü
    // Prisma tipi artık import edilmediği için instanceof kontrolü yerine basit kontrol
    if (error instanceof Error && error.constructor.name.includes('Prisma')) { 
       console.error("Prisma Error Code:", (error as any).code); // Hata kodunu almak için any kullanıldı
     }
    return NextResponse.json({ error: 'İstatistikler alınırken bir hata oluştu.' }, { status: 500 });
  }
} 