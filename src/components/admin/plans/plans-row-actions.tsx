"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { Row } from "@tanstack/react-table"
import * as React from "react"; // State için

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlanColumn } from "./plans-columns" // Plan tipini alalım
import { toast } from "sonner"
import { Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react"
import { PlanDialog } from "./plan-dialog" // Dialog import
import { updatePlanStatus, deletePlan } from "@/actions/admin/plan-actions" // Server actions import

interface DataTableRowActionsProps<TData extends PlanColumn> {
  row: Row<TData>
}

export function DataTableRowActions<TData extends PlanColumn>(
  { row }: DataTableRowActionsProps<TData>
) {
  const plan = row.original
  const [isStatusLoading, setIsStatusLoading] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const handleStatusToggle = async () => {
    setIsStatusLoading(true);
    const newStatus = !plan.isActive;
    try {
        const result = await updatePlanStatus(plan.id, newStatus);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    } catch (error) {
        toast.error("Durum güncellenirken bir hata oluştu.");
    } finally {
        setIsStatusLoading(false);
    }
  }

  const handleDeletePlan = async () => {
     setIsDeleteDialogOpen(true); // Silme işlemi başladı
    try {
        const result = await deletePlan(plan.id);
         if (result.success) {
            toast.success(result.message);
            // Burada dialog kapatmaya gerek yok, revalidate ile satır kaybolacak
        } else {
            toast.error(result.message);
        }
    } catch (error) {
         toast.error("Plan silinirken bir hata oluştu.");
    } finally {
        setIsDeleteDialogOpen(false); // Silme işlemi bitti
    }
  }

  return (
    <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              disabled={isStatusLoading || isDeleteDialogOpen} // İşlem sırasında butonu pasif yap
            >
              {isStatusLoading || isDeleteDialogOpen ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                 <DotsHorizontalIcon className="h-4 w-4" />
              )} 
              <span className="sr-only">Menüyü aç</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
             {/* Düzenle aksiyonu için PlanDialog'u tetikle */}
            <DropdownMenuItem 
              onSelect={() => setIsEditDialogOpen(true)} 
              disabled={isStatusLoading || isDeleteDialogOpen}
            >
               <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuItem 
                onClick={handleStatusToggle} 
                disabled={isStatusLoading || isDeleteDialogOpen}
            >
              {plan.isActive ? 
                 <><EyeOff className="mr-2 h-4 w-4" /> Pasif Yap</> : 
                 <><Eye className="mr-2 h-4 w-4" /> Aktif Yap</>
              }
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             {/* Silme işlemi için onay mekanizması içeride */}
            <DropdownMenuItem 
                onClick={async () => {
                    if (confirm(`"${plan.name}" planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve ilişkili abonelikleri etkileyebilir.`)) {
                        await handleDeletePlan();
                    }
                }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                disabled={isStatusLoading || isDeleteDialogOpen}
             >
               <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Düzenleme Dialog'u */}
        <PlanDialog 
            plan={plan} 
            open={isEditDialogOpen} 
            onOpenChange={setIsEditDialogOpen} 
        />
    </>
  )
} 