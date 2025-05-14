import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // 1. Kullanıcı kimliğini doğrula
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    // 2. Filtre parametrelerini al (products API ile aynı)
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const brandIdParam = searchParams.get('brandId');
    const categoryIdParam = searchParams.get('categoryId');

    // 3. Ana Filtre Koşullarını Oluştur (Product için, status hariç)
    const baseWhere: Prisma.ProductWhereInput = {
      userId: userId,
      ...(brandIdParam && brandIdParam !== 'all' && { brandId: brandIdParam }),
      ...(categoryIdParam && categoryIdParam !== 'all' && { categoryId: categoryIdParam }),
      ...(query && {
        OR: [
          { title: { contains: query /*, mode: 'insensitive' */ } },
          { barcode: { contains: query /*, mode: 'insensitive' */ } },
          { stockCode: { contains: query /*, mode: 'insensitive' */ } },
        ],
      })
    };

    // 4. Tüm ürünleri (filtrelenmiş) sadece durum bilgileriyle çek
    const filteredProducts = await db.product.findMany({
      where: baseWhere, // Ana filtreleri uygula
      select: {
        id: true,
        onSale: true,
        approved: true,
        archived: true,
        rejected: true,
        blacklisted: true,
      },
    });

    // 5. Durumlara göre sayımları hesapla (filtrelenmiş ürün listesi üzerinden)
    const tabCounts = {
      onSale: filteredProducts.filter(p => p.onSale === true).length,
      approved: filteredProducts.filter(p => p.approved === true && p.onSale !== true).length,
      notApproved: filteredProducts.filter(p => p.approved === false).length,
      archived: filteredProducts.filter(p => p.archived === true).length,
      rejected: filteredProducts.filter(p => p.rejected === true).length,
      blacklisted: filteredProducts.filter(p => p.blacklisted === true).length,
      all: filteredProducts.length,
    };

    // Cache'lemeyi önlemek için header ekleyelim
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // 6. Sadece tabCounts nesnesini döndür
    return NextResponse.json({ tabCounts }, { headers });

  } catch (error: unknown) {
    console.error("[API/KarlilikAnalizi/Stats GET] Hata:", error);
    const message = error instanceof Error ? error.message : 'İstatistikler getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 