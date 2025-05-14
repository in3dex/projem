"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TopProduct } from "@/lib/services/dashboard-service"; // Tipi import et

interface TopSellingProductsProps {
  products: TopProduct[] | null;
  isLoading: boolean;
  error: string | null;
}

export function TopSellingProducts({ products, isLoading, error }: TopSellingProductsProps) {

  if (isLoading) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-4/5 mt-1" />
        </CardHeader>
        <CardContent className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="rounded-md h-10 w-10" />
              <div className="grid gap-1 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-12 ml-auto" />
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-32 ml-auto" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive">En Çok Satanlar Hatası</CardTitle>
          <CardDescription className="text-destructive">Veriler alınırken bir sorun oluştu.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Hata: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">En Çok Satan Ürünler</CardTitle>
        <CardDescription>Son 30 günde en çok satan ürünler</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mb-2" />
            <p className="text-center">Satış verisi bulunamadı.</p>
          </div>
        ) : (
          products.map((item) => {
            // Güvenli resim URL alma
            const imageUrl = Array.isArray(item.productDetail?.images) && item.productDetail?.images.length > 0
              ? item.productDetail.images[0]?.url
              : null;

            return (
              <div key={item.barcode} className="flex items-center gap-4 p-2 hover:bg-muted/20 rounded-md transition-colors">
                <div className="bg-muted rounded-md flex items-center justify-center aspect-square w-10 h-10 overflow-hidden border">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.productDetail?.title || 'Ürün Resmi'}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="grid gap-1 flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate" title={item.productDetail?.title || item.barcode}>
                    {item.productDetail?.title || `Barkod: ${item.barcode}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.productDetail?.stockCode ? `SKU: ${item.productDetail.stockCode}` : `Barkod: ${item.barcode}`}
                  </p>
                </div>
                <div className="font-medium text-sm whitespace-nowrap">{item.totalQuantitySold} adet</div>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button asChild size="sm" variant="outline" className="ml-auto gap-1 group">
          <Link href="/dashboard/urunler?sort=sales_desc">
            Tüm Ürünler
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 