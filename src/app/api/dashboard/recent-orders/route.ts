import { NextResponse } from 'next/server';
import { TrendyolOrder, TrendyolCustomer } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/auth'; // Auth.js (Next Auth v5) import

// Frontend'deki arayüzle eşleşen tip
interface RecentOrder {
  id: string;
  orderNumber: string;
  customerFullName: string; 
  totalPrice: number;
  status: string;
  orderDate: string; 
}

// Prisma sorgusunun döndüreceği tip (ilişkiyle birlikte)
type OrderWithCustomer = TrendyolOrder & {
  customer: Pick<TrendyolCustomer, 'firstName' | 'lastName'> | null;
}

export async function GET() {
  const session = await auth(); // Auth.js ile session alma

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const orders: OrderWithCustomer[] = await prisma.trendyolOrder.findMany({
      where: {
        userId: userId,
      },
      take: 5, // Son 5 sipariş
      orderBy: {
        orderDate: 'desc', // Tarihe göre azalan sıralama
      },
      include: {
        customer: { // Müşteri adını almak için
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Veriyi frontend formatına dönüştür
    const recentOrders: RecentOrder[] = orders.map((order: OrderWithCustomer) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      // Müşteri adı varsa birleştir, yoksa varsayılan bir değer ata
      customerFullName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'Müşteri Adı Yok' : 'Bilinmeyen Müşteri',
      totalPrice: order.totalPrice,
      status: order.status,
      orderDate: order.orderDate.toISOString(), // Tarihi ISO string olarak gönder
    }));

    // Frontend'deki API yanıtı { content: [...] } şeklinde bekleniyordu. 
    // Sadece recentOrders dizisini döndürüyoruz. Frontend'i güncelleyeceğiz.
    return NextResponse.json(recentOrders); 

  } catch (error) {
    console.error("Recent orders error:", error);
    return NextResponse.json({ error: 'Son siparişler alınırken bir hata oluştu.' }, { status: 500 });
  }
} 