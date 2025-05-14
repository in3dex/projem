"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Truck, DownloadCloud } from "lucide-react";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Siparis } from "@/lib/types/siparis"; // Siparis tipine ihtiyaç olabilir

interface TopluIslemlerProps {
  selectedRowCount: number;
  totalRowCount: number; // Toplam görünür satır sayısı
  areAllVisibleSelected: boolean; 
  onSelectAllVisible: (select: boolean) => void;
  onOpenBulkCargoModal: () => void;
  onGenerateBulkBarcode: () => void;
  canUpdateBulkCargo: boolean; // Kargo güncelleme butonu aktif mi?
  canGenerateBulkBarcode: boolean; // Barkod oluşturma butonu aktif mi?
}

export function TopluIslemler({
  selectedRowCount,
  totalRowCount,
  areAllVisibleSelected,
  onSelectAllVisible,
  onOpenBulkCargoModal,
  onGenerateBulkBarcode,
  canUpdateBulkCargo,
  canGenerateBulkBarcode
}: TopluIslemlerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all-visible"
          checked={areAllVisibleSelected}
          onCheckedChange={(checked: CheckedState) => onSelectAllVisible(checked === true)}
          aria-label="Tümünü Seç"
          disabled={totalRowCount === 0} // Satır yoksa disable et
        />
        <Label 
          htmlFor="select-all-visible" 
          className={`text-sm font-medium ${totalRowCount === 0 ? 'text-muted-foreground' : ''}`}
        >
          {selectedRowCount} seçili
        </Label>
      </div>
      {selectedRowCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Toplu İşlemler <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={onOpenBulkCargoModal}
              disabled={!canUpdateBulkCargo}
            >
              <Truck className="mr-2 h-4 w-4" /> Toplu Kargo Güncelle
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onGenerateBulkBarcode}
              disabled={!canGenerateBulkBarcode}
            >
              <DownloadCloud className="mr-2 h-4 w-4" /> Seçili Etiketleri Yazdır
            </DropdownMenuItem>
            {/* Diğer toplu işlemler eklenebilir */}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
} 