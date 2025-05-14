'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Notification, User, NotificationType } from "@prisma/client" // Prisma tiplerini import et
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Check, Mail, User as UserIcon, AlertCircle, ShoppingCart, X } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import Link from "next/link"
import React from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Tablo verisi için tip tanımı (ilişkilerle birlikte)
export type NotificationData = Notification & {
  user: Pick<User, 'id' | 'name' | 'email'> | null // User null olabilir
}

// Bildirim Tipi için Badge ve İkon
const getTypeVariantAndIcon = (type?: NotificationType | string | null): { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ElementType } => {
  switch (type) {
    case NotificationType.NEW_USER:
      return { variant: 'default', icon: UserIcon };
    case NotificationType.SUBSCRIPTION_UPDATE:
      return { variant: 'outline', icon: ShoppingCart };
    case NotificationType.PAYMENT_SUCCESS:
        return { variant: 'default', icon: Check }; // Success
    case NotificationType.PAYMENT_FAILED:
      return { variant: 'destructive', icon: AlertCircle };
    case NotificationType.MESSAGE:
        return { variant: 'secondary', icon: Mail };
    // Diğer tipler için eklemeler yapılabilir
    default:
      return { variant: 'secondary', icon: AlertCircle };
  }
};

// Bildirimleri okundu/okunmadı yapma fonksiyonu (Admin için)
const toggleNotificationReadStatus = async (notificationId: string, currentStatus: boolean, router: ReturnType<typeof useRouter>) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, { // API endpoint'i varsayımsal
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !currentStatus }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Bildirim durumu güncellenemedi.');
      }
  
      toast.success(`Bildirim ${!currentStatus ? 'okundu' : 'okunmadı'} olarak işaretlendi.`);
      router.refresh(); // Tabloyu yenile
    } catch (error: any) {    
      toast.error(`Hata: ${error.message}`);
      console.error("Bildirim durumu güncelleme hatası:", error);
    }
  };

export const columns: ColumnDef<NotificationData>[] = [
  // Okundu/Okunmadı Checkbox veya Butonu
  {
    id: "readStatus",
    header: ({ table }) => (
      // Opsiyonel: Tümünü seç checkbox'ı eklenebilir
      <span>Okundu</span>
    ),
    cell: ({ row }) => {
        const router = useRouter();
        return (
            <Button 
                variant="ghost"
                size="icon"
                className={row.original.read ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-foreground"}
                onClick={() => toggleNotificationReadStatus(row.original.id, row.original.read, router)}
                aria-label={row.original.read ? "Okunmadı yap" : "Okundu yap"}
            >
                <Check className="h-4 w-4" />
            </Button>
        )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "message",
    header: "Mesaj",
    cell: ({ row }) => <div className="font-medium">{row.getValue("message")}</div>
  },
  {
    accessorKey: "type",
    header: "Tip",
    cell: ({ row }) => {
      const { variant, icon: TypeIcon } = getTypeVariantAndIcon(row.original.type);
      return (
        <Badge variant={variant}>
          <TypeIcon className="mr-1 h-3 w-3" />
          {row.original.type || 'Bilinmiyor'}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
  },
  {
    accessorKey: "user.email",
    header: "Kullanıcı",
    cell: ({ row }) => {
      const user = row.original.user;
      return user ? (
        <Link href={`/admin/users/${user.id}`} className="hover:underline">
          {user.email}
        </Link>
      ) : (
        'Sistem'
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Tarih
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
     cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">{format(new Date(row.original.createdAt), 'PPpp', { locale: tr })}</div>
    ),
  },
  // İsteğe Bağlı: Aksiyonlar (Sil vb.)
  // {
  //   id: "actions",
  //   cell: ({ row }) => {
  //       // Silme butonu vb. eklenebilir
  //   }
  // }
] 