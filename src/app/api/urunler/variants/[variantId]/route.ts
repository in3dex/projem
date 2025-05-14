import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const costUpdateSchema = z.object({
  costPrice: z.number().nullable().optional(), // Maliyet fiyatı sayı olmalı, null olabilir veya hiç gönderilmeyebilir
});

export async function PATCH(request: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. İstek gövdesini al ve doğrula
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
    }
    
    const validationResult = costUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validationResult.error.errors }, { status: 400 });
    }

    const { costPrice } = validationResult.data;
    // params objesini await ile bekle
    const resolvedParams = await params; 
    const { variantId } = resolvedParams;

    if (!variantId) {
      return NextResponse.json({ error: 'Varyant ID eksik' }, { status: 400 });
    }

    console.log(`[API/CostUpdate] Kullanıcı: ${userId}, Varyant ID: ${variantId} için maliyet güncelleme isteği:`, costPrice);

    // 3. Varyantın kullanıcıya ait olup olmadığını kontrol et ve güncelle
    let updatedVariant;
    try {
      updatedVariant = await db.productVariant.updateMany({
        where: {
          id: variantId,
          product: {
            userId: userId, // Sadece kendi ürününün varyantını güncelleyebilir
          },
        },
        data: {
          costPrice: costPrice, // costPrice null veya sayı olabilir
        },
      });
      console.log(`[API/CostUpdate] Prisma updateMany sonucu (count):`, updatedVariant.count);
    } catch (prismaError) {
        console.error("[API/CostUpdate] Prisma güncelleme hatası:", prismaError);
        return NextResponse.json({ error: 'Veritabanı güncelleme hatası.', details: (prismaError instanceof Error) ? prismaError.message : String(prismaError) }, { status: 500 });
    }

    if (updatedVariant.count === 0) {
      console.warn(`[API/CostUpdate] Varyant bulunamadı veya yetki yok. Kullanıcı: ${userId}, Varyant ID: ${variantId}`);
      return NextResponse.json({ error: 'Varyant bulunamadı veya güncelleme yetkiniz yok' }, { status: 404 });
    }

    // 4. Başarılı yanıtı döndür
    // Güncellenen varyantın tamamını döndürmeye gerek yok, sadece başarı durumu yeterli
    return NextResponse.json({ success: true, message: 'Maliyet fiyatı güncellendi' }, { status: 200 });

  } catch (error: unknown) {
    console.error("Maliyet güncelleme hatası:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Maliyet güncellenirken bir hata oluştu.', 
        details: message 
    }, { status: 500 });
  }
} 