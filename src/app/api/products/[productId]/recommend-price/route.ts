import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import
import { db } from '@/lib/db';
import { z } from 'zod';
import { calculateRecommendedPrice } from '@/lib/profitability';
import type { BaremPrice, ProductCostSetting, CategoryCommission } from '@prisma/client'; // Yeni tipleri ekle

// Gelen istek body'si için Zod şeması (yeni alanlar eklendi)
const recommendPriceSchema = z.object({
  profitRate: z.number().min(0, 'Kâr oranı negatif olamaz'),
  calculationMethod: z.enum(['MARGIN', 'MARKUP'], { 
      errorMap: () => ({ message: 'Hesaplama yöntemi MARGIN veya MARKUP olmalıdır' }) 
  }),
  // Opsiyonel: Gelecekte barem için tahmini satış fiyatı alınabilir
  // estimatedSalePrice: z.number().optional(),
});

// Yardımcı fonksiyon: Uygun barem kuralını bul
const findApplicableBaremRule = (
    rules: BaremPrice[], // any[] oldu
    carrierName: string,
    salePrice: number,
    desi: number
): BaremPrice | null => { // any | null oldu
    const applicableRules = rules.filter(rule => 
        rule.carrierName.toUpperCase() === carrierName.toUpperCase() &&
        salePrice >= rule.minOrderValue && 
        salePrice < rule.maxOrderValue &&
        (rule.maxDesi === null || desi <= rule.maxDesi) // maxDesi null ise veya desi uyuyorsa
    );

    // Birden fazla kural eşleşirse (genelde olmamalı ama), en spesifik olanı (maxDesi daha düşük olan?) veya ilk bulduğumuzu alalım
    // Şimdilik ilk bulduğumuzu alıyoruz.
    return applicableRules.length > 0 ? applicableRules[0] : null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await auth(); // NextAuth v5 kullanımı eklendi
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }
    const userId = session.user.id;
    const resolvedParams = await params; // params objesini await ile bekle
    const productId = resolvedParams.productId; // Bekledikten sonra eriş
    
    // Request Body Doğrulama
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

    const validationResult = recommendPriceSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => `Alan '${err.path.join('.')}': ${err.message}`);
      return NextResponse.json({ error: 'Geçersiz istek parametreleri.', details: errorMessages }, { status: 400 });
    }
    const { profitRate: desiredProfitRatePercent, calculationMethod } = validationResult.data;
    const profitRate = desiredProfitRatePercent / 100; // Orana çevir

    // 1. Gerekli verileri çek
    const [product, settings, baremRules, productSetting, categoryCommission] = await Promise.all([
      // Product: categoryId de lazım olacak
      db.product.findUnique({
        where: { id: productId, userId: userId },
        select: { 
          id: true, 
          costPrice: true, 
          dimensionalWeight: true, 
          salePrice: true, 
          categoryId: true // categoryId eklendi
        }
      }),
      db.generalCostSetting.findUnique({
        where: { userId: userId },
      }),
      db.baremPrice.findMany({
        where: { userId: userId },
      }),
      // Ürüne özel ayarı çek
      db.productCostSetting.findUnique({
        where: { userId_productId: { userId: userId, productId: productId } }
      }),
      // Kategoriye özel komisyonu çek (product.categoryId lazım)
      // Product çekildikten sonra bunu ayrıca çekmek daha mantıklı olabilir
    ]);

    // 2. Verileri Doğrula
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    if (product.costPrice == null) { // null veya undefined kontrolü
      return NextResponse.json({ error: 'Ürünün birim maliyeti tanımlanmamış.' }, { status: 400 });
    }
    if (product.dimensionalWeight == null) {
      return NextResponse.json({ error: 'Ürünün desi (hacimsel ağırlık) bilgisi eksik.' }, { status: 400 });
    }
    if (!settings) {
      return NextResponse.json({ error: 'Genel maliyet ayarları bulunamadı.' }, { status: 400 });
    }
    // Gerekli KDV ve oran kontrolleri (null olmamalılar)
    const requiredSettings: (keyof typeof settings)[] = [
        'defaultCommissionRate', 'defaultTaxRate', 
        'salesVatRate', 'shippingVatRate', 'commissionVatRate'
    ];
    for (const key of requiredSettings) {
        if (settings[key] == null) {
             // key'in string olduğundan emin olalım
             const fieldName = String(key).replace('default','').replace(/([A-Z])/g, ' $1').trim();
             return NextResponse.json({ error: `Genel ayarlarda eksik bilgi: ${fieldName}` }, { status: 400 });
        }
    }
    // Maliyet KDV'si dahil edilecekse oranının da olması lazım
    if (settings.includeCostVat && settings.costVatRate == null) {
        return NextResponse.json({ error: 'Maliyet KDV dahil edilecekse, Maliyet KDV oranı da ayarlanmalıdır.' }, { status: 400 });
    }
    // Varsayılan kargo maliyeti (Barem eşleşmezse kullanılır)
    if (settings.defaultShippingCost == null) {
        return NextResponse.json({ error: 'Varsayılan kargo maliyeti ayarlanmamış (Barem dışı durumlar için gereklidir).' }, { status: 400 });
    }

    // Kategori komisyonunu şimdi çekelim (product var artık)
    const categoryComm = product.categoryId 
        ? await db.categoryCommission.findUnique({
            where: { userId_categoryId: { userId: userId, categoryId: product.categoryId } }
          })
        : null;

    // 3. Hesaplamayı yap (yeni argümanlarla)
    const calculationResult = calculateRecommendedPrice({
      product: product as any, // Tip uyumu için any veya Pick<> düzeltmesi
      settings: settings,
      baremRules: baremRules as BaremPrice[],
      productSetting: productSetting, // Yeni argüman
      categoryCommission: categoryComm, // Yeni argüman
      desiredProfitRatePercent: desiredProfitRatePercent,
      calculationMethod: calculationMethod,
    });

    // 4. Hesaplanan fiyatı DB'ye kaydet
    if (calculationResult.recommendedPrice != null) { // Sadece geçerli bir fiyat hesaplandıysa kaydet
      await db.product.update({
        where: { id: productId, userId: userId }, // userId kontrolü ek güvenlik sağlar
        data: {
          recommendedSalePrice: calculationResult.recommendedPrice,
          // İsteğe bağlı: Son hesaplama zamanını veya kullanılan parametreleri de kaydedebilirsiniz
          // lastRecommendationCalcAt: new Date(),
        },
      });
      console.log(`[API/recommend-price] Product ${productId} için tavsiye fiyat ${calculationResult.recommendedPrice} kaydedildi.`);
    } else {
      console.warn(`[API/recommend-price] Product ${productId} için geçerli tavsiye fiyat hesaplanamadı, kaydedilmedi.`);
       // Hesaplama başarısızsa veya null döndüyse, DB'deki eski değeri null yapabilir veya dokunmayabilirsiniz.
       // Şimdilik dokunmuyoruz. İsterseniz null yapabiliriz:
       // await db.product.update({ where: { id: productId, userId: userId }, data: { recommendedSalePrice: null } });
    }

    // 5. Yanıtı Döndür
    return NextResponse.json(calculationResult);

  } catch (error: any) {
    console.error("Fiyat önerisi API hatası:", error);
    // Hesaplama fonksiyonundan gelen bilinen hataları yakala
    if (error instanceof Error && (
        error.message.includes('maliyeti tanımlanmamış') ||
        error.message.includes('desi bilgisi eksik') ||
        error.message.includes('Genel ayarlarda eksik bilgi') ||
        error.message.includes('Maliyet KDV oranı') ||
        error.message.includes('Varsayılan kargo maliyeti') ||
        error.message.includes('pozitif bir satış fiyatı oluşturmuyor') ||
        error.message.includes('Komisyon ve vergi oranları toplamı')
       )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // ZodError kontrolü
    if (error.name === 'ZodError') {
        return NextResponse.json({ error: 'Geçersiz istek verisi.', details: error.errors }, { status: 400 });
    }
    // Kaydetme hatası olasılığı için genel bir hata mesajı
    console.error("[API/recommend-price] Fiyat önerisi ve kaydetme hatası:", error);
    // Diğer hatalar
    return NextResponse.json({ error: 'Dahili sunucu hatası.', details: error.message }, { status: 500 });
  }
} 