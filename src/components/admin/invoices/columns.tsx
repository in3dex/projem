'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Invoice, InvoiceStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, CheckCircleIcon, ClockIcon, XCircleIcon, InfoIcon, CreditCard, BanknoteIcon, Check } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import React from "react"

// Fatura Tipi (API'den gelen)
export type InvoiceData = Invoice // Şimdilik sadece Invoice yeterli

// Durum Badge'i için variant belirleme fonksiyonu
const getStatusVariantAndClass = (status: InvoiceStatus): { variant: "default" | "secondary" | "destructive" | "outline", className?: string, icon: React.ElementType } => {
  switch (status) {
    case InvoiceStatus.PAID:
      return { variant: 'default', icon: CheckCircleIcon }; // Yeşil
    case InvoiceStatus.PENDING:
      return { variant: 'outline', className: 'border-yellow-500 text-yellow-600 dark:border-yellow-700 dark:text-yellow-500', icon: ClockIcon }; // Sarı/Turuncu
    case InvoiceStatus.OVERDUE:
    case InvoiceStatus.CANCELED:
      return { variant: 'destructive', icon: XCircleIcon }; // Kırmızı
    default:
      return { variant: 'secondary', icon: InfoIcon };
  }
};

// Durumları Türkçeleştirme
const translateStatus = (status: InvoiceStatus): string => {
  switch (status) {
    case InvoiceStatus.PAID: return 'Ödendi'
    case InvoiceStatus.PENDING: return 'Ödeme Bekliyor'
    case InvoiceStatus.OVERDUE: return 'Gecikti'
    case InvoiceStatus.CANCELED: return 'İptal Edildi'
    default: return status
  }
};

// Faturayı ödendi yapma fonksiyonu
const markInvoiceAsPaid = async (invoiceId: string, router: ReturnType<typeof useRouter>) => {
  try {
    const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: InvoiceStatus.PAID }), // Durumu PAID olarak gönder
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Fatura güncellenemedi.');
    }

    toast.success(`Fatura #${invoiceId.substring(0,8)} ödendi olarak işaretlendi.`);
    router.refresh(); // Tabloyu yenile
  } catch (error: any) {    
    toast.error(`Hata: ${error.message}`);
    console.error("Fatura ödendi işaretleme hatası:", error);
  }
};

// Faturayı reddetme fonksiyonu
const rejectInvoice = async (invoiceId: string, router: ReturnType<typeof useRouter>) => {
  try {
    const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: InvoiceStatus.CANCELED }), // Durumu CANCELED olarak gönder
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Fatura reddedilemedi.');
    }

    toast.success(`Fatura #${invoiceId.substring(0,8)} reddedildi.`);
    router.refresh(); // Tabloyu yenile
  } catch (error: any) {    
    toast.error(`Hata: ${error.message}`);
    console.error("Fatura reddetme hatası:", error);
  }
};

export const columns: ColumnDef<InvoiceData>[] = [
  {
    accessorKey: "id",
    header: "Fatura No",
    cell: ({ row }) => <div className="font-mono text-xs">#{row.original.id.substring(0, 8)}...</div>
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const { variant, className, icon: StatusIcon } = getStatusVariantAndClass(row.original.status);
      return (
        <Badge variant={variant} className={className}>
           <StatusIcon className="mr-1 h-3 w-3" />
          {translateStatus(row.original.status)}
        </Badge>
      );
    },
     filterFn: (row, id, value) => {
       return value.includes(row.getValue(id))
     },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-right justify-end w-full px-0 hover:bg-transparent"
      >
        Tutar
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.amount, row.original.currency)}</div>,
  },
  {
    accessorKey: "dueDate",
    header: "Son Ödeme Tarihi",
    cell: ({ row }) => (
        <div>{format(new Date(row.original.dueDate), 'PP', { locale: tr })}</div>
    ),
  },
  {
    accessorKey: "issueDate",
    header: "Oluşturulma Tarihi",
     cell: ({ row }) => (
        <div>{format(new Date(row.original.issueDate), 'PP', { locale: tr })}</div>
    ),
  },
  {
    accessorKey: "paidAt",
    header: "Ödenme Tarihi",
     cell: ({ row }) => (
        <div>{row.original.paidAt ? format(new Date(row.original.paidAt), 'PPpp', { locale: tr }) : '-'}</div>
    ),
  },
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
    cell: ({ row }) => {
      const email = row.original.user?.email;
      if (!email) return '-';
      return <div className="lowercase">{email}</div>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original
      const router = useRouter();
      const [isApproving, setIsApproving] = React.useState(false);
      const [isRejecting, setIsRejecting] = React.useState(false);

      const handleMarkAsPaid = async () => {
        setIsApproving(true);
        await markInvoiceAsPaid(invoice.id, router);
        setIsApproving(false);
      };

      const handleReject = async () => {
        setIsRejecting(true);
        await rejectInvoice(invoice.id, router);
        setIsRejecting(false);
      };
      
      // PENDING veya OVERDUE durumundaki faturalar için butonları göster
      if (invoice.status === InvoiceStatus.PENDING || invoice.status === InvoiceStatus.OVERDUE) {
        return (
          <div className="flex justify-end space-x-2">
            {/* Reddet Butonu */}
            <Button 
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
              >
               <XCircleIcon className="mr-1 h-4 w-4" /> Reddet
            </Button>
             {/* Ödendi Yap Butonu */}
            <Button 
              variant="outline"
              size="sm"
              onClick={handleMarkAsPaid}
              disabled={isApproving || isRejecting}
              className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
              >
               <Check className="mr-1 h-4 w-4" /> Ödendi Yap
            </Button>
          </div>
        )
      }
      // TODO: Başarılı faturalar için indirme linki eklenebilir
      return <div className="text-right">-</div>
    },
  },
] 