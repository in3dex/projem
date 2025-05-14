'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlusCircle, Sparkles, Copy } from "lucide-react";
import type { BaremRuleInput } from "@/hooks/use-barem-rules";

// Define TrendyolBaremTier locally or import if moved to lib
interface TrendyolBaremTier {
    min: number;
    max: number;
    price: number;
    maxDesi: number;
    label: string;
}

interface AddBaremDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    newBaremRule: BaremRuleInput;
    carrierOptions: { value: string; label: string }[];
    suggestedTrendyolRates: TrendyolBaremTier[];
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, type: 'new' | 'edit') => void;
    handleCarrierChange: (value: string, type: 'new' | 'edit') => void;
    handleApplySuggestedRate: (rate: TrendyolBaremTier, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
}

export function AddBaremDialog({
    isOpen,
    onOpenChange,
    newBaremRule,
    carrierOptions,
    suggestedTrendyolRates,
    handleInputChange,
    handleCarrierChange,
    handleApplySuggestedRate,
    onSave,
    isSaving
}: AddBaremDialogProps) {

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Barem Kuralı Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Yeni Barem Kuralı Ekle</DialogTitle>
                    <DialogDescription>
                        Kargo firması, sipariş tutarı aralığı, desi limiti ve KDV hariç fiyatı girin.
                    </DialogDescription>
                </DialogHeader>

                {/* Trendyol Suggestions */} 
                 {suggestedTrendyolRates.length > 0 && (
                    <>
                     <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                         <Sparkles className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                         <AlertTitle className="text-blue-800 dark:text-blue-300">Trendyol Barem Destek Önerileri (5 Desi Altı)</AlertTitle>
                         <AlertDescription className="text-blue-700 dark:text-blue-400 space-y-2 mt-2">
                             {suggestedTrendyolRates.map((rate, index) => (
                                <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-blue-100 dark:bg-blue-900/50">
                                     <span className="text-sm">
                                         <strong>{rate.label}:</strong> {rate.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL (KDV Hariç) - Max {rate.maxDesi} Desi
                                     </span>
                                     <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-blue-600 hover:bg-blue-200 dark:text-blue-400 dark:hover:bg-blue-800"
                                        onClick={() => handleApplySuggestedRate(rate, 'new')}
                                        title="Bu değerleri uygula"
                                        disabled={isSaving}
                                    >
                                         <Copy className="h-3 w-3 mr-1" />
                                         Uygula
                                     </Button>
                                 </div>
                             ))}
                             <p className="text-xs pt-1">Bu fiyatlar Trendyol'un "Barem Destek" uygulamasına ait olup 5 desi ve altı gönderiler için geçerlidir.</p>
                         </AlertDescription>
                     </Alert>
                     <Separator className="my-4" />
                    </>
                 )}

                {/* Form Fields */} 
                 <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="carrierName" className="text-right">Firma</Label>
                        <Select
                            value={newBaremRule.carrierName}
                            onValueChange={(value) => handleCarrierChange(value, 'new')}
                            disabled={isSaving}
                        >
                            <SelectTrigger id="carrierName" className="col-span-3">
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
                        <Label htmlFor="minOrderValue" className="text-right">Min. Tutar (TL)</Label>
                        <Input
                            id="minOrderValue"
                            name="minOrderValue"
                            value={newBaremRule.minOrderValue}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Örn: 0"
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="maxOrderValue" className="text-right">Max. Tutar (TL)</Label>
                        <Input
                            id="maxOrderValue"
                            name="maxOrderValue"
                            value={newBaremRule.maxOrderValue}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Örn: 149,99"
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="maxDesi" className="text-right">Max. Desi</Label>
                        <Input
                            id="maxDesi"
                            name="maxDesi"
                            value={newBaremRule.maxDesi ?? ''}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Boş = Limitsiz"
                            className="col-span-3"
                            type="text"
                            inputMode="decimal"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="priceExclVat" className="text-right">Fiyat (KDV H.)</Label>
                        <Input
                            id="priceExclVat"
                            name="priceExclVat"
                            value={newBaremRule.priceExclVat}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Örn: 27,08"
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
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 