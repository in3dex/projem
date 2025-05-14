import { db } from '@/lib/db';
import { 
    calculatePriceBreakdown, 
    ProductWithCategory, 
    GeneralCostSettingWithRelations, 
    BaremPrice, 
    BreakdownResult
} from '@/lib/profitability';
import { Product, Prisma, GeneralCostSetting } from '@prisma/client';
import dayjs from 'dayjs';
import 'dayjs/locale/tr'; // Türkçe ay isimleri için
dayjs.locale('tr');

// Tipler (API Rotalarından taşındı/kopyalandı)
type ProductForAnalysis = Product & {
    category: {
        id: string;
        trendyolId: number;
        name: string;
        commissions: { userId: string; categoryId: string; commissionRate: number }[];
    };
    costSettings: { userId: string; productId: string; commissionRate: number | null; taxRate: number | null; shippingCost: number | null; additionalCost: number | null }[];
};

export interface StatsDataResponse {
  ortalamaKarMarji: number | null;
  toplamUrunSayisi: number;
  karliUrunSayisi: number;
  zararliUrunSayisi: number;
  enKarlıUrun?: { ad: string; barkod: string; karMarji: number };
  enZararliUrun?: { ad: string; barkod: string; karMarji: number };
  errorMessage?: string;
}

export interface ActionItemProduct {
  id: string;
  barkod: string;
  ad: string;
  sebep: 'ZARARINA_SATIS' | 'DUSUK_STOK' | 'FIYAT_FARKI' | 'YUKSEK_IADE';
  detay: string;
  mevcutFiyat: number;
  maliyet?: number;
  karMarji?: number;
}

export interface SalesTrendDataPoint {
  month: string;
  yearMonth: string;
  siparisSayisi: number;
  toplamTutar: number;
}

export interface CostDistributionDataPoint {
  name: string;
  value: number;
}

const LOW_STOCK_THRESHOLD = 5;
const PRICE_DIFF_THRESHOLD = 0.10;

// --- Sunucu Fonksiyonları ---

export async function getProfitabilityStats(userId: string): Promise<StatsDataResponse | null> {
    console.log("[DEBUG] getProfitabilityStats - userId:", userId); // Debug log
    try {
        // Kullanıcı kimliği kontrol ediliyor
        if (!userId) {
            console.error('[getProfitabilityStats] Kullanıcı ID\'si tanımsız');
            return null;
        }

        // Birkaç sorgu tekniği deneyelim:
        // 1. Normal sorgu
        let generalSettings = await db.generalCostSetting.findUnique({ 
            where: { userId } 
        });

        // 2. ID türü kontrolü - ID string olabilir ama MongoDB/bazı durumlarda object olarak saklanmış olabilir 
        if (!generalSettings) {
            console.log("[DEBUG] Ayarlar bulunamadı, farklı sorgu deneniyor...");
            generalSettings = await db.generalCostSetting.findFirst({
                where: { userId }
            });
        }

        // 3. Farklı alan adı kontrolü - Eğer userId farklı bir alan adıyla kayıtlıysa
        if (!generalSettings) {
            console.log("[DEBUG] Alternatif alanlar deneniyor... Tüm maliyet ayarlarını listeleyelim:");
            const allSettings = await db.generalCostSetting.findMany({
                take: 5 // Performans için sınırlı sayıda getir
            });
            console.log("[DEBUG] Mevcut ayarlar:", JSON.stringify(allSettings.map(s => ({id: s.id, userId: s.userId}))));
        }

        // Ayarlar hala bulunamadıysa, daha özenli bir hata mesajı oluşturalım
        if (!generalSettings) {
            console.error(`[getProfitabilityStats] Kullanıcı ${userId} için genel maliyet ayarları bulunamadı`);
            // Eski hata fırlatma yerine kontrollü bir değer döndürüyoruz
            return {
                ortalamaKarMarji: null,
                toplamUrunSayisi: 0,
                karliUrunSayisi: 0,
                zararliUrunSayisi: 0,
                errorMessage: 'Genel maliyet ayarları bulunamadı. Lütfen önce ayarlarınızı kaydedin.'
            };
        }

        const baremRules = await db.baremPrice.findMany({ where: { userId } });

        const productsFromDb = await db.product.findMany({
            where: {
                userId: userId,
                salePrice: { gt: 0 }
            },
            include: {
                category: { include: { commissions: { where: { userId } } } },
                costSettings: { where: { userId } }
            }
        });

        const products = productsFromDb.filter(
            product => product.costPrice !== null && product.dimensionalWeight !== null
        ) as ProductForAnalysis[];

        const toplamUrunSayisi = products.length;
        if (toplamUrunSayisi === 0) {
            return { ortalamaKarMarji: null, toplamUrunSayisi: 0, karliUrunSayisi: 0, zararliUrunSayisi: 0 };
        }

        let toplamKarMarji = 0, hesaplananUrunSayisi = 0, karliUrunSayisi = 0, zararliUrunSayisi = 0;
        let enYuksekKarMarji = -Infinity, enDusukKarMarji = Infinity;
        let enKarlıUrunData: StatsDataResponse['enKarlıUrun'] | undefined = undefined;
        let enZararliUrunData: StatsDataResponse['enZararliUrun'] | undefined = undefined;

        for (const product of products) {
            try {
                const productSetting = product.costSettings.length > 0 ? product.costSettings[0] : null;
                const categoryCommission = product.category.commissions.length > 0 ? product.category.commissions[0] : null;
                const breakdown = calculatePriceBreakdown({
                    product: product as any, settings: generalSettings as any, baremRules: baremRules as any,
                    productSetting: productSetting as any, categoryCommission: categoryCommission as any,
                    targetSalePrice: product.salePrice!
                });
                if (breakdown.profitMargin !== undefined) {
                    const margin = breakdown.profitMargin;
                    toplamKarMarji += margin; hesaplananUrunSayisi++;
                    if (margin > 0) karliUrunSayisi++; if (margin < 0) zararliUrunSayisi++;
                    if (margin > enYuksekKarMarji) { enYuksekKarMarji = margin; enKarlıUrunData = { ad: product.title, barkod: product.barcode, karMarji: margin }; }
                    if (margin < enDusukKarMarji) { enDusukKarMarji = margin; enZararliUrunData = { ad: product.title, barkod: product.barcode, karMarji: margin }; }
                }
            } catch (e: any) { console.warn(`[Stats Calculation] Ürün ${product.barcode}: ${e.message}`); }
        }

        const ortalamaKarMarji = hesaplananUrunSayisi > 0 ? toplamKarMarji / hesaplananUrunSayisi : null;
        return {
            ortalamaKarMarji: ortalamaKarMarji !== null ? parseFloat(ortalamaKarMarji.toFixed(1)) : null,
            toplamUrunSayisi: toplamUrunSayisi, karliUrunSayisi: karliUrunSayisi, zararliUrunSayisi: zararliUrunSayisi,
            enKarlıUrun: enKarlıUrunData ? { ...enKarlıUrunData, karMarji: parseFloat(enKarlıUrunData.karMarji.toFixed(1)) } : undefined,
            enZararliUrun: enZararliUrunData ? { ...enZararliUrunData, karMarji: parseFloat(enZararliUrunData.karMarji.toFixed(1)) } : undefined,
        };
    } catch (error: any) { 
        console.error("[Server Action getProfitabilityStats] Error:", error);
        return null; 
    }
}

export async function getActionItems(userId: string): Promise<ActionItemProduct[] | null> {
    console.log("[DEBUG] getActionItems - userId:", userId); // Debug log
    try {
        // Kullanıcı kimliği kontrol ediliyor
        if (!userId) {
            console.error('[getActionItems] Kullanıcı ID\'si tanımsız');
            return [];
        }

        // Maliyet ayarlarını çekelim, birkaç farklı sorgu tekniği ile
        let generalSettings = await db.generalCostSetting.findUnique({ 
            where: { userId } 
        });

        // Alternatif sorgu deneyelim
        if (!generalSettings) {
            generalSettings = await db.generalCostSetting.findFirst({
                where: { userId }
            });
        }

        // Ayarlar hala bulunamadıysa
        if (!generalSettings) {
            console.error(`[getActionItems] Kullanıcı ${userId} için genel maliyet ayarları bulunamadı`);
            return []; // Boş dizi döndür, null değil
        }

        const baremRules = await db.baremPrice.findMany({ where: { userId } });

        const productsFromDb = await db.product.findMany({
            where: { 
                userId: userId, 
                salePrice: { gt: 0 }
            },
            include: {
                category: { include: { commissions: { where: { userId } } } },
                costSettings: { where: { userId } }
            }
        });

        const products = productsFromDb.filter(
            product => product.costPrice !== null && 
                       product.dimensionalWeight !== null && 
                       product.quantity !== null
        ) as ProductForAnalysis[];

        const actionItems: ActionItemProduct[] = [];
        for (const product of products) {
            let breakdownResult: BreakdownResult | null = null;
            try {
                const productSetting = product.costSettings.length > 0 ? product.costSettings[0] : null;
                const categoryCommission = product.category.commissions.length > 0 ? product.category.commissions[0] : null;
                breakdownResult = calculatePriceBreakdown({
                    product: product as any, settings: generalSettings as any, baremRules: baremRules as any,
                    productSetting: productSetting as any, categoryCommission: categoryCommission as any,
                    targetSalePrice: product.salePrice!
                });
                if (breakdownResult && breakdownResult.netProfitAmount < 0) {
                    actionItems.push({ id: product.id, barkod: product.barcode, ad: product.title, sebep: 'ZARARINA_SATIS',
                        detay: `Net Kâr: ${breakdownResult.netProfitAmount.toFixed(2)} TL (${breakdownResult.profitMargin?.toFixed(1) ?? 'N/A'}%)`,
                        mevcutFiyat: product.salePrice!, maliyet: breakdownResult.costPrice, karMarji: breakdownResult.profitMargin });
                    continue;
                }
            } catch (e: any) { console.warn(`[Action Items Calculation] Ürün ${product.barcode}: ${e.message}`); }

            if (product.quantity! < LOW_STOCK_THRESHOLD) {
                actionItems.push({ id: product.id, barkod: product.barcode, ad: product.title, sebep: 'DUSUK_STOK',
                    detay: `Kalan Stok: ${product.quantity}`, mevcutFiyat: product.salePrice!, 
                    maliyet: breakdownResult?.costPrice, karMarji: breakdownResult?.profitMargin });
                continue;
            }
            if (product.recommendedSalePrice && product.salePrice && product.recommendedSalePrice > 0) {
                const priceDifferenceRatio = Math.abs(product.recommendedSalePrice - product.salePrice) / product.recommendedSalePrice;
                if (priceDifferenceRatio > PRICE_DIFF_THRESHOLD) {
                    actionItems.push({ id: product.id, barkod: product.barcode, ad: product.title, sebep: 'FIYAT_FARKI',
                        detay: `Mevcut: ${product.salePrice.toFixed(2)} TL, Tavsiye: ${product.recommendedSalePrice.toFixed(2)} TL`,
                        mevcutFiyat: product.salePrice!, maliyet: breakdownResult?.costPrice, karMarji: breakdownResult?.profitMargin });
                    continue;
                }
            }
        }
        return actionItems;
    } catch (error: any) {
        console.error("[Server Action getActionItems] Error:", error);
        return null;
    }
}

export async function getSalesTrend(userId: string): Promise<SalesTrendDataPoint[] | null> {
    console.log("[DEBUG] getSalesTrend - userId:", userId); // Debug log
    try {
        const sixMonthsAgo = dayjs().subtract(6, 'month').startOf('month').toDate();
        const orders = await db.trendyolOrder.findMany({
            where: { userId: userId, orderDate: { gte: sixMonthsAgo } },
            select: { orderDate: true, totalPrice: true },
            orderBy: { orderDate: 'asc' },
        });
        const monthlyData: Record<string, { siparisSayisi: number; toplamTutar: number }> = {};
        orders.forEach(order => {
            const monthYear = dayjs(order.orderDate).format('YYYY-MM');
            if (!monthlyData[monthYear]) monthlyData[monthYear] = { siparisSayisi: 0, toplamTutar: 0 };
            monthlyData[monthYear].siparisSayisi += 1;
            monthlyData[monthYear].toplamTutar += order.totalPrice;
        });
        const salesTrend: SalesTrendDataPoint[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = dayjs().subtract(i, 'month');
            const yearMonth = date.format('YYYY-MM');
            const monthName = date.format('MMMM');
            const data = monthlyData[yearMonth] || { siparisSayisi: 0, toplamTutar: 0 };
            salesTrend.push({ month: monthName, yearMonth: yearMonth, siparisSayisi: data.siparisSayisi, toplamTutar: parseFloat(data.toplamTutar.toFixed(2)) });
        }
        return salesTrend;
    } catch (error: any) {
        console.error("[Server Action getSalesTrend] Error:", error);
        return null;
    }
}

export async function getCostDistribution(userId: string): Promise<CostDistributionDataPoint[] | null> {
    console.log("[DEBUG] getCostDistribution - userId:", userId); // Debug log
    try {
        // Kullanıcı kimliği kontrol ediliyor
        if (!userId) {
            console.error('[getCostDistribution] Kullanıcı ID\'si tanımsız');
            return [];
        }

        // Maliyet ayarlarını çekelim, birkaç farklı sorgu tekniği ile
        let settings = await db.generalCostSetting.findUnique({ 
            where: { userId } 
        });

        // Alternatif sorgu deneyelim
        if (!settings) {
            settings = await db.generalCostSetting.findFirst({
                where: { userId }
            });
        }

        // Ayarlar hala bulunamadıysa varsayılan değerlerle devam edelim
        if (!settings) {
            console.error(`[getCostDistribution] Kullanıcı ${userId} için genel maliyet ayarları bulunamadı`);
            
            // Temel varsayılan değerlerle basit bir dağılım döndürelim
            return [
                { name: 'Ürün Maliyeti (Tahmini Varsayılan)', value: 70 },
                { name: 'Kargo (Varsayılan)', value: 15 },
                { name: 'Komisyon (Varsayılan)', value: 10 },
                { name: 'Diğer Giderler (Varsayılan)', value: 5 }
            ];
        }

        const salePriceExVat = 100;
        const commissionRate = settings.defaultCommissionRate ?? 0;
        const taxRate = settings.defaultTaxRate ?? 0;
        const shippingCost = settings.defaultShippingCost ?? 0;
        const additionalCost = settings.defaultAdditionalCost ?? 0;
        const serviceFeeExclVat = (settings.serviceFeeAmount ?? 0) / (1 + (settings.serviceFeeVatRate ?? 20) / 100);
        const commissionAmount = salePriceExVat * (commissionRate / 100);
        const taxAmount = salePriceExVat * (taxRate / 100);
        const otherCosts = shippingCost + additionalCost + commissionAmount + taxAmount + serviceFeeExclVat;
        const assumedProductCost = Math.max(0, salePriceExVat - otherCosts);
        const totalCostsForPercentage = assumedProductCost + otherCosts;
        const distribution: CostDistributionDataPoint[] = [];
        if (totalCostsForPercentage > 0) {
            if (assumedProductCost > 0) distribution.push({ name: 'Ürün Maliyeti (Tahmini)', value: parseFloat(((assumedProductCost / totalCostsForPercentage) * 100).toFixed(1)) });
            if (shippingCost > 0) distribution.push({ name: 'Kargo (Varsayılan)', value: parseFloat(((shippingCost / totalCostsForPercentage) * 100).toFixed(1)) });
            if (commissionAmount > 0) distribution.push({ name: 'Komisyon (Varsayılan)', value: parseFloat(((commissionAmount / totalCostsForPercentage) * 100).toFixed(1)) });
            if (taxAmount > 0) distribution.push({ name: 'Stopaj (Varsayılan)', value: parseFloat(((taxAmount / totalCostsForPercentage) * 100).toFixed(1)) });
            if (additionalCost > 0) distribution.push({ name: 'Ek Gider (Varsayılan)', value: parseFloat(((additionalCost / totalCostsForPercentage) * 100).toFixed(1)) });
            if (serviceFeeExclVat > 0) distribution.push({ name: 'Hizmet Bedeli', value: parseFloat(((serviceFeeExclVat / totalCostsForPercentage) * 100).toFixed(1)) });
        }
        return distribution;
    } catch (error: any) {
        console.error("[Server Action getCostDistribution] Error:", error);
        return null;
    }
} 