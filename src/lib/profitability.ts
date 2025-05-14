import { Product, GeneralCostSetting, BaremPrice, ProductCostSetting, CategoryCommission, Category } from '@prisma/client';
// import { findApplicableBaremRule } from '@/lib/shipping-costs'; // Kullanılmıyor, kaldırıldı

// Gerekli ilişkileri içeren tipler (Dışa aktarılacak)
export type ProductWithCategory = Product & {
  category: Category;
};

export type GeneralCostSettingWithRelations = GeneralCostSetting; // Şimdilik direkt eşdeğer, ileride değişebilir

// BaremPrice zaten Prisma'dan geliyor, ama import/export için buraya da ekleyebiliriz.
export type { BaremPrice }; // Doğru export syntax'ı

interface CalculatePriceArgs {
  product: ProductWithCategory; // Gerekli ürün alanları (categoryId dahil)
  settings: GeneralCostSettingWithRelations; // Genel ayarlar
  baremRules: BaremPrice[]; // Barem kuralları
  productSetting?: ProductCostSetting | null; // Ürüne özel ayarlar (opsiyonel)
  categoryCommission?: CategoryCommission | null; // Kategoriye özel komisyon (opsiyonel)
  desiredProfitRatePercent: number; // İstenen kâr oranı (%)
  calculationMethod: 'MARGIN' | 'MARKUP'; // Hesaplama metodu
}

interface PriceCalculationResult {
  recommendedPrice: number;
  breakdown: {
    costPrice: number;
    shippingCostExclVat: number;
    shippingKDV: number;
    additionalCost: number;
    commissionAmount: number;
    commissionKDV: number;
    taxAmount: number;
    netProfitAmount: number;
    salesKDV: number;
    costKDV_Deductible: number;
    netKDVPayable: number;
    isBaremApplied: boolean;
    recommendedPrice: number;
    calculationMethodUsed: 'MARGIN' | 'MARKUP';
    profitRateUsed: number;
    recommendedPriceExclVat: number;
    // Hangi ayarların kullanıldığını belirtmek faydalı olabilir
    usedShippingSource: 'product' | 'barem' | 'default';
    usedCommissionSource: 'product' | 'category' | 'default';
    usedTaxSource: 'product' | 'default';
    usedAdditionalCostSource: 'product' | 'default';
  };
}

// Yardımcı fonksiyon: Uygun barem kuralını bul (API rotasından alındı)
const findApplicableBaremRule = (
    rules: BaremPrice[], 
    carrierName: string,
    salePrice: number,
    desi: number
): BaremPrice | null => {
    const applicableRules = rules.filter(rule => 
        rule.carrierName.toUpperCase() === carrierName.toUpperCase() &&
        salePrice >= rule.minOrderValue && 
        salePrice < rule.maxOrderValue &&
        (rule.maxDesi === null || desi <= rule.maxDesi) 
    );
    return applicableRules.length > 0 ? applicableRules[0] : null;
};

export function calculateRecommendedPrice(args: CalculatePriceArgs): PriceCalculationResult {
  const {
    product,
    settings,
    baremRules,
    productSetting,
    categoryCommission,
    desiredProfitRatePercent,
    calculationMethod,
  } = args;

  // 1. Verileri Doğrula
  if (product.costPrice == null) {
    throw new Error('Ürünün birim maliyeti tanımlanmamış.');
  }
  if (product.dimensionalWeight == null) {
    throw new Error('Ürünün desi bilgisi eksik.');
  }
  // Genel ayarlardaki zorunlu alanları kontrol et (KDV oranları vs.)
  const requiredSettings: (keyof GeneralCostSetting)[] = [
      'salesVatRate', 'shippingVatRate', 'commissionVatRate'
      // Artık defaultShippingCost, defaultCommissionRate, defaultTaxRate zorunlu değil, çünkü override edilebilirler
  ];
  for (const key of requiredSettings) {
      if (settings[key] == null) {
          const fieldName = key.replace('default','').replace(/([A-Z])/g, ' $1').trim();
           throw new Error(`Genel ayarlarda eksik KDV bilgisi: ${fieldName}`);
      }
  }
   if (settings.includeCostVat && settings.costVatRate == null) {
       throw new Error('Maliyet KDV dahil edilecekse, Genel ayarlarda Maliyet KDV oranı da ayarlanmalıdır.');
  }

  // 2. Hesaplama için kullanılacak değerleri belirle (Öncelik sırasına göre)
  const profitRate = desiredProfitRatePercent / 100;
  const costPrice = product.costPrice; // Bu değişmez
  const productDesi = product.dimensionalWeight;

  // Komisyon Oranı
  let commissionRatePercent: number;
  let usedCommissionSource: 'product' | 'category' | 'default';
  if (productSetting?.commissionRate != null) {
      commissionRatePercent = productSetting.commissionRate;
      usedCommissionSource = 'product';
  } else if (categoryCommission?.commissionRate != null) {
      commissionRatePercent = categoryCommission.commissionRate;
      usedCommissionSource = 'category';
  } else if (settings.defaultCommissionRate != null) {
      commissionRatePercent = settings.defaultCommissionRate;
      usedCommissionSource = 'default';
  } else {
      throw new Error('Uygulanabilir komisyon oranı bulunamadı (Ürün/Kategori/Genel).');
  }
  const commissionRate = commissionRatePercent / 100;

  // Stopaj/Vergi Oranı
  let taxRatePercent: number;
  let usedTaxSource: 'product' | 'default';
  if (productSetting?.taxRate != null) {
      taxRatePercent = productSetting.taxRate;
      usedTaxSource = 'product';
  } else if (settings.defaultTaxRate != null) {
      taxRatePercent = settings.defaultTaxRate;
      usedTaxSource = 'default';
  } else {
       throw new Error('Uygulanabilir vergi oranı bulunamadı (Ürün/Genel).');
  }
  const taxRate = taxRatePercent / 100;

  // Ek Masraf
  let additionalCost: number;
  let usedAdditionalCostSource: 'product' | 'default';
  if (productSetting?.additionalCost != null) {
      additionalCost = productSetting.additionalCost;
      usedAdditionalCostSource = 'product';
  } else {
      additionalCost = settings.defaultAdditionalCost ?? 0; // Genel ayarda yoksa 0 kabul edilir
      usedAdditionalCostSource = 'default';
  }

  // Kargo Maliyeti (Bu biraz daha karmaşık: Önce Ürün, sonra Barem, sonra Genel)
  let shippingCostExclVat: number;
  let isBaremApplied = false;
  let usedShippingSource: 'product' | 'barem' | 'default';
  if (productSetting?.shippingCost != null) {
      shippingCostExclVat = productSetting.shippingCost;
      usedShippingSource = 'product';
  } else {
      // Ürün ayarı yoksa Barem ve Genel Ayarlara bak
      const carrierName = settings.defaultCarrierName;
      const priceForBaremCheck = product.salePrice; // Mevcut satış fiyatını kullan
      let baremCost: number | null = null;

      if (carrierName && priceForBaremCheck != null && baremRules.length > 0) {
          const applicableRule = findApplicableBaremRule(baremRules, carrierName, priceForBaremCheck, productDesi);
          if (applicableRule) {
              baremCost = applicableRule.priceExclVat;
          }
      }

      if (baremCost !== null) {
          shippingCostExclVat = baremCost;
          isBaremApplied = true;
          usedShippingSource = 'barem';
      } else if (settings.defaultShippingCost != null) {
          shippingCostExclVat = settings.defaultShippingCost;
          usedShippingSource = 'default';
      } else {
          throw new Error('Uygulanabilir kargo maliyeti bulunamadı (Ürün/Barem/Genel).');
      }
  }

  // Diğer KDV ve ayar değerleri (bunlar şimdilik sadece genel ayarlardan geliyor)
  const salesVatRate = (settings.salesVatRate as number) / 100;
  const commissionVatRate = (settings.commissionVatRate as number) / 100;
  const shippingVatRate = (settings.shippingVatRate as number) / 100;
  const costVatRate = settings.costVatRate ? (settings.costVatRate / 100) : 0;
  const includeCostVat = settings.includeCostVat;

  // 3. Tavsiye Fiyatı Hesapla
  const fixedCostsExclVat = costPrice + shippingCostExclVat + additionalCost;
  let recommendedPriceExclVat: number;

  if (calculationMethod === "MARGIN") {
    const denominator = 1 - commissionRate - taxRate - profitRate;
    if (denominator <= 0) {
      throw new Error('MARGIN: Hesaplanan maliyetler ve istenen kâr oranı, pozitif bir satış fiyatı oluşturmuyor.');
    }
    recommendedPriceExclVat = fixedCostsExclVat / denominator;
  } else { // MARKUP
    const costBaseForMarkup = costPrice + additionalCost; // Markup hesaplaması sadece ürün ve ek maliyet üzerinden
    if (costBaseForMarkup < 0) {
       // Negatif maliyet durumu?
    }
    const denominator = 1 - commissionRate - taxRate;
    if (denominator <= 0) {
      throw new Error('MARKUP: Komisyon ve vergi oranları toplamı %100 veya üzeri.');
    }
    // Formül: (Sabit Giderler + (Markup Maliyet Bazı * Kar Oranı)) / (1 - Komisyon - Vergi)
    recommendedPriceExclVat = (fixedCostsExclVat + costBaseForMarkup * profitRate) / denominator;
  }

  const recommendedPriceInclVat = recommendedPriceExclVat * (1 + salesVatRate);
  const finalRecommendedPrice = parseFloat(recommendedPriceInclVat.toFixed(2));

  // 4. KDV Dökümünü Hesapla
  const salesKDV = recommendedPriceInclVat - recommendedPriceExclVat;
  const priceExclSalesVat = recommendedPriceExclVat;
  const shippingKDV = shippingCostExclVat * shippingVatRate;
  const commissionAmount = priceExclSalesVat * commissionRate;
  const commissionKDV = commissionAmount * commissionVatRate;
  const taxAmount = priceExclSalesVat * taxRate;
  
  // Mahsup Edilecek KDV hesaplama mantığı değiştirildi
  // Kargo ve Komisyon KDV'leri her zaman mahsup edilir
  // Maliyet KDV'si ise ayara bağlı olarak mahsup edilir veya gider olarak kabul edilir
  const maliyetKDV = costPrice * costVatRate;
  // Mahsup edilecek toplam KDV (Kargo KDV + Komisyon KDV + opsiyonel olarak Maliyet KDV)
  const costKDV_Deductible = commissionKDV + shippingKDV + (!includeCostVat ? maliyetKDV : 0);
  
  // Net Ödenecek KDV hesaplaması
  const netKDVPayable = salesKDV - costKDV_Deductible;
  const netProfitAmount = priceExclSalesVat - costPrice - shippingCostExclVat - additionalCost - commissionAmount - taxAmount;

  // 5. Sonucu döndür
  return {
    recommendedPrice: finalRecommendedPrice,
    breakdown: {
      costPrice: parseFloat(costPrice.toFixed(2)),
      shippingCostExclVat: parseFloat(shippingCostExclVat.toFixed(2)),
      shippingKDV: parseFloat(shippingKDV.toFixed(2)),
      additionalCost: parseFloat(additionalCost.toFixed(2)),
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      commissionKDV: parseFloat(commissionKDV.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      netProfitAmount: parseFloat(netProfitAmount.toFixed(2)),
      salesKDV: parseFloat(salesKDV.toFixed(2)),
      costKDV_Deductible: parseFloat(costKDV_Deductible.toFixed(2)),
      netKDVPayable: parseFloat(netKDVPayable.toFixed(2)),
      isBaremApplied: isBaremApplied,
      recommendedPrice: finalRecommendedPrice,
      calculationMethodUsed: calculationMethod,
      profitRateUsed: desiredProfitRatePercent,
      recommendedPriceExclVat: parseFloat(recommendedPriceExclVat.toFixed(2)),
      // Kullanılan kaynakları ekle
      usedShippingSource: usedShippingSource,
      usedCommissionSource: usedCommissionSource,
      usedTaxSource: usedTaxSource,
      usedAdditionalCostSource: usedAdditionalCostSource,
    }
  };
}

// Belirli bir satış fiyatı için maliyet/kâr dökümünü hesapla
interface CalculateBreakdownArgs {
    product: ProductWithCategory; // categoryId lazım
    settings: GeneralCostSettingWithRelations;
    baremRules: BaremPrice[];
    productSetting?: ProductCostSetting | null;
    categoryCommission?: CategoryCommission | null;
    targetSalePrice: number; // Analizi yapılacak satış fiyatı (KDV Dahil)
}

// BreakdownResult tipini de export edelim, API kullanabilir
export interface BreakdownResult {
    costPrice: number;
    shippingCostExclVat: number;
    shippingKDV: number;
    additionalCost: number;
    commissionAmount: number;
    commissionKDV: number;
    taxAmount: number;
    netProfitAmount: number;
    salesKDV: number;
    costKDV_Deductible: number;
    netKDVPayable: number;
    isBaremApplied: boolean;
    profitMargin?: number; // Kâr marjı (%)
    profitMarkup?: number; // Markup oranı (%)
    // Hangi ayarların kullanıldığını belirtmek faydalı olabilir
    usedShippingSource: 'product' | 'barem' | 'default';
    usedCommissionSource: 'product' | 'category' | 'default';
    usedTaxSource: 'product' | 'default';
    usedAdditionalCostSource: 'product' | 'default';
}

export function calculatePriceBreakdown(args: CalculateBreakdownArgs): BreakdownResult {
    const { 
        product, 
        settings, 
        baremRules, 
        productSetting, 
        categoryCommission, 
        targetSalePrice 
    } = args;

    // Veri doğrulama
    if (product.costPrice == null) throw new Error('Birim maliyeti tanımlanmamış.');
    if (product.dimensionalWeight == null) throw new Error('Desi bilgisi eksik.');
    // ... (Diğer gerekli ayar kontrolleri eklenebilir) ...

    // Değerleri al (Öncelik sırasına göre)
    const costPrice = product.costPrice;
    const productDesi = product.dimensionalWeight;
    
    // Komisyon
    let commissionRatePercent: number;
    let usedCommissionSource: 'product' | 'category' | 'default';
    if (productSetting?.commissionRate != null) {
        commissionRatePercent = productSetting.commissionRate;
        usedCommissionSource = 'product';
    } else if (categoryCommission?.commissionRate != null) {
        commissionRatePercent = categoryCommission.commissionRate;
        usedCommissionSource = 'category';
    } else if (settings.defaultCommissionRate != null) {
        commissionRatePercent = settings.defaultCommissionRate;
        usedCommissionSource = 'default';
    } else {
        throw new Error('Uygulanabilir komisyon oranı bulunamadı.');
    }
    const commissionRate = commissionRatePercent / 100;

    // Vergi
    let taxRatePercent: number;
    let usedTaxSource: 'product' | 'default';
    if (productSetting?.taxRate != null) {
        taxRatePercent = productSetting.taxRate;
        usedTaxSource = 'product';
    } else if (settings.defaultTaxRate != null) {
        taxRatePercent = settings.defaultTaxRate;
        usedTaxSource = 'default';
    } else {
        throw new Error('Uygulanabilir vergi oranı bulunamadı.');
    }
    const taxRate = taxRatePercent / 100;

    // Ek Masraf
    let additionalCost: number;
    let usedAdditionalCostSource: 'product' | 'default';
    if (productSetting?.additionalCost != null) {
        additionalCost = productSetting.additionalCost;
        usedAdditionalCostSource = 'product';
    } else {
        additionalCost = settings.defaultAdditionalCost ?? 0;
        usedAdditionalCostSource = 'default';
    }

    // Kargo Maliyeti
    let shippingCostExclVat: number;
    let isBaremApplied = false;
    let usedShippingSource: 'product' | 'barem' | 'default';
    if (productSetting?.shippingCost != null) {
        shippingCostExclVat = productSetting.shippingCost;
        usedShippingSource = 'product';
    } else {
        const carrierName = settings.defaultCarrierName;
        let baremCost: number | null = null;
        // Barem kontrolü için hedef satış fiyatını KDV'siz hale getirelim?
        // Ya da barem tanımını KDV dahil mi alacağız? Şema KDV hariç diyor.
        // Mevcut satış fiyatı veya hedef fiyat barem için kullanılabilir. Şimdilik hedef fiyatı kullanalım.
        const priceForBaremCheck = targetSalePrice / (1 + (settings.salesVatRate ?? 20) / 100); 

        if (carrierName && baremRules.length > 0) {
             const applicableRule = findApplicableBaremRule(baremRules, carrierName, priceForBaremCheck, productDesi);
            if (applicableRule) {
                baremCost = applicableRule.priceExclVat;
            }
        }

        if (baremCost !== null) {
            shippingCostExclVat = baremCost;
            isBaremApplied = true;
            usedShippingSource = 'barem';
        } else if (settings.defaultShippingCost != null) {
            shippingCostExclVat = settings.defaultShippingCost;
            usedShippingSource = 'default';
        } else {
            throw new Error('Uygulanabilir kargo maliyeti bulunamadı.');
        }
    }

    // Diğer KDV oranları ve ayarlar
    const salesVatRate = (settings.salesVatRate as number) / 100;
    const commissionVatRate = (settings.commissionVatRate as number) / 100;
    const shippingVatRate = (settings.shippingVatRate as number) / 100;
    const costVatRate = settings.costVatRate ? (settings.costVatRate / 100) : 0;
    const includeCostVat = settings.includeCostVat;

    // Fiyat ve KDV Hesaplamaları (Verilen fiyata göre)
    const priceInclVat = targetSalePrice;
    const priceExclVat = priceInclVat / (1 + salesVatRate);
    const salesKDV = priceInclVat - priceExclVat;
    
    // Kesintiler ve Maliyetler
    const commissionAmount = priceExclVat * commissionRate;
    const taxAmount = priceExclVat * taxRate;
    const shippingKDV = shippingCostExclVat * shippingVatRate;
    const commissionKDV = commissionAmount * commissionVatRate;
    
    // Mahsup Edilecek KDV hesaplama mantığı değiştirildi
    // Kargo ve Komisyon KDV'leri her zaman mahsup edilir
    // Maliyet KDV'si ise ayara bağlı olarak mahsup edilir veya gider olarak kabul edilir
    const maliyetKDV = costPrice * costVatRate;
    // Mahsup edilecek toplam KDV (Kargo KDV + Komisyon KDV + opsiyonel olarak Maliyet KDV)
    const costKDV_Deductible = commissionKDV + shippingKDV + (!includeCostVat ? maliyetKDV : 0);
    
    // Net Ödenecek KDV hesaplaması
    const netKDVPayable = salesKDV - costKDV_Deductible;
    const netProfitAmount = priceExclVat - costPrice - shippingCostExclVat - additionalCost - commissionAmount - taxAmount;

    // Kâr Oranları (Margin ve Markup)
    let profitMargin: number | undefined = undefined;
    if (priceExclVat > 0) {
       profitMargin = (netProfitAmount / priceExclVat) * 100;
    }
    let profitMarkup: number | undefined = undefined;
    const costBaseForMarkup = costPrice + additionalCost; // Markup sadece ürün ve ek maliyete göre
    if (costBaseForMarkup > 0) {
        profitMarkup = (netProfitAmount / costBaseForMarkup) * 100;
    }

    // Sonuç objesi
    return {
        costPrice: parseFloat(costPrice.toFixed(2)),
        shippingCostExclVat: parseFloat(shippingCostExclVat.toFixed(2)),
        shippingKDV: parseFloat(shippingKDV.toFixed(2)),
        additionalCost: parseFloat(additionalCost.toFixed(2)),
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        commissionKDV: parseFloat(commissionKDV.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        netProfitAmount: parseFloat(netProfitAmount.toFixed(2)),
        salesKDV: parseFloat(salesKDV.toFixed(2)),
        costKDV_Deductible: parseFloat(costKDV_Deductible.toFixed(2)),
        netKDVPayable: parseFloat(netKDVPayable.toFixed(2)),
        isBaremApplied: isBaremApplied,
        profitMargin: profitMargin ? parseFloat(profitMargin.toFixed(2)) : undefined,
        profitMarkup: profitMarkup ? parseFloat(profitMarkup.toFixed(2)) : undefined,
        // Kullanılan kaynakları ekle
        usedShippingSource: usedShippingSource,
        usedCommissionSource: usedCommissionSource,
        usedTaxSource: usedTaxSource,
        usedAdditionalCostSource: usedAdditionalCostSource,
    };
}

// Bu yardımcı fonksiyonu da export edelim, gerekebilir
// export { findApplicableBaremRule }; // Kullanılmıyor, kaldırıldı 