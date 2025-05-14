"use client";

import * as React from "react";
import type { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose // Kapatma butonu için
} from "@/components/ui/dialog";
import { PlanForm } from "./plan-form";
import { PlusCircle, Edit } from "lucide-react";

interface PlanDialogProps {
  plan?: Plan | null; // Düzenleme için plan verisi
  children?: React.ReactNode; // Trigger olarak kullanılacaksa
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Form gönderimi başarılı olduğunda dialog'u kapatmak için
  onSuccess?: () => void;
}

export function PlanDialog({ 
  plan,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess
}: PlanDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isEditing = !!plan;
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const handleSuccess = () => {
     onOpenChange(false); // Dialog'u kapat
     onSuccess?.(); // Varsa dışarıdaki onSuccess'i çağır
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Eğer children varsa, onu trigger olarak kullan */}
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      {/* Eğer children yoksa, varsayılan trigger butonlarını göster */}
      {!children && (
          isEditing ? (
             // Düzenleme için küçük bir buton (row action içinde kullanılabilir)
             <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs justify-start p-1 h-auto">
                    <Edit className="mr-2 h-3 w-3" /> Düzenle
                </Button>
             </DialogTrigger>
          ) : (
             // Oluşturma için varsayılan buton (toolbar'da kullanılabilir)
             <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Plan Oluştur
                </Button>
             </DialogTrigger>
          )
      )}

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Planı Düzenle" : "Yeni Plan Oluştur"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `"${plan?.name}" planının detaylarını güncelleyin.` 
              : "Yeni bir abonelik planı için gerekli bilgileri girin."} 
          </DialogDescription>
        </DialogHeader>
        
        {/* Formu Dialog içine yerleştir */}
        <div className="py-2">
           <PlanForm plan={plan} onSuccess={handleSuccess} />
        </div>

         {/* Footer (Formun kendi butonu olduğu için gerek kalmayabilir) */}
         {/* <DialogFooter>
           <DialogClose asChild>
              <Button type="button" variant="secondary">İptal</Button>
           </DialogClose>
           {/* Formun submit butonu dışarıda da kontrol edilebilir * / }
         </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
} 