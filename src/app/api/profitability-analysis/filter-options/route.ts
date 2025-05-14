import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Kullanıcıya ait ürünlerden distinct marka ve kategorileri çek
    const products = await db.product.findMany({
      where: {
        userId: userId,
      },
      select: {
        brandId: true,
        categoryId: true,
        brand: { select: { name: true } }, // Marka adını da al
        category: { select: { name: true } }, // Kategori adını da al
      },
      distinct: ['brandId', 'categoryId'], // Sadece farklı kombinasyonları al
    });

    // 3. Distinct marka ve kategorileri ayıkla
    const brands = Array.from(new Map(products.map(p => [p.brandId, { id: p.brandId, name: p.brand.name }])).values());
    const categories = Array.from(new Map(products.map(p => [p.categoryId, { id: p.categoryId, name: p.category.name }])).values());

    // Cache'lemeyi önlemek için header ekleyelim
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // 4. Marka ve kategori listelerini döndür
    return NextResponse.json({ brands, categories }, { headers });

  } catch (error: unknown) {
    console.error("[API/KarlilikAnalizi/FilterOptions GET] Hata:", error);
    const message = error instanceof Error ? error.message : 'Filtre seçenekleri getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 