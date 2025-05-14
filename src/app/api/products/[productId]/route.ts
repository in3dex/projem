import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { TrendyolApiClientService, ProductUpdateItem, TrendyolApiError, PriceInventoryUpdateItem } from '@/lib/services/trendyol-api-client';
import { Prisma } from '@prisma/client';

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

    const resolvedParams = await params;
    const { productId } = resolvedParams;

    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }
    
    console.log(`[API/Products GET] Ürün aranıyor - ProductId: ${productId}, UserId: ${userId}`);

    // Önce findUnique ile deneyelim
    let product = await db.product.findUnique({
      where: {
        id: productId,
        userId: userId, // Kullanıcının sadece kendi ürünlerini alabilmesini sağla
      },
      include: {
        brand: true, // Marka bilgilerini dahil et
        category: true, // Kategori bilgilerini dahil et
        generalCostSetting: true, // Genel maliyet ayarlarını dahil et
      },
    });

    // Bulunamadıysa findFirst ile deneyelim (daha esnek bir sorgu)
    if (!product) {
      console.log(`[API/Products GET] Ürün findUnique ile bulunamadı, findFirst deneniyor - ProductId: ${productId}`);
      product = await db.product.findFirst({
        where: {
          id: productId,
          userId: userId,
        },
        include: {
          brand: true,
          category: true,
          generalCostSetting: true,
        },
      });
    }

    // Hala bulunamadıysa, muhtemel daha derin bir sorun var
    if (!product) {
      console.log(`[API/Products GET] Ürün bulunamadı - ProductId: ${productId}`);
      
      // Veritabanındaki tüm ürünleri kontrol et (örnek ilk 5 ürün)
      const existingProducts = await db.product.findMany({ 
        where: { userId },
        take: 5,
        select: { id: true, title: true }
      });
      
      console.log(`[API/Products GET] Kullanıcının mevcut ürünleri:`, existingProducts);
      
      return NextResponse.json({ error: 'Ürün bulunamadı veya yetkiniz yok', debug: `Sorgu parametreleri - ProductId: ${productId}, UserId: ${userId}` }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/Products GET ProductId: ${params?.productId ?? 'bilinmiyor'}] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Ürün bilgileri getirilirken bir hata oluştu.';
    // 404 hatası dönebilen Prisma hatalarını yakala (örn: findUnique bulamazsa)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const resolvedParams = await params;
    const { productId } = resolvedParams;
    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const body = await request.json();
    const dataToUpdate = body as Partial<Prisma.ProductUpdateInput>;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan bulunamadı' }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: productId, userId: userId },
      include: { brand: true, category: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Güncellenecek ürün bulunamadı veya yetkiniz yok' }, { status: 404 });
    }
    if (!product.brand || !product.category) {
        console.error(`[API/Products PATCH ProductId: ${productId}] Marka veya kategori bilgisi eksik.`);
        return NextResponse.json({ error: 'Ürünün marka veya kategori bilgisi eksik, Trendyol güncellemesi yapılamaz.' }, { status: 400 });
    }
     if (!product.barcode) {
         console.error(`[API/Products PATCH ProductId: ${productId}] Barkod bilgisi eksik.`);
         return NextResponse.json({ error: 'Ürünün barkod bilgisi eksik, Trendyol güncellemesi yapılamaz.' }, { status: 400 });
     }
      if (!product.productMainId) {
         console.error(`[API/Products PATCH ProductId: ${productId}] ProductMainId bilgisi eksik.`);
         return NextResponse.json({ error: 'Ürünün ProductMainId bilgisi eksik, Trendyol güncellemesi yapılamaz.' }, { status: 400 });
     }

    const updatedProduct = await db.product.update({
      where: {
        id: productId,
      },
      data: dataToUpdate,
      include: { brand: true, category: true },
    });
    console.log(`[API/Products PATCH ProductId: ${productId}] Veritabanı güncellendi.`);

    let trendyolBatchRequestId: string | null = null;
    let trendyolMessage = '';

    const infoFieldsChanged = ['title', 'description', 'stockCode', 'dimensionalWeight', 'vatRate'].some(field => field in dataToUpdate);
    const priceInventoryFieldsChanged = ['quantity', 'salePrice', 'listPrice'].some(field => field in dataToUpdate);

    if (infoFieldsChanged || priceInventoryFieldsChanged) {
       const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
       if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
           console.warn(`[API/Products PATCH ProductId: ${productId}] Trendyol API ayarları bulunamadı veya eksik. Sadece veritabanı güncellendi.`);
           trendyolMessage = 'Trendyol API ayarları eksik, sadece yerel veritabanı güncellendi.';
       } else {
            const trendyolClient = new TrendyolApiClientService({
                sellerId: apiSettings.sellerID,
                apiKey: apiSettings.apiKey,
                apiSecret: apiSettings.apiSecret,
            });

            try {
                if (infoFieldsChanged) {
                    const infoPayloadItem: ProductUpdateItem = {
                        barcode: updatedProduct.barcode!,
                        productMainId: updatedProduct.productMainId!,
                        brandId: updatedProduct.brand.trendyolId,
                        categoryId: updatedProduct.category.trendyolId,
                        title: dataToUpdate.title !== undefined ? String(dataToUpdate.title) : updatedProduct.title,
                        description: dataToUpdate.description !== undefined ? String(dataToUpdate.description ?? '') : (updatedProduct.description ?? ''),
                        stockCode: dataToUpdate.stockCode !== undefined ? String(dataToUpdate.stockCode ?? '') : (updatedProduct.stockCode ?? undefined),
                        dimensionalWeight: dataToUpdate.dimensionalWeight !== undefined ? Number(dataToUpdate.dimensionalWeight ?? 0) : (updatedProduct.dimensionalWeight ?? undefined),
                        vatRate: dataToUpdate.vatRate !== undefined ? Number(dataToUpdate.vatRate ?? 0) : (updatedProduct.vatRate ?? undefined),
                    };
                    console.log(`[API/Products PATCH ProductId: ${productId}] Sending ProductInfo update to Trendyol:`, JSON.stringify({ items: [infoPayloadItem] }, null, 2));
                    const infoBatchId = await trendyolClient.updateProductInfo([infoPayloadItem]);
                    trendyolBatchRequestId = infoBatchId;
                    trendyolMessage += `Trendyol ürün bilgileri güncelleme isteği gönderildi (Batch ID: ${infoBatchId}). `;
                    console.log(`[API/Products PATCH ProductId: ${productId}] Trendyol ProductInfo update sent. Batch ID: ${infoBatchId}`);
                }

                if (priceInventoryFieldsChanged) {
                    const pricePayloadItem: PriceInventoryUpdateItem = {
                        barcode: updatedProduct.barcode!,
                        ...(dataToUpdate.quantity !== undefined && { quantity: Number(dataToUpdate.quantity ?? 0) }),
                        ...(dataToUpdate.salePrice !== undefined && { salePrice: Number(dataToUpdate.salePrice ?? 0) }),
                        ...(dataToUpdate.listPrice !== undefined && { listPrice: Number(dataToUpdate.listPrice ?? 0) }),
                    };

                    if (Object.keys(pricePayloadItem).length > 1) {
                         console.log(`[API/Products PATCH ProductId: ${productId}] Sending PriceInventory update to Trendyol:`, JSON.stringify({ items: [pricePayloadItem] }, null, 2));
                        const priceBatchId = await trendyolClient.updatePriceAndInventory([pricePayloadItem]);
                        trendyolBatchRequestId = priceBatchId;
                        trendyolMessage += `Trendyol fiyat/stok güncelleme isteği gönderildi (Batch ID: ${priceBatchId}).`;
                         console.log(`[API/Products PATCH ProductId: ${productId}] Trendyol PriceInventory update sent. Batch ID: ${priceBatchId}`);
                    }
                }

            } catch (trendyolError: unknown) {
                console.error(`[API/Products PATCH ProductId: ${productId}] Trendyol API Hatası:`, trendyolError);
                const errorMessage = trendyolError instanceof TrendyolApiError
                    ? trendyolError.message
                    : (trendyolError instanceof Error ? trendyolError.message : 'Bilinmeyen bir Trendyol API hatası oluştu.');

                trendyolMessage = `Yerel veritabanı güncellendi ANCAK Trendyol güncellemesi başarısız oldu: ${errorMessage}`;
                
                return NextResponse.json({
                    message: `Veritabanı güncellendi. ${trendyolMessage}`,
                    product: updatedProduct,
                    trendyolBatchRequestId: null,
                    trendyolError: errorMessage
                }, { status: 200 });
            }
       }
    } else {
         trendyolMessage = "Trendyol\'a gönderilecek bir değişiklik bulunmadı.";
         console.log(`[API/Products PATCH ProductId: ${productId}] Sadece veritabanı güncellendi, Trendyol'a gönderilecek alan değişmedi.`);
    }

    return NextResponse.json({
      message: `Ürün başarıyla güncellendi. ${trendyolMessage}`.trim(),
      product: updatedProduct,
      trendyolBatchRequestId: trendyolBatchRequestId
    }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/Products PATCH ProductId: ${params?.productId ?? 'bilinmiyor'}] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Ürün güncellenirken bir hata oluştu.';
    
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'Güncellenecek ürün bulunamadı veya yetkiniz yok' }, { status: 404 });
    }
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
         return NextResponse.json({ error: 'Benzersiz alan ihlali', details: (error as any).meta?.target }, { status: 409 });
    }

    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

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

    const resolvedParams = await params;
    const { productId } = resolvedParams;
    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    await db.product.delete({
      where: {
        id: productId,
        userId: userId,
      },
    });

    return NextResponse.json({ message: 'Ürün başarıyla silindi' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API/Products DELETE ProductId: ${params?.productId ?? 'bilinmiyor'}] Hata:`, error);
    const message = error instanceof Error ? error.message : 'Ürün silinirken bir hata oluştu.';

    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'Silinecek ürün bulunamadı veya yetkiniz yok' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 