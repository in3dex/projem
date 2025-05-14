'use client';

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Loader2, Info, Copy } from "lucide-react";
import { useMemo } from "react";
import { shippingCostsData } from "@/lib/shipping-costs";
import type { GeneralCostSettingsData } from "@/hooks/use-general-cost-settings";
import { Separator } from "@/components/ui/separator";

interface GeneralSettingsFormProps {
    settings: GeneralCostSettingsData;
    calculatedShippingCost: number | null;
    calculateLoading: boolean;
    isSaving: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCarrierChange: (value: string) => void;
    handleProfitMethodChange: (value: "MARGIN" | "MARKUP") => void;
    handleApplyCalculatedCost: () => void;
}

export function GeneralSettingsForm({
    settings,
    calculatedShippingCost,
    calculateLoading,
    isSaving,
    handleInputChange,
    handleCarrierChange,
    handleProfitMethodChange,
    handleApplyCalculatedCost
}: GeneralSettingsFormProps) {

    const carrierOptions = useMemo(() => {
        return shippingCostsData.map(carrier => ({
            value: carrier.name,
            label: carrier.name
        }));
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Varsayılan Maliyetler */}
            <div className="space-y-2">
                <Label htmlFor="defaultShippingCost">Varsayılan Kargo Maliyeti (TL)</Label>
                <Input
                    id="defaultShippingCost"
                    type="text" // Use text for better input handling with null/empty
                    inputMode="decimal" // Hint for mobile keyboards
                    placeholder="Barem dışı veya fallback"
                    value={settings.defaultShippingCost === null ? '' : String(settings.defaultShippingCost).replace('.',',')}
                    onChange={handleInputChange}
                    disabled={isSaving}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="defaultCommissionRate">Varsayılan Komisyon Oranı (%)</Label>
                <Input
                    id="defaultCommissionRate"
                    type="text"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="Örn: 15"
                    value={settings.defaultCommissionRate === null ? '' : String(settings.defaultCommissionRate).replace('.',',')}
                    onChange={handleInputChange}
                    disabled={isSaving}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Varsayılan Stopaj Oranı (%)</Label>
                <Input
                    id="defaultTaxRate"
                    type="text"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="Örn: 0"
                    value={settings.defaultTaxRate === null ? '' : String(settings.defaultTaxRate).replace('.',',')}
                    onChange={handleInputChange}
                    disabled={isSaving}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="defaultAdditionalCost">Varsayılan Ek Masraf (TL)</Label>
                <Input
                    id="defaultAdditionalCost"
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="Paketleme vb."
                    value={settings.defaultAdditionalCost === null ? '' : String(settings.defaultAdditionalCost).replace('.',',')}
                    onChange={handleInputChange}
                    disabled={isSaving}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="serviceFeeAmount">Varsayılan Hizmet Bedeli (TL, KDV Hariç)</Label>
                <Input
                    id="serviceFeeAmount"
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    value={settings.serviceFeeAmount === null ? '' : String(settings.serviceFeeAmount).replace('.',',')}
                    onChange={handleInputChange}
                    placeholder="Örn: 8.49"
                    disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">Trendyol varsayılanı: 8.49 TL</p>
            </div>

            {/* Kargo Firması ve Desi */}
            <div className="space-y-2 border-t pt-6 mt-6 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="defaultCarrierName">Varsayılan Kargo Firması</Label>
                    <Select
                        value={settings.defaultCarrierName ?? "__NONE__"}
                        onValueChange={handleCarrierChange}
                        disabled={isSaving}
                    >
                        <SelectTrigger id="defaultCarrierName">
                            <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__NONE__">Yok / Barem Kullan</SelectItem>
                            {carrierOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Kargo maliyeti barem dışı kalırsa veya desi hesaplanamazsa bu firma kullanılır.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="defaultDesi">Varsayılan Desi</Label>
                    <Input
                        id="defaultDesi"
                        type="text"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="Barem için kullanılır"
                        value={settings.defaultDesi === null ? '' : String(settings.defaultDesi).replace('.',',')}
                        onChange={handleInputChange}
                        disabled={isSaving}
                    />
                    {/* Display Calculated Cost */} 
                    {settings.defaultCarrierName && settings.defaultDesi !== null && (
                        <div className="text-sm text-muted-foreground flex items-center justify-between gap-2 mt-2">
                            <div className="flex items-center gap-1 min-w-0">
                                {calculateLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Info className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                    {calculatedShippingCost !== null
                                        ? `${settings.defaultCarrierName} ${String(settings.defaultDesi).replace('.',',')} desi:`
                                        : calculateLoading ? 'Hesaplanıyor...' : 'Fiyat yok/desteklenmiyor'}
                                </span>
                                {calculatedShippingCost !== null && !calculateLoading && (
                                    <strong className="ml-1">{calculatedShippingCost.toFixed(2)} ₺</strong>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleApplyCalculatedCost}
                                disabled={calculatedShippingCost === null || calculateLoading || isSaving}
                                title="Hesaplanan ücreti varsayılan maliyete uygula"
                                className="flex-shrink-0"
                            >
                                <Copy className="h-3 w-3 mr-1" />
                                Uygula
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Kâr Hesaplama */}
            <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3 border-t pt-4 mt-4">
                <Label>Varsayılan Kâr Hesaplama Yöntemi</Label>
                <RadioGroup
                    value={settings.defaultProfitCalculationMethod ?? "MARGIN"}
                    onValueChange={handleProfitMethodChange}
                    className="flex items-center gap-4"
                    disabled={isSaving}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MARGIN" id="r-margin" disabled={isSaving} />
                        <Label htmlFor="r-margin">Marj Üzerinden (%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MARKUP" id="r-markup" disabled={isSaving} />
                        <Label htmlFor="r-markup">Maliyet Üzerine Ekleme (%)</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label htmlFor="defaultProfitRate">Varsayılan Kâr Oranı (%)</Label>
                <Input
                    id="defaultProfitRate"
                    type="text"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="Seçilen yönteme göre oran"
                    value={settings.defaultProfitRate === null ? '' : String(settings.defaultProfitRate).replace('.',',')}
                    onChange={handleInputChange}
                    disabled={isSaving}
                />
            </div>
        </div>
    );
} 