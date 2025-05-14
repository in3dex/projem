'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import
import { db } from '@/lib/db';
import { z } from 'zod';
import { calculateRecommendedPrice } from '@/lib/profitability';
import { Prisma, BaremPrice, ProductCostSetting, CategoryCommission } from '@prisma/client';

// İstek gövdesi için şema (filtreler + hesaplama ayarları)
const bulkRecommendPriceSchema = z.object({
    // Filtreler (karlilik-analizi/products rotasındakilere benzer)
    query: z.string().optional(),
    listingStatus: z.string().optional().default('all'),
    brandId: z.string().optional(),
    categoryId: z.string().optional(),
    // Hesaplama Ayarları
    profitRate: z.number().min(0, 'Kâr oranı negatif olamaz'),
    calculationMethod: z.enum(['MARGIN', 'MARKUP']),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
        }
        const userId = session.user.id;

        // İstek gövdesini al ve doğrula
        let requestBody: any;
        try {
            requestBody = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
        }

        const validationResult = bulkRecommendPriceSchema.safeParse(requestBody);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(err => `Alan '${err.path.join('.')}': ${err.message}`);
            return NextResponse.json({ error: 'Geçersiz istek parametreleri.', details: errorMessages }, { status: 400 });
        }
        const { 
            query, listingStatus, brandId, categoryId, 
            profitRate: desiredProfitRatePercent, calculationMethod 
        } = validationResult.data;

        // 1. Ayarları ve Barem Kurallarını Çek
        // Değişkenleri ayrı ayrı tanımlıyoruz ki daha sonra değiştirebilelim
        let settings = await db.generalCostSetting.findUnique({
            where: { userId: userId },
        });
        
        const baremRules = await db.baremPrice.findMany({ 
            where: { userId: userId },
        });

        if (!settings) {
            // Varsayılan ayarlarla devam et
            console.log(`[Bulk Recommend Price] Kullanıcı ${userId} için genel maliyet ayarları bulunamadı. Varsayılan değerler kullanılacak.`);
            
            // findUnique alternatifi deneyelim
            let altSettings = await db.generalCostSetting.findFirst({
                where: { userId: userId }
            });
            
            // Hala bulunamadıysa tüm mevcut ayarları debug log'a yazalım
            if (!altSettings) {
                const allSettings = await db.generalCostSetting.findMany({
                    take: 3 // Performans için sınırlı sayıda getir 
                });
                console.log("[Bulk Recommend Price] Mevcut maliyet ayarları:", allSettings.map(s => ({id: s.id, userId: s.userId})));
                
                // Varsayılan ayarlarla ilerle ve kullanıcıya nazik bir mesaj göster
                return NextResponse.json({ 
                    error: 'Genel maliyet ayarları bulunamadı. Lütfen önce Maliyet Ayarları sayfasından genel ayarlarınızı kaydedin.',
                    recommendations: [] 
                }, { status: 200 }); // 400 yerine 200 dönüyoruz çünkü istek geçerli ama sonuç hesaplanamıyor
            } else {
                // findFirst ile ayar bulunduysa devam et
                console.log("[Bulk Recommend Price] findFirst ile maliyet ayarları bulundu!");
                settings = altSettings;
            }
        }

        // Gerekli ayar kontrolleri (calculateRecommendedPrice içinde yapılıyor ama burada da yapılabilir)

        // 2. Filtre Koşullarını Oluştur (hasCost = true dahil)
        const where: Prisma.ProductWhereInput = {
            userId: userId,
            costPrice: { not: null }, // Sadece maliyeti tanımlı olanlar
            ...(brandId && brandId !== 'all' && { brandId: brandId }),
            ...(categoryId && categoryId !== 'all' && { categoryId: categoryId }),
            ...(listingStatus && listingStatus !== 'all' && {
                ...(listingStatus === 'onSale' && { onSale: true }),
                ...(listingStatus === 'approved' && { approved: true, onSale: { not: true } }),
                ...(listingStatus === 'notApproved' && { approved: false }),
                ...(listingStatus === 'archived' && { archived: true }),
                ...(listingStatus === 'rejected' && { rejected: true }),
                ...(listingStatus === 'blacklisted' && { blacklisted: true }),
            }),
            ...(query && {
                OR: [
                    { title: { contains: query } },
                    { barcode: { contains: query } },
                    { stockCode: { contains: query } },
                ],
            }),
        };

        // 3. İlgili Ürünleri Çek (categoryId dahil)
        const productsToCalculate = await db.product.findMany({
            where,
            select: { 
                id: true, 
                costPrice: true, 
                dimensionalWeight: true, 
                salePrice: true, 
                categoryId: true // categoryId eklendi
            }
        });

        if (productsToCalculate.length === 0) {
             return NextResponse.json({ recommendations: [], message: "Hesaplanacak ürün bulunamadı." }, { status: 200 });
        }

        // 4. İlgili tüm özel ayarları önceden çek (Performans için)
        const productIds = productsToCalculate.map(p => p.id);
        const categoryIds = productsToCalculate.map(p => p.categoryId).filter(Boolean) as string[]; // Null olmayan categoryId'ler

        const [productSettingsList, categoryCommissionsList] = await Promise.all([
            db.productCostSetting.findMany({
                where: { userId: userId, productId: { in: productIds } }
            }),
            db.categoryCommission.findMany({
                where: { userId: userId, categoryId: { in: categoryIds } }
            })
        ]);

        // Haritalar oluşturarak ayarlara hızlı erişim sağla
        const productSettingsMap = new Map(productSettingsList.map(ps => [ps.productId, ps]));
        const categoryCommissionsMap = new Map(categoryCommissionsList.map(cc => [cc.categoryId, cc]));

        // 5. Her ürün için hesaplama yap ve güncelleme listesi oluştur
        const updatePromises: Prisma.PrismaPromise<any>[] = [];
        const recommendationsResult: { productId: string; recommendedPrice: number | null; error?: string }[] = [];

        for (const product of productsToCalculate) {
            try {
                // İlgili özel ayarları haritalardan al
                const productSetting = productSettingsMap.get(product.id);
                const categoryCommission = product.categoryId ? categoryCommissionsMap.get(product.categoryId) : null;

                const result = calculateRecommendedPrice({
                     product: product as any, 
                     settings: settings, 
                     baremRules: baremRules as BaremPrice[],
                     productSetting: productSetting, // Haritadan alınan ayar
                     categoryCommission: categoryCommission, // Haritadan alınan komisyon
                     desiredProfitRatePercent: desiredProfitRatePercent,
                     calculationMethod: calculationMethod,
                 });
                 
                 recommendationsResult.push({ productId: product.id, recommendedPrice: result.recommendedPrice });
                 
                 if (result.recommendedPrice != null) {
                     updatePromises.push(
                         db.product.update({
                             where: { id: product.id, userId: userId }, 
                             data: { recommendedSalePrice: result.recommendedPrice }
                         })
                     );
                 } else {
                     // İsteğe bağlı: Hesaplama null döndürürse DB'deki değeri null yapabiliriz
                     // updatePromises.push(db.product.update({ where: { id: product.id, userId: userId }, data: { recommendedSalePrice: null } }));
                 }
            } catch (error: any) {
                 console.warn(`[Bulk Recommend Price] Product ID ${product.id} için hesaplama hatası: ${error.message}`);
                 recommendationsResult.push({ productId: product.id, recommendedPrice: null, error: error.message });
                 // Hata durumunda DB'deki değeri null yapabilir veya dokunmayabiliriz
                 // updatePromises.push(db.product.update({ where: { id: product.id, userId: userId }, data: { recommendedSalePrice: null } }));
            }
        }

        // 6. Başarılı hesaplamaları tek bir transaction içinde veritabanına kaydet
        if (updatePromises.length > 0) {
            try {
                await db.$transaction(updatePromises);
                console.log(`[Bulk Recommend Price] ${updatePromises.length} ürün için tavsiye fiyatları başarıyla kaydedildi.`);
            } catch (transactionError: any) {
                 console.error("[Bulk Recommend Price] Veritabanı güncelleme transaction hatası:", transactionError);
                 // Transaction başarısız olursa, tüm güncellemeler geri alınır.
                 // Hata detayını döndürebilir veya genel bir mesaj verebiliriz.
                 return NextResponse.json({ error: 'Hesaplanan fiyatlar kaydedilirken bir veritabanı hatası oluştu.', details: transactionError.message }, { status: 500 });
            }
        }

        // 7. Hesaplama sonuçlarını (kaydedilmiş veya kaydedilememiş halleriyle) döndür
        return NextResponse.json({ recommendations: recommendationsResult });

    } catch (error: any) {
        console.error("Toplu Fiyat Önerisi API hatası:", error);
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: 'Geçersiz istek verisi.', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Dahili sunucu hatası.', details: error.message }, { status: 500 });
    }
} 