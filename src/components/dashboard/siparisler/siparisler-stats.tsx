"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SiparisStats } from "@/lib/types/siparis"; // Tip importu
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  DollarSign,
  Heart,
  HelpCircle,
  Info,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  CheckCircle, // Teslim edildi için
} from "lucide-react";

// -------- İstatistik Kartı Bileşeni --------
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  tooltipDescription: string;
  description?: string;
  isLoading: boolean;
  action?: React.ReactNode; // action prop eklendi
}

function StatCard({
  title,
  value,
  icon: Icon,
  tooltipDescription,
  description,
  isLoading,
  action, // action prop kullanıldı
}: StatCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Icon className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipDescription}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && !isLoading && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
      {action && ( // action gösteriliyor
        <div className="p-4 pt-0 mt-auto"> 
          {action}
        </div>
      )}
    </Card>
  );
}
// -------- İstatistik Kartı Bileşeni Sonu --------

interface SiparislerStatsProps {
  stats: SiparisStats | null;
  isLoading: boolean;
  onLoyalCustomersClick: () => void; // Sadık müşteriler modalını açmak için prop
}

export function SiparislerStats({
  stats,
  isLoading,
  onLoyalCustomersClick,
}: SiparislerStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-6">
      <StatCard
        title="Toplam Sipariş (Son 30 Gün)"
        value={stats?.totalOrdersLast30Days ?? 0}
        icon={ShoppingBag}
        tooltipDescription="Son 30 gün içinde alınan toplam sipariş sayısı."
        isLoading={isLoading}
      />
      <StatCard
        title="Toplam Ciro (Son 30 Gün)"
        value={formatCurrency(stats?.totalRevenueLast30Days ?? 0)}
        icon={DollarSign}
        tooltipDescription="Son 30 gün içindeki siparişlerin toplam tutarı."
        isLoading={isLoading}
      />
       <StatCard
        title="Bekleyen Siparişler"
        value={stats?.pendingOrders ?? 0}
        icon={Package} // 'Package' ikonu daha uygun olabilir
        tooltipDescription="'Created', 'Picking', 'Invoiced' durumundaki siparişler."
        isLoading={isLoading}
        description={`${stats?.createdOrders ?? 0} Oluşturuldu, ${stats?.pickingOrders ?? 0} Hazırlanıyor, ${stats?.invoicedOrders ?? 0} Faturalandı`}
      />
      <StatCard
        title="Kargodaki Siparişler"
        value={stats?.shippedOrders ?? 0}
        icon={Truck}
        tooltipDescription="'Shipped' durumundaki siparişler."
        isLoading={isLoading}
      />
        <StatCard
        title="Teslim Edilen Siparişler (Son 30 Gün)"
        value={stats?.deliveredOrdersLast30Days ?? 0}
        icon={CheckCircle} // Teslim edildi ikonu
        tooltipDescription="Son 30 gün içinde 'Delivered' durumuna geçen sipariş sayısı."
        isLoading={isLoading}
      />
       {/* Diğer StatCard'lar eklenebilir... Örneğin İptal edilenler */}
      {/* <StatCard
        title="İptal Edilen Siparişler (Son 30 Gün)"
        value={stats?.cancelledOrdersLast30Days ?? 0}
        icon={Ban}
        tooltipDescription="Son 30 gün içinde 'Cancelled' durumuna geçen sipariş sayısı."
        isLoading={isLoading}
      /> */}
      {/* Sadık Müşteriler Kartı (Opsiyonel, tıklanabilir) */}
      {/* <StatCard
        title="En Sadık Müşteriler"
        value={stats?.topLoyalCustomers ? `${stats.topLoyalCustomers.length} Müşteri` : 'Veri Yok'}
        icon={Heart}
        tooltipDescription="En çok sipariş veren müşterileri görmek için tıklayın."
        isLoading={isLoading}
        action={
          <Button size="sm" variant="outline" onClick={onLoyalCustomersClick}>
            Listeyi Gör
          </Button>
        }
      /> */}
    </div>
  );
} 