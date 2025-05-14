'use client'

import { ColumnDef, HeaderContext, CellContext } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, FileText, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
// import { TrendyolClaim, TrendyolClaimItemDetail, TrendyolClaimItem } from '@/lib/services/trendyol-api-client' // Yanıt tipini import et - BU SİLİNECEK
// Ana sayfada kullanılan SerializedClaim tipini import edelim
import type { SerializedClaim, SerializedClaimItem } from '@/app/dashboard/iadeler/page'; // YOL DÜZELTİLDİ
import { format } from 'date-fns'

// Durumlar için renk eşleştirmesi (Badge'in kabul ettiği variantlara göre)
const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Created: 'default',
  WaitingInAction: 'secondary',
  Accepted: 'secondary', // 'success' yerine 'secondary' kullanalım (veya özel stil)
  Cancelled: 'outline',
  Rejected: 'destructive',
  Unresolved: 'secondary', // 'warning' yerine 'secondary' (veya özel stil)
  InAnalysis: 'secondary', // 'info' yerine 'secondary' (veya özel stil)
  WaitingFraudCheck: 'secondary' // 'warning' yerine 'secondary' (veya özel stil)
};

// Tabloya iletilecek meta verisi için tip tanımı
// Bu, useReactTable options.meta içinde tanımlanacak
export interface ClaimTableMeta {
  openModal: (claim: SerializedClaim) => void;
  triggerApprove: (claimId: string, itemIds: string[]) => void;
  triggerReject: (claim: SerializedClaim) => void;
}

// Bu, SerializedClaim tipine göre kolon tanımıdır
// CellContext'e meta tipini de ekliyoruz
export const columns: ColumnDef<SerializedClaim>[] = [
  // Seçim kolonu (isteğe bağlı)
  {
    id: 'select',
    header: ({ table }: HeaderContext<SerializedClaim, unknown>) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Tümünü seç"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }: CellContext<SerializedClaim, unknown>) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'orderNumber',
    header: ({ column }: HeaderContext<SerializedClaim, unknown>) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Sipariş No
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'claimDate',
    header: 'İade Tarihi',
    cell: ({ row }: CellContext<SerializedClaim, unknown>) => {
      const date = new Date(row.getValue('claimDate'))
      // GMT+3 için ayar yapılabilir veya server'da çevrilebilir
      return <div className="whitespace-nowrap">{format(date, 'dd/MM/yyyy HH:mm')}</div>
    },
  },
  {
    accessorKey: 'customerFirstName',
    header: 'Müşteri Adı',
    cell: ({ row }: CellContext<SerializedClaim, unknown>) => `${row.original.customerFirstName} ${row.original.customerLastName}`
  },
  {
    id: 'claimStatus',
    header: 'Durum',
    // Birden fazla item olabileceği için ilk item'ın durumunu gösterelim (veya daha karmaşık bir mantık)
    cell: ({ row }: CellContext<SerializedClaim, unknown>) => {
        // items yerine claimItems kullanılmalı (SerializedClaim tipine göre)
        const firstItem = row.original.claimItems[0];
        // API yanıtındaki yapı değişti, doğrudan status var
        const status = firstItem?.status || 'Bilinmiyor';
        const variant = statusVariantMap[status] || 'secondary'; // Bilinmeyen durumlar için de 'secondary'
        return <Badge variant={variant}>{status}</Badge>;
    }
  },
  {
    id: 'approveAction',
    header: 'Onayla',
    cell: ({ row, table }: CellContext<SerializedClaim, unknown>) => {
      const claim = row.original;
      const waitingItems = claim.claimItems.filter(item => item.status === 'WaitingInAction');
      const canApprove = waitingItems.length > 0;
      const meta = table.options.meta as ClaimTableMeta | undefined;

      if (!canApprove) return null;

      const handleApproveClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Event bubbling engellendi
        const itemIdsToApprove = waitingItems.map(item => item.trendyolClaimItemId);
        // claim.id (CUID olan) ile çağrı yapıyoruz, page.tsx'deki find buna göre çalışacak
        meta?.triggerApprove(claim.id, itemIdsToApprove); 
      };

      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 h-8 px-2"
          onClick={handleApproveClick}
          disabled={!meta?.triggerApprove}
        >
          <CheckCircle className="mr-1 h-4 w-4" /> Onayla
        </Button>
      );
    }
  },
  {
    id: 'rejectAction',
    header: 'Reddet',
    cell: ({ row, table }: CellContext<SerializedClaim, unknown>) => {
      const claim = row.original;
      const canReject = claim.claimItems.some(item => item.status === 'WaitingInAction');
      const meta = table.options.meta as ClaimTableMeta | undefined;

      if (!canReject) return null; 

      const handleRejectClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Event bubbling engellendi
        meta?.triggerReject(claim);
      };

      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-2"
          onClick={handleRejectClick}
          disabled={!meta?.triggerReject}
        >
          <XCircle className="mr-1 h-4 w-4" /> Reddet
        </Button>
      );
    }
  },
  {
    id: 'detailsAction',
    header: 'Detay',
    cell: ({ row, table }: CellContext<SerializedClaim, unknown>) => {
      const claim = row.original
      const meta = table.options.meta as ClaimTableMeta | undefined

      const handleDetailsClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Event bubbling engellendi
        meta?.openModal(claim);
      }

      return (
         <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDetailsClick}
            disabled={!meta?.openModal}
          >
            <FileText className="h-4 w-4" />
         </Button>
      )
    },
  },
] 