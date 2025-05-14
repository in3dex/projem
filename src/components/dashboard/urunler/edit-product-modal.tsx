'use client';

import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { ProductEditForm } from '@/components/dashboard/product-edit-form';

interface EditProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSuccess: () => void;
}

export function EditProductModal({ 
  isOpen, 
  onOpenChange, 
  productId,
  onSuccess 
}: EditProductModalProps) {
  
  // productId null ise modal'ı göstermeme
  if (!productId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] lg:max-w-[60vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ürünü Düzenle</DialogTitle>
          <DialogDescription>
            {/* Açıklamada ID veya başka bir bilgi gösterilebilir, şimdilik kaldırıldı */}
            {/* Ürün ID: {productId} */}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6"> 
             <ProductEditForm
                 productId={productId}
                 onSuccess={(type) => { 
                     // Başarı durumunda modalı kapat ve üst bileşeni bilgilendir
                     onSuccess(); // Bu zaten handleEditSuccess'ı çağırır (ki o da modalı kapatır)
                     // Belki farklı türler için farklı mesajlar gösterilebilir?
                     // console.log(`Başarılı işlem: ${type}`);
                 }}
                 onCancel={() => onOpenChange(false)} // Bu prop hala gerekli
             />
        </div>
      </DialogContent>
    </Dialog>
  );
} 