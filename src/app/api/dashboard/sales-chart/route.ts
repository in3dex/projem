import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
// import { Prisma } from '@prisma/client'; // Artık $queryRaw kullanmıyoruz

interface DailyRevenue {
  date: string; // YYYY-MM-DD formatında
  revenue: number;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  const userId = session.user.id;

  // URL'den periyot al (varsayılan 30 gün)
  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get('period') || '30', 10);

  if (isNaN(periodDays) || periodDays <= 0) {
      return NextResponse.json({ error: 'Geçersiz periyot değeri' }, { status: 400 });
  }

  try {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), periodDays)); 

    console.log(`[Sales Chart API - Prisma] Fetching data for user ${userId} between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}`);

    // 1. Belirtilen tarih aralığındaki siparişleri çek (sadece tarih ve fiyat yeterli)
    const orders = await prisma.trendyolOrder.findMany({
        where: {
            userId: userId,
            orderDate: {
                gte: startDate,
                lte: endDate,
            }
        },
        select: {
            orderDate: true,
            totalPrice: true,
        }
    });

    console.log(`[Sales Chart API - Prisma] Fetched ${orders.length} orders.`);

    // 2. Siparişleri tarihe göre grupla ve günlük ciroyu hesapla
    const dailyRevenueMap = new Map<string, number>();
    orders.forEach(order => {
        const dateStr = format(order.orderDate, 'yyyy-MM-dd');
        const currentRevenue = dailyRevenueMap.get(dateStr) || 0;
        dailyRevenueMap.set(dateStr, currentRevenue + order.totalPrice);
    });

    // 3. Tüm günler için bir harita oluştur (başlangıçtan bitişe) ve verileri birleştir
    const allDaysMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        allDaysMap.set(dateStr, dailyRevenueMap.get(dateStr) || 0); // Veri varsa onu al, yoksa 0
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Haritayı istenen formata dönüştür
    const chartData: DailyRevenue[] = Array.from(allDaysMap.entries()).map(([date, revenue]) => ({
        date,
        revenue
    }));
    
    // console.log(`[Sales Chart API - Prisma] Processed chart data:`, chartData); // İsterseniz logu açabilirsiniz

    return NextResponse.json(chartData);

  } catch (error: unknown) {
    console.error("[Sales Chart API - Prisma] Error fetching daily revenue:", error);
    if (error instanceof Error) {
         console.error("Error stack:", error.stack);
         if ((error as any).code) { // Prisma Error
            console.error("Prisma Error Code:", (error as any).code);
         }
     } else {
         console.error("Unknown error type:", typeof error);
     }
    return NextResponse.json({ error: 'Satış grafiği verileri yüklenemedi.' }, { status: 500 });
  }
} 