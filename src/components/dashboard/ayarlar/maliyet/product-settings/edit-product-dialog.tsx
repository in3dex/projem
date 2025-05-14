'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { EditProductSettingState, ProductSettingInput } from "@/hooks/use-product-cost-settings";
import { useEffect } from "react";

interface EditProductDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editProductSetting: EditProductSettingState;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
}

export function EditProductDialog({
    isOpen,
    onOpenChange,
    editProductSetting,
    handleInputChange,
    onSave,
    isSaving
}: EditProductDialogProps) {

    // Diyalog kapandığında state'i temizlemek için (hook içinde de yapılabilir)
    useEffect(() => {
        if (!isOpen) {
            // Optional: Reset any local state if needed
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ürün Bazlı Ayarı Düzenle</DialogTitle>
                    <DialogDescription>
                        '{editProductSetting?.productId}' için maliyetleri güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                {editProductSetting && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_productId">Ürün ID</Label>
                            <Input
                                id="edit_productId"
                                name="productId"
                                value={editProductSetting.productId}
                                disabled // Product ID değiştirilemez
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_commissionRate">Özel Komisyon Oranı (%)</Label>
                            <Input
                                id="edit_commissionRate"
                                name="commissionRate"
                                type="number"
                                step="0.1"
                                value={editProductSetting.commissionRate ?? ''}
                                onChange={(e) => handleInputChange(e, 'edit')}
                                placeholder="Varsayılanı kullanmak için boş bırakın"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_shippingCost">Özel Kargo Maliyeti (TL)</Label>
                            <Input
                                id="edit_shippingCost"
                                name="shippingCost"
                                type="number"
                                step="0.01"
                                value={editProductSetting.shippingCost ?? ''}
                                onChange={(e) => handleInputChange(e, 'edit')}
                                placeholder="Varsayılanı kullanmak için boş bırakın"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_additionalCost">Özel Ek Masraf (TL)</Label>
                            <Input
                                id="edit_additionalCost"
                                name="additionalCost"
                                type="number"
                                step="0.01"
                                value={editProductSetting.additionalCost ?? ''}
                                onChange={(e) => handleInputChange(e, 'edit')}
                                placeholder="Varsayılanı kullanmak için boş bırakın"
                                disabled={isSaving}
                            />
                        </div>
                        {/* TaxRate eklenecekse buraya input eklenebilir */}
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>İptal</Button></DialogClose>
                    <Button onClick={onSave} disabled={isSaving || !editProductSetting}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Güncelle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 