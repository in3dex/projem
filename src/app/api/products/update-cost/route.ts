import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';

// Gelen istek gövdesi için Zod şeması
const updateCostSchema = z.object({
  barcode: z.string().min(1, 'Barkod gereklidir'),
  costPrice: z.number().min(0, 'Maliyet negatif olamaz'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Kimlik Doğrulama
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });
    const userId = payload.userId; // Token'dan kullanıcı ID'sini al

    // 2. İstek Gövdesini Al
    const body = await request.json();

    // --- YENİ: Gelen isteği logla --- 
    console.log("[/api/products/update-cost] Gelen İstek Gövdesi:", JSON.stringify(body, null, 2));

    // Doğrulama yap
    const validation = updateCostSchema.safeParse(body);

    if (!validation.success) {
      // --- YENİ: Başarısız doğrulamayı da logla --- 
      console.error("[/api/products/update-cost] Zod Doğrulama Hatası:", validation.error.flatten());
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
    }

    const { barcode, costPrice } = validation.data;

    // 3. Veritabanında Ürünü Güncelle
    // Product modeli üzerinden barkod ile ürünü bul ve maliyeti güncelle
    const updatedProduct = await db.product.updateMany({
      where: {
        barcode: barcode,
        userId: userId, // Güvenlik: Sadece kendi ürününü güncelleyebilsin
      },
      data: {
        costPrice: costPrice,
      },
    });

    if (updatedProduct.count === 0) {
        return NextResponse.json({ error: 'Ürün bulunamadı veya güncelleme yetkiniz yok.' }, { status: 404 });
    }

    // 4. Başarılı Yanıtı Döndür
    return NextResponse.json({ success: true, message: 'Maliyet başarıyla güncellendi.' });

  } catch (error: unknown) {
    console.error('Maliyet güncelleme hatası:', error);
    let errorMessage = 'Maliyet güncellenirken bir hata oluştu.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 