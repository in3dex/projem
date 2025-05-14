import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import userService from '@/lib/services/user-service';
import { TrendyolApiClientService, PriceInventoryUpdateItem, TrendyolApiError } from '@/lib/services/trendyol-api-client';
import { Prisma } from '@prisma/client'; 

// Frontend'den gelen her bir fiyat/stok güncelleme verisi için Zod şeması
const priceInventoryUpdateItemSchema = z.object({
  barcode: z.string().min(1, 'Barkod gereklidir'),
  quantity: z.number().int('Stok tam sayı olmalı').min(0, 'Stok negatif olamaz').optional(),
  salePrice: z.number().positive('Satış fiyatı pozitif olmalı').optional(),
  listPrice: z.number().positive('Liste fiyatı pozitif olmalı').optional(),
}).refine(item => item.quantity !== undefined || item.salePrice !== undefined || item.listPrice !== undefined, {
    message: 'Her ürün için en az bir alan (quantity, salePrice, listPrice) güncellenmelidir.',
});

// Ana istek gövdesi şeması
const updatePriceInventorySchema = z.object({
  items: z.array(priceInventoryUpdateItemSchema).min(1, 'Güncellenecek en az bir ürün olmalı'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Kimlik Doğrulama
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });
    const userId = payload.userId;

    // 2. API Ayarlarını Al
    const apiSettings = await db.apiSettings.findUnique({
      where: { userId },
    });
    if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
      return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
    }

    // 3. İstek Gövdesini Al ve Doğrula
    const body = await request.json();
    const validation = updatePriceInventorySchema.safeParse(body);

    if (!validation.success) {
      console.error("Fiyat/Stok güncelleme API validation hatası:", validation.error.errors);
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
    }

    const validatedItems = validation.data.items;

    // 4. Trendyol API İstemcisini Hazırla ve Çağır
    const trendyolClient = new TrendyolApiClientService({
      sellerId: apiSettings.sellerID,
      apiKey: apiSettings.apiKey,
      apiSecret: apiSettings.apiSecret,
    });

    // API'ye gönderilecek item'ları hazırla (Zod tipi PriceInventoryUpdateItem ile uyumlu olmalı)
    const apiItems: PriceInventoryUpdateItem[] = validatedItems.map(item => ({
      barcode: item.barcode,
      // Sadece undefined olmayan değerleri gönder
      ...(item.quantity !== undefined && { quantity: item.quantity }),
      ...(item.salePrice !== undefined && { salePrice: item.salePrice }),
      ...(item.listPrice !== undefined && { listPrice: item.listPrice }),
    }));

    const batchRequestId = await trendyolClient.updatePriceAndInventory(apiItems);

    // 5. Veritabanını Güncelle (Optimistic Update)
    const updatePromises = validatedItems.map(item => {
      const dataToUpdate: Prisma.ProductUpdateArgs['data'] = {};
      if (item.quantity !== undefined) dataToUpdate.quantity = item.quantity;
      if (item.salePrice !== undefined) dataToUpdate.salePrice = item.salePrice;
      if (item.listPrice !== undefined) dataToUpdate.listPrice = item.listPrice;

      if (Object.keys(dataToUpdate).length === 0) {
        return Promise.resolve();
      }

      return db.product.updateMany({
          where: {
            barcode: item.barcode,
            userId: userId
          },
          data: dataToUpdate,
      });
    });

    await Promise.all(updatePromises);
    console.log(`Kullanıcı ${userId} için ${validatedItems.length} ürünün fiyat/stok bilgisi veritabanında güncellendi (optimistic).`);

    // 6. Başarılı Yanıtı Döndür
    return NextResponse.json({
      success: true,
      message: 'Fiyat/stok güncelleme isteği başarıyla Trendyol\'a gönderildi ve veritabanı güncellendi.',
      batchRequestId: batchRequestId,
    });

  } catch (error: unknown) {
    console.error('Fiyat/stok güncelleme API rotasında hata:', error);
    let errorMessage = 'Fiyat/stok güncelleme sırasında bir hata oluştu.';
    let statusCode = 500;
    let errorDetails: any = undefined;

    if (error instanceof TrendyolApiError) {
      errorMessage = `Trendyol API Hatası: ${error.message}`;
      errorDetails = error.details;
      if (error.message.includes("400") || error.message.includes("404")) {
        statusCode = 400;
      }
    } else if (error instanceof z.ZodError) {
       errorMessage = 'Geçersiz veri gönderildi.';
       errorDetails = error.flatten();
       statusCode = 400;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: statusCode });
  }
} 