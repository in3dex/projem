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
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryCommissionInput } from "@/hooks/use-category-commissions";

interface Category {
    id: string;
    name?: string | null;
}

interface AddCategoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    newCategoryCommission: CategoryCommissionInput;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => void;
    onSave: () => void;
    isSaving: boolean;
    allCategories: Category[];
    isLoadingAllCategories: boolean;
    handleCategorySelect: (categoryId: string) => void;
}

export function AddCategoryDialog({
    isOpen,
    onOpenChange,
    newCategoryCommission,
    handleInputChange,
    onSave,
    isSaving,
    allCategories,
    isLoadingAllCategories,
    handleCategorySelect
}: AddCategoryDialogProps) {
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const selectedCategoryName = allCategories.find(cat => cat.id === newCategoryCommission.categoryId)?.name;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                 setIsComboboxOpen(false);
                 setSearchQuery("");
             }
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Yeni Kategori Komisyonu Ekle</DialogTitle>
                    <DialogDescription>
                        Kategoriyi arayın/seçin veya ID'sini girin ve özel komisyon oranını belirtin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryComboboxTrigger">Kategori Ara ve Seç</Label>
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    id="categoryComboboxTrigger"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isComboboxOpen}
                                    className="w-full justify-between font-normal"
                                    disabled={isLoadingAllCategories || isSaving}
                                >
                                    {newCategoryCommission.categoryId
                                        ? (selectedCategoryName ?? newCategoryCommission.categoryId)
                                        : "Listeden bir kategori seçin veya arayın..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto p-0">
                                <Command
                                    filter={(value, search) => {
                                        const category = allCategories.find(cat => cat.id === value);
                                        const nameMatch = category?.name?.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'));
                                        const idMatch = category?.id.includes(search);
                                        return nameMatch || idMatch ? 1 : 0;
                                    }}
                                >
                                    <CommandInput
                                        placeholder="Kategori adı veya ID ile ara..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                    />
                                    <CommandList>
                                        {isLoadingAllCategories && (
                                            <div className="py-6 text-center text-sm text-muted-foreground">Yükleniyor...</div>
                                        )}
                                        <CommandEmpty>Kategori bulunamadı.</CommandEmpty>
                                        <CommandGroup>
                                            {allCategories.map((category) => (
                                                <CommandItem
                                                    key={category.id}
                                                    value={category.id}
                                                    onSelect={(currentValue) => {
                                                        handleCategorySelect(currentValue === newCategoryCommission.categoryId ? '' : currentValue);
                                                        setIsComboboxOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            newCategoryCommission.categoryId === category.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {category.name ?? category.id}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="categoryId">Seçilen Kategori ID'si (Veya Manuel Girin)</Label>
                        <Input
                            id="categoryId"
                            name="categoryId"
                            value={newCategoryCommission.categoryId}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Yukarıdan seçin veya ID girin"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="commissionRate">Özel Komisyon Oranı (%) <span className="text-red-500">*</span></Label>
                        <Input
                            id="commissionRate"
                            name="commissionRate"
                            type="number"
                            step="0.1"
                            value={newCategoryCommission.commissionRate ?? ''}
                            onChange={(e) => handleInputChange(e, 'new')}
                            placeholder="Örn: 15.5"
                            required
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>İptal</Button></DialogClose>
                    <Button onClick={onSave} disabled={isSaving || !newCategoryCommission.categoryId || !newCategoryCommission.commissionRate}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 