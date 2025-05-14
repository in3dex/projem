'use client';

import Image from 'next/image';
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// Arayüz API'den gelen yeni yanıta göre güncellendi
interface TopSellingProductData {
  productDetail: {
    id: string;
    barcode: string;
    stockCode: string | null;
    images: any; // JSON tipi
    title: string;
  } | null; // Ürün bulunamayabilir
  barcode: string; // Hangi barkod olduğu bilgisi
  totalQuantitySold: number;
}

interface TopSellingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  topSellingProducts: TopSellingProductData[] | null | undefined; // Yeni tip kullanılıyor
}

export function TopSellingModal({ 
  isOpen, 
  onOpenChange, 
  isLoading, 
  topSellingProducts
}: TopSellingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5"/> En Çok Satan Ürünler
          </DialogTitle>
          <DialogDescription>
            Son 30 gün içinde en çok satılan ilk 5 ürün.
            {/* Açıklama güncellendi (API'de 5'e çıkardık) */}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : topSellingProducts && topSellingProducts.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
              {/* Map'leme doğrudan gelen dizi üzerinden yapılıyor */}
              {topSellingProducts.map((item, index) => {
                // Item null/undefined ise render etme (gerçi API boş döndürmemeli)
                if (!item) return null;

                let imageUrl: string | null = null;
                // productDetail üzerinden erişim
                const productTitle: string = item.productDetail?.title ?? '(Ürün Adı Yok)';
                const stockCode: string | null = item.productDetail?.stockCode ?? null;
                
                try {
                   // productDetail üzerinden görsel alma
                   if (item.productDetail?.images && Array.isArray(item.productDetail.images) && item.productDetail.images[0]?.url) {
                      imageUrl = item.productDetail.images[0].url;
                   } else if (item.productDetail?.images && typeof item.productDetail.images === 'object' && (item.productDetail.images as any).url) {
                     imageUrl = (item.productDetail.images as any).url;
                   }
                 } catch (e) { console.error("Image parse error in modal:", e); }

                return (
                  <Card 
                    key={item.barcode} 
                     className={cn(
                      "flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out hover:shadow-lg",
                      // Öne çıkarma stilini kaldırabilir veya farklı bir şekilde yapabiliriz
                    )}
                  >
                    <CardHeader className="p-0 relative">
                      <Badge 
                        variant={"secondary"} 
                        className="absolute top-2 right-2 z-10 flex items-center gap-1"
                      >
                         #{index + 1} 
                      </Badge>
                      {imageUrl ? (
                        <Image 
                          src={imageUrl} 
                          alt={productTitle} 
                          width={150} // Daha küçük görseller
                          height={150}
                          className="w-full h-36 object-cover" // Yükseklik ayarlandı
                          unoptimized
                          onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                        />
                      ) : <div className="h-36 w-full bg-secondary flex items-center justify-center text-muted-foreground">Görsel Yok</div>}
                    </CardHeader>
                    <CardContent className="p-3 flex flex-col flex-grow"> 
                        {/* Veri erişimi productDetail üzerinden */}
                        <h3 className="font-semibold text-xs mb-1 line-clamp-2">{productTitle}</h3>
                        <p className="text-xs text-muted-foreground mb-1">Barkod: {item.barcode}</p>
                        <p className="text-xs text-muted-foreground mb-2">SKU: {stockCode ?? '-'}</p>
                        <div className="mt-auto flex justify-between items-center pt-1 border-t">
                            <p className="text-xs font-medium">Satış Adedi:</p>
                            <Badge variant="default">{item.totalQuantitySold}</Badge>
                        </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Son 30 günde satış verisi bulunamadı.</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 