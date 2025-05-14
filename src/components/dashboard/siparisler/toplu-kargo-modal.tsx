"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TopluKargoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eligibleOrderCount: number;
  selectedOrderIds: Set<string>; // Güncellenecek sipariş ID'leri
  onBulkUpdate: (status: string, trackingNumber: string | null) => Promise<void>; // Ana fonksiyona callback
}

export function TopluKargoModal({
  isOpen,
  onOpenChange,
  eligibleOrderCount,
  selectedOrderIds,
  onBulkUpdate,
}: TopluKargoModalProps) {
  const [bulkCargoStatus, setBulkCargoStatus] = useState<string>("Shipped"); // Varsayılan Shipped
  const [bulkCargoTrackingNumber, setBulkCargoTrackingNumber] = useState<string>("");
  const [isUpdatingBulkCargo, setIsUpdatingBulkCargo] = useState(false);
  const [bulkUpdateError, setBulkUpdateError] = useState<string | null>(null);

  const handleBulkCargoChange = async () => {
    if (selectedOrderIds.size === 0 || !bulkCargoStatus) return;

    setIsUpdatingBulkCargo(true);
    setBulkUpdateError(null);

    try {
       // Ana bileşendeki güncelleme fonksiyonunu çağır
      await onBulkUpdate(bulkCargoStatus, bulkCargoTrackingNumber.trim() || null);
      
      toast.success(`${selectedOrderIds.size} siparişin kargo bilgisi başarıyla güncellendi.`);
      setBulkCargoTrackingNumber(""); // Input'u temizle
      onOpenChange(false); // Modalı kapat

    } catch (error: any) {
      console.error("Toplu kargo güncelleme hatası:", error);
      const errorMessage = error.message || "Bilinmeyen bir hata oluştu.";
      setBulkUpdateError(errorMessage);
      toast.error(`Toplu Kargo Güncelleme Başarısız: ${errorMessage}`);
    } finally {
      setIsUpdatingBulkCargo(false);
    }
  };

  // Modal kapatıldığında state'leri sıfırla
  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
        setBulkCargoTrackingNumber("");
        setBulkUpdateError(null);
        // setBulkCargoStatus("Shipped"); // Durum sıfırlanmalı mı?
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toplu Kargo Bilgisi Güncelle</DialogTitle>
          <DialogDescription>
            Seçili {eligibleOrderCount} sipariş için kargo durumunu ve takip numarasını güncelleyin.
            Sadece 'Created', 'Picking', 'Invoiced' durumundaki siparişler güncellenebilir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bulk-cargo-status" className="text-right">
              Yeni Durum
            </Label>
            <Select value={bulkCargoStatus} onValueChange={setBulkCargoStatus} disabled={isUpdatingBulkCargo}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Kargo Durumu Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Shipped">Shipped (Kargoya Verildi)</SelectItem>
                {/* Gerekirse diğer durumlar eklenebilir */}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bulk-cargo-tracking" className="text-right">
              Takip No (Opsiyonel)
            </Label>
            <Input 
              id="bulk-cargo-tracking"
              value={bulkCargoTrackingNumber}
              onChange={(e) => setBulkCargoTrackingNumber(e.target.value)}
              placeholder="Kargo takip numarası"
              className="col-span-3"
              disabled={isUpdatingBulkCargo}
            />
          </div>
          {bulkUpdateError && <p className="text-sm text-red-500 col-span-4 text-center">{bulkUpdateError}</p>}
        </div>
        <DialogFooter>
            <Button 
            type="button" 
            onClick={handleBulkCargoChange} 
            disabled={isUpdatingBulkCargo || !bulkCargoStatus || eligibleOrderCount === 0}
          >
            {isUpdatingBulkCargo ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : null}
            Güncelle
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isUpdatingBulkCargo}>
              İptal
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 