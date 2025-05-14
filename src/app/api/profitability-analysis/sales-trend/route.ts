import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import dayjs from 'dayjs';
import 'dayjs/locale/tr'; // Türkçe ay isimleri için
dayjs.locale('tr');

// API Yanıt Tipi (Export kaldırıldı, src/types/analysis.ts'den import edilecek)
interface SalesTrendDataPoint { 
  month: string; 
  yearMonth: string; 
  siparisSayisi: number;
  toplamTutar: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Son 6 Ayın Başlangıç Tarihini Hesapla
    const sixMonthsAgo = dayjs().subtract(6, 'month').startOf('month').toDate();

    // 3. Veritabanından İlgili Siparişleri Çek
    const orders = await db.trendyolOrder.findMany({
      where: {
        userId: userId,
        orderDate: { gte: sixMonthsAgo },
        // İptal edilmemiş veya iade edilmemiş siparişleri filtrelemek gerekebilir
        // status: { notIn: ['Cancelled', 'Returned'] } // Örnek filtre
      },
      select: {
        orderDate: true,
        totalPrice: true, // KDV dahil toplam tutar
      },
      orderBy: {
        orderDate: 'asc',
      },
    });

    // 4. Veriyi Aylara Göre Grupla ve Topla
    const monthlyData: Record<string, { siparisSayisi: number; toplamTutar: number }> = {};

    orders.forEach(order => {
      const monthYear = dayjs(order.orderDate).format('YYYY-MM');
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { siparisSayisi: 0, toplamTutar: 0 };
      }
      monthlyData[monthYear].siparisSayisi += 1;
      monthlyData[monthYear].toplamTutar += order.totalPrice;
    });

    // 5. Son 6 Ayın Formatını Oluştur ve Veriyi Eşleştir
    const salesTrend: SalesTrendDataPoint[] = [];
    for (let i = 6; i >= 0; i--) { // Son 6 ay + bu ay
        const date = dayjs().subtract(i, 'month');
        const yearMonth = date.format('YYYY-MM');
        const monthName = date.format('MMMM'); // Türkçe ay adı
        const data = monthlyData[yearMonth] || { siparisSayisi: 0, toplamTutar: 0 };
        
        salesTrend.push({
            month: monthName,
            yearMonth: yearMonth,
            siparisSayisi: data.siparisSayisi,
            toplamTutar: parseFloat(data.toplamTutar.toFixed(2)),
        });
    }

    return NextResponse.json(salesTrend, { status: 200 });

  } catch (error: any) {
    console.error("[API SalesTrend] Genel Hata:", error);
    return NextResponse.json({ error: 'Satış trendi verisi alınırken sunucu hatası oluştu.', details: error.message }, { status: 500 });
  }
} 