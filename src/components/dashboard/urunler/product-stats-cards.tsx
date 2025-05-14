'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
    Package, 
    CheckCircle, 
    XCircle, 
    Archive, 
    TrendingUp, 
    BatteryWarning, 
    FileQuestion, 
    Trophy 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// API'den gelen veri yapısına uygun interface
interface ProductStats {
  totalProducts: number;
  onSaleProducts: number;
  notApprovedProducts: number;
  outOfStockProducts: number;
  potentialRevenue: number;
  lowStockProducts: number;
  noSkuProducts: number;
}

interface ProductStatsCardsProps {
  stats: ProductStats | null;
  isLoading: boolean;
  onOpenTopSelling: () => void; // Çok satanlar modalını açmak için
}

export function ProductStatsCards({ stats, isLoading, onOpenTopSelling }: ProductStatsCardsProps) {
  if (isLoading) {
    // Yüklenirken iskelet (skeleton) gösterimi
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 mb-6">
        {[...Array(8)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    // Veri yoksa veya hata oluştuysa
    return <div className="text-center text-muted-foreground py-4">İstatistikler yüklenemedi.</div>;
  }

  return (
    // Responsive grid yapısı güncellendi
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Satışta Olan</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.onSaleProducts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Onaysız</CardTitle>
          <XCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.notApprovedProducts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stokta Olmayan</CardTitle>
          <Archive className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.outOfStockProducts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Potansiyel Ciro</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency ? formatCurrency(stats.potentialRevenue) : `${stats.potentialRevenue.toFixed(2)} TL`}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Düşük Stok (&lt;10)</CardTitle>
          <BatteryWarning className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lowStockProducts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SKU Tanımsız</CardTitle>
          <FileQuestion className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.noSkuProducts}</div>
        </CardContent>
      </Card>
      {/* Çok Satanlar kartı */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow bg-primary/5 border-primary/20" onClick={onOpenTopSelling}>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">En Çok Satanlar</CardTitle>
           <Trophy className="h-4 w-4 text-amber-500" />
         </CardHeader>
         <CardContent>
           <div className="text-lg font-semibold text-primary">İlk 5'i Gör</div>
           <p className="text-xs text-muted-foreground">Detayları görmek için tıkla</p>
         </CardContent>
      </Card>
    </div>
  );
} 