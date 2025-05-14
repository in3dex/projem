"use client"

import * as React from "react"
import { Row } from "@tanstack/react-table"
import { MoreHorizontal, CheckCircle, XCircle, RefreshCw, Ban, Clock, PlayCircle, PauseCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger, 
    DropdownMenuSub, 
    DropdownMenuSubTrigger, 
    DropdownMenuSubContent, 
    DropdownMenuPortal
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { SubscriptionStatus } from "@prisma/client"
import { updateSubscriptionStatus, cancelSubscription } from "@/actions/admin/subscription-actions"
import { SubscriptionColumn } from "./subscriptions-columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface DataTableRowActionsProps<TData extends { id: string }> {
  row: Row<TData>
}

export function DataTableRowActions<TData extends { id: string }>({ row }: DataTableRowActionsProps<TData>) {
  const subscription = row.original as SubscriptionColumn
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = React.useState<boolean>(false)
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState<boolean>(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<Record<SubscriptionStatus, boolean>>({})
  const [isCancelling, setIsCancelling] = React.useState<boolean>(false)

  const handleStatusChange = async (newStatus: SubscriptionStatus) => {
    if (isUpdatingStatus[newStatus] || isCancelling) return; // Zaten işlemdeyse veya iptal ediliyorsa tekrar tetikleme

    setIsUpdatingStatus(prev => ({ ...prev, [newStatus]: true }))
    setIsStatusMenuOpen(false) // Dropdown menüyü kapat

    const actionResult = await updateSubscriptionStatus(row.original.id, newStatus)

    if (actionResult.success) {
      toast.success(actionResult.message)
      // İsteğe bağlı: Tabloyu yenilemek için ek mantık eklenebilir
      // Örneğin: router.refresh() veya useQueryClient().invalidateQueries(...)
    } else {
      toast.error(actionResult.message || "Durum güncellenirken bir hata oluştu.")
    }

    setIsUpdatingStatus(prev => ({ ...prev, [newStatus]: false }))
  }

  const handleCancel = async () => {
    if (isCancelling || Object.values(isUpdatingStatus).some(Boolean)) return; // Zaten işlemdeyse tekrar tetikleme

    setIsCancelling(true)

    const actionResult = await cancelSubscription(row.original.id)

    if (actionResult.success) {
      toast.success(actionResult.message)
      setIsCancelAlertOpen(false) // Onay dialogunu kapat
      // İsteğe bağlı: Tabloyu yenilemek için ek mantık
    } else {
      toast.error(actionResult.message || "Abonelik iptal edilirken bir hata oluştu.")
    }

    setIsCancelling(false)
  }

  const currentStatus = subscription.status

  return (
    <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <DropdownMenu onOpenChange={(open) => !isStatusMenuOpen && open}> 
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                    disabled={isLoading}
                >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Menüyü aç</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem disabled>Abonelik Detayları</DropdownMenuItem> {/* TODO: Detay sayfası/modalı */} 
                <DropdownMenuSeparator />
                <DropdownMenuSub onOpenChange={setIsStatusMenuOpen}> 
                    <DropdownMenuSubTrigger disabled={isLoading || currentStatus === SubscriptionStatus.CANCELED}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Durumu Değiştir
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem 
                                onClick={() => handleStatusChange(SubscriptionStatus.ACTIVE)} 
                                disabled={isLoading || currentStatus === SubscriptionStatus.ACTIVE || currentStatus === SubscriptionStatus.CANCELED}
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Aktif Yap
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleStatusChange(SubscriptionStatus.INACTIVE)} 
                                disabled={isLoading || currentStatus === SubscriptionStatus.INACTIVE || currentStatus === SubscriptionStatus.CANCELED}
                            >
                                <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Pasif Yap
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleStatusChange(SubscriptionStatus.PAST_DUE)} 
                                disabled={isLoading || currentStatus === SubscriptionStatus.PAST_DUE || currentStatus === SubscriptionStatus.CANCELED}
                            >
                                <XCircle className="mr-2 h-4 w-4 text-orange-500" /> Ödeme Gecikti Yap
                            </DropdownMenuItem>
                             <DropdownMenuItem 
                                onClick={() => handleStatusChange(SubscriptionStatus.TRIALING)} 
                                disabled={isLoading || currentStatus === SubscriptionStatus.TRIALING || currentStatus === SubscriptionStatus.CANCELED}
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-blue-500" /> Deneme Yap
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    disabled={isLoading || currentStatus === SubscriptionStatus.CANCELED}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => setIsCancelAlertOpen(true)} // Uyarıyı aç
                >
                    <XCircle className="mr-2 h-4 w-4" />
                    Aboneliği İptal Et
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* İptal Onaylama Uyarısı */}
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
                Bu abonelik kalıcı olarak iptal edilecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling} // İptal işlemi sırasında butonu devre dışı bırak
              className="bg-destructive hover:bg-destructive/90"
            >
              {isCancelling ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Evet, İptal Et
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  )
} 