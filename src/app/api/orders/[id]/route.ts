import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı
    const orderId = params.id;
    
    // Siparişi veritabanından al
    const order = await db.trendyolOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
        shipmentAddress: true,
        invoiceAddress: true,
        statusHistory: {
          orderBy: {
            createdDate: 'desc'
          }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }
    
    // BigInt değerlerini serileştirilebilir formata dönüştür
    const serializedOrder = serializeBigIntAndDates(order);
    
    return NextResponse.json(serializedOrder);
    
  } catch (error: any) {
    console.error('Sipariş detay hatası:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Sipariş detayları alınırken bir hata oluştu',
        message: error.message
      },
      { status: 500 }
    );
  }
} 