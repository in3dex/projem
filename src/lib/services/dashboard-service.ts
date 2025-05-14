import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Prisma } from "@prisma/client"; // Prisma tiplerini import et
import { format } from 'date-fns';

// --- Tip Tanımları ---
// Bu tipler dashboard sayfasında da kullanılabilir veya oradan import edilebilir.
export interface DashboardStats {
  totalRevenue: string; // String'e çevrildi
  totalOrders: number;          // Toplam Sipariş Sayısı
  pendingQuestions: number;     // Bekleyen Müşteri Sorusu
  totalProducts: number;        // Yeni: Toplam ürün sayısı
  totalClaims: number;          // Yeni: Toplam iade talebi sayısı
  monthlyRevenue: string;        // Yeni: Son 30 Gün Ciro (string)
  monthlyOrders: number;         // Yeni: Son 30 Gün Sipariş
  pendingOrders: number;         // Yeni: Bekleyen Siparişler
  // TODO: Diğer istatistikler eklenebilir (örn: Aktif Ürün Sayısı, İade Talepleri vb.)
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerFullName: string; 
  totalPrice: number;
  status: string;
  orderDate: Date; // Date olarak bırakmak daha iyi
}

// Yeni: En Çok Satan Ürün Tipi
export interface TopProduct {
  barcode: string;
  totalQuantitySold: number;
  productDetail: {
    id: string;
    title: string;
    stockCode: string | null;
    images: any; // JSON tipinde
  } | null;
}

// Yeni: Tahmin Veri Noktası Tipi
export interface ForecastDataPoint extends TimeSeriesDataPoint {
  isForecast: boolean; // Bu noktanın tahmin olup olmadığını belirtir
}

// Yeni: Haftalık Satış Veri Noktası Tipi
export interface WeeklySalesDataPoint {
  dayOfWeek: number; // 0: Pazar, 1: Pazartesi, ..., 6: Cumartesi
  averageSales: number;
}

// Yeni: Aylık Performans Veri Noktası Tipi (isForecast kaldırıldı)
export interface MonthlyPerformanceDataPoint {
  month: string; // 'YYYY-MM' formatı
  value: number;
}

// Yeni: Servis Fonksiyonu Dönüş Tipi
export interface MonthlyForecastResult {
  historicalData: MonthlyPerformanceDataPoint[] | null;
  forecastValue: number | null;
}

// Yeni: Günlük Tahmin Veri Noktası Tipi
export interface DailyForecastDataPoint {
  date: string; // 'YYYY-MM-DD' formatı
  forecastValue: number;
}

// Yeni: Şehir Satış Veri Noktası Tipi
export interface CitySalesDataPoint {
  city: string;
  orderCount: number;
}

// --- Servis Fonksiyonları ---

/**
 * Oturum açmış kullanıcının temel dashboard istatistiklerini getirir.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const endDate = endOfDay(new Date());
  const startDate30Days = startOfDay(subDays(endDate, 30));

  // Paralel sorgular için Promise.all kullanalım
  const [allTimeStats, monthlyStats, pendingQuestionsCount, totalProductsCount, totalClaimsCount, pendingOrdersCount] = await Promise.all([
    // Tüm zamanlar
    prisma.trendyolOrder.aggregate({
      _count: { id: true },
      _sum: { totalPrice: true },
      where: { userId: userId },
    }),
    // Son 30 gün
    prisma.trendyolOrder.aggregate({
      _count: { id: true }, // Son 30 gün sipariş
      _sum: { totalPrice: true }, // Son 30 gün ciro
      where: {
        userId: userId,
        orderDate: {
          gte: startDate30Days,
          lte: endDate,
        },
      },
    }),
    prisma.customerQuestion.count({
      where: { userId: userId, status: 'WAITING_FOR_ANSWER' },
    }),
    prisma.product.count({
      where: { userId: userId, archived: false },
    }),
    prisma.trendyolClaim.count({
      where: { userId: userId },
    }),
    // Yeni: Bekleyen siparişleri say (Düzeltildi)
    prisma.trendyolOrder.count({
      where: {
        userId: userId,
        status: { in: ['Created', 'Invoiced'] } // Doğru durumlar: Created, Invoiced
      },
    }),
  ]);

  const totalRevenueDecimal = allTimeStats._sum.totalPrice ?? new Prisma.Decimal(0);
  const monthlyRevenueDecimal = monthlyStats._sum.totalPrice ?? new Prisma.Decimal(0);

  return {
    totalRevenue: totalRevenueDecimal.toString(),
    totalOrders: allTimeStats._count.id ?? 0,
    monthlyRevenue: monthlyRevenueDecimal.toString(), // Son 30 gün ciro
    monthlyOrders: monthlyStats._count.id ?? 0,      // Son 30 gün sipariş
    pendingQuestions: pendingQuestionsCount ?? 0,
    totalProducts: totalProductsCount ?? 0,
    totalClaims: totalClaimsCount ?? 0,
    pendingOrders: pendingOrdersCount ?? 0, // Yeni: Bekleyen sipariş sayısı
  };
}

/**
 * Oturum açmış kullanıcının son N siparişini getirir.
 * @param limit Getirilecek sipariş sayısı (varsayılan 5)
 */
export async function getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        throw new Error("Kullanıcı oturumu bulunamadı.");
    }

    const orders = await prisma.trendyolOrder.findMany({
        where: { userId },
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
             customer: { // Müşteri adını almak için
                 select: { firstName: true, lastName: true }
             }
        }
    });

    // Veriyi RecentOrder tipine dönüştür
    return orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerFullName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
        totalPrice: order.totalPrice,
        status: order.status, // Veya shipmentPackageStatus
        orderDate: order.orderDate,
    }));
}

// --- Grafik Veri Fonksiyonları ---

export interface TimeSeriesDataPoint {
  date: string; // 'YYYY-MM-DD' formatı
  value: number;
}

/**
 * Son N günlük ciro verisini getirir.
 * @param days Geçmişe dönük gün sayısı (varsayılan 30)
 */
export async function getRevenueOverTime(days: number = 30): Promise<TimeSeriesDataPoint[]> {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        throw new Error("Kullanıcı oturumu bulunamadı.");
    }

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1)); // days kadar gün öncesi

    // Son 'days' güne ait siparişleri çek
    const orders = await prisma.trendyolOrder.findMany({
        where: {
            userId: userId,
            orderDate: {
                gte: startDate,
                lte: endDate,
            },
            // Sadece tamamlanmış siparişleri saymak isteyebilirsiniz (opsiyonel)
            // status: { in: ['Delivered', 'Shipped', 'Invoiced'] } 
        },
        select: {
            orderDate: true,
            totalPrice: true,
        },
        orderBy: {
            orderDate: 'asc',
        },
    });

    // Günlük ciroları hesapla
    const dailyRevenue: { [key: string]: number } = {};
    
    // Tüm günleri içeren bir başlangıç haritası oluştur (0 değerli)
    for (let i = 0; i < days; i++) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        dailyRevenue[date] = 0;
    }

    // Siparişleri günlere göre grupla ve topla
    orders.forEach(order => {
        const dateStr = format(order.orderDate, 'yyyy-MM-dd');
        if (dailyRevenue[dateStr] !== undefined) {
             // Prisma Decimal'ı number'a çevirip ekle
             dailyRevenue[dateStr] += new Prisma.Decimal(order.totalPrice).toNumber();
        }
    });

    // Sonucu TimeSeriesDataPoint dizisine çevir ve tarihe göre sırala
    const result = Object.entries(dailyRevenue)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return result;
}

/**
 * Son N günde en çok satan ürünleri getirir.
 * @param days Geçmişe dönük gün sayısı (varsayılan 30)
 * @param limit Getirilecek ürün sayısı (varsayılan 5)
 */
export async function getTopSellingProducts(
  days: number = 30,
  limit: number = 5
): Promise<TopProduct[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const startDate = startOfDay(subDays(new Date(), days));

  // Son 'days' güne ait sipariş kalemlerini çek ve barkoda göre grupla
  const topItems = await prisma.trendyolOrderItem.groupBy({
    by: ['barcode'],
    _sum: {
      quantity: true,
    },
    where: {
      order: {
        userId: userId,
        orderDate: {
          gte: startDate,
        },
      },
      // İptal veya iade olmayanları saymak daha doğru olabilir (opsiyonel)
      // orderLineItemStatusName: { notIn: ['Cancelled', 'Returned'] }
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  if (!topItems || topItems.length === 0) {
    return [];
  }

  // Barkod listesini al
  const barcodes = topItems.map(item => item.barcode).filter(Boolean) as string[];

  // Ürün detaylarını çek (eşleşen barkodlar için)
  const products = await prisma.product.findMany({
    where: {
      userId: userId,
      barcode: { in: barcodes },
    },
    select: {
      id: true,
      barcode: true,
      title: true,
      stockCode: true,
      images: true,
    },
  });

  // Ürün detaylarını bir haritada sakla (barkod -> ürün detayı)
  const productMap = new Map(products.map(p => [p.barcode, p]));

  // Sonucu birleştir
  const result: TopProduct[] = topItems.map(item => ({
    barcode: item.barcode ?? 'Bilinmiyor',
    totalQuantitySold: item._sum.quantity ?? 0,
    productDetail: item.barcode ? productMap.get(item.barcode) ?? null : null,
  }));

  return result;
}

/**
 * Geçmiş satış verilerini ve basit bir gelecek tahminini getirir.
 * @param historyDays Geçmiş veri için gün sayısı (varsayılan 30)
 * @param forecastDays Gelecek tahmin için gün sayısı (varsayılan 7)
 * @param avgWindow Ortalama hesaplama için kullanılacak gün sayısı (varsayılan 7)
 */
export async function getSalesForecast(
  historyDays: number = 30,
  forecastDays: number = 7,
  avgWindow: number = 7
): Promise<ForecastDataPoint[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  if (avgWindow > historyDays) {
    avgWindow = historyDays; // Ortalama penceresi geçmişten büyük olamaz
  }

  // Hem geçmiş hem de ortalama için yeterli veri çek
  const totalDaysToFetch = historyDays;
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, totalDaysToFetch - 1));

  const orders = await prisma.trendyolOrder.findMany({
    where: {
      userId: userId,
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      orderDate: true,
      totalPrice: true,
    },
    orderBy: {
      orderDate: 'asc',
    },
  });

  // Günlük ciroları hesapla
  const dailyRevenue: { [key: string]: number } = {};
  for (let i = 0; i < totalDaysToFetch; i++) {
    const date = format(subDays(endDate, i), 'yyyy-MM-dd');
    dailyRevenue[date] = 0;
  }
  orders.forEach(order => {
    const dateStr = format(order.orderDate, 'yyyy-MM-dd');
    if (dailyRevenue[dateStr] !== undefined) {
      dailyRevenue[dateStr] += new Prisma.Decimal(order.totalPrice).toNumber();
    }
  });

  // Geçmiş veriyi formatla
  const historicalData: ForecastDataPoint[] = Object.entries(dailyRevenue)
    .map(([date, value]) => ({ date, value, isForecast: false }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Tahmin için son 'avgWindow' günün ortalamasını al
  const lastWindowData = historicalData.slice(-avgWindow);
  const averageSales = lastWindowData.reduce((sum, item) => sum + item.value, 0) / avgWindow;

  // Gelecek tahmin noktalarını oluştur
  const forecastData: ForecastDataPoint[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  for (let i = 1; i <= forecastDays; i++) {
    lastDate.setDate(lastDate.getDate() + 1);
    forecastData.push({
      date: format(lastDate, 'yyyy-MM-dd'),
      value: averageSales, // Ortalama değeri kullan
      isForecast: true,
    });
  }

  // Geçmiş ve tahmin verisini birleştir
  return [...historicalData, ...forecastData];
}

/**
 * Son N güne ait veriyi kullanarak haftanın günlerine göre ortalama ciro hesaplar.
 * @param historyDays Analiz edilecek geçmiş gün sayısı (varsayılan 90)
 */
export async function getSalesByDayOfWeek(
  historyDays: number = 90
): Promise<WeeklySalesDataPoint[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, historyDays - 1));

  const orders = await prisma.trendyolOrder.findMany({
    where: {
      userId: userId,
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      orderDate: true,
      totalPrice: true,
    },
  });

  // Günlere göre toplam satışları ve gün sayılarını tut
  const salesByDay: { [key: number]: { total: number; count: number } } = {};
  for (let i = 0; i < 7; i++) {
    salesByDay[i] = { total: 0, count: 0 };
  }

  // Hangi günlerin veri içerdiğini takip et
  const daysWithData = new Set<string>();

  orders.forEach(order => {
    const orderDate = order.orderDate;
    const dayOfWeek = orderDate.getDay(); // 0=Pazar, 6=Cumartesi
    const dateString = format(orderDate, 'yyyy-MM-dd');

    // Aynı güne ait mükerrer sayımı engelle (günlük toplamları biriktir)
    if (!daysWithData.has(dateString)) {
       daysWithData.add(dateString);
       // O güne ait tüm siparişlerin toplamını al (bu sorgu daha verimli olabilir)
       // Şimdilik mevcut veriyle devam edelim, her siparişi ayrı işleyelim
    } 
    // Her siparişin cirosunu ilgili güne ekle
     salesByDay[dayOfWeek].total += new Prisma.Decimal(order.totalPrice).toNumber();
     // Sadece gün sayısını saymak için bu satırı farklı yönetebiliriz.
     // Şimdilik her siparişin olduğu günü sayalım, sonra gerekirse düzeltiriz.
     // VEYA daha iyisi: Günlük toplamları hesaplayıp sonra günlere göre gruplayalım.

  });

  // Günlük Toplamları Hesapla (Daha doğru yaklaşım)
  const dailyTotals: { [date: string]: number } = {};
  orders.forEach(order => {
      const dateStr = format(order.orderDate, 'yyyy-MM-dd');
      const price = new Prisma.Decimal(order.totalPrice).toNumber();
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + price;
  });

  // Günlük toplamları haftanın günlerine göre grupla ve ortalamayı al
   for (let i = 0; i < 7; i++) {
     salesByDay[i] = { total: 0, count: 0 };
   }
   Object.entries(dailyTotals).forEach(([dateStr, total]) => {
       const date = new Date(dateStr);
       // Saat dilimi sorunlarını önlemek için UTC kullanmayı düşünün veya date-fns-tz
       date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Yerel saate göre günü al
       const dayOfWeek = date.getDay();
       if (salesByDay[dayOfWeek]) { 
         salesByDay[dayOfWeek].total += total;
         salesByDay[dayOfWeek].count += 1; // O günden kaç tane olduğunu say
       }
   });

  // Ortalama hesapla
  const result: WeeklySalesDataPoint[] = [];
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Per', 'Cum', 'Cmt']; // Türkçe kısaltmalar
  for (let i = 0; i < 7; i++) {
    const dayData = salesByDay[i];
    result.push({
      dayOfWeek: i,
      // dayName: dayNames[i], // İsimlendirmeyi istemci tarafında yapalım
      averageSales: dayData.count > 0 ? dayData.total / dayData.count : 0,
    });
  }

  // İsteğe bağlı: Haftanın başlangıcını Pazartesi yapmak için sırala
  // result.sort((a, b) => (a.dayOfWeek === 0 ? 7 : a.dayOfWeek) - (b.dayOfWeek === 0 ? 7 : b.dayOfWeek));

  return result;
}

/**
 * Son N aylık ciro verisini ve bir sonraki ay için basit tahmini DÖNDÜRÜR.
 * @param historyMonths Geçmiş veri için ay sayısı (varsayılan 12)
 * @param avgWindow Ortalama hesaplama için ay sayısı (varsayılan 3)
 */
export async function getMonthlySalesForecast(
  historyMonths: number = 12,
  avgWindow: number = 3
): Promise<MonthlyForecastResult> { // Dönüş tipi güncellendi
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    // Hata durumunda null değerler döndür
    return { historicalData: null, forecastValue: null }; 
  }

  if (avgWindow > historyMonths) {
    avgWindow = historyMonths;
  }

  // Veri çekilecek başlangıç ve bitiş tarihlerini hesapla
  const endDate = endOfDay(new Date()); // Bugün
  // Başlangıç: Geçmiş ay sayısı kadar öncesinin ilk günü
  const startDate = startOfDay(subDays(endDate, (historyMonths * 31))); // Kabaca hesap
  // Daha doğru başlangıç tarihi hesaplanabilir (örn: subMonths kullanarak)

  const orders = await prisma.trendyolOrder.findMany({
    where: {
      userId: userId,
      orderDate: {
        gte: startDate, // Geniş bir aralık çekelim
        lte: endDate,
      },
    },
    select: {
      orderDate: true,
      totalPrice: true,
    },
    orderBy: {
      orderDate: 'asc',
    },
  });

  // Aylık ciroları hesapla
  const monthlyRevenue: { [key: string]: number } = {};
  orders.forEach(order => {
    const monthStr = format(order.orderDate, 'yyyy-MM');
    monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + new Prisma.Decimal(order.totalPrice).toNumber();
  });

  // Geçmiş veriyi formatla
  const historicalDataResult: MonthlyPerformanceDataPoint[] = []; // Tip güncellendi
  const currentDate = new Date();
  currentDate.setDate(1);
  for (let i = 0; i < historyMonths; i++) {
    const monthStr = format(currentDate, 'yyyy-MM');
    historicalDataResult.push({ 
        month: monthStr, 
        value: monthlyRevenue[monthStr] || 0,
        // isForecast: false // Kaldırıldı
    });
    currentDate.setMonth(currentDate.getMonth() - 1);
  }
  historicalDataResult.reverse();

  // Tahmin değerini hesapla
  const lastWindowData = historicalDataResult.slice(-avgWindow);
  const forecastValueResult = lastWindowData.length > 0 
    ? lastWindowData.reduce((sum, item) => sum + item.value, 0) / lastWindowData.length
    : 0;

  // Ayrılmış verileri döndür
  return {
      historicalData: historicalDataResult,
      forecastValue: forecastValueResult
  };
}

/**
 * Bir sonraki ayın her günü için basit satış tahminini hesaplar.
 * Geçmiş N günün verisine göre haftanın günü ortalamalarını kullanır.
 * @param historyDays Geçmiş veri için gün sayısı (varsayılan 90)
 */
export async function getNextMonthDailyForecast(
  historyDays: number = 90
): Promise<DailyForecastDataPoint[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return []; // Hata durumunda boş dizi döndür
  }

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, historyDays - 1));

  // Geçmiş siparişleri çek
  const orders = await prisma.trendyolOrder.findMany({
    where: {
      userId: userId,
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      orderDate: true,
      totalPrice: true,
    },
  });

  // Haftanın günlerine göre toplam satışı ve gün sayısını hesapla
  const salesByDayOfWeek: { [key: number]: { total: number; count: number } } = {};
  for (let i = 0; i < 7; i++) {
    salesByDayOfWeek[i] = { total: 0, count: 0 };
  }
  const dailyTotals: { [date: string]: number } = {};
  orders.forEach(order => {
    const dateStr = format(order.orderDate, 'yyyy-MM-dd');
    const price = new Prisma.Decimal(order.totalPrice).toNumber();
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + price;
  });

  Object.keys(dailyTotals).forEach(dateStr => {
    const date = new Date(dateStr);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Yerel saate göre günü al
    const dayOfWeek = date.getDay(); // 0: Pazar, ..., 6: Cumartesi
    if (salesByDayOfWeek[dayOfWeek]) {
      salesByDayOfWeek[dayOfWeek].total += dailyTotals[dateStr];
      salesByDayOfWeek[dayOfWeek].count += 1;
    }
  });

  // Haftanın günü ortalamalarını hesapla
  const averageSalesByDay: number[] = [];
  for (let i = 0; i < 7; i++) {
    const dayData = salesByDayOfWeek[i];
    averageSalesByDay[i] = dayData.count > 0 ? dayData.total / dayData.count : 0;
  }

  // Gelecek ayın günleri için tahmin yap
  const forecastResult: DailyForecastDataPoint[] = [];
  const today = new Date();
  const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const currentDate = firstDayOfNextMonth;
  while (currentDate <= lastDayOfNextMonth) {
    const dayOfWeek = currentDate.getDay();
    forecastResult.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      forecastValue: averageSalesByDay[dayOfWeek] ?? 0, // İlgili günün ortalamasını kullan
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return forecastResult;
}

/**
 * Son N günde en çok sipariş alan ilk X şehri getirir.
 * @param historyDays Geçmiş veri için gün sayısı (varsayılan 90)
 * @param limit Gösterilecek şehir sayısı (varsayılan 5)
 */
export async function getTopCitiesByOrderCount(
  historyDays: number = 90,
  limit: number = 5
): Promise<CitySalesDataPoint[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  const startDate = startOfDay(subDays(new Date(), historyDays - 1));

  // İlişkisel sorgu ile şehirleri çekelim (groupBy yerine ilişkisel alanla join kullanıyoruz)
  const orders = await prisma.trendyolOrder.findMany({
    where: {
      userId: userId,
      orderDate: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      shipmentAddress: {
        select: {
          city: true,
        },
      },
    },
  });

  // JavaScript ile gruplandırma yapalım
  const cityCountMap: Record<string, number> = {};
  
  // Şehirleri say
  orders.forEach(order => {
    if (order.shipmentAddress && order.shipmentAddress.city) {
      const city = order.shipmentAddress.city;
      cityCountMap[city] = (cityCountMap[city] || 0) + 1;
    }
  });

  // Sıralama ve formatlama
  const result: CitySalesDataPoint[] = Object.entries(cityCountMap)
    .map(([city, count]) => ({
      city,
      orderCount: count,
    }))
    .sort((a, b) => b.orderCount - a.orderCount) // Azalan sıralama
    .slice(0, limit); // İlk X sonucu al

  return result;
}

// export async function getOrderStatusDistribution() { ... } 