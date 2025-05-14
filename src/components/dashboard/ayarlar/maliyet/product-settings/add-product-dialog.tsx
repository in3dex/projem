'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, ChevronsUpDown, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductSettingInput } from "@/hooks/use-product-cost-settings";

interface Product {
    id: string;
    title?: string | null;
    barcode?: string | null;
}

interface AddProductDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    newProductSetting: ProductSettingInput;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
    productSearchQuery: string;
    productSearchResults: Product[];
    isLoadingProductSearch: boolean;
    isComboboxOpen: boolean;
    setIsComboboxOpen: (open: boolean) => void;
    handleProductSearchChange: (query: string) => void;
    handleProductSelect: (productId: string) => void;
}

const LabelWithTooltip = ({ htmlFor, label, tooltipText }: { htmlFor: string, label: string, tooltipText: string }) => (
    <div className="flex items-center space-x-1.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);

export function AddProductDialog({
    isOpen,
    onOpenChange,
    newProductSetting,
    handleInputChange,
    onSave,
    isSaving,
    productSearchQuery,
    productSearchResults,
    isLoadingProductSearch,
    isComboboxOpen,
    setIsComboboxOpen,
    handleProductSearchChange,
    handleProductSelect
}: AddProductDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Yeni Ürün Bazlı Ayar Ekle</DialogTitle>
                    <DialogDescription>
                        Ürünü arayın veya ID'sini girin ve bu ürüne özel maliyetleri belirtin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                    <div className="space-y-1.5">
                        <LabelWithTooltip
                            htmlFor="productComboboxTrigger" 
                            label="Ürün Ara ve Seç"
                            tooltipText="Aramak istediğiniz ürünün adını, barkodunu veya ID'sini yazmaya başlayın. En az 2 karakter gereklidir."
                        />
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    id="productComboboxTrigger"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isComboboxOpen}
                                    className="w-full justify-between font-normal"
                                    disabled={isSaving}
                                >
                                    {newProductSetting.productId
                                        ? (productSearchResults.find(p => p.id === newProductSetting.productId)?.title ?? productSearchQuery)
                                            ? `${(productSearchResults.find(p => p.id === newProductSetting.productId)?.title ?? productSearchQuery).substring(0, 30)}${((productSearchResults.find(p => p.id === newProductSetting.productId)?.title ?? productSearchQuery).length > 30) ? '...' : ''} (${newProductSetting.productId})`
                                            : newProductSetting.productId
                                        : (productSearchQuery || "Ürün adı, barkod veya ID ile ara...")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Ürün adı, barkod, ID..."
                                        value={productSearchQuery}
                                        onValueChange={handleProductSearchChange}
                                    />
                                    <CommandList>
                                        {isLoadingProductSearch && (
                                            <div className="py-6 text-center text-sm text-muted-foreground">Yükleniyor...</div>
                                        )}
                                        <CommandEmpty>
                                            {productSearchQuery.trim().length < 2
                                                ? "Aramak için en az 2 karakter girin."
                                                : "Ürün bulunamadı."
                                            }
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {productSearchResults.map((product) => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={product.id}
                                                    onSelect={(currentValue) => {
                                                        handleProductSelect(currentValue);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            newProductSetting.productId === product.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span className="flex-1 truncate" title={product.title ?? product.barcode ?? product.id}>
                                                        {product.title ?? product.barcode ?? product.id}
                                                    </span>
                                                    {product.title && <span className="ml-2 text-xs text-muted-foreground">({product.barcode ?? product.id})</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1.5">
                        <LabelWithTooltip
                            htmlFor="productId"
                            label="Seçilen Ürün ID'si (Veya Manuel Girin)"
                            tooltipText="Yukarıdaki arama kutusundan bir ürün seçtiğinizde burası otomatik olarak dolar. Alternatif olarak, ürünün ID'sini manuel olarak da girebilirsiniz."
                        />
                        <Input
                            id="productId"
                            name="productId"
                            value={newProductSetting.productId}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Yukarıdan seçin veya ID girin"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="border-t pt-5 mt-2">
                        <h4 className="text-sm font-medium mb-4">Özel Maliyet Ayarları (Opsiyonel)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <LabelWithTooltip
                                    htmlFor="commissionRate"
                                    label="Komisyon Oranı (%)"
                                    tooltipText="Bu ürüne özel bir Trendyol komisyon oranı belirleyin. Boş bırakırsanız genel veya kategori ayarı geçerli olur."
                                />
                        <Input
                            id="commissionRate"
                            name="commissionRate"
                            type="number"
                            step="0.1"
                            value={newProductSetting.commissionRate ?? ''}
                            onChange={(e) => handleInputChange(e, 'new')}
                                    placeholder="Varsayılan"
                            disabled={isSaving}
                        />
                    </div>
                            <div className="space-y-1.5">
                                <LabelWithTooltip
                                    htmlFor="shippingCost"
                                    label="Kargo Maliyeti (TL)"
                                    tooltipText="Bu ürüne özel bir kargo maliyeti belirleyin (KDV Hariç). Boş bırakırsanız genel veya barem ayarı geçerli olur."
                                />
                        <Input
                            id="shippingCost"
                            name="shippingCost"
                            type="number"
                            step="0.01"
                            value={newProductSetting.shippingCost ?? ''}
                            onChange={(e) => handleInputChange(e, 'new')}
                                    placeholder="Varsayılan"
                            disabled={isSaving}
                        />
                    </div>
                            <div className="space-y-1.5">
                                <LabelWithTooltip
                                    htmlFor="additionalCost"
                                    label="Ek Masraf (TL)"
                                    tooltipText="Bu ürüne özel ek masrafları (paketleme, etiket vb. KDV Hariç) girin. Boş bırakırsanız genel ayar geçerli olur."
                                />
                        <Input
                            id="additionalCost"
                            name="additionalCost"
                            type="number"
                            step="0.01"
                            value={newProductSetting.additionalCost ?? ''}
                            onChange={(e) => handleInputChange(e, 'new')}
                                    placeholder="Varsayılan"
                            disabled={isSaving}
                        />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="mt-2">
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>İptal</Button></DialogClose>
                    <Button onClick={onSave} disabled={isSaving || !newProductSetting.productId}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 