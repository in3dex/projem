"use client";

import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowUpRight, Package, ShoppingBag } from "lucide-react";
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
import { RecentOrder } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface RecentOrdersProps {
  orders: RecentOrder[] | null;
  isLoading: boolean;
  error: string | null;
}

// Sipariş durumlarını görsel olarak işaretle
function getStatusVariant(status: string) {
  switch (status) {
    case "READY_TO_SHIP":
      return { variant: "secondary", label: "Hazırlanıyor" };
    case "INVOICED":
      return { variant: "secondary", label: "Faturalı" };
    case "SHIPPED":
      return { variant: "default", label: "Gönderildi" };
    case "DELIVERED":
      return { variant: "success", label: "Teslim Edildi" };
    case "CANCELLED":
      return { variant: "destructive", label: "İptal" };
    case "RETURNED":
      return { variant: "destructive", label: "İade" };
    default:
      return { variant: "outline", label: status };
  }
}

export function RecentOrders({ orders, isLoading, error }: RecentOrdersProps) {
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
          <CardTitle className="text-destructive">Son Siparişler Hatası</CardTitle>
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
        <CardTitle className="text-lg">Son Siparişler</CardTitle>
        <CardDescription>En son verilen siparişler</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mb-2" />
            <p className="text-center">Henüz sipariş verilmemiş.</p>
          </div>
        ) : (
          orders.map((order) => {
            const status = getStatusVariant(order.status);
            
            return (
              <div key={order.id} className="flex items-center gap-4 p-2 hover:bg-muted/20 rounded-md transition-colors">
                <div className="bg-primary/10 text-primary rounded-md flex items-center justify-center h-10 w-10 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="grid gap-1 flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    #{order.orderNumber}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {(() => {
                        try {
                          // orderDate alanını kullan
                          const orderDate = order.orderDate;
                          
                          // Geçersiz tarih kontrolü
                          if (!orderDate || isNaN(orderDate.getTime())) {
                            return "Tarih yok";
                          }
                          
                          return format(orderDate, "d MMM yy", { locale: tr });
                        } catch (e) {
                          console.error("Tarih formatı hatası:", e);
                          return "Tarih hatası";
                        }
                      })()}
                    </p>
                    <Badge variant={status.variant as any} className="text-[10px] px-1 py-0 h-4">
                      {status.label}
                    </Badge>
                  </div>
                </div>
                <div className="font-medium text-sm text-right">{formatCurrency(order.totalPrice)}</div>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button asChild size="sm" variant="outline" className="ml-auto gap-1 group">
          <Link href="/dashboard/siparisler">
            Tüm Siparişler
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 