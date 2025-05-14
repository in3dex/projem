"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LineChart as LineChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TimeSeriesDataPoint } from '@/lib/services/dashboard-service';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area
} from 'recharts';

interface SalesReportChartProps {
  salesData: TimeSeriesDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
}

export function SalesReportChart({ salesData, isLoading, error }: SalesReportChartProps) {

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-2/5 mt-1" />
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="lg:col-span-2 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Satış Grafiği Hatası</CardTitle>
          <CardDescription className="text-destructive">Grafik verileri alınırken bir sorun oluştu.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px]">
          <p className="text-destructive text-center">Hata: {error}</p>
        </CardContent>
      </Card>
    )
  }

  // Veri var ama hepsi sıfır mı veya veri yok mu kontrolü
  const hasRevenueData = salesData && salesData.some(d => d.value > 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Son 30 Günlük Satış Performansı</CardTitle>
        <CardDescription>Günlük ciro grafiği</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px] pl-2 pr-6 pb-6"> {/* Recharts için padding */}
        {hasRevenueData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={salesData}
              margin={{
                top: 5,
                right: 10,
                left: -15,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => format(new Date(value), "dd MMM")}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, 'TRY', 'tr-TR', true)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-md)'
                }}
                labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy")}
                formatter={(value: number) => [formatCurrency(value), 'Ciro']}
              />
              <Area
                type="monotone"
                dataKey="value" // `value` olarak değiştirildi
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 1, stroke: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <LineChartIcon className="h-10 w-10 mb-2" />
            <p className="text-center">Son 30 gün için satış verisi bulunamadı.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 