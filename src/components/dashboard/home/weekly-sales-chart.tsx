"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BarChart as BarChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { WeeklySalesDataPoint } from "@/lib/services/dashboard-service";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

interface WeeklySalesChartProps {
  weeklyData: WeeklySalesDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
  barColor: string;
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  tooltipBorder: string;
}

const dayNames = ["Paz", "Pzt", "Sal", "Çrş", "Per", "Cum", "Cmt"];

// X ekseni etiketlerini formatlamak için fonksiyon
const formatXAxis = (tickItem: number) => {
  return dayNames[tickItem] || "";
};

export function WeeklySalesChart({
  weeklyData,
  isLoading,
  error,
  barColor,
  textColor,
  gridColor,
  tooltipBg,
  tooltipBorder
}: WeeklySalesChartProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
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
    return (
      <Card className="border-destructive shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive">Haftalık Satış Grafiği Hatası</CardTitle>
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

  const hasData = weeklyData && weeklyData.length > 0 && weeklyData.some(d => d.averageSales > 0);

  // Haftanın başlangıcını Pazartesi yapmak için veriyi sırala (isteğe bağlı)
  const sortedData = weeklyData?.slice().sort((a, b) => 
    (a.dayOfWeek === 0 ? 7 : a.dayOfWeek) - (b.dayOfWeek === 0 ? 7 : b.dayOfWeek)
  );

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow"> 
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Haftalık Ortalama Satış</CardTitle>
        <CardDescription>Haftanın günlerine göre ortalama ciro</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pl-2 pr-4 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{
                top: 15,
                right: 10,
                left: -25,
                bottom: 5,
              }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="dayOfWeek"
                stroke={textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatXAxis}
              />
              <YAxis
                stroke={textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, "TRY", "tr-TR", true)}
              />
              <Tooltip
                cursor={{ fill: `${barColor}33` }} // Yarı şeffaf hover efekti
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: textColor, fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}
                itemStyle={{ color: textColor, fontSize: "11px" }}
                labelFormatter={(label) => `${formatXAxis(label as number)} Günü`}
                formatter={(value: number) => [formatCurrency(value), "Ort. Ciro"]}
              />
              <Bar
                dataKey="averageSales"
                fill={barColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                animationDuration={500}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BarChartIcon className="h-10 w-10 mb-2" />
            <p className="text-center">Haftalık satış verisi bulunamadı.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 