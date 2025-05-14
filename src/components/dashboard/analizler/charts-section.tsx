'use client'; // Recharts client-side render gerektirir

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    PieChart, 
    Pie, 
    Cell, 
    Sector 
} from 'recharts';
import { SalesTrendDataPoint, CostDistributionDataPoint } from '@/types/analysis'; // Tipleri import et
import { AlertCircle } from 'lucide-react';

interface ChartsSectionProps {
  salesTrendData: SalesTrendDataPoint[] | null;
  costDistributionData: CostDistributionDataPoint[] | null;
}

// Recharts Pie Chart için renkler
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Pie chart label'larını özelleştirmek için
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Yüzde çok küçükse label'ı gösterme
    if (!percent || percent * 100 < 3) return null; 

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
            {`${name} ${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function ChartsSection({ salesTrendData, costDistributionData }: ChartsSectionProps) {

  // Grafik bileşenini sadece veri varsa render et
  const SalesTrendChart = salesTrendData && salesTrendData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Sipariş Adedi', angle: -90, position: 'insideLeft', style:{fontSize: '12px', fill:'#888888'} }}
                />
                 <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₺${value}`}
                     label={{ value: 'Toplam Tutar', angle: 90, position: 'insideRight', style:{fontSize: '12px', fill:'#888888'} }}
                />
                <Tooltip 
                    formatter={(value: number, name: string) => [
                        name === 'toplamTutar' ? `₺${value.toFixed(2)}` : value,
                        name === 'toplamTutar' ? 'Toplam Tutar' : 'Sipariş Sayısı'
                    ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="siparisSayisi" stroke="#8884d8" name="Sipariş Sayısı" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="toplamTutar" stroke="#82ca9d" name="Toplam Tutar" />
            </LineChart>
        </ResponsiveContainer>
  ) : null; // Veri yoksa null döndür

  const CostDistributionChart = costDistributionData && costDistributionData.length > 0 ? (
     <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={costDistributionData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // label={renderCustomizedLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {costDistributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}/>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
  ) : null; // Veri yoksa null döndür

   // renderContent fonksiyonu artık daha basit olabilir veya kaldırılabilir
   // Doğrudan Card içinde kontrol yapalım
   
  return (
    <div className="grid gap-4 md:grid-cols-2">
       {/* Sales Trend Card */}
       <Card>
         <CardHeader>
           <CardTitle>Satış Trendi</CardTitle>
           <CardDescription>Son 6 aylık sipariş adetleri ve ciro.</CardDescription>
         </CardHeader>
         <CardContent className="h-[300px] flex items-center justify-center">
           {!salesTrendData ? (
               <p className="text-muted-foreground flex items-center">
                   <AlertCircle className="h-4 w-4 mr-2 text-red-500"/> 
                   Grafik verisi yüklenemedi.
               </p>
           ) : salesTrendData.length === 0 ? (
                <p className="text-muted-foreground">Grafik için yeterli veri yok.</p>
           ) : (
               SalesTrendChart // Sadece veri varsa render et
           )}
         </CardContent>
       </Card>
       
       {/* Cost Distribution Card */}
        <Card>
         <CardHeader>
           <CardTitle>Maliyet Dağılımı (Tahmini)</CardTitle>
           <CardDescription>Varsayılan ayarlara göre maliyet kalemleri.</CardDescription>
         </CardHeader>
         <CardContent className="h-[300px] flex items-center justify-center">
            {!costDistributionData ? (
               <p className="text-muted-foreground flex items-center">
                   <AlertCircle className="h-4 w-4 mr-2 text-red-500"/> 
                   Grafik verisi yüklenemedi.
               </p>
           ) : costDistributionData.length === 0 ? (
                <p className="text-muted-foreground">Grafik için yeterli veri yok.</p>
           ) : (
               CostDistributionChart // Sadece veri varsa render et
           )}
         </CardContent>
       </Card>
    </div>
  );
} 