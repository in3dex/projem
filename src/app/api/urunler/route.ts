import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

// Varsayılan sayfa boyutu
const DEFAULT_PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Sorgu parametrelerini al
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10) - 1; // 0-bazlı indeks
    const size = parseInt(searchParams.get('size') || `${DEFAULT_PAGE_SIZE}`, 10);
    const query = searchParams.get('query') || '';
    const stockStatus = searchParams.get('stockStatus'); // 'inStock', 'outOfStock'
    const listingStatus = searchParams.get('listingStatus') || 'onSale'; // onSale, approved, archived, rejected, blacklisted, all
    const brandIdParam = searchParams.get('brandId');
    const categoryIdParam = searchParams.get('categoryId');

    // 3. Prisma Sorgu Koşullarını Oluştur (Product modeline göre güncellendi)
    const where: Prisma.ProductWhereInput = {
      userId: userId, // Her zaman kullanıcıya göre filtrele
      AND: [ // Tüm koşulları AND ile birleştir
        // Arama sorgusu (varsa)
        query ? {
          OR: [
            { title: { contains: query } },
            { stockCode: { contains: query } },
            { barcode: { contains: query } },
          ]
        } : {},

        // Marka Filtresi (varsa ve 'all' değilse)
        brandIdParam && brandIdParam !== 'all' ? {
          brandId: { equals: brandIdParam }
        } : {},

        // Kategori Filtresi (varsa ve 'all' değilse)
        categoryIdParam && categoryIdParam !== 'all' ? {
          categoryId: { equals: categoryIdParam }
        } : {},

        // Listeleme Durumu Filtresi (varsa ve 'all' değilse)
        listingStatus && listingStatus !== 'all' ? {
            ...(listingStatus === 'onSale' && { onSale: true }),
            ...(listingStatus === 'approved' && { approved: true, onSale: false }), // Satışta olmayan onaylılar
            ...(listingStatus === 'notApproved' && { approved: false }),
            ...(listingStatus === 'archived' && { archived: true }),
            ...(listingStatus === 'rejected' && { rejected: true }),
            ...(listingStatus === 'blacklisted' && { blacklisted: true }),
        } : {},

        // Stok Durumu Filtresi (varsa)
        stockStatus ? {
            quantity: stockStatus === 'inStock' ? { gt: 0 } : stockStatus === 'outOfStock' ? 0 : undefined,
        } : {}
      ]
    };

    // 4. Verileri ve Toplam Sayıyı Çek
    const [products, totalCount] = await db.$transaction([
      db.product.findMany({
        where,
        include: { // include artık variants içermiyor
          brand: true,
          category: true,
        },
        orderBy: {
          createdAt: 'desc', // Veya title, vb. olabilir
        },
        skip: page * size,
        take: size,
      }),
      db.product.count({ where }),
    ]);

    // 5. Yanıtı Oluştur
    const totalPages = Math.ceil(totalCount / size);

    // Cache'lemeyi önlemek için header ekleyelim
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json({
      content: products,
      page: page + 1, 
      size: size,
      totalElements: totalCount,
      totalPages: totalPages,
    }, { headers }); // Header'ları yanıta ekle

  } catch (error: unknown) {
    console.error("Ürün listeleme hatası:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Ürünler listelenirken bir hata oluştu.', 
        details: message 
    }, { status: 500 });
  }
} 