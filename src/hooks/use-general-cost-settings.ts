'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { shippingCostsData, getShippingCost } from '@/lib/shipping-costs';

// Placeholder types (Replace with actual Prisma types if available)
export interface GeneralCostSettingsData {
  id?: string;
  defaultShippingCost: number | null;
  defaultCommissionRate: number | null;
  defaultTaxRate: number | null;
  defaultAdditionalCost: number | null;
  defaultCarrierName: string | null;
  defaultDesi: number | null;
  defaultProfitCalculationMethod: "MARGIN" | "MARKUP" | null;
  defaultProfitRate: number | null;
  salesVatRate: number | null;
  shippingVatRate: number | null;
  commissionVatRate: number | null;
  serviceFeeAmount: number | null;
  serviceFeeVatRate: number | null;
  costVatRate: number | null;
  includeCostVat: boolean | null;
}

const initialSettings: GeneralCostSettingsData = {
    defaultShippingCost: null,
    defaultCommissionRate: null,
    defaultTaxRate: null,
    defaultAdditionalCost: null,
    defaultCarrierName: null,
    defaultDesi: null,
    defaultProfitCalculationMethod: "MARGIN",
    defaultProfitRate: null,
    salesVatRate: 20, // Default VAT rates
    shippingVatRate: 20,
    commissionVatRate: 20,
    serviceFeeAmount: 8.49, // Default Service Fee
    serviceFeeVatRate: 20,
    costVatRate: null,
    includeCostVat: false,
};

export function useGeneralCostSettings() {
    const [settings, setSettings] = useState<GeneralCostSettingsData>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(null);
    const [calculateLoading, setCalculateLoading] = useState(false);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/settings/cost/general');
            if (!response.ok) {
                let errorDetails = response.statusText;
                try {
                    errorDetails = (await response.json()).error || errorDetails;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorDetails || 'Ayarlar getirilemedi.');
            }
            const data = await response.json();
            // Merge fetched data with initial defaults to ensure all fields are present
            setSettings(prev => ({
                ...initialSettings, // Start with defaults
                ...prev,            // Keep any local changes if fetch is slow? (unlikely needed here)
                ...data,           // Override with fetched data
                // Ensure specific types or defaults for potentially missing fields from API
                defaultProfitCalculationMethod: data.defaultProfitCalculationMethod ?? initialSettings.defaultProfitCalculationMethod,
                salesVatRate: data.salesVatRate ?? initialSettings.salesVatRate,
                shippingVatRate: data.shippingVatRate ?? initialSettings.shippingVatRate,
                commissionVatRate: data.commissionVatRate ?? initialSettings.commissionVatRate,
                serviceFeeAmount: data.serviceFeeAmount ?? initialSettings.serviceFeeAmount,
                serviceFeeVatRate: data.serviceFeeVatRate ?? initialSettings.serviceFeeVatRate,
                includeCostVat: data.includeCostVat ?? initialSettings.includeCostVat,
            }));
        } catch (error: any) {
            console.error("Ayarları getirme hatası:", error);
            toast.error(`Ayarlar getirilemedi: ${error.message}`);
            setSettings(initialSettings); // Reset to defaults on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Calculate default shipping cost when carrier or desi changes
    useEffect(() => {
        if (settings.defaultCarrierName && settings.defaultDesi !== null) {
            try {
                setCalculateLoading(true);
                const desiValue = parseFloat(String(settings.defaultDesi));
                if (isNaN(desiValue)) {
                    setCalculatedShippingCost(null);
                    return;
                }
                const cost = getShippingCost(settings.defaultCarrierName, desiValue);
                setCalculatedShippingCost(cost);
            } catch (error) {
                console.error("Varsayılan kargo maliyeti hesaplanırken hata:", error);
                setCalculatedShippingCost(null);
            } finally {
                setCalculateLoading(false);
            }
        } else {
            setCalculatedShippingCost(null);
        }
    }, [settings.defaultCarrierName, settings.defaultDesi]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type, checked } = e.target;
        const numericFields = [
            'defaultDesi', 'defaultShippingCost', 'defaultCommissionRate',
            'defaultTaxRate', 'defaultAdditionalCost', 'defaultProfitRate',
            'salesVatRate', 'shippingVatRate', 'commissionVatRate',
            'serviceFeeAmount', 'serviceFeeVatRate', 'costVatRate'
        ];

        setSettings(prev => {
            let processedValue: string | number | boolean | null;

            if (type === 'checkbox') {
                processedValue = checked;
            } else if (numericFields.includes(id)) {
                // Allow empty string to represent null, parse otherwise
                processedValue = value === '' ? null : parseFloat(value);
                 // If parseFloat results in NaN, keep it as null (or handle as error later)
                 if (value !== '' && isNaN(processedValue as number)) {
                    processedValue = prev[id as keyof GeneralCostSettingsData]; // Revert to previous value if invalid number
                     toast.warning(`"${id}" için geçersiz sayısal değer: ${value}`);
                 }
            } else {
                processedValue = value;
            }

            if (id in prev) {
                return { ...prev, [id]: processedValue };
            } else {
                console.warn(`Trying to update non-existent key: ${id}`);
                return prev;
            }
        });
    };

    const handleSelectChange = (id: keyof GeneralCostSettingsData, value: string | null) => {
         setSettings(prev => ({ ...prev, [id]: value }));
    };

     const handleCarrierChange = (value: string) => {
         const actualValue = value === "__NONE__" ? null : value;
         handleSelectChange('defaultCarrierName', actualValue);
     };

     const handleProfitMethodChange = (value: "MARGIN" | "MARKUP") => {
         handleSelectChange('defaultProfitCalculationMethod', value);
     };

    const handleSave = async () => {
        setIsSaving(true);
        toast.info("Genel maliyet ayarları kaydediliyor...");
        try {
            // Prepare payload, potentially converting nulls back if API expects undefined or specific values
            const payload = { ...settings };

            const response = await fetch('/api/settings/cost/general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                let errorDetails = response.statusText;
                try {
                    errorDetails = (await response.json()).error || errorDetails;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorDetails || 'Ayarlar kaydedilemedi.');
            }
            const resultData = await response.json();
            // Update state with the saved data from the response
             setSettings(prev => ({
                ...initialSettings, // Ensure defaults
                ...prev,            // Keep local non-saved fields? (unlikely needed)
                ...resultData.data // Apply saved data
            }));
            toast.success(resultData.message || 'Genel maliyet ayarları başarıyla kaydedildi.');
        } catch (error: any) {
            console.error("Kaydetme hatası:", error);
            toast.error(`Ayarlar kaydedilemedi: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplyCalculatedCost = () => {
        if (calculatedShippingCost !== null) {
            setSettings(prev => ({
                ...prev,
                defaultShippingCost: calculatedShippingCost
            }));
            const costForToast = calculatedShippingCost.toFixed(2);
            toast.info(`Varsayılan kargo maliyeti ${costForToast} TL olarak ayarlandı.`);
        }
    };


    return {
        settings,
        isLoading,
        isSaving,
        calculatedShippingCost,
        calculateLoading,
        handleInputChange,
        handleSelectChange,
        handleCarrierChange,
        handleProfitMethodChange,
        handleSave,
        handleApplyCalculatedCost,
        fetchSettings, // Expose fetch for potential manual refresh
    };
} 