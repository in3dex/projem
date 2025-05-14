import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

// Ürün bazlı ayar şeması (tüm alanlar opsiyonel ama en az biri olmalı? - Şimdilik hepsi opsiyonel)
const productCostSettingSchema = z.object({
  shippingCost: z.number().nonnegative('Kargo maliyeti negatif olamaz').nullable().optional(),
  additionalCost: z.number().nonnegative('Ek masraf negatif olamaz').nullable().optional(),
  commissionRate: z.number().min(0, 'Komisyon oranı 0\'dan küçük olamaz').max(100, 'Komisyon oranı 100\'den büyük olamaz').nullable().optional(),
  taxRate: z.number().min(0, 'Stopaj oranı 0\'dan küçük olamaz').max(100, 'Stopaj oranı 100\'den büyük olamaz').nullable().optional(),
});

// GET: Belirli bir ürün için ayarı getir
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const productId = params.productId;
    if (!productId) return NextResponse.json({ error: 'Ürün ID eksik' }, { status: 400 });

    const setting = await db.productCostSetting.findUnique({
      where: { 
        userId_productId: { // unique index'i kullan
          userId: userId,
          productId: productId 
        }
      },
    });

    return NextResponse.json(setting, { status: 200 }); // Bulunamazsa null dönecek

  } catch (error: unknown) {
    console.error(`[API/ProductCostSetting/${params.productId} GET] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Ayar getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// POST: Belirli bir ürün için ayar oluştur veya güncelle (Upsert)
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const productId = params.productId;
    if (!productId) return NextResponse.json({ error: 'Ürün ID eksik' }, { status: 400 });

    let data: any;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

    // Veriyi doğrula
    const validationResult = productCostSettingSchema.safeParse(data);
    if (!validationResult.success) {
      const firstErrorMessage = validationResult.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası';
      return NextResponse.json({ error: 'Geçersiz veri', details: firstErrorMessage }, { status: 400 });
    }
    const validatedData = validationResult.data;

    // Ürünün kullanıcıya ait olup olmadığını kontrol et (isteğe bağlı ama önerilir)
    const productExists = await db.product.findFirst({
      where: { id: productId, userId: userId },
      select: { id: true } // Sadece varlığını kontrol et
    });
    if (!productExists) {
        return NextResponse.json({ error: 'Ürün bulunamadı veya bu ürüne erişim yetkiniz yok.' }, { status: 404 });
    }

    // Upsert: Kayıt varsa güncelle, yoksa oluştur
    const upsertedSetting = await db.productCostSetting.upsert({
      where: { 
        userId_productId: {
          userId: userId,
          productId: productId
        }
      },
      update: { // Güncellenecek alanlar
        shippingCost: validatedData.shippingCost,
        additionalCost: validatedData.additionalCost,
        commissionRate: validatedData.commissionRate,
        taxRate: validatedData.taxRate,
      },
      create: { // Yeni oluşturulacak kayıt
        userId: userId,
        productId: productId,
        shippingCost: validatedData.shippingCost,
        additionalCost: validatedData.additionalCost,
        commissionRate: validatedData.commissionRate,
        taxRate: validatedData.taxRate,
      },
    });

    return NextResponse.json({ success: true, message: 'Ürün ayarı başarıyla kaydedildi.', data: upsertedSetting }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/ProductCostSetting/${params.productId} POST] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Ayar kaydedilirken bir hata oluştu.';
    // Prisma'nın benzersiz kısıtlama hatasını yakalayabiliriz (gerçi upsert bunu önlemeli)
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// DELETE: Belirli bir ürün için ayarı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const productId = params.productId;
    if (!productId) return NextResponse.json({ error: 'Ürün ID eksik' }, { status: 400 });

    // Ayarı sil
    await db.productCostSetting.delete({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId
        }
      },
    });

    return NextResponse.json({ success: true, message: 'Ürün ayarı başarıyla silindi.' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/ProductCostSetting/${params.productId} DELETE] Hata:`, error);
    // Kayıt bulunamadı hatasını yakala
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError' && (error as any).code === 'P2025') {
       return NextResponse.json({ error: 'Silinecek ayar bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Ayar silinirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 