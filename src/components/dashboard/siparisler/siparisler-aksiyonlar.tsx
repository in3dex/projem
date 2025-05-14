"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays, differenceInDays } from "date-fns";
import { RefreshCw, DownloadCloud, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface SiparislerAksiyonlarProps {
  onSyncComplete: () => Promise<void>; // Veri yenileme için callback
}

export function SiparislerAksiyonlar({ onSyncComplete }: SiparislerAksiyonlarProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCustomSyncModalOpen, setIsCustomSyncModalOpen] = useState(false);
  const [syncTarihAraligi, setSyncTarihAraligi] = useState<DateRange | undefined>({
    from: subDays(new Date(), 14),
    to: new Date(),
  });

  const handleSyncDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to && differenceInDays(range.to, range.from) > 14) {
      toast.warning("Tarih aralığı en fazla 14 gün olabilir.");
    } else {
      setSyncTarihAraligi(range);
    }
  };

  const senkronizeEt = async (type: "last15days" | "all" | "custom", orderNumbers?: string[] | string) => {
    setIsSyncing(true);
    let endpoint = '/api/orders/sync';
    const params = new URLSearchParams();

    if (type === 'custom' && syncTarihAraligi?.from && syncTarihAraligi?.to) {
        if (differenceInDays(syncTarihAraligi.to, syncTarihAraligi.from) > 14) {
            toast.error("Tarih aralığı en fazla 14 gün olabilir.");
            setIsSyncing(false);
            return;
        }
        params.append('startDate', syncTarihAraligi.from.toISOString());
        params.append('endDate', syncTarihAraligi.to.toISOString());
    } else if (type === 'last15days') {
        // API varsayılan olarak son 15 günü alıyorsa parametreye gerek yok
    } else if (type === 'all') {
        params.append('syncAll', 'true');
    }

    if(orderNumbers && typeof orderNumbers === 'string'){
        params.append('orderNumber', orderNumbers);
    } 
    // TODO: Gerekirse toplu sipariş numarası ile senkronizasyon eklenebilir

    const queryString = params.toString();
    if (queryString) {
        endpoint += `?${queryString}`;
    }

    toast.info(`${type === 'custom' ? 'Belirtilen aralıkta' : type === 'all' ? 'Tüm' : 'Son 15 günlük'} siparişler senkronize ediliyor...`);

    try {
        const response = await fetch(endpoint, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Senkronizasyon başarısız.');
        }
        toast.success(result.message || 'Siparişler başarıyla senkronize edildi.');
        await onSyncComplete(); // Ana component'i haberdar et
        setIsCustomSyncModalOpen(false); // Özel modalı kapat
    } catch (error: any) {
        console.error("Senkronizasyon hatası:", error);
        toast.error(`Senkronizasyon hatası: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };


  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isSyncing}>
              {isSyncing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="mr-2 h-4 w-4" />
              )}
              Siparişleri Senkronize Et
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => senkronizeEt("last15days")} disabled={isSyncing}>
              Son 15 Gün
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCustomSyncModalOpen(true)} disabled={isSyncing}>
              Tarih Aralığı Seç...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => senkronizeEt("all")} disabled={isSyncing}>
              Tüm Siparişleri Senkronize Et (Uzun Sürebilir)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Gerekirse son senkronizasyon bilgisi gösterilebilir */}
      </div>

      <Dialog open={isCustomSyncModalOpen} onOpenChange={setIsCustomSyncModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Özel Tarih Aralığı ile Senkronize Et</DialogTitle>
            <DialogDescription>
              Siparişleri senkronize etmek için bir tarih aralığı seçin (en fazla 14 gün).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="sync-date-range">Tarih Aralığı</Label>
            <DateRangePicker
              dateRange={syncTarihAraligi}
              onDateRangeChange={handleSyncDateChange}
              className="w-full"
            />
            {syncTarihAraligi?.from && syncTarihAraligi?.to && differenceInDays(syncTarihAraligi.to, syncTarihAraligi.from) > 14 && (
              <p className="text-red-600 text-sm">Seçilen tarih aralığı 14 günden fazla olamaz.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomSyncModalOpen(false)}>İptal</Button>
            <Button
              onClick={() => senkronizeEt('custom')}
              disabled={isSyncing || !syncTarihAraligi?.from || !syncTarihAraligi?.to || (syncTarihAraligi.from && syncTarihAraligi.to && differenceInDays(syncTarihAraligi.to, syncTarihAraligi.from) > 14)}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Senkronize Ediliyor...
                </>
              ) : 'Şimdi Senkronize Et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 