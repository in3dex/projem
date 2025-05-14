"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plan } from "@prisma/client" // Prisma'dan Plan tipini alalım
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { DataTableRowActions } from "./plans-row-actions" // Satır aksiyonları (oluşturulacak)
import { formatCurrency } from "@/lib/utils" // Para birimi formatlama (varsa)

// Tabloya göndereceğimiz Plan verisinin tipi (page.tsx'deki select ile eşleşmeli)
// Şimdilik tüm Plan modelini alıyoruz
export type PlanColumn = Plan 

export const columns: ColumnDef<PlanColumn>[] = [
  // Seçim Kutusu Kolonu
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Tümünü seç"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Satırı seç"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Plan Adı Kolonu
  {
    accessorKey: "name",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Plan Adı" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },

  // Aylık Fiyat Kolonu
  {
    accessorKey: "priceMonthly",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Aylık Fiyat" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("priceMonthly") as number | null
      return price ? formatCurrency(price, row.original.currency) : <span className="text-muted-foreground">-</span>
    },
    enableSorting: true,
    enableHiding: true,
  },
  
  // Yıllık Fiyat Kolonu
  {
    accessorKey: "priceYearly",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Yıllık Fiyat" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("priceYearly") as number | null
       return price ? formatCurrency(price, row.original.currency) : <span className="text-muted-foreground">-</span>
    },
    enableSorting: true,
    enableHiding: true,
  },
  
   // Aktif/Pasif Durumu Kolonu
  {
    accessorKey: "isActive",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Durum" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Aktif" : "Pasif"}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id))) // Filtreleme için
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Oluşturulma Tarihi Kolonu (Opsiyonel)
  {
    accessorKey: "createdAt",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Oluşturulma" />
    ),
    cell: ({ row }) => {
       const date = new Date(row.getValue("createdAt"))
       const formattedDate = date.toLocaleDateString('tr-TR', { 
         year: 'numeric', month: 'short', day: 'numeric' 
       })
       return <div className="whitespace-nowrap text-xs text-muted-foreground">{formattedDate}</div>
    },
     enableSorting: true,
     enableHiding: true,
  },

  // Aksiyonlar Kolonu
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />, // Aksiyon bileşenini kullan
     enableSorting: false,
     enableHiding: false,
  },
] 