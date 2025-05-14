import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt'; // Auth helper'ları import et (yol doğruysa)
import { z } from 'zod';
import { shippingCostsData } from '@/lib/shipping-costs'; // Geçerli kargo firmalarını almak için

// Geçerli kargo firması isimlerini al
const validCarrierNames = shippingCostsData.map(c => c.name);

// Yeni Barem kuralı için doğrulama şeması
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


// GET: Kullanıcının Barem kurallarını getir
export async function GET(request: NextRequest) {
  try {
    // Token doğrulama ve userId alma (General ayarlarındaki gibi)
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const baremRules = await db.baremPrice.findMany({
      where: { userId },
      orderBy: [ // Mantıklı bir sıralama ekleyelim
        { carrierName: 'asc' },
        { minOrderValue: 'asc' },
        { maxDesi: 'asc' },
      ],
    });

    return NextResponse.json(baremRules, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/Barem GET] Hata:", error);
    const message = error instanceof Error ? error.message : 'Barem kuralları getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// POST: Yeni Barem kuralı ekle
export async function POST(request: NextRequest) {
  try {
    // Token doğrulama ve userId alma
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    let data: any;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

     // Gelen veriyi doğrula (Temizlemeye gerek yok, Zod halleder)
    const validationResult = baremPriceSchema.safeParse(data);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => {
        const fieldName = err.path.join('.') || 'Genel'; 
        return `${fieldName}: ${err.message}`;
      });
      console.error("[API/Barem POST] Doğrulama Hatası:", validationResult.error.errors);
      const firstErrorMessage = validationResult.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası';
      return NextResponse.json({ 
          error: 'Geçersiz veri', 
          details: firstErrorMessage,
          allErrors: errorMessages
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Veritabanına ekle
    const newBaremRule = await db.baremPrice.create({
      data: {
        userId: userId, // Token'dan gelen doğrulanmış kullanıcı ID'si
        carrierName: validatedData.carrierName,
        minOrderValue: validatedData.minOrderValue,
        maxOrderValue: validatedData.maxOrderValue,
        maxDesi: validatedData.maxDesi, // Zod zaten nullable kontrolünü yaptı
        priceExclVat: validatedData.priceExclVat,
      },
    });

    console.log(`[API/Barem POST] Kullanıcı ${userId} için yeni barem kuralı eklendi: ${newBaremRule.id}`);
    return NextResponse.json({ success: true, message: 'Barem kuralı başarıyla eklendi.', data: newBaremRule }, { status: 201 }); // 201 Created

  } catch (error: unknown) {
    console.error("[API/Barem POST] Hata:", error);
    // Prisma unique constraint hatasını yakalama (örn: aynı aralık/desi/firma ile tekrar ekleme?)
    // Gerekirse burada daha detaylı hata yönetimi yapılabilir.
    const message = error instanceof Error ? error.message : 'Barem kuralı eklenirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// TODO: PUT ve DELETE metotları eklenecek (muhtemelen [baremId] dinamik rotasında) 