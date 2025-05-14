'use client';

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { GeneralCostSettingsData } from "@/hooks/use-general-cost-settings";

interface VatSettingsFormProps {
    settings: GeneralCostSettingsData;
    isSaving: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function VatSettingsForm({ settings, isSaving, handleInputChange }: VatSettingsFormProps) {
    return (
        <div className="space-y-6">
            {/* Service Fee Amount - BU BLOK TAŞINDI */}
            {/* 
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
            <Separator /> 
            */}
            {/* Grid for VAT Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="salesVatRate">Satış KDV Oranı (%)</Label>
                    <Input
                        id="salesVatRate"
                        type="text"
                        inputMode="decimal"
                        value={settings.salesVatRate === null ? '' : String(settings.salesVatRate).replace('.',',')}
                        onChange={handleInputChange}
                        placeholder="Örn: 20"
                        disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="shippingVatRate">Kargo KDV Oranı (%)</Label>
                    <Input
                        id="shippingVatRate"
                        type="text"
                        inputMode="decimal"
                        step="1"
                        value={settings.shippingVatRate === null ? '' : String(settings.shippingVatRate).replace('.',',')}
                        onChange={handleInputChange}
                        placeholder="Örn: 20"
                        disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="commissionVatRate">Komisyon KDV Oranı (%)</Label>
                    <Input
                        id="commissionVatRate"
                        type="text"
                        inputMode="decimal"
                        step="1"
                        value={settings.commissionVatRate === null ? '' : String(settings.commissionVatRate).replace('.',',')}
                        onChange={handleInputChange}
                        placeholder="Örn: 20"
                        disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="serviceFeeVatRate">Hizmet Bedeli KDV Oranı (%)</Label>
                    <Input
                        id="serviceFeeVatRate"
                        type="text"
                        inputMode="decimal"
                        step="1"
                        value={settings.serviceFeeVatRate === null ? '' : String(settings.serviceFeeVatRate).replace('.',',')}
                        onChange={handleInputChange}
                        placeholder="Örn: 20"
                        disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="costVatRate">Maliyet KDV Oranı (%)</Label>
                    <Input
                        id="costVatRate"
                        type="text"
                        inputMode="decimal"
                        step="1"
                        value={settings.costVatRate === null ? '' : String(settings.costVatRate).replace('.',',')}
                        onChange={handleInputChange}
                        placeholder="Opsiyonel"
                        disabled={isSaving}
                    />
                </div>
                {/* Keep this field empty or adjust grid */}
                {/* <div></div> */}
                 {/* VAT Inclusion Checkbox - Moved below grid */} 
            </div>
            {/* VAT Inclusion Checkbox */} 
             <div className="flex items-center space-x-2 pt-4 border-t">
                 <Input
                    type="checkbox"
                    id="includeCostVat"
                    checked={settings.includeCostVat ?? false}
                    onChange={handleInputChange}
                    className="h-4 w-4"
                    disabled={isSaving} />
                 <Label htmlFor="includeCostVat" className="text-sm font-normal">
                     Maliyet KDV'sini gider olarak hesaplamalara dahil et (mahsup etme)
                 </Label>
             </div>
        </div>
    );
} 