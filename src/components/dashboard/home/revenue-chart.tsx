'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TimeSeriesDataPoint } from "@/lib/services/dashboard-service"; // Veri tipi import edildi
import { formatCurrency } from "@/lib/utils";
import { ChartTooltipContent } from "@/components/ui/chart"; // Shadcn tooltip içeriği

interface RevenueChartProps {
  data: TimeSeriesDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
   // Veri var mı ve hepsi sıfır mı kontrolü
   const hasData = data.some(d => d.value > 0);

  return (
    <Card className="lg:col-span-2"> {/* Grid layout için span */} 
      <CardHeader>
        <CardTitle>Son 30 Günlük Ciro</CardTitle>
        <CardDescription>
          Günlük toplam ciro performansı.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[350px] pl-2 pr-6 pb-6"> {/* Recharts için padding ayarı */}
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                tickFormatter={(value) => formatCurrency(value, 'TRY', 'tr-TR', true)} // Compact format
                width={80}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    hideLabel // Tarih label'ını gizle, tooltip'te zaten var
                    formatter={(value) => formatCurrency(value)}
                 />}
              />
              <Area
                dataKey="value"
                type="monotone"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorRevenue)" // Gradient fill
                fillOpacity={0.4}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 1, stroke: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
             {/* <LineChartIcon className="h-10 w-10 mb-2" /> İkon tanımı yok, geçici kaldırıldı */} 
             <p className="text-center">Son 30 gün için ciro verisi bulunamadı.</p>
           </div>
        )}
      </CardContent>
    </Card>
  )
} 