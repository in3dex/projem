'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2 } from "lucide-react";
import type { BaremPriceData } from "@/hooks/use-barem-rules";

interface BaremRulesTableProps {
    baremRules: BaremPriceData[];
    isLoading: boolean;
    isDeleting: boolean;
    ruleToDelete: BaremPriceData | null;
    onEdit: (rule: BaremPriceData) => void;
    onDelete: (rule: BaremPriceData) => void; // Pass the whole rule to identify for deletion
    handleConfirmDelete: () => void;
    closeDeleteConfirmation: () => void;
}

export function BaremRulesTable({
    baremRules,
    isLoading,
    isDeleting,
    ruleToDelete,
    onEdit,
    onDelete,
    handleConfirmDelete,
    closeDeleteConfirmation
}: BaremRulesTableProps) {

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (baremRules.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Tanımlı barem kuralı bulunmamaktadır.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Kargo Firması</TableHead>
                    <TableHead>Min. Tutar</TableHead>
                    <TableHead>Max. Tutar</TableHead>
                    <TableHead>Max. Desi</TableHead>
                    <TableHead className="text-right">Fiyat (KDV Hariç)</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {baremRules.map((rule) => (
                    <TableRow key={rule.id}>
                        <TableCell>{rule.carrierName}</TableCell>
                        <TableCell>{rule.minOrderValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</TableCell>
                        <TableCell>{rule.maxOrderValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</TableCell>
                        <TableCell>{rule.maxDesi ?? 'Limitsiz'}</TableCell>
                        <TableCell className="text-right">{rule.priceExclVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</TableCell>
                        <TableCell className="text-right space-x-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(rule)}
                                disabled={isDeleting}
                                title="Düzenle"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog open={ruleToDelete?.id === rule.id} onOpenChange={(open) => !open && closeDeleteConfirmation()}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        disabled={isDeleting && ruleToDelete?.id === rule.id}
                                        title="Sil"
                                        onClick={() => onDelete(rule)}
                                    >
                                        {isDeleting && ruleToDelete?.id === rule.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                {ruleToDelete?.id === rule.id && (
                                     <AlertDialogContent>
                                         <AlertDialogHeader>
                                             <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                             <AlertDialogDescription>
                                                Bu işlem geri alınamaz. '{ruleToDelete.carrierName}' için {ruleToDelete.minOrderValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL - {ruleToDelete.maxOrderValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL ({ruleToDelete.maxDesi ? `Max ${ruleToDelete.maxDesi} Desi` : 'Limitsiz Desi'}) kuralını kalıcı olarak silecektir.
                                             </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <AlertDialogFooter>
                                             <AlertDialogCancel onClick={closeDeleteConfirmation}>İptal</AlertDialogCancel>
                                             <AlertDialogAction
                                                 onClick={handleConfirmDelete}
                                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                 disabled={isDeleting}
                                             >
                                                 {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                 Sil
                                             </AlertDialogAction>
                                         </AlertDialogFooter>
                                     </AlertDialogContent>
                                )}
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
} 