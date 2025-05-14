'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { EditCategoryCommissionState, CategoryCommissionInput } from "@/hooks/use-category-commissions";
import { useEffect } from "react";

interface EditCategoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editCategoryCommission: EditCategoryCommissionState;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
}

export function EditCategoryDialog({
    isOpen,
    onOpenChange,
    editCategoryCommission,
    handleInputChange,
    onSave,
    isSaving
}: EditCategoryDialogProps) {

    useEffect(() => {
        if (!isOpen) {
            // Optional: Reset any local state if needed
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kategori Komisyonu Düzenle</DialogTitle>
                    <DialogDescription>
                        '{editCategoryCommission?.categoryId}' için komisyon oranını güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                {editCategoryCommission && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_categoryId">Kategori ID</Label>
                            <Input
                                id="edit_categoryId"
                                name="categoryId"
                                value={editCategoryCommission.categoryId}
                                disabled // Category ID değiştirilemez
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_categoryCommissionRate">Komisyon Oranı (%) <span className="text-red-500">*</span></Label>
                            <Input
                                id="edit_categoryCommissionRate"
                                name="commissionRate"
                                type="number"
                                step="0.1"
                                min="0"
                                value={editCategoryCommission.commissionRate}
                                onChange={(e) => handleInputChange(e, 'edit')}
                                placeholder="Örn: 18"
                                required
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>İptal</Button></DialogClose>
                    <Button onClick={onSave} disabled={isSaving || !editCategoryCommission || editCategoryCommission.commissionRate === ''}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Güncelle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 