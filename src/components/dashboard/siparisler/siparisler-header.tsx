import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatCard } from "@/components/dashboard/siparisler/stat-card";
import { RefreshCw, Download, Info, ShoppingBag, ArchiveRestore, Truck, CheckCircle, DollarSign, TrendingUp, Layers, Ban, Users } from "lucide-react";
import { tr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { SiparisStats } from "@/lib/types/siparis";

interface SiparislerHeaderProps {
  syncLoading: boolean;
  sonSenkronizasyon: { tarih: Date | null; basarili: boolean; mesaj: string };
  siparisStats: SiparisStats | null;
  isStatsLoading: boolean;
  isLoyalCustomersLoading: boolean; 
  hazirlaniyor: number;
  invoicedCount: number; // invoice durum sayısı için prop
  kargoyaVerildi: number;
  tamamlandi: number;
  openLoyalCustomersModal: () => void;
  senkronizeEt: (type: "last15days" | "all" | "custom" | "allOnly") => void;
}

export function SiparislerHeader({
  syncLoading,
  sonSenkronizasyon,
  siparisStats,
  isStatsLoading,
  isLoyalCustomersLoading,
  hazirlaniyor,
  invoicedCount,
  kargoyaVerildi,
  tamamlandi,
  openLoyalCustomersModal,
  senkronizeEt,
}: SiparislerHeaderProps) {
  return (
    <>
      {/* Başlık ve Senkronizasyon Butonu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Siparişler</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => senkronizeEt("all")} disabled={syncLoading}>
            {syncLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Tüm Siparişleri Senkronize Et
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Info className={`h-4 w-4 ${!sonSenkronizasyon.tarih ? 'text-yellow-500' : sonSenkronizasyon.basarili ? 'text-green-500' : 'text-red-500'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  {sonSenkronizasyon.mesaj}
                  {sonSenkronizasyon.tarih && (
                    <>
                      <br />
                      ({formatDistanceToNow(sonSenkronizasyon.tarih, { addSuffix: true, locale: tr })})
                    </>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <Card>
        <CardHeader>
          <CardTitle>Sipariş Özeti</CardTitle>
          <CardDescription>Son duruma göre sipariş istatistikleri.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="İşlem Bekleyen"
              value={hazirlaniyor}
              icon={ShoppingBag}
              tooltipDescription="Oluşturuldu, Hazırlanıyor ve Faturalandı durumundaki siparişler."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Kargo Bekleyen"
              value={invoicedCount} // Prop'tan gelen değer
              icon={ArchiveRestore}
              tooltipDescription="Faturalanmış ancak henüz kargoya verilmemiş siparişler."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Kargoya Verildi"
              value={kargoyaVerildi}
              icon={Truck}
              tooltipDescription="Kargoya verilen ve teslimat noktasında olan siparişler."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Tamamlandı"
              value={tamamlandi}
              icon={CheckCircle}
              tooltipDescription="Başarıyla teslim edilen siparişler."
              isLoading={isStatsLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Toplam Ciro"
              value={siparisStats?.totalRevenue ? siparisStats.totalRevenue.toFixed(2) : '0.00'}
              icon={DollarSign}
              tooltipDescription="Filtredeki siparişlerin toplam cirosu."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Ort. Sipariş Değeri"
              value={siparisStats?.averageOrderValue ? siparisStats.averageOrderValue.toFixed(2) : '0.00'}
              icon={TrendingUp}
              tooltipDescription="Filtredeki siparişlerin ortalama değeri."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Toplam Sipariş (Filtre)"
              value={siparisStats?.totalOrders ?? 0}
              icon={Layers}
              tooltipDescription="Mevcut filtrelere uyan toplam sipariş adedi."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="İptal Edilenler"
              value={siparisStats?.totalCancelledOrders ?? 0}
              icon={Ban}
              tooltipDescription="Filtrede iptal edilen sipariş sayısı."
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Sadık Müşteri"
              value={siparisStats?.loyalCustomerCount ?? 0}
              icon={Users}
              tooltipDescription="Birden fazla sipariş veren müşteri sayısı."
              isLoading={isStatsLoading}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary hover:text-primary/90 justify-start p-0 h-auto"
                  onClick={openLoyalCustomersModal}
                  disabled={isLoyalCustomersLoading}
                >
                  İncele
                  {isLoyalCustomersLoading && <RefreshCw className="h-3 w-3 ml-1 animate-spin" />}
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
} 