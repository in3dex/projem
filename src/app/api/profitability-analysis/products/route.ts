import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { Prisma } from '@prisma/client';

// Varsayılan sayfa boyutu
const DEFAULT_PAGE_SIZE_KARLILIK = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Sayfalama ve Filtre parametrelerini al
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10) - 1; // 0-bazlı indeks
    const size = parseInt(searchParams.get('size') || `${DEFAULT_PAGE_SIZE_KARLILIK}`, 10);
    const listingStatus = searchParams.get('listingStatus') || 'all';
    const query = searchParams.get('query') || '';
    const brandIdParam = searchParams.get('brandId');
    const categoryIdParam = searchParams.get('categoryId');
    const hasCostParam = searchParams.get('hasCost') === 'true';

    // 3. Prisma Sorgu Koşullarını Oluştur (Product için)
    const where: Prisma.ProductWhereInput = {
      userId: userId, // Doğrudan kullanıcı ID'si
      // Marka Filtresi
      ...(brandIdParam && brandIdParam !== 'all' && { brandId: brandIdParam }),
      // Kategori Filtresi
      ...(categoryIdParam && categoryIdParam !== 'all' && { categoryId: categoryIdParam }),
      // Listing Status filtresi
      ...(listingStatus && listingStatus !== 'all' && {
        ...(listingStatus === 'onSale' && { onSale: true }),
        ...(listingStatus === 'approved' && { approved: true, onSale: { not: true } }), // Hem onaylı hem satışta olmayan
        ...(listingStatus === 'notApproved' && { approved: false }),
        ...(listingStatus === 'archived' && { archived: true }),
        ...(listingStatus === 'rejected' && { rejected: true }),
        ...(listingStatus === 'blacklisted' && { blacklisted: true }),
      }),
      // Arama sorgusu (varsa) - title, barcode, stockCode
      ...(query && {
        OR: [
          { title: { contains: query } }, // SQLite için mode kaldırıldı
          { barcode: { contains: query } },
          { stockCode: { contains: query } },
        ],
      }),
      // Yeni: Maliyeti tanımlı filtresi
      ...(hasCostParam && { costPrice: { not: null } }),
    };

    // 4. Ürünleri ve Toplam Sayıyı Çek
    const [products, totalCount] = await db.$transaction([
      db.product.findMany({
        where,
        select: { // Açıkça seçelim
          id: true,
          userId: true,
          title: true,
          barcode: true,
          stockCode: true,
          onSale: true,
          approved: true,
          archived: true,
          rejected: true,
          blacklisted: true,
          costPrice: true,
          salePrice: true,
          quantity: true,
          recommendedSalePrice: true,
          dimensionalWeight: true,
          brand: true, 
          category: true,
          createdAt: true,
          updatedAt: true,
          images: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: page * size,
        take: size,
      }),
      db.product.count({ where }),
    ]);

    // 5. Yanıtı Oluştur
    const totalPages = Math.ceil(totalCount / size);

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json({
      content: products, // Artık product listesi
      page: page + 1,
      size: size,
      totalElements: totalCount,
      totalPages: totalPages,
    }, { headers });

  } catch (error: unknown) {
    console.error("[API/KarlilikAnalizi/Products GET] Hata:", error);
    const message = error instanceof Error ? error.message : 'Karlılık verileri getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 