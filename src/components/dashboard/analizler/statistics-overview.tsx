import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Package, AlertCircle } from 'lucide-react'; // AlertCircle eklendi
import { StatsDataResponse } from '@/app/api/profitability-analysis/statistics/route'; // API yanıt tipini import et

interface StatisticsOverviewProps {
  statsData: StatsDataResponse | null;
}

export default function StatisticsOverview({ statsData }: StatisticsOverviewProps) {

  // Veri yoksa veya hata varsa gösterilecek durum
  if (!statsData) {
    return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Yükleniyor...</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded animate-pulse"></div> 
              </CardContent>
            </Card>
         ))}
      </div>
    );
  }

  const { 
      ortalamaKarMarji,
      // toplamUrunSayisi, // Bu API'de eklendi ama card'da kullanılmıyor şimdilik
      // karliUrunSayisi, // Bu API'de eklendi ama card'da kullanılmıyor şimdilik
      // zararliUrunSayisi, // Bu API'de eklendi ama card'da kullanılmıyor şimdilik
      enKarlıUrun,
      enZararliUrun
  } = statsData; // Veriyi prop'tan al

  // API'de toplam satış adedi yok, şimdilik kaldıralım veya farklı bir metrik gösterelim.
  // Toplam ürün sayısını gösterelim
   const toplamUrunSayisi = statsData.toplamUrunSayisi;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ortalama Kar Marjı</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ortalamaKarMarji !== null ? `%${ortalamaKarMarji.toFixed(1)}` : 'N/A'}</div>
        </CardContent>
      </Card>
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Hesaplanan Ürün</CardTitle> {/* Başlık değişti */}
           <Package className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold">{toplamUrunSayisi}</div> {/* Veri değişti */}
         </CardContent>
       </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Karlı Ürün</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold truncate" title={enKarlıUrun?.ad}>{enKarlıUrun?.ad || '-'}</div>
          <p className="text-xs text-muted-foreground">
             %{enKarlıUrun?.karMarji !== undefined ? enKarlıUrun.karMarji.toFixed(1) : 'N/A'} kar marjı
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Düşük Karlı Ürün</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           <div className="text-lg font-semibold truncate" title={enZararliUrun?.ad}>{enZararliUrun?.ad || '-'}</div>
             <p className={`text-xs ${enZararliUrun && enZararliUrun.karMarji < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
               %{enZararliUrun?.karMarji !== undefined ? enZararliUrun.karMarji.toFixed(1) : 'N/A'} kar marjı
            </p>
        </CardContent>
      </Card>
    </div>
  );
} 