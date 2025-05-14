import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SiparisFiltrele } from "@/components/siparis/siparis-filtrele";
import { DateRange } from "react-day-picker";
// import { ChevronDown } from "lucide-react"; // Icon hook'ta veya ana bileşende olabilir

interface SiparislerFilterActionsProps {
  aramaMetni: string;
  tarihAraligi: DateRange | undefined;
  invoiceStatusFilter: string;
  selectedOrderCount: number;
  isBulkUpdatingCargo: boolean;
  isGeneratingBulkBarcode: boolean;
  handleAramaMetniChange: (text: string) => void;
  handleTarihAraligiChange: (range: DateRange | undefined) => void;
  handleInvoiceStatusFilterChange: (value: string) => void;
  fetchData: () => void; // filtrele fonksiyonu
  temizleFiltreler: () => void;
  openBulkCargoModal: () => void;
  handleBulkGenerateBarcode: () => void;
}

export function SiparislerFilterActions({
  aramaMetni,
  tarihAraligi,
  invoiceStatusFilter,
  selectedOrderCount,
  isBulkUpdatingCargo,
  isGeneratingBulkBarcode,
  handleAramaMetniChange,
  handleTarihAraligiChange,
  handleInvoiceStatusFilterChange,
  fetchData,
  temizleFiltreler,
  openBulkCargoModal,
  handleBulkGenerateBarcode,
}: SiparislerFilterActionsProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
      <div className="flex-grow w-full">
        <SiparisFiltrele
          aramaMetni={aramaMetni}
          setAramaMetni={handleAramaMetniChange}
          tarihAraligi={tarihAraligi}
          setTarihAraligi={handleTarihAraligiChange}
          invoiceStatus={invoiceStatusFilter}
          setInvoiceStatus={handleInvoiceStatusFilterChange}
          filtrele={fetchData}
          temizle={temizleFiltreler}
        />
      </div>
      <div className="flex-shrink-0">
        {selectedOrderCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Toplu İşlemler ({selectedOrderCount})
                {/* <ChevronDown className="ml-2 h-4 w-4" /> */}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={openBulkCargoModal} 
                disabled={isBulkUpdatingCargo || isGeneratingBulkBarcode}
              >
                Kargo Firması Değiştir...
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleBulkGenerateBarcode} 
                disabled={isGeneratingBulkBarcode || isBulkUpdatingCargo}
              >
                {isGeneratingBulkBarcode ? 'Oluşturuluyor...' : 'Toplu Barkod Oluştur (PDF)'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
} 