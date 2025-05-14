"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LineChart as LineChartIcon, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
// Tipi import et
import { DailyForecastDataPoint } from "@/lib/services/dashboard-service"; 
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

// Props'a renkleri ekle
interface NextMonthDailyForecastChartProps { 
  forecastData: DailyForecastDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
  lineColor: string;
  dotColor: string;
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  tooltipBorder: string;
}

// X ekseni formatlayıcısı (örn: 05 May)
const formatXAxis = (tickItem: string) => {
  try {
    const date = new Date(tickItem);
    return format(date, "dd MMM", { locale: tr });
  } catch (e) {
    return tickItem;
  }
};

export function NextMonthDailyForecastChart({ 
  forecastData, 
  isLoading, 
  error, 
  // Renkleri props'dan al
  lineColor,
  dotColor,
  textColor,
  gridColor,
  tooltipBg,
  tooltipBorder
}: NextMonthDailyForecastChartProps) {
  if (isLoading) {
    // Skeleton
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-3/5 mt-1" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Hata gösterimi
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Günlük Tahmin Grafiği Hatası</CardTitle>
          <CardDescription className="text-destructive">
            Grafik verileri alınırken bir sorun oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[300px]">
          <p className="text-destructive text-center">Hata: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = forecastData && forecastData.length > 0;
  const nextMonthName = hasData ? format(new Date(forecastData[0].date), "MMMM yyyy", { locale: tr }) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gelecek Ay Günlük Satış Tahmini ({nextMonthName})</CardTitle>
        <CardDescription>Son 90 gün verisine göre günlük tahminler</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pl-2 pr-4 pb-4"> {/* Yükseklik ayarlanabilir */} 
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={forecastData}
              margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatXAxis}
                // interval={6} // Etiketleri seyreltmek için (opsiyonel)
              />
              <YAxis
                stroke={textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, "TRY", "tr-TR", true)}
              />
              <Tooltip
                cursor={{ stroke: textColor , strokeWidth: 1, strokeDasharray: '3 3'}}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)",
                }}
                labelStyle={{ color: textColor }}
                itemStyle={{ color: textColor }}
                labelFormatter={(label) => format(new Date(label as string), "dd MMMM yyyy", { locale: tr })}
                formatter={(value: number) => [formatCurrency(value), "Tahmini Ciro"]}
              />
              <Line
                type="monotone"
                dataKey="forecastValue"
                stroke={lineColor} // Prop'dan gelen rengi kullan
                strokeWidth={2}
                dot={{ r: 2, fill: dotColor }} // Prop'dan gelen rengi kullan
                activeDot={{ r: 5, strokeWidth: 1, fill: dotColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <LineChartIcon className="h-10 w-10 mb-2" />
            <p className="text-center">Günlük tahmin verisi bulunamadı.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-start gap-1 pt-4">
        <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
        <span>
          Tahminler, geçmiş 90 gündeki haftanın günü ortalamalarına dayanmaktadır.
        </span>
      </CardFooter>
    </Card>
  );
} 