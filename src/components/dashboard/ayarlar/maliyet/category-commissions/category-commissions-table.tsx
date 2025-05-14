'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2 } from "lucide-react";
import type { CategoryCommissionData } from "@/hooks/use-category-commissions"; // Tipi hook'tan alalım

interface CategoryCommissionsTableProps {
    categoryCommissions: CategoryCommissionData[];
    isLoading: boolean;
    isDeleting: boolean;
    onEdit: (commission: CategoryCommissionData) => void;
    onDelete: (settingId: string, categoryId: string, categoryName: string) => void; // Setting ID, Category ID ve adı gerekli
    openDeleteDialogId: string | null;
    setOpenDeleteDialogId: (id: string | null) => void;
    handleConfirmDelete: () => void;
}

export function CategoryCommissionsTable({
    categoryCommissions,
    isLoading,
    isDeleting,
    onEdit,
    onDelete,
    openDeleteDialogId,
    setOpenDeleteDialogId,
    handleConfirmDelete
}: CategoryCommissionsTableProps) {

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (categoryCommissions.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Tanımlı kategori komisyonu bulunmamaktadır.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Kategori ID</TableHead>
                    <TableHead>Kategori Adı</TableHead>
                    <TableHead>Komisyon Oranı (%)</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {categoryCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                        <TableCell>{commission.categoryId}</TableCell>
                        <TableCell>{commission.categoryName ?? '-'}</TableCell>
                        <TableCell>{commission.commissionRate.toFixed(2)}%</TableCell>
                        <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" title="Düzenle" onClick={() => onEdit(commission)} disabled={isDeleting}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog open={openDeleteDialogId === commission.id} onOpenChange={(open) => !open && setOpenDeleteDialogId(null)}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Sil" className="text-red-600 hover:text-red-700" onClick={() => onDelete(commission.id, commission.categoryId, commission.categoryName ?? commission.categoryId)} disabled={isDeleting}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bu işlem geri alınamaz. '{commission.categoryName ?? commission.categoryId}' kategorisi için özel komisyon oranını kalıcı olarak silecektir.
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