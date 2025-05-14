import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { TrendyolApiClientService, ProductUpdateItem, TrendyolApiError } from '@/lib/services/trendyol-api-client';
import { Prisma } from '@prisma/client';

// Frontend'den gelen güncelleme verisi için Zod şeması
const productUpdateSchema = z.object({
    barcode: z.string().min(1, 'Barkod gereklidir'),
    updates: z.object({ // Değişen alanlar objesi
        title: z.string().min(1, 'Ürün başlığı gereklidir').max(100).optional(),
        description: z.string().max(30000).nullish(), // null gönderilebilir
        stockCode: z.string().max(100).nullish(),
        dimensionalWeight: z.number().positive().nullish(),
        vatRate: z.number().min(0).max(100).nullish(),
    }).refine(obj => Object.keys(obj).length > 0, {
        message: "Güncellenecek en az bir alan gönderilmelidir."
    }),
});

export async function PUT(request: NextRequest) {
    try {
        // 1. Kimlik Doğrulama
        const token = getTokenFromCookie(request.headers.get('cookie') || '');
        if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });
        const userId = payload.userId;

        // 2. İstek Gövdesini Al ve Doğrula
        const body = await request.json();
        const validation = productUpdateSchema.safeParse(body);

        if (!validation.success) {
            console.error("Ürün güncelleme API validation hatası:", validation.error.errors);
            return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
        }

        const { barcode, updates } = validation.data;

        // 3. Veritabanından Mevcut Ürün Bilgisini Çek (Trendyol ID'leri için)
        const product = await db.product.findUnique({
            where: {
                barcode: barcode,
                userId: userId
                 // Eğer @@unique([barcode, userId]) tanımlıysa:
                 // barcode_userId: { barcode, userId }
            },
            include: {
                brand: true, // brand.trendyolId için
                category: true, // category.trendyolId için
            }
        });

        if (!product) {
            return NextResponse.json({ error: `Ürün (barkod: ${barcode}) bulunamadı veya yetkiniz yok.` }, { status: 404 });
        }

        if (!product.brand?.trendyolId || !product.category?.trendyolId) {
             return NextResponse.json({ error: `Ürün için Trendyol Marka/Kategori ID bilgisi eksik. Önce senkronizasyonu kontrol edin.` }, { status: 400 });
        }

        // 4. Trendyol API Payload'ını Oluştur
        // Frontend'den gelen güncellemeleri mevcut bilgilerle birleştir
        const trendyolPayloadItem: ProductUpdateItem = {
            barcode: product.barcode,
            title: updates.title ?? product.title, // Güncelleme varsa onu, yoksa mevcut olanı kullan
            productMainId: product.productMainId, // Veritabanından alındı (Güncellenemez)
            brandId: product.brand.trendyolId, // Veritabanından trendyolId (integer) alındı
            categoryId: product.category.trendyolId, // Veritabanından trendyolId (integer) alındı
            stockCode: updates.stockCode !== undefined ? updates.stockCode : product.stockCode,
            dimensionalWeight: updates.dimensionalWeight !== undefined ? updates.dimensionalWeight : product.dimensionalWeight,
            description: updates.description !== undefined ? updates.description : product.description,
            vatRate: updates.vatRate !== undefined ? updates.vatRate : product.vatRate,
            // Diğer zorunlu/opsiyonel alanlar gerekirse eklenebilir (örn: images, attributes)
        };

        // 5. Trendyol API İstemcisini Hazırla ve Çağır
        const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
        if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
            return NextResponse.json({ error: 'Trendyol API ayarları bulunamadı veya eksik.' }, { status: 400 });
        }
        const trendyolClient = new TrendyolApiClientService({
            sellerId: apiSettings.sellerID,
            apiKey: apiSettings.apiKey,
            apiSecret: apiSettings.apiSecret,
        });

        console.log("[API Update] Sending payload to Trendyol:", JSON.stringify({ items: [trendyolPayloadItem] }, null, 2));
        // API endpoint'ini de güncelleyelim (varsa)
        const trendyolUpdateEndpoint = `/integration/product/sellers/${apiSettings.sellerID}/products`;
        // updateProductInfo metodu içinde bu endpoint kullanılıyor mu kontrol edilmeli, 
        // eğer değilse, service içinde de güncellenmeli veya burada doğrudan request kullanılmalı.
        // Şimdilik updateProductInfo metodunun doğru endpoint'i kullandığını varsayıyoruz.
        const batchRequestId = await trendyolClient.updateProductInfo([trendyolPayloadItem]);
        console.log(`[API Update] Trendyol update request sent. Batch ID: ${batchRequestId}`);

        // 6. Veritabanını Güncelle (Trendyol Başarılı Olduktan Sonra)
        const dbUpdateData: Prisma.ProductUpdateArgs['data'] = { ...updates };

        await db.product.update({
            where: { 
                // barcode ve userId ile güncellemek daha güvenli olabilir, 
                // ama product objesini zaten yukarıda çektik ve ID'si var.
                id: product.id 
            }, 
            data: dbUpdateData,
        });
        console.log(`[API Update] Product ${barcode} updated in local database.`);

        // 7. Başarılı Yanıtı Döndür
        return NextResponse.json({
            success: true,
            message: "Ürün bilgileri başarıyla Trendyol'a gönderildi ve veritabanında güncellendi.",
            batchRequestId: batchRequestId,
        });

    } catch (error: unknown) {
        console.error('Ürün güncelleme API rotasında hata:', error);
        let errorMessage = 'Ürün güncelleme sırasında bir hata oluştu.';
        let statusCode = 500;
        let errorDetails: any = undefined;

        if (error instanceof TrendyolApiError) {
            errorMessage = `Trendyol API Hatası: ${error.message}`;
            errorDetails = error.details;
            if (String(error.message).includes("400") || String(error.message).includes("404")) {
                statusCode = 400;
            }
             // Trendyol'dan gelen spesifik hata mesajlarını logla/döndür
             console.error("Trendyol API Error Details:", errorDetails);
             if (errorDetails?.errors?.[0]) {
                 errorMessage = `Trendyol Hatası: ${errorDetails.errors[0].message || errorDetails.errors[0]}`;
             }
        } else if (error instanceof z.ZodError) {
            errorMessage = 'Geçersiz veri gönderildi.';
            errorDetails = error.flatten();
            statusCode = 400;
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
             errorMessage = 'Veritabanı hatası oluştu.';
             console.error("Prisma Error:", error.code, error.message);
             // Belki spesifik kodlara göre mesaj verilebilir (örn: P2025 - Kayıt bulunamadı)
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: statusCode });
    }
} 