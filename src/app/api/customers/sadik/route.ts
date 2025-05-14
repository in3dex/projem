import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. En Çok Sipariş Veren Müşterileri Bul
    const topCustomersData = await db.trendyolOrder.groupBy({
      by: ['customerId'],
      _count: {
        id: true, // Sipariş sayısını say
      },
      orderBy: {
        _count: {
          id: 'desc', // Sipariş sayısına göre çoktan aza sırala
        },
      },
      take: 6, // İlk 6 müşteriyi al
      // where: { customer: { user: { id: userId } } } // Kullanıcı filtresi
    });

    // 3. Müşteri ID'lerini al
    const customerIds = topCustomersData.map(item => item.customerId);

    // 4. Müşteri Detaylarını Çek
    const customers = await db.trendyolCustomer.findMany({
      where: {
        id: {
          in: customerIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        // İhtiyaç halinde diğer alanlar (email vb.) eklenebilir
      },
    });

    // 5. Müşteri Detaylarını Sipariş Sayılarıyla Eşleştir (Düz Yapı)
    const topLoyalCustomers = topCustomersData.map(data => {
      const customerDetails = customers.find(c => c.id === data.customerId);
      return {
        customerId: data.customerId, // customerId eklendi (frontend'de key için lazım)
        firstName: customerDetails?.firstName || 'Bilinmeyen', // Null kontrolü
        lastName: customerDetails?.lastName || 'Müşteri', // Null kontrolü
        orderCount: data._count.id,
      };
    }).sort((a, b) => b.orderCount - a.orderCount); // Sıralama kalsın

    return NextResponse.json(topLoyalCustomers); // Düz listeyi döndür

  } catch (error: unknown) {
    console.error('Sadık müşteriler alınırken hata:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Sadık müşteriler alınamadı.', 
        message: message 
    }, { status: 500 });
  }
} 