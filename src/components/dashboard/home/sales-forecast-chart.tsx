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
import { ForecastDataPoint } from "@/lib/services/dashboard-service";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  ReferenceArea,
} from "recharts";

interface SalesForecastChartProps {
  forecastData: ForecastDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
}

export function SalesForecastChart({
  forecastData,
  isLoading,
  error,
}: SalesForecastChartProps) {
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
          <CardTitle className="text-destructive">Satış Tahmin Grafiği Hatası</CardTitle>
          <CardDescription className="text-destructive">
            Grafik verileri alınırken bir sorun oluştu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px]">
          <p className="text-destructive text-center">Hata: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = forecastData && forecastData.length > 0;
  const forecastStartIndex = forecastData?.findIndex((d) => d.isForecast) ?? -1;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Satış Performansı ve Tahmini</CardTitle>
        <CardDescription>
          Geçmiş satışlar ve önümüzdeki 7 gün için basit tahmin.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[350px] pl-2 pr-6 pb-6">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecastData}
              margin={{
                top: 5,
                right: 10,
                left: -15,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.05} />
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
                tickFormatter={(value) => formatCurrency(value, "TRY", "tr-TR", true)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)",
                }}
                labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy")}
                formatter={(value: number, name: string, props) => {
                  const prefix = props.payload.isForecast ? "Tahmin: " : "Ciro: ";
                  return [formatCurrency(value), prefix];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorHistory)"
                strokeWidth={2}
                dot={false}
              />
              {forecastStartIndex !== -1 && (
                <ReferenceArea
                  x1={forecastData?.[forecastStartIndex]?.date}
                  x2={forecastData?.[forecastData.length - 1]?.date}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.1}
                  ifOverflow="visible"
                  label={(
                    <text x={10} y={15} fontSize="10" fill="hsl(var(--muted-foreground))">
                      Tahmin
                    </text>
                  )}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <LineChartIcon className="h-10 w-10 mb-2" />
            <p className="text-center">Grafik için veri bulunamadı.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-start gap-1 pt-4">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span>
            Tahminler, son 7 günlük ortalama satışlara dayanmaktadır.
            Bu basit bir projeksiyondur ve gerçek sonuçlar farklılık gösterebilir.
          </span>
      </CardFooter>
    </Card>
  );
} 