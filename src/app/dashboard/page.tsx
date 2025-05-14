import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from 'next/link';
import Image from 'next/image'; // Ürün resmi için
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  MessageSquareWarning, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  LineChart as LineChartIcon, // Recharts ile çakışmasın diye yeniden adlandır
  Package,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { auth } from "@/lib/auth/auth";
import { redirect } from 'next/navigation';
import { 
  getDashboardStats, 
  getRecentOrders, 
  getRevenueOverTime, 
  getTopSellingProducts, 
  TimeSeriesDataPoint, 
  RecentOrder, 
  DashboardStats,
  TopProduct,
  getSalesForecast,
  getSalesByDayOfWeek,
  ForecastDataPoint,
  WeeklySalesDataPoint,
  getMonthlySalesForecast,
  MonthlyPerformanceDataPoint,
  MonthlyForecastResult,
  getNextMonthDailyForecast,
  DailyForecastDataPoint,
  getTopCitiesByOrderCount, // Şehir verileri için eklendi
  CitySalesDataPoint // Şehir tipi eklendi
} from "@/lib/services/dashboard-service";
import { DashboardClientContent } from "@/components/dashboard/home/dashboard-client-content";

// --- Ana Dashboard Bileşeni (Artık Sunucu Bileşeni) ---

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role; // Kullanıcı rolünü al

  // Oturum kontrolü
  if (!userId) {
    redirect("/giris?callbackUrl=/dashboard");
  }

  // Hata mesajlarını tutacak değişkenler
  let statsError: string | null = null;
  let recentOrdersError: string | null = null;
  let revenueError: string | null = null;
  let topProductsError: string | null = null;
  let forecastError: string | null = null;
  let weeklySalesError: string | null = null;
  let monthlyForecastError: string | null = null;
  let nextMonthDailyForecastError: string | null = null;
  let topCitiesError: string | null = null; // Şehir hatası için değişken eklendi

  // Verileri sunucu tarafında çek (Promise.all ile paralel)
  const [statsData, recentOrdersData, revenueData, topProductsData, forecastData, weeklySalesData, monthlyDataResult, nextMonthDailyForecastData, topCitiesData] = await Promise.all([
    getDashboardStats().catch(err => { console.error("Stats Error:", err); statsError = "İstatistikler yüklenemedi."; return null; }),
    getRecentOrders(5).catch(err => { console.error("Recent Orders Error:", err); recentOrdersError = "Son siparişler yüklenemedi."; return null; }),
    getRevenueOverTime(30).catch(err => { console.error("Revenue Data Error:", err); revenueError = "Gelir verisi yüklenemedi."; return null; }),
    getTopSellingProducts(30, 5).catch(err => { console.error("Top Products Error:", err); topProductsError = "Çok satan ürünler yüklenemedi."; return null; }),
    getSalesForecast(30, 7, 7).catch(err => { console.error("Forecast Data Error:", err); forecastError = "Günlük tahmin verisi yüklenemedi."; return null; }),
    getSalesByDayOfWeek(90).catch(err => { console.error("Weekly Sales Error:", err); weeklySalesError = "Haftalık satış verisi yüklenemedi."; return null; }),
    getMonthlySalesForecast(12, 3).catch(err => { 
      console.error("Monthly Forecast Error:", err); 
      monthlyForecastError = "Aylık veri ve tahmin yüklenemedi."; 
      return { historicalData: null, forecastValue: null }; // Hata durumunda null döndür
    }),
    getNextMonthDailyForecast(90).catch(err => { 
        console.error("Next Month Daily Forecast Error:", err); 
        nextMonthDailyForecastError = "Gelecek ay günlük tahmin yüklenemedi."; 
        return []; // Hata durumunda boş dizi döndür
    }),
    getTopCitiesByOrderCount(90, 5).catch(err => { // Şehir verilerini yeniden ekledik
        console.error("Top Cities Error:", err); 
        topCitiesError = "Şehir verisi yüklenemedi."; 
        return [];
    })
  ]);

  // Aylık veriyi ve tahmini ayır
  const historicalMonthlyData = monthlyDataResult?.historicalData ?? null;
  const nextMonthForecastValue = monthlyDataResult?.forecastValue ?? null;

  const isAdmin = userRole === 'ADMIN'; // Admin kontrolü

  // Çekilen veriyi Client Component'e prop olarak gönder
  return (
    <div className="flex min-h-screen w-full flex-col">
       {/* Client içeriğini render et */}
       <DashboardClientContent 
         statsData={statsData as DashboardStats | null} 
         statsError={statsError}
         recentOrdersData={recentOrdersData as RecentOrder[] | null} 
         recentOrdersError={recentOrdersError}
         revenueData={revenueData as TimeSeriesDataPoint[] | null} 
         revenueError={revenueError}
         topProductsData={topProductsData as TopProduct[] | null} 
         topProductsError={topProductsError}
         forecastData={forecastData as ForecastDataPoint[] | null} 
         forecastError={forecastError}
         weeklySalesData={weeklySalesData as WeeklySalesDataPoint[] | null} 
         weeklySalesError={weeklySalesError}
         historicalMonthlyData={historicalMonthlyData as MonthlyPerformanceDataPoint[] | null}
         nextMonthForecastValue={nextMonthForecastValue}
         monthlyForecastError={monthlyForecastError}
         nextMonthDailyForecastData={nextMonthDailyForecastData as DailyForecastDataPoint[] | null}
         nextMonthDailyForecastError={nextMonthDailyForecastError}
         topCitiesData={topCitiesData as CitySalesDataPoint[] | null} // Şehir verisi eklendi
         topCitiesError={topCitiesError} // Şehir hatası eklendi
         isAdmin={isAdmin}
       />
    </div>
  )
}

// Bu dosyadaki tüm yardımcı bileşen tanımları (TopSellingProducts, SalesReportChart, RecentOrders, getStatusVariant vb.) kaldırıldı.
// Bu bileşenler ya DashboardClientContent içine taşınmalı ya da kendi ayrı dosyalarına konulmalıdır.