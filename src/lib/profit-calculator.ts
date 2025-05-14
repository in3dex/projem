import { shippingCostsData, getShippingCost } from '@/lib/shipping-costs';
import { GeneralCostSettingsData } from '@/hooks/use-general-cost-settings';
import { BaremPriceData } from '@/hooks/use-barem-rules';

// --- Profit Calculation Logic ---
// Define the structure for the calculation result type
export type CalculationResult = {
    productCost: number;
    salePrice: number;
    salePriceWithVat: number;
    desi: number;
    shippingCost: number | null;
    shippingVat: number;
    commission: number;
    commissionVat: number;
    tax: number;
    additionalCost: number;
    serviceFeeExclVat: number;
    serviceFeeVat: number;
    totalCost: number;
    profit: number;
    marginPercent: number;
    markupPercent: number;
    isProfit: boolean;
    costVatAmount: number;
    includeCostVat: boolean;
    error: string | null;
};

// Type for simulation input state
export type SimulationInput = {
    productCost: string | number;
    salePrice: string | number;
    desi: string | number;
    carrier: string;
    serviceFeeInclVat: string | number;
    additionalCostExclVat: string | number;
}

// Default error state structure
export const defaultErrorResult: CalculationResult = {
    error: "Hesaplama için gerekli tüm değerleri girin.", // Initial user-facing message
    productCost: 0, salePrice: 0, salePriceWithVat: 0, desi: 0, shippingCost: null,
    shippingVat: 0, commission: 0, commissionVat: 0, tax: 0, additionalCost: 0,
    serviceFeeExclVat: 0, serviceFeeVat: 0, totalCost: 0, profit: 0, marginPercent: 0,
    markupPercent: 0, isProfit: false, costVatAmount: 0, includeCostVat: false
};

// Helper function to parse numeric input safely
export const safeParseFloat = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(String(value).replace(',','.'));
    return isNaN(num) ? 0 : num;
};

// The core calculation function
export function calculateProfit(
    simulationData: SimulationInput,
    settingsData: GeneralCostSettingsData,
    baremRulesData: BaremPriceData[]
): CalculationResult {
    try {
        const { productCost, salePrice, desi, serviceFeeInclVat, additionalCostExclVat, carrier } = simulationData;

        // --- 1. Parse Simulation Inputs ---
        const simProductCost = safeParseFloat(productCost);
        const simSalePrice = safeParseFloat(salePrice);
        const simDesi = safeParseFloat(desi);
        const simServiceFeeInclVat = safeParseFloat(serviceFeeInclVat);
        const simAdditionalCostExclVat = safeParseFloat(additionalCostExclVat);

        if (!carrier) return { ...defaultErrorResult, error: "Lütfen kargo firması seçin." };
        if (simSalePrice <= 0) return { ...defaultErrorResult, error: "Satış fiyatı 0'dan büyük olmalıdır." };

        // --- 2. Determine Shipping Cost ---
        const calculateSimulationShippingCost = (): number | null => {
            const matchedBaremRule = baremRulesData.find(rule =>
                rule.carrierName === carrier &&
                simSalePrice >= rule.minOrderValue &&
                simSalePrice < rule.maxOrderValue &&
                (rule.maxDesi === null || simDesi <= rule.maxDesi)
            );

            if (matchedBaremRule) {
                return matchedBaremRule.priceExclVat;
            }
            const desiBasedCost = getShippingCost(carrier, simDesi);
            if (desiBasedCost !== null) {
                return desiBasedCost;
            }
            // Fallback to default ONLY if the carrier matches or no default carrier is set
            if (settingsData.defaultShippingCost !== null &&
                (!settingsData.defaultCarrierName || settingsData.defaultCarrierName === carrier)) {
                return settingsData.defaultShippingCost;
            }
            return null;
        };
        const shippingCostExclVat = calculateSimulationShippingCost();
        if (shippingCostExclVat === null) {
            return { ...defaultErrorResult, error: "Kargo maliyeti hesaplanamadı (Barem/Desi/Varsayılan eşleşmedi)." };
        }

        // --- 3. Get Settings Values (with defaults) ---
        const salesVatRate = settingsData.salesVatRate ?? 20;
        const shippingVatRate = settingsData.shippingVatRate ?? 20;
        const commissionVatRate = settingsData.commissionVatRate ?? 20;
        const costVatRate = settingsData.costVatRate ?? 0;
        const includeCostVat = settingsData.includeCostVat ?? false;
        // Use sim service fee VAT rate if available, else default
        const serviceFeeVatRate = settingsData.serviceFeeVatRate ?? 20;
        const commissionRate = settingsData.defaultCommissionRate ?? 0;
        const taxRate = settingsData.defaultTaxRate ?? 0;
        const settingsAdditionalCostExclVat = settingsData.defaultAdditionalCost ?? 0;

        // --- 4. Perform Calculations ---
        const serviceFeeExclVat = simServiceFeeInclVat / (1 + serviceFeeVatRate / 100);
        const serviceFeeVat = simServiceFeeInclVat - serviceFeeExclVat;
        const salePriceWithVat = simSalePrice * (1 + salesVatRate / 100);
        const commission = simSalePrice * (commissionRate / 100);
        const commissionVat = commission * (commissionVatRate / 100);
        const shippingVat = shippingCostExclVat * (shippingVatRate / 100);
        // Cost VAT is added only if includeCostVat is false (meaning it's NOT already included in simProductCost)
        const costVatAmount = includeCostVat ? 0 : simProductCost * (costVatRate / 100);
        const tax = simSalePrice * (taxRate / 100); // Stopaj
        const totalAdditionalCostExclVat = settingsAdditionalCostExclVat + simAdditionalCostExclVat;

        // Total Cost Calculation
        const totalCost = simProductCost +
                          shippingCostExclVat +
                          commission +
                          tax +
                          serviceFeeExclVat +
                          totalAdditionalCostExclVat +
                          shippingVat +
                          commissionVat +
                          serviceFeeVat +
                          costVatAmount; // Add cost VAT if not included in base cost

        const profit = simSalePrice - totalCost;

        // --- 5. Calculate Margin and Markup ---
        const marginPercent = simSalePrice === 0 ? 0 : (profit / simSalePrice) * 100;
        // Markup base: Product cost + Additional costs + Service Fee (all excl. VAT)
        const costBaseForMarkup = simProductCost + totalAdditionalCostExclVat + serviceFeeExclVat;
        const markupPercent = costBaseForMarkup === 0 ? (profit > 0 ? Infinity : 0) : (profit / costBaseForMarkup) * 100;

        // --- 6. Format and Return Result ---
        const result: CalculationResult = {
            productCost: simProductCost,
            salePrice: simSalePrice,
            salePriceWithVat,
            desi: simDesi,
            shippingCost: shippingCostExclVat,
            shippingVat,
            commission,
            commissionVat,
            tax,
            additionalCost: totalAdditionalCostExclVat,
            serviceFeeExclVat,
            serviceFeeVat,
            totalCost,
            profit,
            marginPercent: isNaN(marginPercent) ? 0 : marginPercent,
            markupPercent: isNaN(markupPercent) || !isFinite(markupPercent) ? 0 : markupPercent,
            isProfit: profit > 0,
            costVatAmount,
            includeCostVat,
            error: null
        };
        return result;

    } catch (error) {
        console.error("Karlılık hesaplaması sırasında hata:", error);
        return { ...defaultErrorResult, error: "Hesaplama sırasında beklenmedik bir hata oluştu." };
    }
}
// --- End Profit Calculation Logic --- 