"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LineChart as LineChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
// Tipi güncelle
import { MonthlyPerformanceDataPoint } from "@/lib/services/dashboard-service"; 
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
interface MonthlyPerformanceChartProps { 
  historicalData: MonthlyPerformanceDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
  lineColor: string;
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  tooltipBorder: string;
}

// X ekseni formatlayıcısı aynı kalabilir
const formatXAxis = (tickItem: string) => {
  try {
    const date = new Date(`${tickItem}-01T00:00:00`);
    return format(date, "MMM yy", { locale: tr });
  } catch (e) {
    return tickItem;
  }
};

// Bileşen adını ve props'u güncelle
export function MonthlyPerformanceChart({ 
  historicalData, 
  isLoading, 
  error, 
  // Renkleri props'dan al
  lineColor,
  textColor,
  gridColor,
  tooltipBg,
  tooltipBorder
}: MonthlyPerformanceChartProps) {
  if (isLoading) {
    // Skeleton aynı kalabilir
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-3/5 mt-1" />
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Hata gösterimi aynı kalabilir, başlığı güncelle
    return (
      <Card className="border-destructive shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive">Aylık Performans Grafiği Hatası</CardTitle>
          <CardDescription className="text-destructive">
            Grafik verileri alınırken bir sorun oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[320px]">
          <p className="text-destructive text-center">Hata: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // hasData kontrolünü güncelle
  const hasData = historicalData && historicalData.length > 0 && historicalData.some(d => d.value > 0);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        {/* Başlığı ve açıklamayı güncelle */} 
        <CardTitle className="text-xl">Aylık Satış Performansı</CardTitle>
        <CardDescription>Son 12 aylık ciro</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] pl-2 pr-4 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={historicalData} 
              margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
            >
              {/* Gradient'i kaldırabiliriz, renk prop ile geliyor */}
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="month" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatXAxis}/>
              <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, "TRY", "tr-TR", true)}/>
              <Tooltip
                cursor={{ stroke: textColor, strokeWidth: 1, strokeDasharray: '3 3'}}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  padding: "8px 12px"
                }}
                labelStyle={{ color: textColor, fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }} 
                itemStyle={{ color: textColor, fontSize: "11px" }}
                labelFormatter={(label) => formatXAxis(label as string)}
                formatter={(value: number) => [formatCurrency(value), "Ciro"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor} // Prop'dan gelen rengi kullan
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 1, fill: lineColor, stroke: tooltipBg }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          // Veri yok mesajı: İkonu güncelle
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <LineChartIcon className="h-10 w-10 mb-2" />
            <p className="text-center">Aylık satış verisi bulunamadı.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 