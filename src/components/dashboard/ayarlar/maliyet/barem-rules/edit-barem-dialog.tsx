'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Copy } from "lucide-react";
import type { EditBaremRuleState, BaremRuleInput } from "@/hooks/use-barem-rules";

// Define TrendyolBaremTier locally or import if moved to lib
interface TrendyolBaremTier {
    min: number;
    max: number;
    price: number;
    maxDesi: number;
    label: string;
}

interface EditBaremDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    ruleToEdit: EditBaremRuleState;
    carrierOptions: { value: string; label: string }[];
    suggestedTrendyolRates: TrendyolBaremTier[];
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, type: 'new' | 'edit') => void;
    handleCarrierChange: (value: string, type: 'new' | 'edit') => void;
    handleApplySuggestedRate: (rate: TrendyolBaremTier, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
}

export function EditBaremDialog({
    isOpen,
    onOpenChange,
    ruleToEdit,
    carrierOptions,
    suggestedTrendyolRates,
    handleInputChange,
    handleCarrierChange,
    handleApplySuggestedRate,
    onSave,
    isSaving
}: EditBaremDialogProps) {

    if (!ruleToEdit) return null; // Don't render if no rule is being edited

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Barem Kuralı Düzenle</DialogTitle>
                    <DialogDescription>
                        '{ruleToEdit.carrierName}' için kural detaylarını güncelleyin.
                    </DialogDescription>
                </DialogHeader>

                {/* Trendyol Suggestions */} 
                 {suggestedTrendyolRates.length > 0 && (
                     <>
                         <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 mt-4">
                             <Sparkles className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                             <AlertTitle className="text-blue-800 dark:text-blue-300">Trendyol Barem Destek Önerileri (5 Desi Altı)</AlertTitle>
                             <AlertDescription className="text-blue-700 dark:text-blue-400 space-y-2 mt-2">
                                 {suggestedTrendyolRates.map((rate, index) => (
                                     <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-blue-100 dark:bg-blue-900/50">
                                         <span className="text-sm">
                                             <strong>{rate.label}:</strong> {rate.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL (KDV Hariç) - Max {rate.maxDesi} Desi
                                         </span>
                                          {/* Apply button might not be needed in edit, but kept for consistency */}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-blue-600 hover:bg-blue-200 dark:text-blue-400 dark:hover:bg-blue-800"
                                            onClick={() => handleApplySuggestedRate(rate, 'edit')}
                                            title="Bu değerleri uygula"
                                            disabled={isSaving}
                                        >
                                             <Copy className="h-3 w-3 mr-1" />
                                             Uygula
                                         </Button>
                                     </div>
                                 ))}
                             </AlertDescription>
                         </Alert>
                         <Separator className="my-4" />
                     </>
                 )}

                {/* Form Fields */} 
                 <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-carrierName" className="text-right">Firma</Label>
                        <Select
                            value={ruleToEdit.carrierName}
                            onValueChange={(value) => handleCarrierChange(value, 'edit')}
                            disabled={isSaving}
                        >
                            <SelectTrigger id="edit-carrierName" className="col-span-3">
                                <SelectValue placeholder="Kargo Firması Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {carrierOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-minOrderValue" className="text-right">Min. Tutar (TL)</Label>
                        <Input
                            id="edit-minOrderValue"
                            name="minOrderValue"
                            value={ruleToEdit.minOrderValue}
                            onChange={(e) => handleInputChange(e, 'edit')}
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-maxOrderValue" className="text-right">Max. Tutar (TL)</Label>
                        <Input
                            id="edit-maxOrderValue"
                            name="maxOrderValue"
                            value={ruleToEdit.maxOrderValue}
                            onChange={(e) => handleInputChange(e, 'edit')}
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-maxDesi" className="text-right">Max. Desi</Label>
                        <Input
                            id="edit-maxDesi"
                            name="maxDesi"
                            value={ruleToEdit.maxDesi ?? ''}
                            onChange={(e) => handleInputChange(e, 'edit')}
                            placeholder="Boş = Limitsiz"
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-priceExclVat" className="text-right">Fiyat (KDV H.)</Label>
                        <Input
                            id="edit-priceExclVat"
                            name="priceExclVat"
                            value={ruleToEdit.priceExclVat}
                            onChange={(e) => handleInputChange(e, 'edit')}
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSaving}>İptal</Button>
                    </DialogClose>
                    <Button type="button" onClick={onSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Güncelle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 