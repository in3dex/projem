import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, PackageMinus, ArrowRight, Info } from 'lucide-react'; // Info eklendi
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ActionItemProduct } from '@/app/api/profitability-analysis/action-items/route'; // API yanıt tipini import et

interface ActionItemsProps {
  actionItems: ActionItemProduct[] | null;
}

// Mock data kaldırıldı

const getIconAndColor = (sebep: ActionItemProduct['sebep']) => {
  switch (sebep) {
    case 'ZARARINA_SATIS':
      return { Icon: TrendingDown, color: 'text-red-500' };
    case 'DUSUK_STOK':
      return { Icon: PackageMinus, color: 'text-yellow-500' };
    case 'FIYAT_FARKI':
       return { Icon: AlertTriangle, color: 'text-blue-500' };
    case 'YUKSEK_IADE':
      return { Icon: AlertTriangle, color: 'text-orange-500' };
    default:
      return { Icon: AlertTriangle, color: 'text-gray-500' };
  }
};

export default function ActionItems({ actionItems }: ActionItemsProps) {
  // Veri yoksa veya hata varsa farklı mesajlar göster
  if (actionItems === null) {
    return (
      <Card>
        <CardHeader>
           <CardTitle>Aksiyon Gereken Ürünler</CardTitle>
           <CardDescription>Fiyatlandırma, stok veya diğer metriklerde dikkat edilmesi gereken ürünler burada listelenir.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500"/> 
            Aksiyon listesi yüklenirken bir hata oluştu.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardHeader>
           <CardTitle>Aksiyon Gereken Ürünler</CardTitle>
           <CardDescription>Fiyatlandırma, stok veya diğer metriklerde dikkat edilmesi gereken ürünler burada listelenir.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground flex items-center">
            <Info className="h-4 w-4 mr-2 text-blue-500"/>
            Şu anda acil aksiyon gerektiren bir ürün bulunmamaktadır.
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
       <CardHeader>
         <CardTitle>Aksiyon Gereken Ürünler</CardTitle>
         <CardDescription>Fiyatlandırma, stok veya diğer metriklerde dikkat edilmesi gereken ürünler.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actionItems.map((item) => { // Prop'tan gelen veriyi kullan
            const { Icon, color } = getIconAndColor(item.sebep);
            return (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center space-x-3">
                   <Icon className={`h-5 w-5 ${color}`} />
                   <div>
                      <p className="text-sm font-medium leading-none truncate" title={item.ad}>{item.ad} <span className="text-xs text-muted-foreground">({item.barkod})</span></p>
                      <p className={`text-xs ${color}`}>{item.detay}</p>
                   </div>
                </div>
                {/* TODO: Link'i ürün detay sayfasına yönlendir - Şimdilik doğru görünüyor */}
                <Link href={`/dashboard/urunler/${item.id}?tab=karlilik`} passHref>
                    <Button variant="outline" size="sm">
                        İncele <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 