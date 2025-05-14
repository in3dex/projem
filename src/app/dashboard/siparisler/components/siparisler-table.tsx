import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

export function SiparislerTablosu({ data, pagination, onPageChange, isLoading = false, onSiparisSenkronizeEt }) {
  const [seciliSiparisler, setSeciliSiparisler] = useState<string[]>([]);

  // Aksiyonlar sütununu ekleyelim
  const columns = [
    // ... (mevcut sütunlar)
    {
      id: "actions",
      header: "Aksiyonlar",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
              <span className="sr-only">Açılır menü</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => window.open(`/dashboard/siparisler/${row.original.id}`, '_blank')}
            >
              Siparişi Görüntüle
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onSiparisSenkronizeEt(row.original.orderNumber)}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Siparişi Senkronize Et
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(row.original.orderNumber)}
            >
              Sipariş Numarasını Kopyala
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  // Toplu işlemler için butonları ekleyelim
  const topluIslemButonlari = (
    <div className="mb-4 flex items-center space-x-2">
      <Button 
        variant="outline"
        size="sm"
        onClick={() => {
          if (seciliSiparisler.length > 0) {
            // Seçili siparişleri senkronize et
            onSiparisSenkronizeEt(seciliSiparisler);
          }
        }}
        disabled={isLoading || seciliSiparisler.length === 0}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Seçili Siparişleri Senkronize Et ({seciliSiparisler.length})
      </Button>
    </div>
  );

  return (
    <div>
      {seciliSiparisler.length > 0 && topluIslemButonlari}
      
      {/* Mevcut tablo kodu */}
      {/* ... */}
    </div>
  );
} 