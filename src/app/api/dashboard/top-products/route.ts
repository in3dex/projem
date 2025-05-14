import { NextResponse } from 'next/server';
import { PrismaClient, Product, TrendyolOrderItem } from '@prisma/client';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import
import { subDays, startOfDay } from 'date-fns';

// Frontend'deki arayüzle eşleşen tip
interface TopProduct {
  productId: string; // Bizim Product tablomuzdaki ID
  productTitle: string;
  productBarcode: string;
  totalQuantitySold: number;
  productImageUrl?: string; // Ana görseli almayı deneyebiliriz
}

// Prisma groupBy sonucunun tipini tanımla
type SoldItemGroup = {
    barcode: string | null; // Schema'da nullable, ama where ile null olmayanları alıyoruz
    _sum: {
        quantity: number | null;
    };
}

// Product sorgusunun döndüreceği tip
type ProductInfo = Pick<Product, 'id' | 'title' | 'barcode' | 'images'>;

export async function GET() {
  const prisma = new PrismaClient();

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

    // 1. Adım: Son 30 günde satılan ürün kalemlerini al ve barcode'a göre grupla
    const soldItems: SoldItemGroup[] = await prisma.trendyolOrderItem.groupBy({
      by: ['barcode'], 
      _sum: {
        quantity: true,
      },
      where: {
        barcode: { 
          not: null,
          notIn: [''], 
        },
        order: { 
          userId: userId,
          orderDate: {
            gte: thirtyDaysAgo,
          },
        }
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10, 
    });

    if (soldItems.length === 0) {
        return NextResponse.json([]);
    }

    // 2. Adım: Bulunan barkodlara sahip ürünlerin detaylarını çek
    const barcodes = soldItems.map(item => item.barcode).filter((bc): bc is string => bc !== null); 

    const products: ProductInfo[] = await prisma.product.findMany({
        where: {
            userId: userId,
            barcode: {
                in: barcodes,
            },
        },
        select: {
            id: true,
            title: true,
            barcode: true,
            images: true, 
        },
    });

    // 3. Adım: Satış verisi ile ürün detaylarını birleştir ve null olmayanları al
    const topProductsData: TopProduct[] = soldItems.map((item: SoldItemGroup) => { // item tipi belirtildi
        // item.barcode null olamaz (where koşulu)
        const productDetail = products.find((p: ProductInfo) => p.barcode === item.barcode!); // p tipi belirtildi, ! ile null kontrolü
        if (!productDetail) return null; 

        let imageUrl: string | undefined = undefined;
        try {
             if (productDetail.images && typeof productDetail.images === 'string') {
                 const parsedImages = JSON.parse(productDetail.images);
                 if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                    imageUrl = parsedImages[0]?.url ?? undefined;
                 }
             } else if (Array.isArray(productDetail.images) && productDetail.images.length > 0) {
                 imageUrl = productDetail.images[0]?.url ?? undefined;
             }
        } catch (e) {
            console.warn(`Product image parse error for barcode ${productDetail.barcode}:`, e)
        }

        return {
            productId: productDetail.id,
            productTitle: productDetail.title,
            productBarcode: productDetail.barcode, 
            totalQuantitySold: item._sum.quantity ?? 0,
            productImageUrl: imageUrl,
        };
    }).filter((p): p is TopProduct => p !== null) // p tipi belirtildi
      .sort((a: TopProduct, b: TopProduct) => b.totalQuantitySold - a.totalQuantitySold) // a, b tipleri belirtildi
      .slice(0, 5); 

    return NextResponse.json(topProductsData);

  } catch (error) {
    console.error("Top selling products error:", error);
    return NextResponse.json({ error: 'En çok satan ürünler alınırken bir hata oluştu.' }, { status: 500 });
  }
} 