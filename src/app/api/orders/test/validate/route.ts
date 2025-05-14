import { NextRequest, NextResponse } from 'next/server';
// import { verifyToken, getTokenFromCookie } from '@/lib/auth/jwt'; // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db';
import { TrendyolOrderService } from '@/lib/services/trendyol-order-service';
import { OrderItem } from '@/types/order';
import { z } from 'zod';

// Veritabanındaki sipariş bilgilerini API'den gelen yanıtla karşılaştır
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı
    
    // Test için belirtilen kullanıcı ID'sini kontrol et
    if (userId !== 'cm9k957xf0000vaibqs9sl6zi') {
      return NextResponse.json(
        { error: 'Bu doğrulama endpointi sadece test kullanıcısı tarafından kullanılabilir' },
        { status: 403 }
      );
    }
    
    // API ayarlarını veritabanından al
    const settings = await db.apiSettings.findFirst({
      where: { userId }
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: 'API ayarları bulunamadı' },
        { status: 404 }
      );
    }

    // URL'den sipariş numarasını al
    const searchParams = request.nextUrl.searchParams;
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Sipariş numarası belirtilmelidir' },
        { status: 400 }
      );
    }

    // API'den sipariş bilgilerini al
    const apiOrder = await TrendyolOrderService.getOrderByOrderNumber(settings, orderNumber);
    
    if (!apiOrder) {
      return NextResponse.json(
        { error: 'API\'den sipariş bilgileri alınamadı' },
        { status: 404 }
      );
    }

    // Veritabanından aynı sipariş bilgilerini al
    const dbOrder = await db.siparisler.findFirst({
      where: {
        userId,
        orderNumber: orderNumber
      },
      include: {
        items: true,
        customer: {
          include: {
            address: true
          }
        },
        statusHistory: true
      }
    });

    if (!dbOrder) {
      return NextResponse.json(
        { error: 'Veritabanında bu sipariş bulunamadı' },
        { status: 404 }
      );
    }

    // Karşılaştırma yapılacak alanları belirle
    const comparison = {
      orderMatch: {
        orderNumber: apiOrder.orderNumber === dbOrder.orderNumber,
        status: apiOrder.status === dbOrder.status,
        totalPrice: apiOrder.totalPrice === dbOrder.totalPrice,
        cargoTrackingNumber: apiOrder.cargoTrackingNumber === dbOrder.cargoTrackingNumber,
        cargoTrackingLink: apiOrder.cargoTrackingLink === dbOrder.cargoTrackingLink
      },
      itemsMatch: {
        count: apiOrder.orderItems?.length === dbOrder.items.length,
        details: apiOrder.orderItems?.map((apiItem: any) => {
          const dbItem = dbOrder.items.find((item: any) => item.lineItemId === apiItem.lineItemId);
          return {
            lineItemId: apiItem.lineItemId,
            found: !!dbItem,
            matches: dbItem ? {
              productName: apiItem.productName === dbItem.productName,
              quantity: apiItem.quantity === dbItem.quantity,
              price: apiItem.price === dbItem.price
            } : null
          };
        })
      },
      customerMatch: {
        name: apiOrder.customerFirstName === dbOrder.customer?.firstName && 
              apiOrder.customerLastName === dbOrder.customer?.lastName,
        email: apiOrder.customerEmail === dbOrder.customer?.email,
        phone: apiOrder.customerPhone === dbOrder.customer?.phone
      }
    };

    // Tüm alanlarda eşleşme olup olmadığını kontrol et
    const allMatches = Object.values(comparison.orderMatch).every(match => match) &&
                       comparison.itemsMatch.count &&
                       comparison.itemsMatch.details?.every((item: any) => item.found && 
                         Object.values(item.matches || {}).every(match => match)) &&
                       Object.values(comparison.customerMatch).every(match => match);

    return NextResponse.json({
      success: true,
      orderNumber,
      allMatch: allMatches,
      comparison,
      apiOrder,
      dbOrder
    });
    
  } catch (error: any) {
    console.error('Doğrulama API hatası:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Doğrulama sırasında bir hata oluştu: ${error.message || error}`
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth(); // auth() kullanıldı
        if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        }
        const userId = session.user.id; // userId oturumdan alındı

        // ... (rest of the function using userId) ...

    } catch (error) {
        // ... (error handling) ...
    }
} 