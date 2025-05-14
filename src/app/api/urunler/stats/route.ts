import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Kullanıcıya ait tüm varyantları çek (Sadece gerekli alanları)
    // Performans için tüm varyantları çekmek yerine count kullanmak daha iyi
    // const userVariants = await db.productVariant.findMany({
    //   where: { product: { userId: userId } },
    //   select: { 
    //     approved: true, 
    //     onSale: true, 
    //     archived: true, 
    //     rejected: true, 
    //     blacklisted: true, 
    //     quantity: true 
    //   }
    // });

    // 3. İstatistikleri ve Sekme Sayılarını Hesapla (Prisma count ile - Product modeli kullanılarak)
    
    // Genel İstatistikler
    const totalProducts = await db.product.count({ 
      where: { userId: userId }
    });
    const onSaleCount = await db.product.count({ 
      where: { userId: userId, onSale: true }
    });
    const notApprovedCount = await db.product.count({ 
      where: { userId: userId, approved: false }
    });
    const outOfStockCount = await db.product.count({ 
      where: { userId: userId, quantity: 0 }
    });

    // Sekme Sayıları (Tab Counts)
    const approvedNotOnSaleCount = await db.product.count({
      where: { userId: userId, approved: true, onSale: false }
    });
     const archivedCount = await db.product.count({
      where: { userId: userId, archived: true }
    });
    const rejectedCount = await db.product.count({
      where: { userId: userId, rejected: true }
    });
    const blacklistedCount = await db.product.count({
       where: { userId: userId, blacklisted: true }
    });

    // Yeni Kart İstatistikleri
    // Potansiyel Ciro için tüm ürünleri çekip hesaplayalım (performans sorunu olabilir)
    const productsForRevenue = await db.product.findMany({
      where: { userId: userId },
      select: { salePrice: true, quantity: true }
    });
    const potentialRevenue = productsForRevenue.reduce((sum: number, p) => sum + (p.salePrice * p.quantity), 0);

    const lowStockCount = await db.product.count({
      where: { userId: userId, quantity: { gt: 0, lt: 10 } } // 1-9 arası stok
    });

    const noSkuCount = await db.product.count({
      where: { userId: userId, stockCode: null }
    });

    const stats = {
      // Kart İstatistikleri
      totalProducts: totalProducts,
      onSaleProducts: onSaleCount,
      notApprovedProducts: notApprovedCount,
      outOfStockProducts: outOfStockCount,
      potentialRevenue: potentialRevenue,
      lowStockProducts: lowStockCount,
      noSkuProducts: noSkuCount,
      // Sekme Sayıları (Product bazında)
      tabCounts: {
        onSale: onSaleCount,
        approved: approvedNotOnSaleCount,
        notApproved: notApprovedCount,
        archived: archivedCount,
        rejected: rejectedCount,
        blacklisted: blacklistedCount,
        all: totalProducts
      }
    };

    return NextResponse.json(stats);

  } catch (error: unknown) {
    console.error("Ürün istatistikleri alınırken hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Ürün istatistikleri alınamadı.', 
        details: message 
    }, { status: 500 });
  }
} 