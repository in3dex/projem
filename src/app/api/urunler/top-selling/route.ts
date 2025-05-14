import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { startOfDay, subDays, endOfDay } from 'date-fns';

// Döndürülecek veri tipi güncellendi
export interface TopSellingProduct {
  productDetail: {
    id: string;
    barcode: string;
    stockCode: string | null;
    images: any; // JSON tipi
    title: string;
  } | null; // Ürün bulunamayabilir
  barcode: string; // Hangi barkod olduğu bilgisi
  totalQuantitySold: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // URL'den limit ve periyot al (varsayılan 5 ürün, 30 gün)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const periodDays = parseInt(searchParams.get('period') || '30', 10);

    if (isNaN(limit) || limit <= 0 || isNaN(periodDays) || periodDays <= 0) {
        return NextResponse.json({ error: 'Geçersiz limit veya periyot değeri' }, { status: 400 });
    }

    // 2. Periyoda göre tarih aralığını belirle
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), periodDays)); 

    // 3. Kullanıcının belirtilen periyottaki sipariş kalemlerini çek
    const orderItems = await db.trendyolOrderItem.findMany({
        where: {
            order: { // TrendyolOrder ile ilişki üzerinden filtrele
                userId: userId,
                orderDate: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            barcode: { // Barkodu null olmayanları al
                not: null
            }
        },
        select: {
            barcode: true,
            quantity: true,
        }
    });

    if (!orderItems || orderItems.length === 0) {
      console.log(`[Top Selling API] User ${userId} için ${periodDays} günlük periyotta sipariş kalemi bulunamadı.`);
      return NextResponse.json([]);
    }

    // 4. Sipariş kalemlerini barkoda göre grupla ve miktarları topla
    const salesDataMap = new Map<string, number>();
    orderItems.forEach(item => {
        if (item.barcode) { // Barkod null değilse işle
            const currentQuantity = salesDataMap.get(item.barcode) || 0;
            salesDataMap.set(item.barcode, currentQuantity + item.quantity);
        }
    });

    // 5. Satış miktarına göre sırala ve limiti uygula
    const sortedSalesData = Array.from(salesDataMap.entries())
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA) // Miktara göre azalan sıralama
        .slice(0, limit); // Limiti uygula

    if (sortedSalesData.length === 0) {
      console.log(`[Top Selling API] User ${userId} için gruplama sonrası veri bulunamadı.`);
      return NextResponse.json([]);
    }
    
    // 6. En çok satan barkodlara ait ürün detaylarını çek
    const topBarcodes = sortedSalesData.map(([barcode]) => barcode);
    const products = await db.product.findMany({
      where: {
        barcode: {
          in: topBarcodes,
        },
        userId: userId 
      },
      select: { 
        id: true,
        barcode: true,
        stockCode: true,
        images: true,
        title: true 
      }
    });

    // 7. Satış Adetleri ile Ürün Detaylarını Birleştir
    const topSellingProducts: TopSellingProduct[] = sortedSalesData.map(([barcode, totalQuantitySold]) => {
      const productDetail = products.find(p => p.barcode === barcode);
      return {
        barcode: barcode,
        totalQuantitySold: totalQuantitySold,
        productDetail: productDetail || null, 
      };
    });

    return NextResponse.json(topSellingProducts);

  } catch (error: unknown) {
    console.error("En çok satan ürünler alınırken hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'En çok satan ürünler alınamadı.', 
        details: message 
    }, { status: 500 });
  }
} 