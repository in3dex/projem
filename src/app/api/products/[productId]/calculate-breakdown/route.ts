'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import
import { db } from '@/lib/db';
import { z } from 'zod';
import { calculatePriceBreakdown } from '@/lib/profitability';
import type { BaremPrice, ProductCostSetting, CategoryCommission } from '@prisma/client';

// Query parametresi için şema
const breakdownQuerySchema = z.object({
  price: z.string() // Önce string olarak al
          .refine((val) => !isNaN(parseFloat(val)), { message: "Geçerli bir sayı olmalıdır" }) // Sayıya çevrilebilir mi kontrol et
          .transform((val) => parseFloat(val)) // Sayıya çevir
          .pipe(z.number().positive('Fiyat pozitif olmalıdır')) // Sonucu doğrula
});

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }
    const userId = session.user.id;
    const resolvedParams = await params; // params objesini await ile bekle
    const productId = resolvedParams.productId; // Bekledikten sonra eriş

    // Query parametresini al ve doğrula
    const { searchParams } = new URL(request.url);
    const priceParam = searchParams.get('price');

    if (priceParam === null) {
         return NextResponse.json({ error: 'Hata: \'price\' query parametresi gereklidir.' }, { status: 400 });
    }

    const validationResult = breakdownQuerySchema.safeParse({ price: priceParam });
    if (!validationResult.success) {
       const errorMessages = validationResult.error.errors.map(err => `Parametre '${err.path.join('.')}': ${err.message}`);
       return NextResponse.json({ error: 'Geçersiz \'price\' parametresi.', details: errorMessages }, { status: 400 });
    }
    const targetSalePrice = validationResult.data.price;

    // 1. Gerekli verileri çek
    const [product, settings, baremRules, productSetting] = await Promise.all([
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
      // Kategori komisyonu ayrı çekilecek
    ]);

    // 2. Veri Kontrolleri
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    if (!settings) {
      return NextResponse.json({ error: 'Genel maliyet ayarları bulunamadı.' }, { status: 400 });
    }
    // Diğer kontroller calculatePriceBreakdown içinde yapılıyor.

    // Kategori komisyonunu çek
    const categoryComm = product.categoryId 
        ? await db.categoryCommission.findUnique({
            where: { userId_categoryId: { userId: userId, categoryId: product.categoryId } }
          })
        : null;

    // 3. Hesaplamayı yap (yeni argümanlarla)
    const breakdownResult = calculatePriceBreakdown({
        product: product as any, // Tip uyumu
        settings: settings,
        baremRules: baremRules as BaremPrice[],
        productSetting: productSetting,
        categoryCommission: categoryComm,
        targetSalePrice: targetSalePrice,
    });

    // 4. Yanıtı Döndür
    return NextResponse.json(breakdownResult);

  } catch (error: any) {
    console.error("Fiyat dökümü API hatası:", error);
    // Hesaplama fonksiyonundan gelen bilinen hataları yakala
    if (error instanceof Error && (
        error.message.includes('maliyeti tanımlanmamış') ||
        error.message.includes('desi bilgisi eksik') ||
        error.message.includes('Genel ayarlarda eksik bilgi') ||
        error.message.includes('Varsayılan kargo maliyeti')
       )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
     // ZodError kontrolü
     if (error.name === 'ZodError') {
         return NextResponse.json({ error: 'Geçersiz istek parametresi.', details: error.errors }, { status: 400 });
     }
    // Diğer hatalar
    return NextResponse.json({ error: 'Dahili sunucu hatası.', details: error.message }, { status: 500 });
  }
} 