'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProductCostPrice } from '@/actions/products/update-product-cost'; // Bu action'ı oluşturacağız

// Ürün tipi (gerekli alanlar)
interface ProductData {
    id: string;
    title: string;
    barcode: string | null;
    stockCode: string | null;
    costPrice: number | null;
}

interface EditCostModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductData | null;
    onCostUpdate: () => void; // Maliyet güncellendiğinde çağrılacak callback
}

export function EditCostModal({ isOpen, onClose, product, onCostUpdate }: EditCostModalProps) {
    const [costPrice, setCostPrice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (product) {
            setCostPrice(product.costPrice?.toString() ?? '');
            setError(null); // Modal açıldığında hatayı temizle
        }
    }, [product]);

    const handleSave = async () => {
        if (!product) return;

        const newCost = parseFloat(costPrice);
        if (isNaN(newCost) || newCost < 0) {
            setError("Lütfen geçerli bir pozitif maliyet girin.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await updateProductCostPrice(product.id, newCost);
            if (result.success) {
                toast.success("Ürün maliyeti başarıyla güncellendi.");
                onCostUpdate(); // Ana bileşeni güncellemesi için tetikle
                onClose(); // Modalı kapat
            } else {
                throw new Error(result.error || "Maliyet güncellenemedi.");
            }
        } catch (err: any) {
            console.error("Maliyet güncelleme hatası:", err);
            setError(err.message || "Bir hata oluştu.");
            toast.error(`Maliyet güncellenemedi: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ürün Maliyetini Düzenle</DialogTitle>
                    <DialogDescription>
                        '{product.title}' ürününün birim maliyetini (KDV Hariç) güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="text-sm space-y-1">
                        <p><span className="font-medium">Barkod:</span> {product.barcode ?? '-'}</p>
                        <p><span className="font-medium">Stok Kodu:</span> {product.stockCode ?? '-'}</p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPrice" className="text-right col-span-1">
                            Birim Maliyet (₺)
                        </Label>
                        <Input
                            id="costPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            className="col-span-3"
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 col-span-4 text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>
                            İptal
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 