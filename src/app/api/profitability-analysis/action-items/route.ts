import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { 
    calculatePriceBreakdown, 
    ProductWithCategory, 
    GeneralCostSettingWithRelations, 
    BaremPrice, 
    BreakdownResult
} from '@/lib/profitability';
import { Product, Prisma } from '@prisma/client';

// statistics/route.ts'deki Product tipi tanımını kullanalım
type ProductForAnalysis = Product & {
    category: {
        id: string;
        trendyolId: number;
        name: string;
        commissions: { userId: string; categoryId: string; commissionRate: number }[];
    };
    costSettings: { userId: string; productId: string; commissionRate: number | null; taxRate: number | null; shippingCost: number | null; additionalCost: number | null }[];
};

// API Yanıt Tipi
export interface ActionItemProduct {
  id: string; // Ürün ID'si (detay sayfasına link için)
  barkod: string;
  ad: string;
  sebep: 'ZARARINA_SATIS' | 'DUSUK_STOK' | 'FIYAT_FARKI' | 'YUKSEK_IADE'; // Aksiyon nedeni
  detay: string; // Örn: "%-5.2 kar marjı", "Stok: 2"
  mevcutFiyat: number;
  maliyet?: number;
  karMarji?: number;
}

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Gerekli Ayarları Çek
    const generalSettings = await db.generalCostSetting.findUnique({ where: { userId } });
    const baremRules = await db.baremPrice.findMany({ where: { userId } });

    if (!generalSettings) {
        return NextResponse.json({ error: 'Genel maliyet ayarları bulunamadı.' }, { status: 400 });
    }

    // 3. Kullanıcının Ürünlerini Çek (Gerekli ilişkilerle)
    // Hem karlılık hem stok kontrolü için ürünleri çekiyoruz
    const products = await db.product.findMany({
        where: {
            userId: userId,
            // Karlılık için gerekli alanlar
            costPrice: { not: null }, 
            dimensionalWeight: { not: null }, 
            salePrice: { not: null, gt: 0 },
            // Stok kontrolü için quantity bilgisi de önemli
            quantity: { not: null }
        },
        include: {
            category: {
                include: {
                    commissions: { where: { userId } }
                }
            },
            costSettings: { where: { userId } }
        }
    }) as ProductForAnalysis[];

    const actionItems: ActionItemProduct[] = [];

    // 4. Ürünleri Değerlendir
    for (const product of products) {
        let breakdownResult: BreakdownResult | null = null;
        let calculationError: string | null = null;

        // a) Karlılık Hesaplaması (Zararına Satış Kontrolü)
        try {
            const productSetting = product.costSettings.length > 0 ? product.costSettings[0] : null;
            const categoryCommission = product.category.commissions.length > 0 ? product.category.commissions[0] : null;

            breakdownResult = calculatePriceBreakdown({
                product: product as any, 
                settings: generalSettings as any, 
                baremRules: baremRules as any, 
                productSetting: productSetting as any, 
                categoryCommission: categoryCommission as any, 
                targetSalePrice: product.salePrice! 
            });

            if (breakdownResult && breakdownResult.netProfitAmount < 0) {
                actionItems.push({
                    id: product.id,
                    barkod: product.barcode,
                    ad: product.title,
                    sebep: 'ZARARINA_SATIS',
                    detay: `Net Kâr: ${breakdownResult.netProfitAmount.toFixed(2)} TL (${breakdownResult.profitMargin?.toFixed(1) ?? 'N/A'}%)`,
                    mevcutFiyat: product.salePrice!,
                    maliyet: breakdownResult.costPrice,
                    karMarji: breakdownResult.profitMargin
                });
                 continue; // Bir ürün için birden fazla sebep listelememek için
            }
        } catch (error: any) {
            calculationError = error.message;
            console.warn(`[API ActionItems] Ürün ${product.barcode} için karlılık hesaplanamadı: ${calculationError}`);
        }

        // b) Düşük Stok Kontrolü
        if (product.quantity! < LOW_STOCK_THRESHOLD) {
             actionItems.push({
                 id: product.id,
                 barkod: product.barcode,
                 ad: product.title,
                 sebep: 'DUSUK_STOK',
                 detay: `Kalan Stok: ${product.quantity}`, 
                 mevcutFiyat: product.salePrice!,
                 maliyet: breakdownResult?.costPrice, // Hesaplandıysa ekleyelim
                 karMarji: breakdownResult?.profitMargin // Hesaplandıysa ekleyelim
             });
             continue; 
        }
        
        // c) Fiyat Farkı Kontrolü (Eğer recommendedSalePrice varsa)
        if (product.recommendedSalePrice && product.salePrice && product.recommendedSalePrice > 0) { // recommendedSalePrice 0'dan büyük olmalı
            const priceDifferenceRatio = Math.abs(product.recommendedSalePrice - product.salePrice) / product.recommendedSalePrice;
            const PRICE_DIFF_THRESHOLD = 0.10; // %10 fark eşiği
            if (priceDifferenceRatio > PRICE_DIFF_THRESHOLD) { 
                actionItems.push({
                    id: product.id,
                    barkod: product.barcode,
                    ad: product.title,
                    sebep: 'FIYAT_FARKI',
                    detay: `Mevcut: ${product.salePrice.toFixed(2)} TL, Tavsiye: ${product.recommendedSalePrice.toFixed(2)} TL`,
                    mevcutFiyat: product.salePrice!,
                    maliyet: breakdownResult?.costPrice,
                    karMarji: breakdownResult?.profitMargin
                });
                continue; // Diğer kontrollere geçme
            }
        }

        // TODO: Yüksek İade Oranı Kontrolü (Daha karmaşık, ileride eklenebilir)
    }

    // 5. Sonucu Döndür
    return NextResponse.json(actionItems, { status: 200 });

  } catch (error: any) {
    console.error("[API ActionItems] Genel Hata:", error);
    return NextResponse.json({ error: 'Aksiyon listesi alınırken sunucu hatası oluştu.', details: error.message }, { status: 500 });
  }
} 