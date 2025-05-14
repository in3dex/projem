"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitySalesDataPoint } from "@/lib/services/dashboard-service";

interface TopCitiesChartProps {
  data: CitySalesDataPoint[] | null;
  error?: string | null;
  colors: { 
    bar: string;
    grid: string;
    tooltipContent: string;
    tooltipLabel: string;
    axisLabel: string;
  };
}

export function TopCitiesChart({ data, error, colors }: TopCitiesChartProps) {

  if (error) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Şehre Göre Sipariş Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Şehre Göre Sipariş Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Yeterli veri bulunamadı.</p>
        </CardContent>
      </Card>
    );
  }

  // Y eksenindeki etiketlerin uzunluğunu kısaltalım
  const formattedData = data.map(item => ({
    ...item,
    city: item.city.length > 10 ? `${item.city.substring(0, 8)}...` : item.city // Kısaltma
  }));

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">En Çok Sipariş Alan Şehirler</CardTitle>
      </CardHeader>
      <CardContent className="pl-0 pr-2 pb-2">
        <div className="h-[220px]"> {/* Yükseklik azaltıldı */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical" 
              data={formattedData} 
              margin={{
                top: 5,
                right: 25, 
                left: 5, 
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis 
                type="number" 
                stroke={colors.axisLabel} 
                fontSize={11} 
                tickFormatter={(value) => Math.floor(value) === value ? value.toString() : ''}
              />
              <YAxis
                dataKey="city"
                type="category"
                stroke={colors.axisLabel}
                width={60}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                    backgroundColor: colors.tooltipContent,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: colors.tooltipLabel, marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', color: colors.tooltipLabel }}
                formatter={(value: number, name: string, props: any) => {
                    // Orijinal şehir adını tooltip'te göster
                    const originalCity = data.find(d => d.city.startsWith(props.payload.city.substring(0,8)))?.city || props.payload.city;
                    return [`${value} Sipariş`, originalCity];
                }}
                labelFormatter={(label) => ""}
              />
              <Bar
                dataKey="orderCount"
                fill={colors.bar}
                radius={[0, 4, 4, 0]}
                barSize={12} // Çubuk kalınlığı azaltıldı
                name="Sipariş Sayısı"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 