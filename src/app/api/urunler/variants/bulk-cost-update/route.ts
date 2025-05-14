'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    // Gelen body'nin { barcode: cost | null } formatında bir obje olduğundan emin olalım
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı. Beklenen: { \"barkod\": maliyet, ... }' }, { status: 400 });
    }

    const barcodes = Object.keys(body);
    if (barcodes.length === 0) {
      return NextResponse.json({ error: 'Güncellenecek barkod bulunamadı.' }, { status: 400 });
    }

    let updatedCount = 0;
    const notFoundBarcodes: string[] = [];
    const updatePromises: Promise<any>[] = [];

    // 1. Kullanıcıya ait tüm ürünleri barkodlarıyla birlikte çekelim
    const userProducts = await db.product.findMany({
      where: { 
        userId: userId,
        barcode: { in: barcodes } // Sadece JSON'daki barkodları çek
      },
      select: { id: true, barcode: true } // Sadece ID ve barkod yeterli
    });

    // Hızlı erişim için barkodları bir Map'e alalım
    const productMap = new Map(userProducts.map(p => [p.barcode, p.id]));

    // 2. JSON verisini döngüye alıp güncelleme işlemlerini hazırla
    for (const barcode of barcodes) {
      const costValue = body[barcode];
      const productId = productMap.get(barcode);

      // Maliyet değerini doğrula (sayı veya null olmalı)
      if (typeof costValue !== 'number' && costValue !== null) {
         console.warn(`[BulkCostUpdate] Geçersiz maliyet değeri (${costValue}) for barcode ${barcode}. Atlanıyor.`);
         // İsteğe bağlı olarak bu barkodları da notFoundBarcodes'a ekleyebiliriz
         notFoundBarcodes.push(`${barcode} (Geçersiz Değer)`); 
         continue; // Bu barkodu atla
      }
       
      if (productId) {
        // Ürün bulundu ve kullanıcıya ait, güncelleme promise'ini ekle
        updatePromises.push(
          db.product.update({
            where: { id: productId }, // id üzerinden güncellemek daha güvenli
            data: { costPrice: costValue }, // costPrice alanını güncelle
          })
        );
        updatedCount++; // Başarılı güncelleme sayısını artır (promise başarılı olursa geçerli olacak)
      } else {
        // Ürün bulunamadı veya kullanıcıya ait değil
        notFoundBarcodes.push(barcode);
      }
    }

    // 3. Tüm geçerli güncelleme işlemlerini transaction içinde çalıştır
    if (updatePromises.length > 0) {
        try {
             await db.$transaction(updatePromises);
             // Transaction başarılı olursa updatedCount geçerlidir.
        } catch (transactionError) {
             console.error("[BulkCostUpdate] Transaction hatası:", transactionError);
             // Transaction başarısız olursa, teknik olarak hiçbir ürün güncellenmemiştir.
             // Ancak hangi aşamada hata olduğunu bilmek zor olabilir. 
             // Şimdilik genel bir hata mesajı dönelim.
             updatedCount = 0; // Güncelleme başarısız oldu
             // notFoundBarcodes listesi hala hangi barkodların başta bulunamadığını gösterir.
              return NextResponse.json({ 
                  error: 'Güncelleme işlemi sırasında bir veritabanı hatası oluştu.',
                  details: transactionError instanceof Error ? transactionError.message : String(transactionError),
                  notFoundBarcodes: notFoundBarcodes // Hangi barkodların hiç bulunamadığını belirtelim
              }, { status: 500 });
        }
    }
    
    // 4. Sonucu döndür
    return NextResponse.json({ 
      message: `${updatedCount} ürünün maliyeti başarıyla güncellendi.`, 
      updatedCount: updatedCount,
      notFoundBarcodes: notFoundBarcodes 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/BulkCostUpdate POST] Hata:", error);
    const message = error instanceof Error ? error.message : 'Toplu maliyet güncellenirken bir sunucu hatası oluştu.';
    // JSON parse hatasını yakala
    if (error instanceof SyntaxError) {
       return NextResponse.json({ error: 'Gönderilen JSON formatı bozuk.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 