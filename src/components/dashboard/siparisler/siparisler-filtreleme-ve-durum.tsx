"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiparisFiltrele } from "@/components/siparis/siparis-filtrele"; // Mevcut filtre bileşeni
import { DateRange } from "react-day-picker";

// Gösterilecek ve sıralanacak statüler (page.tsx'den kopyalandı, dışarı alınabilir)
const ORDER_STATUS_TABS = [
  { value: "all", label: "Tümü" },
  { value: "Created", label: "Oluşturuldu" },
  { value: "Picking", label: "Hazırlanıyor" },
  { value: "Invoiced", label: "Faturalandı" },
  { value: "Shipped", label: "Kargoya Verildi" },
  { value: "Delivered", label: "Teslim Edildi" },
  { value: "Cancelled", label: "İptal Edildi" },
  { value: "UnDelivered", label: "Teslim Edilemedi" },
];

interface SiparislerFiltrelemeVeDurumProps {
  // Filtreleme state'leri ve handler'ları
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatus: string;
  cargoStatusFilter: string | null; // Tip null olabilir
  setCargoStatusFilter: (status: string | null) => void;
  invoiceStatusFilter: string;
  setInvoiceStatusFilter: (status: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  onFilter: () => void;
  onClearFilters: () => void;
  // Durum Tab handler'ı
  onTabChange: (status: string) => void;
}

export function SiparislerFiltrelemeVeDurum({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  cargoStatusFilter,
  setCargoStatusFilter,
  invoiceStatusFilter,
  setInvoiceStatusFilter,
  dateRange,
  setDateRange,
  onFilter,
  onClearFilters,
  onTabChange,
}: SiparislerFiltrelemeVeDurumProps) {
  return (
    <>
      {/* Filtreleme Bileşeni */}
      <div className="p-4 border-b">
        <SiparisFiltrele
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedStatus={selectedStatus} // Bu prop belki SiparisFiltrele'den kaldırılabilir?
          cargoStatusFilter={cargoStatusFilter}
          setCargoStatusFilter={setCargoStatusFilter}
          invoiceStatus={invoiceStatusFilter} // Prop adı eşleşmeli
          setInvoiceStatus={setInvoiceStatusFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange} // Prop adı onDateRangeChange olmalı
          onFilter={onFilter}
          onClearFilters={onClearFilters}
        />
      </div>

      {/* Durum Sekmeleri */}
      <Tabs value={selectedStatus} onValueChange={onTabChange} className="w-full">
        <TabsList className="m-4">
          {ORDER_STATUS_TABS.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
              {/* Count gösterimi performans nedeniyle kaldırıldı */}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* TabsContent burada render edilmeyecek, ana sayfada edilecek */}
      </Tabs>
    </>
  );
} 