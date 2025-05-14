import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { 
    calculatePriceBreakdown, 
    ProductWithCategory, 
    GeneralCostSettingWithRelations, 
    BaremPrice 
} from '@/lib/profitability'; // Profitability fonksiyonlarını ve tipleri import et
import { Product, Prisma } from '@prisma/client'; // Prisma tipleri

// calculatePriceBreakdown için gerekli ilişkileri içeren Product tipi
type ProductForStats = Product & {
    category: {
        id: string;
        trendyolId: number;
        name: string;
        commissions: { userId: string; categoryId: string; commissionRate: number }[];
    };
    costSettings: { userId: string; productId: string; commissionRate: number | null; taxRate: number | null; shippingCost: number | null; additionalCost: number | null }[];
};

// API Yanıt Tipi
export interface StatsDataResponse {
  ortalamaKarMarji: number | null;
  toplamUrunSayisi: number;
  karliUrunSayisi: number;
  zararliUrunSayisi: number;
  enKarlıUrun?: { ad: string; barkod: string; karMarji: number };
  enZararliUrun?: { ad: string; barkod: string; karMarji: number };
}

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
    // Kategori komisyonlarını ve Ürün ayarlarını Product sorgusunda include edeceğiz

    if (!generalSettings) {
        return NextResponse.json({ error: 'Genel maliyet ayarları bulunamadı.' }, { status: 400 });
    }

    // 3. Kullanıcının Ürünlerini Çek (Gerekli ilişkilerle)
    const products = await db.product.findMany({
        where: {
            userId: userId,
            costPrice: { not: null }, // Maliyeti olmayanları hesaplama dışı bırak
            dimensionalWeight: { not: null }, // Desisi olmayanları hesaplama dışı bırak
            salePrice: { not: null, gt: 0 } // Geçerli satış fiyatı olanlar
        },
        include: {
            category: { // Kategori komisyonu için gerekli
                include: {
                    commissions: { where: { userId } }
                }
            },
            costSettings: { where: { userId } } // Ürüne özel ayarlar
        }
    }) as ProductForStats[]; // Prisma tipini override et

    const toplamUrunSayisi = products.length;
    if (toplamUrunSayisi === 0) {
        return NextResponse.json<StatsDataResponse>({ 
            ortalamaKarMarji: null,
            toplamUrunSayisi: 0,
            karliUrunSayisi: 0,
            zararliUrunSayisi: 0,
         }, { status: 200 });
    }

    // 4. Her Ürün İçin Karlılığı Hesapla
    let toplamKarMarji = 0;
    let hesaplananUrunSayisi = 0;
    let karliUrunSayisi = 0;
    let zararliUrunSayisi = 0;
    let enYuksekKarMarji = -Infinity;
    let enDusukKarMarji = Infinity;
    let enKarlıUrunData: StatsDataResponse['enKarlıUrun'] | undefined = undefined;
    let enZararliUrunData: StatsDataResponse['enZararliUrun'] | undefined = undefined;

    for (const product of products) {
        try {
            const productSetting = product.costSettings.length > 0 ? product.costSettings[0] : null;
            const categoryCommission = product.category.commissions.length > 0 ? product.category.commissions[0] : null;

            const breakdown = calculatePriceBreakdown({
                product: product as any, // Hızlı çözüm: as any kullan
                settings: generalSettings as any, // Hızlı çözüm: as any kullan
                baremRules: baremRules as any, // Hızlı çözüm: as any kullan
                productSetting: productSetting as any, // Hızlı çözüm: as any kullan
                categoryCommission: categoryCommission as any, // Hızlı çözüm: as any kullan
                targetSalePrice: product.salePrice! 
            });

            if (breakdown.profitMargin !== undefined) {
                 const margin = breakdown.profitMargin;
                 toplamKarMarji += margin;
                 hesaplananUrunSayisi++;

                 if (margin > 0) karliUrunSayisi++;
                 if (margin < 0) zararliUrunSayisi++;

                 if (margin > enYuksekKarMarji) {
                     enYuksekKarMarji = margin;
                     enKarlıUrunData = { ad: product.title, barkod: product.barcode, karMarji: margin };
                 }
                 if (margin < enDusukKarMarji) {
                     enDusukKarMarji = margin;
                     enZararliUrunData = { ad: product.title, barkod: product.barcode, karMarji: margin };
                 }
            }

        } catch (error: any) {
            // Tek bir ürün hesaplanamazsa logla ama devam et
            console.warn(`[API Stats] Ürün ${product.barcode} için karlılık hesaplanamadı: ${error.message}`);
        }
    }

    // 5. Sonuçları Hesapla ve Döndür
    const ortalamaKarMarji = hesaplananUrunSayisi > 0 ? toplamKarMarji / hesaplananUrunSayisi : null;

    const responseData: StatsDataResponse = {
        ortalamaKarMarji: ortalamaKarMarji !== null ? parseFloat(ortalamaKarMarji.toFixed(1)) : null,
        toplamUrunSayisi: toplamUrunSayisi,
        karliUrunSayisi: karliUrunSayisi,
        zararliUrunSayisi: zararliUrunSayisi,
        enKarlıUrun: enKarlıUrunData ? { ...enKarlıUrunData, karMarji: parseFloat(enKarlıUrunData.karMarji.toFixed(1)) } : undefined,
        enZararliUrun: enZararliUrunData ? { ...enZararliUrunData, karMarji: parseFloat(enZararliUrunData.karMarji.toFixed(1)) } : undefined,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error("[API Stats] Genel Hata:", error);
    return NextResponse.json({ error: 'İstatistikler alınırken sunucu hatası oluştu.', details: error.message }, { status: 500 });
  }
} 