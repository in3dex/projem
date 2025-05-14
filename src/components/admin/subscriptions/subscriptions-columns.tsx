"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Subscription, User, Plan, SubscriptionStatus, BillingInterval } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { DataTableRowActions } from "./subscriptions-row-actions" // Satır aksiyonları (oluşturulacak)
import Link from "next/link"
import { cn } from "@/lib/utils"

// Tabloya göndereceğimiz Subscription verisinin tipi (page.tsx'deki include ile eşleşmeli)
export type SubscriptionColumn = Subscription & {
  user: Pick<User, 'id' | 'name' | 'email'> | null // Prisma include ile gelen user
  plan: Pick<Plan, 'id' | 'name'> | null // Prisma include ile gelen plan
}

// Durum için renk ve metin belirleyen yardımcı fonksiyon
const getStatusProps = (status: SubscriptionStatus) => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return { variant: "default", text: "Aktif" };
    case SubscriptionStatus.TRIALING:
      return { variant: "secondary", text: "Deneme" };
    case SubscriptionStatus.PAST_DUE:
      return { variant: "destructive", text: "Ödeme Gecikti" };
    case SubscriptionStatus.CANCELED:
      return { variant: "outline", text: "İptal Edildi" };
    case SubscriptionStatus.INACTIVE:
    default:
      return { variant: "outline", text: "Pasif" };
  }
}

// Periyot için metin belirleyen yardımcı fonksiyon
const getIntervalText = (interval: BillingInterval | null) => {
   if (!interval) return '-';
   return interval === BillingInterval.MONTH ? "Aylık" : "Yıllık";
}

// Tarih formatlama (opsiyonel)
const formatDate = (date: Date | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const columns: ColumnDef<SubscriptionColumn>[] = [
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

  // Kullanıcı Kolonu
  {
    accessorKey: "user",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Kullanıcı" />
    ),
    cell: ({ row }) => {
      const user = row.original.user
      return user ? (
         <Link href={`/admin/users/${user.id}`} className="hover:underline font-medium truncate" title={user.email}>
           {user.name ?? user.email}
        </Link>
      ) : (
        <span className="text-muted-foreground italic">Bilinmiyor</span>
      )
    },
    sortingFn: (rowA, rowB, columnId) => { // Özel sıralama fonksiyonu
        const nameA = rowA.original.user?.name ?? rowA.original.user?.email ?? '';
        const nameB = rowB.original.user?.name ?? rowB.original.user?.email ?? '';
        return nameA.localeCompare(nameB);
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Plan Kolonu
  {
    accessorKey: "plan",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Plan" />
    ),
    cell: ({ row }) => {
       const plan = row.original.plan
       return plan ? (
          <Link href={`/admin/plans/${plan.id}`} className="hover:underline">
             {plan.name}
           </Link>
        ) : (
          <span className="text-muted-foreground italic">Bilinmiyor</span>
        )
    },
    sortingFn: (rowA, rowB, columnId) => { // Özel sıralama fonksiyonu
        const nameA = rowA.original.plan?.name ?? '';
        const nameB = rowB.original.plan?.name ?? '';
        return nameA.localeCompare(nameB);
    },
    enableSorting: true,
    enableHiding: true,
  },
  
  // Durum Kolonu
  {
    accessorKey: "status",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Durum" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as SubscriptionStatus
      const { variant, text } = getStatusProps(status)
      return (
        <Badge variant={variant} className="whitespace-nowrap">
          {text}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id)) // Filtreleme için
    },
    enableSorting: true,
    enableHiding: true,
  },
  
   // Periyot Kolonu
  {
    accessorKey: "interval",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Periyot" />
    ),
    cell: ({ row }) => {
       const interval = row.getValue("interval") as BillingInterval | null
       return <span className="whitespace-nowrap">{getIntervalText(interval)}</span>
    },
     filterFn: (row, id, value) => {
      // null değerleri de filtreleyebilmek için kontrol
      const interval = row.getValue(id) as BillingInterval | null;
      return value.includes(interval ?? 'null'); // 'null' string'i ile eşleşebilir
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Bitiş Tarihi Kolonu
  {
    accessorKey: "endDate",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Bitiş Tarihi" />
    ),
    cell: ({ row }) => {
       const date = row.getValue("endDate") as Date | null
       return <div className="whitespace-nowrap">{formatDate(date)}</div>
    },
     enableSorting: true,
     enableHiding: true,
  },

  // Aksiyonlar Kolonu
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />, 
     enableSorting: false,
     enableHiding: false,
  },
] 