'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { shippingCostsData } from '@/lib/shipping-costs';

// --- START: Trendyol Barem Destek Data (Keep this utility data here or move to a lib file) ---
interface TrendyolBaremTier {
    min: number;
    max: number;
    price: number;
    maxDesi: number;
    label: string; // e.g., "0 TL - 149,99 TL Arası"
}

const trendyolBaremRates: Record<string, TrendyolBaremTier[]> = {
    'PTT - TEX': [
        { min: 0, max: 149.99, price: 27.08, maxDesi: 5, label: "0 TL - 149,99 TL Arası" },
        { min: 149.99, max: 249.99, price: 51.66, maxDesi: 5, label: "149,99 TL - 249,99 TL Arası" },
    ],
    'Aras - MNG - Kolay Gelsin - Sürat': [
        { min: 0, max: 149.99, price: 35.83, maxDesi: 5, label: "0 TL - 149,99 TL Arası" },
        { min: 149.99, max: 249.99, price: 62.49, maxDesi: 5, label: "149,99 TL - 249,99 TL Arası" },
    ],
    'YK': [
        { min: 0, max: 149.99, price: 59.16, maxDesi: 5, label: "0 TL - 149,99 TL Arası" },
        { min: 149.99, max: 249.99, price: 81.66, maxDesi: 5, label: "149,99 TL - 249,99 TL Arası" },
    ],
};

// Map individual carriers from shippingCostsData to the Trendyol groups
const trendyolCarrierMapping: Record<string, string> = {
    "PTT Kargo": 'PTT - TEX',
    "TEX Kargo": 'PTT - TEX',
    "Aras Kargo": 'Aras - MNG - Kolay Gelsin - Sürat',
    "MNG Kargo": 'Aras - MNG - Kolay Gelsin - Sürat',
    "Kolay Gelsin": 'Aras - MNG - Kolay Gelsin - Sürat',
    "Sürat Kargo": 'Aras - MNG - Kolay Gelsin - Sürat',
    "Yurtiçi Kargo": 'YK',
};
// --- END: Trendyol Barem Destek Data ---

// Placeholder types (Replace with actual Prisma types if available)
export interface BaremPriceData {
    id: string;
    carrierName: string;
    minOrderValue: number;
    maxOrderValue: number;
    maxDesi: number | null;
    priceExclVat: number;
    // Add other fields if present in Prisma model (e.g., createdAt, updatedAt)
}

// Type for form inputs (allows strings during input)
export interface BaremRuleInput {
    carrierName: string;
    minOrderValue: number | string;
    maxOrderValue: number | string;
    maxDesi: number | string | null;
    priceExclVat: number | string;
}

// Type for editing state (includes ID)
export type EditBaremRuleState = (BaremRuleInput & { id: string }) | null;

const initialNewRule: BaremRuleInput = {
    carrierName: '',
    minOrderValue: '',
    maxOrderValue: '',
    maxDesi: null,
    priceExclVat: ''
};

export function useBaremRules() {
    const [baremRules, setBaremRules] = useState<BaremPriceData[]>([]);
    const [isLoadingBarem, setIsLoadingBarem] = useState(true);
    const [isSavingBarem, setIsSavingBarem] = useState(false); // Combined state for add/update
    const [isDeletingBarem, setIsDeletingBarem] = useState(false);
    const [isAddBaremDialogOpen, setIsAddBaremDialogOpen] = useState(false);
    const [isEditBaremDialogOpen, setIsEditBaremDialogOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState<BaremPriceData | null>(null);
    const [ruleToEdit, setRuleToEdit] = useState<EditBaremRuleState>(null);
    const [newBaremRule, setNewBaremRule] = useState<BaremRuleInput>(initialNewRule);
    const [suggestedTrendyolRates, setSuggestedTrendyolRates] = useState<TrendyolBaremTier[]>([]);

    const carrierOptions = useMemo(() => {
        return shippingCostsData.map(carrier => ({
            value: carrier.name,
            label: carrier.name
        }));
    }, []);

    const fetchBaremRules = useCallback(async () => {
        setIsLoadingBarem(true);
        try {
            const response = await fetch('/api/settings/cost/barem');
            if (!response.ok) {
                let errorDetails = response.statusText;
                try {
                    errorDetails = (await response.json()).error || errorDetails;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorDetails || 'Barem kuralları getirilemedi.');
            }
            const data: BaremPriceData[] = await response.json();
            setBaremRules(data);
        } catch (error: any) {
            console.error("Barem kurallarını getirme hatası:", error);
            toast.error(`Barem kuralları getirilemedi: ${error.message}`);
            setBaremRules([]);
        } finally {
            setIsLoadingBarem(false);
        }
    }, []);

    useEffect(() => {
        fetchBaremRules();
    }, [fetchBaremRules]);

    // Helper to parse and validate numeric input
    const parseNumeric = (val: string | number | null): number | null => {
        if (val === null || val === '') return null;
        const num = parseFloat(String(val).replace(/,/g, '.')); // Replace comma with dot for parsing
        return isNaN(num) ? null : num;
    };

    // Validate Barem Rule Input
    const validateBaremRule = (rule: BaremRuleInput): string | null => {
        const minOrderValue = parseNumeric(rule.minOrderValue);
        const maxOrderValue = parseNumeric(rule.maxOrderValue);
        const priceExclVat = parseNumeric(rule.priceExclVat);

        if (!rule.carrierName) return "Lütfen bir kargo firması seçin.";
        if (minOrderValue === null) return "Min. Tutar geçerli bir sayı olmalıdır.";
        if (maxOrderValue === null) return "Max. Tutar geçerli bir sayı olmalıdır.";
        if (priceExclVat === null) return "Fiyat geçerli bir sayı olmalıdır.";
        if (minOrderValue >= maxOrderValue) return "Min. Tutar, Max. Tutar'dan küçük olmalıdır.";
        // Add more validation if needed (e.g., non-negative price)
        return null; // No error
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, type: 'new' | 'edit') => {
        const { name, value } = e.target;
        const targetStateSetter = type === 'new' ? setNewBaremRule : setRuleToEdit;
        const numericFields = ['minOrderValue', 'maxOrderValue', 'maxDesi', 'priceExclVat'];

        targetStateSetter(prev => {
            if (!prev) return null; // Should not happen for 'new', safety for 'edit'
            let processedValue: string | number | null = value;
            if (name === 'maxDesi' && value === '') {
                 processedValue = null;
             } else if (numericFields.includes(name)) {
                 // Allow numeric input with dot or comma, store as string
                 const sanitizedValue = value.replace(/[^0-9.,]/g, '');
                 processedValue = sanitizedValue;
             }
            return { ...prev, [name]: processedValue };
        });
    };

    const handleCarrierChange = (value: string, type: 'new' | 'edit') => {
        const actualValue = value === "__NONE__" ? '' : value;
        const targetStateSetter = type === 'new' ? setNewBaremRule : setRuleToEdit;

        targetStateSetter(prev => {
             if (!prev) return null;
             return { ...prev, carrierName: actualValue };
        });

        // Update suggestions only for the relevant dialog
        const trendyolGroup = trendyolCarrierMapping[actualValue];
        setSuggestedTrendyolRates(trendyolGroup ? trendyolBaremRates[trendyolGroup] : []);
    };

    const handleApplySuggestedRate = (rate: TrendyolBaremTier, type: 'new' | 'edit') => {
        const targetStateSetter = type === 'new' ? setNewBaremRule : setRuleToEdit;
         targetStateSetter(prev => {
            if (!prev) return null;
            return {
                ...prev,
                minOrderValue: String(rate.min).replace('.',','), // Use comma for display
                maxOrderValue: String(rate.max).replace('.',','),
                maxDesi: String(rate.maxDesi),
                priceExclVat: String(rate.price).replace('.',','),
            };
        });
        toast.info(`"${rate.label}" için önerilen değerler uygulandı.`);
    };

    const handleAddBaremRule = async () => {
        const validationError = validateBaremRule(newBaremRule);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setIsSavingBarem(true);
        toast.info("Yeni barem kuralı ekleniyor...");
        try {
            const payload = {
                carrierName: newBaremRule.carrierName,
                minOrderValue: parseNumeric(newBaremRule.minOrderValue) as number, // Assert non-null based on validation
                maxOrderValue: parseNumeric(newBaremRule.maxOrderValue) as number,
                maxDesi: parseNumeric(newBaremRule.maxDesi),
                priceExclVat: parseNumeric(newBaremRule.priceExclVat) as number,
            };

            const response = await fetch('/api/settings/cost/barem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.error || resultData.details || 'Barem kuralı eklenemedi.');
            }
            toast.success(resultData.message || "Barem kuralı başarıyla eklendi!");
            setBaremRules(prev => [...prev, resultData.data]);
            setIsAddBaremDialogOpen(false);
            setNewBaremRule(initialNewRule);
            setSuggestedTrendyolRates([]);
        } catch (error: any) {
            console.error("Barem ekleme hatası:", error);
            toast.error(`Barem kuralı eklenemedi: ${error.message}`);
        } finally {
            setIsSavingBarem(false);
        }
    };

    const handleUpdateBaremRule = async () => {
        if (!ruleToEdit?.id) {
            toast.error("Güncellenecek kural bulunamadı.");
            return;
        }
        const validationError = validateBaremRule(ruleToEdit);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setIsSavingBarem(true);
        toast.info("Barem kuralı güncelleniyor...");
        try {
             const payload = {
                carrierName: ruleToEdit.carrierName,
                minOrderValue: parseNumeric(ruleToEdit.minOrderValue) as number,
                maxOrderValue: parseNumeric(ruleToEdit.maxOrderValue) as number,
                maxDesi: parseNumeric(ruleToEdit.maxDesi),
                priceExclVat: parseNumeric(ruleToEdit.priceExclVat) as number,
            };

            const response = await fetch(`/api/settings/cost/barem/${ruleToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.error || resultData.details || 'Barem kuralı güncellenemedi.');
            }
            toast.success(resultData.message || "Barem kuralı başarıyla güncellendi!");
            setBaremRules(prev =>
                prev.map(rule =>
                    rule.id === ruleToEdit.id ? { ...rule, ...resultData.data } : rule
                )
            );
            setIsEditBaremDialogOpen(false);
            setRuleToEdit(null);
            setSuggestedTrendyolRates([]);
        } catch (error: any) {
            console.error("Barem kuralı güncelleme hatası:", error);
            toast.error(`Güncelleme başarısız: ${error.message}`);
        } finally {
            setIsSavingBarem(false);
        }
    };

    const handleDeleteBaremRule = async () => {
        if (!ruleToDelete?.id) {
            toast.error("Silinecek kural bulunamadı.");
            setRuleToDelete(null); // Close confirmation if somehow opened without ID
            return;
        }
        const idToDelete = ruleToDelete.id;
        setIsDeletingBarem(true);
        toast.info("Barem kuralı siliniyor...");
        try {
            const response = await fetch(`/api/settings/cost/barem/${idToDelete}`, {
                method: 'DELETE'
            });
            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.error || resultData.details || 'Barem kuralı silinemedi.');
            }
            toast.success(resultData.message || "Barem kuralı başarıyla silindi!");
            setBaremRules(prev => prev.filter(rule => rule.id !== idToDelete));
            setRuleToDelete(null); // Close confirmation dialog
        } catch (error: any) {
            console.error("Barem kuralı silme hatası:", error);
            toast.error(`Silme başarısız: ${error.message}`);
             setRuleToDelete(null); // Ensure dialog closes on error too
        } finally {
            setIsDeletingBarem(false);
        }
    };

    // Dialog Handlers
    const openAddBaremDialog = () => {
        setNewBaremRule(initialNewRule);
        setSuggestedTrendyolRates([]);
        setIsAddBaremDialogOpen(true);
    };
    const closeAddBaremDialog = () => setIsAddBaremDialogOpen(false);

    const openEditBaremDialog = (rule: BaremPriceData) => {
         setRuleToEdit({
            id: rule.id,
            carrierName: rule.carrierName,
            minOrderValue: String(rule.minOrderValue).replace('.',','), // Use comma for display
            maxOrderValue: String(rule.maxOrderValue).replace('.',','),
            maxDesi: rule.maxDesi === null ? null : String(rule.maxDesi),
            priceExclVat: String(rule.priceExclVat).replace('.',','),
        });
         const trendyolGroup = trendyolCarrierMapping[rule.carrierName];
         setSuggestedTrendyolRates(trendyolGroup ? trendyolBaremRates[trendyolGroup] : []);
        setIsEditBaremDialogOpen(true);
    };
    const closeEditBaremDialog = () => {
        setIsEditBaremDialogOpen(false);
        setRuleToEdit(null);
         setSuggestedTrendyolRates([]);
    };

    const openDeleteConfirmation = (rule: BaremPriceData) => setRuleToDelete(rule);
    const closeDeleteConfirmation = () => setRuleToDelete(null);

    return {
        baremRules,
        isLoadingBarem,
        isSavingBarem,
        isDeletingBarem,
        isAddBaremDialogOpen,
        isEditBaremDialogOpen,
        ruleToDelete,
        ruleToEdit,
        newBaremRule,
        carrierOptions,
        suggestedTrendyolRates,
        handleInputChange,
        handleCarrierChange,
        handleApplySuggestedRate,
        handleAddBaremRule,
        handleUpdateBaremRule,
        handleDeleteBaremRule,
        openAddBaremDialog,
        closeAddBaremDialog,
        openEditBaremDialog,
        closeEditBaremDialog,
        openDeleteConfirmation,
        closeDeleteConfirmation,
        fetchBaremRules,
        setIsAddBaremDialogOpen
    };
} 