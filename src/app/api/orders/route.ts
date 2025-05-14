import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client'; // OrderBy tipi için

/**
 * BigInt ve tarih değerlerini serileştirmek için yardımcı fonksiyon
 * Trendyol API notuna göre orderDate GMT+3 olarak gelir
 */
function serializeBigIntAndDates(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return data.toString();
  }
  
  // Tarih nesnesi ise ISO string'e çevir
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeBigIntAndDates(item));
  }
  
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      result[key] = serializeBigIntAndDates(data[key]);
    }
    return result;
  }
  
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı
    
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    // 'limit' varsa 'size' yerine onu kullan, yoksa 'size' veya varsayılan 10
    const limitParam = searchParams.get('limit');
    const sizeParam = searchParams.get('size');
    const take = limitParam ? parseInt(limitParam) : (sizeParam ? parseInt(sizeParam) : 10);
    const skip = page * take; // Skip hesaplaması take'e göre güncellendi

    const status = searchParams.get('status') || undefined;
    const orderNumber = searchParams.get('orderNumber') || undefined;
    const invoiceStatus = searchParams.get('invoiceStatus') || 'all';
    const startDateParam = searchParams.get('startDate'); // Tarih parametreleri
    const endDateParam = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'orderDate'; // Varsayılan sıralama
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // Varsayılan sıralama yönü
    
    // Filtreleme koşullarını oluştur (userId zaten alındı)
    const where: Prisma.TrendyolOrderWhereInput = { 
        userId: userId, // userId doğrudan kullanılıyor
    };
    
    if (status && status !== 'all') { // 'all' durumu filtreyi atlar
      where.status = status;
    }
    
    if (orderNumber) {
      where.orderNumber = {
        contains: orderNumber,
      };
    }

    // Fatura durumuna göre filtre ekle
    if (invoiceStatus === 'uploaded') {
      where.invoiceLink = { not: null };
    } else if (invoiceStatus === 'notUploaded') {
      where.invoiceLink = null;
    }

    // Tarih aralığı filtresi
    if (startDateParam || endDateParam) {
        // where.orderDate objesini güvenli bir şekilde oluştur/güncelle
        const dateFilter: Prisma.DateTimeFilter = {}; 
    if (startDateParam) {
        try {
                 const startDate = new Date(parseInt(startDateParam));
                 if (!isNaN(startDate.getTime())) { // Geçerli tarih mi kontrolü
                    dateFilter.gte = startDate;
                 } else {
                    console.warn("Geçersiz başlangıç tarihi timestamp formatı:", startDateParam);
                 }
            } catch (e) { console.warn("Başlangıç tarihi parse hatası:", startDateParam, e); }
    }
    if (endDateParam) {
        try {
                 const endDate = new Date(parseInt(endDateParam));
                 if (!isNaN(endDate.getTime())) { // Geçerli tarih mi kontrolü
                    dateFilter.lte = endDate;
                 } else {
                    console.warn("Geçersiz bitiş tarihi timestamp formatı:", endDateParam);
                 }
            } catch (e) { console.warn("Bitiş tarihi parse hatası:", endDateParam, e); }
        }
        // Eğer gte veya lte tanımlanmışsa where.orderDate'i ata
        if (Object.keys(dateFilter).length > 0) {
            where.orderDate = dateFilter;
        }
    }

    // Sıralama koşulunu oluştur
    const orderBy: Prisma.TrendyolOrderOrderByWithRelationInput = {};
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
        // Güvenlik için sadece belirli alanlara göre sıralamaya izin verilebilir
        if (['orderDate', 'totalPrice', 'status'].includes(sortBy)) {
           orderBy[sortBy as keyof Prisma.TrendyolOrderOrderByWithRelationInput] = sortOrder;
        } else {
            orderBy['orderDate'] = 'desc'; // Geçersiz alan ise varsayılana dön
        }
    } else {
         orderBy['orderDate'] = 'desc'; // Varsayılan
    }
    
    console.log("[API /orders] Applying WHERE clause:", JSON.stringify(where, null, 2)); // Debug: WHERE clause'u logla
    
    // Siparişleri veritabanından çek
    const [orders, total] = await Promise.all([
      db.trendyolOrder.findMany({
        where, // userId içeren filtre
        orderBy,
        skip,
        take,
        include: {
          customer: {
             select: { firstName: true, lastName: true, email: true } // Sadece gerekli alanlar
          },
          items: {
             select: { productName: true, quantity: true, price: true, barcode: true } // Sadece gerekli alanlar
          },
          shipmentAddress: {
             select: { city: true, district: true } // Sadece gerekli alanlar
          },
          // statusHistory ve shipmentPackages tüm liste için gereksiz olabilir, kaldırılabilir
          // statusHistory: {
          //   orderBy: {
          //     createdDate: 'desc'
          //   }
          // },
          shipmentPackages: {
            select: {
              id: true,
              trendyolPackageId: true,
              status: true
            }
          }
        }
      }),
      db.trendyolOrder.count({ where }) // userId içeren filtre
    ]);
    
    // Duruma göre sipariş sayılarını hesapla
    const statusCounts = await db.trendyolOrder.groupBy({
      by: ['status'],
      where: { userId: userId }, // userId filtresi eklendi
      _count: {
        status: true
      }
    });
    
    // Status sayılarını da serileştir ve tüm olası statüleri ekle
    const tümStatuler = [
      "Awaiting", "Created", "Picking", "Invoiced", 
      "Shipped", "AtCollectionPoint", "Cancelled", 
      "UnPacked", "Delivered", "UnDelivered", "UnDeliveredAndReturned"
    ];
    
    const serializedStatusCounts = tümStatuler.reduce((acc, statu) => {
      acc[statu] = 0; // Başlangıçta tüm statüleri 0 olarak ayarla
      return acc;
    }, {} as Record<string, number>);
    
    // Veritabanından gelen sayımları ekle
    statusCounts.forEach(stat => {
      if (stat.status) {
        serializedStatusCounts[stat.status] = stat._count.status;
      }
    });
    
    // BigInt değerlerini serileştirilebilir formata dönüştür
    const serializedOrders = serializeBigIntAndDates(orders);
    
    // Dashboard widget çağrısı için log ekle
    if (request.nextUrl.searchParams.has('limit')) {
        console.log("[API /siparisler - Widget Call] Returning orders:", JSON.stringify(serializedOrders, null, 2));
    }

    // Response oluştur
    return NextResponse.json({
      content: serializedOrders,
      totalElements: total,
      totalPages: Math.ceil(total / take),
      size: take, // Dönen size parametresi 'take' olmalı
      page,
      statusCounts: serializedStatusCounts
    });
    
  } catch (error: any) {
    console.error('Siparişler getirme hatası:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Siparişler alınırken bir hata oluştu',
        message: error.message
      },
      { status: 500 }
    );
  }
} 