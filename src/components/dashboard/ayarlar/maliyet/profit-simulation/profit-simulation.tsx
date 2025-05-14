'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { shippingCostsData } from '@/lib/shipping-costs';
import { GeneralCostSettingsData } from '@/hooks/use-general-cost-settings';
import { BaremPriceData } from '@/hooks/use-barem-rules';
import { calculateProfit, SimulationInput, CalculationResult } from '@/lib/profit-calculator';

interface ProfitSimulationProps {
    settings: GeneralCostSettingsData;
    baremRules: BaremPriceData[];
}

export function ProfitSimulation({ settings, baremRules }: ProfitSimulationProps) {
    const [simulation, setSimulation] = useState<SimulationInput>({
        productCost: '80', // KDV Hariç
        salePrice: '350', // KDV Hariç
        desi: '3',
        carrier: '',
        serviceFeeInclVat: (settings.serviceFeeAmount ?? 0) * (1 + (settings.serviceFeeVatRate ?? 20) / 100), // Use calculated default
        additionalCostExclVat: '0'
    });

    const carrierOptions = useMemo(() => {
        return shippingCostsData.map(carrier => ({
            value: carrier.name,
            label: carrier.name
        }));
    }, []);

    // Initialize carrier when options load
    useEffect(() => {
        if (!simulation.carrier && carrierOptions.length > 0) {
            setSimulation(prev => ({ ...prev, carrier: carrierOptions[0].value }));
        }
    }, [carrierOptions, simulation.carrier]);

    // Update default service fee if settings change
     useEffect(() => {
        const defaultServiceFeeInclVat = (settings.serviceFeeAmount ?? 0) * (1 + (settings.serviceFeeVatRate ?? 20) / 100);
         setSimulation(prev => ({ ...prev, serviceFeeInclVat: defaultServiceFeeInclVat.toFixed(2).replace('.',',') }));
     }, [settings.serviceFeeAmount, settings.serviceFeeVatRate]);

    const handleSimulationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSimulation(prev => ({ ...prev, [name]: value }));
    };

    const handleSimulationCarrierChange = (value: string) => {
        setSimulation(prev => ({ ...prev, carrier: value }));
    };

    const calculationResult: CalculationResult = useMemo(() => calculateProfit(simulation, settings, baremRules), [
        simulation, settings, baremRules
    ]);

    const formatCurrency = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    const formatPercent = (value: number) => value.toFixed(2) + ' %';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-4">
                <h4 className="font-semibold">Girdi Değerleri</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="sim-productCost">Ürün Maliyeti (KDV H.)</Label>
                        <Input id="sim-productCost" name="productCost" type="text" inputMode="decimal" value={simulation.productCost} onChange={handleSimulationChange} placeholder="Örn: 80" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sim-salePrice">Satış Fiyatı (KDV H.)</Label>
                        <Input id="sim-salePrice" name="salePrice" type="text" inputMode="decimal" value={simulation.salePrice} onChange={handleSimulationChange} placeholder="Örn: 350" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sim-desi">Desi</Label>
                        <Input id="sim-desi" name="desi" type="text" inputMode="decimal" value={simulation.desi} onChange={handleSimulationChange} placeholder="Örn: 3" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sim-carrier">Kargo Firması</Label>
                        <Select value={simulation.carrier} onValueChange={handleSimulationCarrierChange}>
                            <SelectTrigger id="sim-carrier">
                                <SelectValue placeholder="Seçin..." />
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
                     <div className="space-y-2">
                        <Label htmlFor="sim-serviceFeeInclVat">Hizmet Bedeli (KDV D.)</Label>
                         <Input id="sim-serviceFeeInclVat" name="serviceFeeInclVat" type="text" inputMode="decimal" value={simulation.serviceFeeInclVat} onChange={handleSimulationChange} placeholder="Örn: 10.19" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sim-additionalCostExclVat">Ek Masraf (KDV H.)</Label>
                        <Input id="sim-additionalCostExclVat" name="additionalCostExclVat" type="text" inputMode="decimal" value={simulation.additionalCostExclVat} onChange={handleSimulationChange} placeholder="Varsayılana ek" />
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4 border-l md:pl-8">
                <h4 className="font-semibold">Hesaplama Sonuçları</h4>
                {calculationResult.error ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Hesaplama Hatası</AlertTitle>
                        <AlertDescription>{calculationResult.error}</AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Satış Fiyatı (KDV D.):</span> <strong>{formatCurrency(calculationResult.salePriceWithVat)}</strong></div>
                        <Separator />
                         <p className="font-medium text-muted-foreground pt-2">Giderler (KDV Hariç):</p>
                         <div className="flex justify-between pl-4"><span>Ürün Maliyeti:</span> <span>{formatCurrency(calculationResult.productCost)}</span></div>
                         <div className="flex justify-between pl-4"><span>Kargo Maliyeti:</span> <span>{calculationResult.shippingCost !== null ? formatCurrency(calculationResult.shippingCost) : '-'}</span></div>
                         <div className="flex justify-between pl-4"><span>Komisyon:</span> <span>{formatCurrency(calculationResult.commission)}</span></div>
                         <div className="flex justify-between pl-4"><span>Stopaj:</span> <span>{formatCurrency(calculationResult.tax)}</span></div>
                         <div className="flex justify-between pl-4"><span>Hizmet Bedeli:</span> <span>{formatCurrency(calculationResult.serviceFeeExclVat)}</span></div>
                         <div className="flex justify-between pl-4"><span>Ek Masraf:</span> <span>{formatCurrency(calculationResult.additionalCost)}</span></div>
                        <Separator />
                        <p className="font-medium text-muted-foreground pt-2">Toplam Gider KDV'leri:</p>
                        <div className="flex justify-between pl-4"><span>Kargo KDV:</span> <span>{formatCurrency(calculationResult.shippingVat)}</span></div>
                        <div className="flex justify-between pl-4"><span>Komisyon KDV:</span> <span>{formatCurrency(calculationResult.commissionVat)}</span></div>
                        <div className="flex justify-between pl-4"><span>Hizmet Bedeli KDV:</span> <span>{formatCurrency(calculationResult.serviceFeeVat)}</span></div>
                        {!calculationResult.includeCostVat && calculationResult.costVatAmount > 0 && (
                            <div className="flex justify-between pl-4"><span>Maliyet KDV:</span> <span>{formatCurrency(calculationResult.costVatAmount)}</span></div>
                        )}
                        <Separator />
                         <div className="flex justify-between font-semibold pt-2"><span>Toplam Gider (Tüm KDVler Dahil):</span> <span>{formatCurrency(calculationResult.totalCost)}</span></div>
                        <Separator />
                         <div className={cn("flex justify-between font-bold text-lg pt-2", calculationResult.isProfit ? 'text-green-600' : 'text-red-600')}>                           
                            <span>Net Kâr (Satış KDV Hariç):</span>
                            <span>{formatCurrency(calculationResult.profit)}</span>
                         </div>
                         <div className="flex justify-between text-xs pt-1 text-muted-foreground">
                            <span>Marj (%): {formatPercent(calculationResult.marginPercent)}</span>
                            <span>Maliyet Üzeri (%): {formatPercent(calculationResult.markupPercent)}</span>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
} 