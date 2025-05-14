import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { SiparisKart } from "@/components/siparis/siparis-kart";
import { Download } from "lucide-react";
import { Siparis } from "@/lib/types/siparis";

// Sayfalama numaralarını hesaplayan yardımcı fonksiyon (Hook'tan veya utils'ten gelebilir)
const getPageNumbers = (currentPage: number, totalPages: number, pageNeighbours: number = 1) => {
    const totalNumbers = (pageNeighbours * 2) + 3;
    const totalBlocks = totalNumbers + 2;
    if (totalPages <= totalBlocks) return Array.from({ length: totalPages }, (_, i) => i);
    const startPage = Math.max(0, currentPage - pageNeighbours);
    const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
    let pages: (number | string)[] = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);
    const hasLeftSpill = startPage > 0;
    const hasRightSpill = endPage < totalPages - 1;
    const spillOffset = totalNumbers - (pages.length + 1);
    if (!hasLeftSpill && hasRightSpill) pages = [...pages, ...Array.from({ length: spillOffset }, (_, i) => endPage + i + 1), '...ELLIPSIS_RIGHT', totalPages - 1];
    else if (hasLeftSpill && !hasRightSpill) pages = [0, '...ELLIPSIS_LEFT', ...Array.from({ length: spillOffset }, (_, i) => startPage - i - 1).reverse(), ...pages];
    else if (hasLeftSpill && hasRightSpill) pages = [0, '...ELLIPSIS_LEFT', ...pages, '...ELLIPSIS_RIGHT', totalPages - 1];
    if (pages[0] !== 0 && pages[1] !== '...ELLIPSIS_LEFT') pages.unshift(0);
    if (pages[pages.length - 1] !== totalPages - 1 && pages[pages.length - 2] !== '...ELLIPSIS_RIGHT') pages.push(totalPages - 1);
    return pages;
};

interface SiparislerListProps {
  isLoading: boolean;
  siparisler: Siparis[];
  toplamSayfa: number;
  sayfaNo: number;
  selectedOrderIds: Set<string>;
  isAllVisibleSelected: boolean;
  durum: string; // Boş liste mesajı için
  aramaMetni: string; // Boş liste mesajı için
  handleSelectAllVisible: (select: boolean) => void;
  handleSelectOrder: (orderId: string, selected: boolean) => void;
  openDetayModal: (siparis: Siparis) => void;
  openInvoiceUploadModal: (siparis: Siparis) => void;
  fetchData: () => void; // onCargoProviderUpdated için
  handleSayfaChange: (newPage: number) => void;
  temizleFiltreler: () => void; // Boş liste mesajı için
  senkronizeEt: (type: "last15days" | "all" | "custom") => void; // Boş liste mesajı için
}

export function SiparislerList({
  isLoading,
  siparisler,
  toplamSayfa,
  sayfaNo,
  selectedOrderIds,
  isAllVisibleSelected,
  durum,
  aramaMetni,
  handleSelectAllVisible,
  handleSelectOrder,
  openDetayModal,
  openInvoiceUploadModal,
  fetchData,
  handleSayfaChange,
  temizleFiltreler,
  senkronizeEt,
}: SiparislerListProps) {

  console.log("[SiparislerList] Received siparisler prop:", siparisler); // Debug: Gelen prop'u logla

  const pageNumbers = getPageNumbers(sayfaNo, toplamSayfa);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (siparisler.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center space-y-4 mt-6">
        <h2 className="text-xl font-medium">Sipariş bulunamadı</h2>
        <p className="text-muted-foreground">
          {durum === "all" && !aramaMetni
            ? "Hiç sipariş bulunamadı. Senkronize etmeyi deneyin."
            : "Arama kriterlerinize uygun sipariş bulunamadı."}
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={temizleFiltreler} variant="outline">
            Filtreleri Temizle
          </Button>
          <Button onClick={() => senkronizeEt("last15days")}>
            <Download className="h-4 w-4 mr-2" />
            Senkronize Et
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tümünü Seç Checkbox */} 
      <div className="flex items-center gap-2 mb-4 px-1">
        <Checkbox
          id="select-all-visible"
          checked={isAllVisibleSelected}
          onCheckedChange={(checked) => handleSelectAllVisible(Boolean(checked))}
          className="h-6 w-6"
        />
        <Label htmlFor="select-all-visible" className="text-sm font-medium cursor-pointer">
          Sayfadakileri Seç ({selectedOrderIds.size} / {siparisler.length})
        </Label>
      </div>

      {/* Sipariş Kartları Grid */} 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {siparisler.map((siparis) => (
          <SiparisKart
            key={siparis.id}
            siparis={siparis}
            onClick={openDetayModal}
            onFaturaYukleClick={openInvoiceUploadModal}
            onCargoProviderUpdated={fetchData}
            isSelected={selectedOrderIds.has(siparis.id)}
            onSelectChange={(selected) => handleSelectOrder(siparis.id, selected)}
          />
        ))}
      </div>

      {/* Sayfalama */} 
      {toplamSayfa > 1 && (
        <Pagination className="my-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handleSayfaChange(sayfaNo - 1)}
                aria-disabled={sayfaNo === 0}
                tabIndex={sayfaNo === 0 ? -1 : undefined}
                className={sayfaNo === 0 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>

            {pageNumbers.map((page, index) => (
              <PaginationItem key={`${page}-${index}`}>
                {typeof page === 'number' ? (
                  <PaginationLink
                    size="default"
                    isActive={page === sayfaNo}
                    onClick={() => handleSayfaChange(page)}
                  >
                    {page + 1}
                  </PaginationLink>
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => handleSayfaChange(sayfaNo + 1)}
                aria-disabled={sayfaNo === toplamSayfa - 1}
                tabIndex={sayfaNo === toplamSayfa - 1 ? -1 : undefined}
                className={sayfaNo === toplamSayfa - 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
} 