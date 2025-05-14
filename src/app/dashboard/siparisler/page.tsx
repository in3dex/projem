"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  RefreshCw, 
  Download, 
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  MoreHorizontal,
  DownloadCloud,
  ChevronDown,
} from "lucide-react";
import { tr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Input,
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/dashboard/siparisler/stat-card";
import { useSiparislerPage } from "@/hooks/use-siparisler-page";

import { Siparis, LoyalCustomer } from "@/lib/types/siparis";
import { SiparislerHeader } from "@/components/dashboard/siparisler/siparisler-header";
import { SiparislerFilterActions } from "@/components/dashboard/siparisler/siparisler-filter-actions";
import { SiparislerTabs } from "@/components/dashboard/siparisler/siparisler-tabs";
import { SiparislerList } from "@/components/dashboard/siparisler/siparisler-list";
import { SiparislerModals } from "@/components/dashboard/siparisler/siparisler-modals";

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

export default function SiparislerPage() {
  const {
    siparisler, seciliSiparis, detayModalAcik, isLoading, syncLoading, aramaMetni, durum, tarihAraligi,
    sonSenkronizasyon, toplamSiparis, toplamSayfa, sayfaNo, sayfaBoyutu,
    durumSayilari, siparisStats, isLoyalCustomersModalOpen, topLoyalCustomers, isLoyalCustomersLoading,
    invoiceStatusFilter, isInvoiceUploadModalOpen, selectedPackageIdForInvoice, selectedFile, invoiceNumberInput,
    invoiceDateInput, isUploadingInvoice, isStatsLoading, 
    selectedOrderIds,
    isBulkCargoModalOpen, newCargoProvider, isBulkUpdatingCargo, isGeneratingBulkBarcode, isAllVisibleSelected,
    toplamSiparisSayisi, hazirlaniyor, kargoyaVerildi, tamamlandi,
    handleAramaMetniChange, handleDurumChange, handleTarihAraligiChange, handleSayfaChange,
    handleInvoiceStatusFilterChange, 
    handleFileChange, handleInvoiceNumberChange,
    handleInvoiceDateChange, handleNewCargoProviderChange,
    openDetayModal, closeDetayModal, openLoyalCustomersModal, closeLoyalCustomersModal, openInvoiceUploadModal,
    closeInvoiceUploadModal, 
    openBulkCargoModal, closeBulkCargoModal,
    handleSelectOrder, handleSelectAllVisible,
    fetchData, fetchStats, fetchTopLoyalCustomers, senkronizeEt, handleInvoiceUpload,
    handleBulkCargoChange, handleBulkGenerateBarcode,
    getEligibleOrdersForCargoChange,
    getEligibleOrdersForBarcode,
    temizleFiltreler,
  } = useSiparislerPage();

  const pageNumbers = useMemo(() => {
    const getPageNumbers = (currentPage: number, totalPages: number, pageNeighbours: number = 1) => {
      const totalNumbers = (pageNeighbours * 2) + 3;
      const totalBlocks = totalNumbers + 2;
  
      if (totalPages <= totalBlocks) {
        return Array.from({ length: totalPages }, (_, i) => i);
      }
  
      const startPage = Math.max(0, currentPage - pageNeighbours);
      const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
      let pages: (number | string)[] = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);
  
      const hasLeftSpill = startPage > 0;
      const hasRightSpill = endPage < totalPages - 1;
      const spillOffset = totalNumbers - (pages.length + 1);
  
      switch (true) {
        case !hasLeftSpill && hasRightSpill:
          {
            const extraPages = Array.from({ length: spillOffset }, (_, i) => endPage + i + 1);
            pages = [...pages, ...extraPages, '...ELLIPSIS_RIGHT', totalPages - 1];
            break;
          }
        case hasLeftSpill && !hasRightSpill:
          {
            const extraPages = Array.from({ length: spillOffset }, (_, i) => startPage - i - 1).reverse();
            pages = [0, '...ELLIPSIS_LEFT', ...extraPages, ...pages];
            break;
          }
        case hasLeftSpill && hasRightSpill:
        default:
          {
            pages = [0, '...ELLIPSIS_LEFT', ...pages, '...ELLIPSIS_RIGHT', totalPages - 1];
            break;
          }
      }
      if (pages[0] !== 0 && pages[1] !== '...ELLIPSIS_LEFT') {
        pages.unshift(0);
      }
      if (pages[pages.length - 1] !== totalPages - 1 && pages[pages.length - 2] !== '...ELLIPSIS_RIGHT') {
        pages.push(totalPages - 1);
      }

      return pages;
    };

    return getPageNumbers(sayfaNo, toplamSayfa);
  }, [sayfaNo, toplamSayfa]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40 p-4 md:p-6">
      <SiparislerHeader
        syncLoading={syncLoading}
        sonSenkronizasyon={sonSenkronizasyon}
        siparisStats={siparisStats}
        isStatsLoading={isStatsLoading}
        isLoyalCustomersLoading={isLoyalCustomersLoading}
        hazirlaniyor={hazirlaniyor}
        invoicedCount={durumSayilari?.Invoiced || 0}
        kargoyaVerildi={kargoyaVerildi}
        tamamlandi={tamamlandi}
        openLoyalCustomersModal={openLoyalCustomersModal}
        senkronizeEt={senkronizeEt}
      />

      <SiparislerFilterActions
              aramaMetni={aramaMetni}
              tarihAraligi={tarihAraligi}
        invoiceStatusFilter={invoiceStatusFilter}
        selectedOrderCount={selectedOrderIds.size}
        isBulkUpdatingCargo={isBulkUpdatingCargo}
        isGeneratingBulkBarcode={isGeneratingBulkBarcode}
        handleAramaMetniChange={handleAramaMetniChange}
        handleTarihAraligiChange={handleTarihAraligiChange}
        handleInvoiceStatusFilterChange={handleInvoiceStatusFilterChange}
        fetchData={fetchData}
        openBulkCargoModal={openBulkCargoModal}
        handleBulkGenerateBarcode={handleBulkGenerateBarcode}
        temizleFiltreler={temizleFiltreler}
      />

      <SiparislerTabs
        durum={durum}
        toplamSiparis={toplamSiparis}
        durumSayilari={durumSayilari}
        handleDurumChange={handleDurumChange}
      />

      <SiparislerList
        isLoading={isLoading}
        siparisler={siparisler}
        toplamSayfa={toplamSayfa}
        sayfaNo={sayfaNo}
        selectedOrderIds={selectedOrderIds}
        isAllVisibleSelected={isAllVisibleSelected}
        durum={durum}
        aramaMetni={aramaMetni}
        handleSelectAllVisible={handleSelectAllVisible}
        handleSelectOrder={handleSelectOrder}
        openDetayModal={openDetayModal}
        openInvoiceUploadModal={openInvoiceUploadModal}
        fetchData={fetchData}
        handleSayfaChange={handleSayfaChange}
        senkronizeEt={senkronizeEt}
        temizleFiltreler={temizleFiltreler}
      />

      <SiparislerModals
        seciliSiparis={seciliSiparis}
        detayModalAcik={detayModalAcik}
        closeDetayModal={closeDetayModal}
        isLoyalCustomersModalOpen={isLoyalCustomersModalOpen}
        isLoyalCustomersLoading={isLoyalCustomersLoading}
        topLoyalCustomers={topLoyalCustomers}
        closeLoyalCustomersModal={closeLoyalCustomersModal}
        isInvoiceUploadModalOpen={isInvoiceUploadModalOpen}
        selectedPackageIdForInvoice={selectedPackageIdForInvoice}
        invoiceNumberInput={invoiceNumberInput}
        invoiceDateInput={invoiceDateInput}
        isUploadingInvoice={isUploadingInvoice}
        selectedFile={selectedFile}
        closeInvoiceUploadModal={closeInvoiceUploadModal}
        handleFileChange={handleFileChange}
        handleInvoiceNumberChange={handleInvoiceNumberChange}
        handleInvoiceDateChange={handleInvoiceDateChange}
        handleInvoiceUpload={handleInvoiceUpload}
        isBulkCargoModalOpen={isBulkCargoModalOpen}
        isBulkUpdatingCargo={isBulkUpdatingCargo}
        newCargoProvider={newCargoProvider}
        eligibleCargoChangeCount={getEligibleOrdersForCargoChange().length}
        closeBulkCargoModal={closeBulkCargoModal}
        handleNewCargoProviderChange={handleNewCargoProviderChange}
        handleBulkCargoChange={handleBulkCargoChange}
      />
    </div>
  );
} 