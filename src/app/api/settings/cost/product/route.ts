import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const productSettings = await db.productCostSetting.findMany({
      where: { userId },
      include: { // İlişkili ürün bilgisini de alalım
        product: {
          select: { id: true, title: true, barcode: true } 
        }
      },
      orderBy: {
        // Ürün adına göre sıralayabiliriz veya updatedAt
        product: { title: 'asc' } 
      },
    });

    return NextResponse.json(productSettings, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/ProductCostSettings GET List] Hata:", error);
    const message = error instanceof Error ? error.message : 'Ürün bazlı ayarlar getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 