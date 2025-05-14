'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Subscription, User, Plan, SubscriptionStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Check, X, Edit } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from 'next/navigation' // Sayfayı yenilemek için
import React, { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
  } from "@/components/ui/dialog"
import { SubscriptionEditForm } from "@/components/admin/subscription-edit-form"

// Tablo verisi için tip tanımı (ilişkilerle birlikte)
export type SubscriptionWithDetails = Subscription & {
  user: Pick<User, 'id' | 'name' | 'email'>
  plan: Pick<Plan, 'id' | 'name'>
}

// Durum Badge'i için variant belirleme fonksiyonu
const getStatusVariantAndClass = (status: SubscriptionStatus): { variant: "default" | "secondary" | "destructive" | "outline", className?: string } => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return { variant: 'default' } // Yeşil gibi görünür genelde (veya success class eklenebilir)
    case SubscriptionStatus.PENDING_PAYMENT:
      // 'warning' variantı yok, outline kullanıp sarı/turuncu renk ekleyelim
      return { variant: 'outline', className: 'border-yellow-500 text-yellow-600 dark:border-yellow-700 dark:text-yellow-500' } 
    case SubscriptionStatus.CANCELED:
      return { variant: 'destructive' } // Kırmızı
    case SubscriptionStatus.INACTIVE:
    case SubscriptionStatus.PAST_DUE:
      return { variant: 'secondary' } // Gri
    case SubscriptionStatus.TRIALING:
      return { variant: 'outline' } // Farklı bir stil (mavi olabilir)
    default:
      return { variant: 'outline' }
  }
}

// Durumları Türkçeleştirme (isteğe bağlı)
const translateStatus = (status: SubscriptionStatus): string => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return 'Aktif'
    case SubscriptionStatus.PENDING_PAYMENT: return 'Ödeme Bekliyor'
    case SubscriptionStatus.CANCELED: return 'İptal Edildi'
    case SubscriptionStatus.INACTIVE: return 'Pasif'
    case SubscriptionStatus.PAST_DUE: return 'Ödeme Gecikti'
    case SubscriptionStatus.TRIALING: return 'Deneme'
    default: return status
  }
}

export const columns: ColumnDef<SubscriptionWithDetails>[] = [
  {
    accessorKey: "user.email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Kullanıcı Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="lowercase">{row.original.user?.email || '-'}</div>,
  },
  {
    accessorKey: "plan.name",
    header: "Plan Adı",
    cell: ({ row }) => <div>{row.original.plan?.name || '-'}</div>,
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const { variant, className } = getStatusVariantAndClass(row.original.status);
      return (
        <Badge variant={variant} className={className}>
          {translateStatus(row.original.status)}
        </Badge>
      );
    },
    // Duruma göre filtreleme için
     filterFn: (row, id, value) => {
       return value.includes(row.getValue(id))
     },
  },
  {
    accessorKey: "paymentMethod",
    header: "Ödeme Yöntemi",
    cell: ({ row }) => <div className="uppercase">{row.original.paymentMethod || '-'}</div>,
  },
  {
    accessorKey: "currentPeriodEnd",
    header: "Bitiş Tarihi",
    cell: ({ row }) => (
        <div>{format(new Date(row.original.currentPeriodEnd), 'PP', { locale: tr })}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Oluşturulma Tarihi",
     cell: ({ row }) => (
        <div>{format(new Date(row.original.createdAt), 'PPpp', { locale: tr })}</div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Aksiyonlar</div>,
    cell: ({ row }) => {
      const subscription = row.original;
      const [isDialogOpen, setIsDialogOpen] = useState(false);

      return (
        <div className="text-right">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
                 <DialogTrigger asChild>
                     <Button variant="ghost" size="icon" aria-label="Aboneliği Düzenle">
                         <Edit className="h-4 w-4" />
                     </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[425px]">
                     <DialogHeader>
                         <DialogTitle>Abonelik Düzenle</DialogTitle>
                         <DialogDescription>
                            Kullanıcı: {subscription.user?.email} <br/>
                            Plan: {subscription.plan?.name}
                         </DialogDescription>
                     </DialogHeader>
                     <SubscriptionEditForm 
                        subscription={subscription} 
                        onSuccess={() => setIsDialogOpen(false)}
                    />
                 </DialogContent>
            </Dialog>
        </div>
      );
    },
  },
] 