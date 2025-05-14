'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2 } from "lucide-react";
import type { ProductCostSettingData } from '@/hooks/use-product-cost-settings'; // Tipleri hook'tan alalım

interface ProductSettingsTableProps {
    productSettings: ProductCostSettingData[];
    isLoading: boolean;
    isDeleting: boolean;
    onEdit: (setting: ProductCostSettingData) => void;
    onDelete: (settingId: string, productId: string, productName: string) => void; // Setting ID, Product ID ve adı gerekli
    openDeleteDialogId: string | null;
    setOpenDeleteDialogId: (id: string | null) => void;
    handleConfirmDelete: () => void;
}

export function ProductSettingsTable({
    productSettings,
    isLoading,
    isDeleting,
    onEdit,
    onDelete,
    openDeleteDialogId,
    setOpenDeleteDialogId,
    handleConfirmDelete
}: ProductSettingsTableProps) {

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (productSettings.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Tanımlı ürün bazlı ayar bulunmamaktadır.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Ürün ID</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Komisyon (%)</TableHead>
                    <TableHead>Kargo (TL)</TableHead>
                    <TableHead>Ek Masraf (TL)</TableHead>
                    {/* <TableHead>Stopaj (%)</TableHead> // Eklenecekse */}
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {productSettings.map((setting) => (
                    <TableRow key={setting.id}>
                        <TableCell>{setting.productId}</TableCell>
                        <TableCell>{setting.productName ?? '-'}</TableCell>
                        <TableCell>{setting.commissionRate !== null ? `${setting.commissionRate.toFixed(2)}%` : 'Varsayılan'}</TableCell>
                        <TableCell>{setting.shippingCost !== null ? `${setting.shippingCost.toFixed(2)} TL` : 'Varsayılan'}</TableCell>
                        <TableCell>{setting.additionalCost !== null ? `${setting.additionalCost.toFixed(2)} TL` : 'Varsayılan'}</TableCell>
                        {/* <TableCell>{setting.taxRate !== null ? `${setting.taxRate.toFixed(2)}%` : 'Varsayılan'}</TableCell> // Eklenecekse */}
                        <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" title="Düzenle" onClick={() => onEdit(setting)} disabled={isDeleting}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog open={openDeleteDialogId === setting.id} onOpenChange={(open) => !open && setOpenDeleteDialogId(null)}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Sil" className="text-red-600 hover:text-red-700" onClick={() => onDelete(setting.id, setting.productId, setting.productName ?? setting.productId)} disabled={isDeleting}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bu işlem geri alınamaz. '{setting.productName ?? setting.productId}' ürünü için özel ayarları kalıcı olarak silecektir.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setOpenDeleteDialogId(null)}>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sil
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
} 