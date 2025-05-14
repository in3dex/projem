"use client";

import { Suspense } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/home/stat-card";
import { DashboardSkeleton } from "@/components/dashboard/home/dashboard-skeleton";
import { formatCurrency } from '@/lib/utils';
import { 
  DollarSign, 
  ShoppingBag, 
  HelpCircle,
  ArrowUpRight,
  Package,
  Repeat,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Hourglass,
  AlertCircle,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { RecentOrders } from "./recent-orders";
import { SalesReportChart } from "./sales-report-chart";
import { TopSellingProducts } from "./top-selling-products";
import { WeeklySalesChart } from "./weekly-sales-chart";
import { MonthlyPerformanceChart } from "./monthly-performance-chart";
import { NextMonthDailyForecastChart } from "./next-month-daily-forecast-chart";
import { TopCitiesChart } from "@/components/dashboard/charts/top-cities-chart";
import { 
  TimeSeriesDataPoint, 
  RecentOrder, 
  TopProduct, 
  ForecastDataPoint, 
  WeeklySalesDataPoint, 
  MonthlyPerformanceDataPoint, 
  DailyForecastDataPoint, 
  CitySalesDataPoint
} from "@/lib/services/dashboard-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTheme } from "next-themes";

// Gelen prop tipleri
interface DashboardClientContentProps {
  statsData: {
    totalRevenue: string;
    totalOrders: number;
    pendingQuestions: number;
    totalProducts: number;
    totalClaims: number;
    monthlyRevenue: string;
    monthlyOrders: number;
    pendingOrders: number;
  } | null;
  statsError: string | null;
  recentOrdersData: RecentOrder[] | null;
  recentOrdersError: string | null;
  revenueData: TimeSeriesDataPoint[] | null;
  revenueError: string | null;
  topProductsData: TopProduct[] | null;
  topProductsError: string | null;
  forecastData: ForecastDataPoint[] | null;
  forecastError: string | null;
  weeklySalesData: WeeklySalesDataPoint[] | null;
  weeklySalesError: string | null;
  historicalMonthlyData: MonthlyPerformanceDataPoint[] | null;
  monthlyForecastError: string | null;
  nextMonthForecastValue: number | null;
  nextMonthDailyForecastData: DailyForecastDataPoint[] | null;
  nextMonthDailyForecastError: string | null;
  topCitiesData: CitySalesDataPoint[] | null;
  topCitiesError: string | null;
  isAdmin: boolean;
}

export function DashboardClientContent({ 
  statsData, 
  statsError,
  recentOrdersData, 
  recentOrdersError,
  revenueData, 
  revenueError,
  topProductsData, 
  topProductsError,
  forecastData, 
  forecastError,
  weeklySalesData, 
  weeklySalesError,
  historicalMonthlyData,
  monthlyForecastError,
  nextMonthForecastValue,
  nextMonthDailyForecastData,
  nextMonthDailyForecastError,
  topCitiesData,
  topCitiesError,
  isAdmin 
}: DashboardClientContentProps) {
  const isLoadingWeeklySales = weeklySalesData === undefined;
  const isLoadingMonthlyPerformance = historicalMonthlyData === undefined;
  const isLoadingNextMonthDailyForecast = nextMonthDailyForecastData === undefined;
  const isLoadingTopCities = topCitiesData === undefined;

  // Get current theme
  const { theme } = useTheme();

  // Renkleri tema bazlı HSL stringleri olarak tanımla
  // Recharts bunları doğrudan kullanabilir.
  const colors = {
      bar: theme === 'dark' ? "hsl(210, 40%, 96.1%)" : "hsl(222.2, 47.4%, 11.2%)", // foreground
      line: theme === 'dark' ? "hsl(210, 40%, 96.1%)" : "hsl(222.2, 47.4%, 11.2%)", // foreground
      area: theme === 'dark' ? "hsl(210, 40%, 96.1%)" : "hsl(222.2, 47.4%, 11.2%)", // foreground
      grid: theme === 'dark' ? "hsl(215, 27.9%, 16.9%)" : "hsl(220, 13%, 91%)",      // border
      tooltipContent: theme === 'dark' ? "hsl(224, 71.4%, 4.1%)" : "hsl(0, 0%, 100%)",       // popover
      tooltipLabel: theme === 'dark' ? "hsl(210, 40%, 96.1%)" : "hsl(220.9, 39.3%, 11%)",   // popover-foreground
      axisLabel: theme === 'dark' ? "hsl(215, 16.3%, 56.9%)" : "hsl(215.4, 16.3%, 46.9%)" // muted-foreground
  };

  // Son veri yenileme zamanı
  const lastUpdated = new Date().toLocaleTimeString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 md:p-6 pb-8">
      <div className="flex flex-col md:flex-row items-center justify-between border-b pb-4 mb-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Kontrol Paneli</h1>
        <div className="flex gap-3 mt-3 md:mt-0">
          <p className="text-sm text-muted-foreground hidden md:flex items-center">
            <span className="mr-1">Son güncelleme:</span>
            {lastUpdated}
          </p>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
          {isAdmin && (
            <Button asChild variant="default" size="sm" className="h-8">
              <Link href="/admin">
                Yönetici Paneli
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* İstatistik Kartları Bölümü */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {statsError ? (
              <Alert variant="destructive" className="col-span-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{statsError}</AlertDescription>
              </Alert>
          ) : statsData ? (
            <>
              <StatCard
                title="Son 30 Gün Ciro"
                value={formatCurrency(parseFloat(statsData.monthlyRevenue || '0'))}
                icon={TrendingUp}
                description="Son 30 gün performansı"
                className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/40 dark:to-cyan-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Son 30 Gün Sipariş"
                value={statsData.monthlyOrders}
                icon={CalendarDays}
                description="Son 30 gün performansı"
                className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/40 dark:to-yellow-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Toplam Ciro"
                value={formatCurrency(parseFloat(statsData.totalRevenue || '0'))}
                icon={DollarSign}
                description="Tüm zamanlar"
                className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Toplam Sipariş"
                value={statsData.totalOrders}
                icon={ShoppingBag}
                description="Tüm zamanlar"
                className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/40 dark:to-violet-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Toplam Ürün"
                value={statsData.totalProducts}
                icon={Package}
                description="Aktif ürünler"
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Bekleyen Sorular"
                value={statsData.pendingQuestions}
                icon={HelpCircle}
                description="Cevaplanmamış sorular"
                className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Bekleyen Siparişler"
                value={statsData.pendingOrders}
                icon={Hourglass}
                description="Hazırlanan/Faturalanan"
                className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/40 dark:to-pink-900/20 transform transition-all hover:translate-y-[-3px]"
              />
              <StatCard
                title="Toplam İade"
                value={statsData.totalClaims}
                icon={Repeat}
                description="Tüm iade talepleri"
                className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 transform transition-all hover:translate-y-[-3px]"
              />
            </>
          ) : (
            <p className="text-muted-foreground col-span-full">İstatistik verisi bulunamadı.</p>
          )}
        </div>
      </Suspense>

      {/* Grafik ve Tablo Alanları */}
      <div className="grid gap-5 md:grid-cols-1 lg:grid-cols-3">
          {/* Başlık */}
          <div className="col-span-full">
            <h2 className="text-xl font-semibold mb-2">Performans Analizleri</h2>
            <div className="w-full h-px bg-border mb-2"></div>
          </div>
          
          {/* Sütun 1: Aylık Performans ve Şehirler */} 
          <div className="lg:col-span-1 grid gap-5">
              <MonthlyPerformanceChart 
                 historicalData={historicalMonthlyData}
                 isLoading={isLoadingMonthlyPerformance}
                 error={monthlyForecastError}
                 lineColor={colors.line}
                 textColor={colors.axisLabel}
                 gridColor={colors.grid}
                 tooltipBg={colors.tooltipContent}
                 tooltipBorder={colors.grid}
              />
              <TopCitiesChart 
                data={topCitiesData}
                error={topCitiesError}
                colors={colors}
              />
          </div>

          {/* Sütun 2: Tahmin ve Haftalık */} 
          <div className="lg:col-span-1 grid gap-5">
               <NextMonthDailyForecastChart 
                  forecastData={nextMonthDailyForecastData}
                  isLoading={isLoadingNextMonthDailyForecast}
                  error={nextMonthDailyForecastError}
                  lineColor={colors.line}
                  dotColor={colors.line}
                  textColor={colors.axisLabel}
                  gridColor={colors.grid}
                  tooltipBg={colors.tooltipContent}
                  tooltipBorder={colors.grid}
              />
              <WeeklySalesChart 
                weeklyData={weeklySalesData}
                isLoading={isLoadingWeeklySales}
                error={weeklySalesError}
                barColor={colors.bar}
                textColor={colors.axisLabel}
                gridColor={colors.grid}
                tooltipBg={colors.tooltipContent}
                tooltipBorder={colors.grid}
              />
          </div>

          {/* Sütun 3: Siparişler ve Ürünler */} 
          <div className="lg:col-span-1 grid gap-5">
              <RecentOrders 
                orders={recentOrdersData} 
                isLoading={recentOrdersData === undefined}
                error={recentOrdersError}
              />
              <TopSellingProducts 
                products={topProductsData} 
                isLoading={topProductsData === undefined}
                error={topProductsError}
              />
          </div>
      </div>

    </main>
  );
}

// Not: RecentOrders, SalesReportChart, TopSellingProducts gibi alt bileşenlerin
// tanımları ya bu dosyada olmalı ya da ayrı dosyalardan import edilmeli.
// Şimdilik placeholder olarak bırakıldı. page.tsx içindeki ilgili fonksiyonlar
// bu bileşenlere taşınmalı veya bu bileşenler yeniden oluşturulmalı. 