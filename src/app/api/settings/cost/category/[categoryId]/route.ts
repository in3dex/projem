import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

// Kategori komisyon şeması
const categoryCommissionSchema = z.object({
  commissionRate: z.number().min(0, 'Komisyon oranı 0\'dan küçük olamaz').max(100, 'Komisyon oranı 100\'den büyük olamaz'),
});

// GET: Belirli bir kategori için komisyonu getir
export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const categoryId = params.categoryId;
    if (!categoryId) return NextResponse.json({ error: 'Kategori ID eksik' }, { status: 400 });

    const commission = await db.categoryCommission.findUnique({
      where: { 
        userId_categoryId: { // unique index'i kullan
          userId: userId,
          categoryId: categoryId 
        }
      },
    });

    return NextResponse.json(commission, { status: 200 }); // Bulunamazsa null dönecek

  } catch (error: unknown) {
    console.error(`[API/CategoryCommission/${params.categoryId} GET] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Komisyon getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// POST: Belirli bir kategori için komisyon oluştur veya güncelle (Upsert)
export async function POST(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const categoryId = params.categoryId;
    if (!categoryId) return NextResponse.json({ error: 'Kategori ID eksik' }, { status: 400 });

    let data: any;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

    // Veriyi doğrula
    const validationResult = categoryCommissionSchema.safeParse(data);
    if (!validationResult.success) {
      const firstErrorMessage = validationResult.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası';
      return NextResponse.json({ error: 'Geçersiz veri', details: firstErrorMessage }, { status: 400 });
    }
    const validatedData = validationResult.data;

    // Kategorinin var olup olmadığını kontrol et (isteğe bağlı)
    const categoryExists = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });
    if (!categoryExists) {
        return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
    }

    // Upsert: Kayıt varsa güncelle, yoksa oluştur
    const upsertedCommission = await db.categoryCommission.upsert({
      where: { 
        userId_categoryId: {
          userId: userId,
          categoryId: categoryId
        }
      },
      update: { // Güncellenecek alanlar
        commissionRate: validatedData.commissionRate,
      },
      create: { // Yeni oluşturulacak kayıt
        userId: userId,
        categoryId: categoryId,
        commissionRate: validatedData.commissionRate,
      },
    });

    return NextResponse.json({ success: true, message: 'Kategori komisyonu başarıyla kaydedildi.', data: upsertedCommission }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/CategoryCommission/${params.categoryId} POST] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Komisyon kaydedilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// DELETE: Belirli bir kategori için komisyonu sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const categoryId = params.categoryId;
    if (!categoryId) return NextResponse.json({ error: 'Kategori ID eksik' }, { status: 400 });

    // Komisyonu sil
    await db.categoryCommission.delete({
      where: {
        userId_categoryId: {
          userId: userId,
          categoryId: categoryId
        }
      },
    });

    return NextResponse.json({ success: true, message: 'Kategori komisyonu başarıyla silindi.' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/CategoryCommission/${params.categoryId} DELETE] Hata:`, error);
    // Kayıt bulunamadı hatasını yakala
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError' && (error as any).code === 'P2025') {
       return NextResponse.json({ error: 'Silinecek komisyon ayarı bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Komisyon silinirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 