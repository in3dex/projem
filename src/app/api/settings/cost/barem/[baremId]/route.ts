import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';
import { shippingCostsData } from '@/lib/shipping-costs';

// Geçerli kargo firması isimlerini al (POST rotasındaki ile aynı)
const validCarrierNames = shippingCostsData.map(c => c.name);

// Barem kuralı güncelleme/oluşturma için doğrulama şeması (POST rotasındaki ile aynı)
const baremPriceSchema = z.object({
  carrierName: z.string().refine(val => validCarrierNames.includes(val), {
    message: "Geçersiz kargo firması adı",
  }),
  minOrderValue: z.number().nonnegative('Minimum sipariş değeri negatif olamaz'),
  maxOrderValue: z.number().positive('Maksimum sipariş değeri pozitif olmalı'),
  maxDesi: z.number().nonnegative('Maksimum desi negatif olamaz').nullable(),
  priceExclVat: z.number().nonnegative('Fiyat negatif olamaz'),
}).refine(data => data.maxOrderValue > data.minOrderValue, {
  message: "Maksimum sipariş değeri, minimum değerden büyük olmalıdır.",
  path: ["maxOrderValue"],
});

// Helper function to get user ID from token
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = getTokenFromCookie(request.headers.get('cookie') || '');
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload?.userId ? String(payload.userId) : null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

// PUT: Belirli bir barem kuralını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { baremId: string } }
) {
  const { baremId } = params;
  if (!baremId) {
    return NextResponse.json({ error: 'Barem kuralı ID eksik.' }, { status: 400 });
  }

  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli veya geçersiz.' }, { status: 401 });
    }

    let data: any;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

    // Gelen veriyi doğrula
    const validationResult = baremPriceSchema.safeParse(data);
    if (!validationResult.success) {
      const firstErrorMessage = validationResult.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası';
      console.error(`[API/Barem PUT/${baremId}] Doğrulama Hatası:`, validationResult.error.errors);
      return NextResponse.json({ error: 'Geçersiz veri', details: firstErrorMessage }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Kuralı güncelle (hem ID hem de userId ile eşleşmeli)
    const updatedBaremRule = await db.baremPrice.update({
      where: {
        id: baremId,
        userId: userId, // Kullanıcının sadece kendi kuralını güncelleyebilmesini sağla
      },
      data: {
        // Sadece valide edilmiş alanları güncelle
        carrierName: validatedData.carrierName,
        minOrderValue: validatedData.minOrderValue,
        maxOrderValue: validatedData.maxOrderValue,
        maxDesi: validatedData.maxDesi,
        priceExclVat: validatedData.priceExclVat,
      },
    });

    console.log(`[API/Barem PUT] Kullanıcı ${userId} için barem kuralı ${baremId} güncellendi.`);
    return NextResponse.json({ success: true, message: 'Barem kuralı başarıyla güncellendi.', data: updatedBaremRule }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/Barem PUT/${baremId}] Hata:`, error);
     // Prisma'nın `RecordNotFound` hatasını yakalayabiliriz (update için)
     // Tip kontrolü yaparak 'code' özelliğine güvenli erişim
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError' && typeof (error as any).code !== 'undefined' && (error as any).code === 'P2025') {
       return NextResponse.json({ error: 'Güncellenecek kayıt bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Barem kuralı güncellenirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}


// DELETE: Belirli bir barem kuralını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { baremId: string } }
) {
  const { baremId } = params;
  if (!baremId) {
    return NextResponse.json({ error: 'Barem kuralı ID eksik.' }, { status: 400 });
  }

  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli veya geçersiz.' }, { status: 401 });
    }

    // Kuralı sil (hem ID hem de userId ile eşleşmeli)
    await db.baremPrice.delete({
      where: {
        id: baremId,
        userId: userId, // Kullanıcının sadece kendi kuralını sildiğinden emin ol
      },
    });

    console.log(`[API/Barem DELETE] Kullanıcı ${userId} için barem kuralı ${baremId} silindi.`);
    return NextResponse.json({ success: true, message: 'Barem kuralı başarıyla silindi.' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/Barem DELETE/${baremId}] Hata:`, error);
    // Prisma'nın `RecordNotFound` hatasını yakalayabiliriz (delete için)
    // Tip kontrolü yaparak 'code' özelliğine güvenli erişim
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError' && typeof (error as any).code !== 'undefined' && (error as any).code === 'P2025') {
       return NextResponse.json({ error: 'Silinecek kayıt bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Barem kuralı silinirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 