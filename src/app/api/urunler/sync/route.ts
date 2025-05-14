import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { fetchAllTrendyolProductsForUser } from '@/lib/services/product-services/trendyol-fetch-service';
import { syncProductsWithDatabase } from '@/lib/services/product-services/database-save-service';
import { db } from '@/lib/db'; // Prisma client import
import { SubscriptionStatus } from '@prisma/client'; // SubscriptionStatus enum import

export async function POST(request: NextRequest) {
  console.log("Ürün senkronizasyon endpoint'i çağrıldı: POST /api/urunler/sync");

  try {
    // 1. Kullanıcı kimliğini doğrula
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // ---------- YENİ: Abonelik Kontrolü Başlangıç ----------
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { status: true } // Sadece durumu kontrol etmek yeterli
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      console.warn(`Kullanıcı ${userId} için aktif abonelik bulunamadı. Ürün senkronizasyonu engellendi.`);
      return NextResponse.json({
        error: 'Aktif Abonelik Gerekli',
        details: 'Bu işlemi gerçekleştirmek için aktif bir aboneliğe sahip olmanız gerekmektedir.'
      }, { status: 402 }); // 402 Payment Required
    }
    // ---------- YENİ: Abonelik Kontrolü Bitiş ----------

    console.log(`Kullanıcı ${userId} için ürün senkronizasyonu başlatıldı (Aktif abonelik mevcut).`);

    // 2. Trendyol'dan TÜM ürünleri çek (hatalı sayfalar dahil)
    const { products: trendyolProducts, failedPages } = await fetchAllTrendyolProductsForUser(userId);
    
    // 3. Veritabanı ile senkronize et
    const syncResult = await syncProductsWithDatabase(userId, trendyolProducts);

    console.log(`Kullanıcı ${userId} için senkronizasyon tamamlandı.`);

    // 4. Sonucu döndür (hatalı sayfaları da ekle)
    return NextResponse.json({
      message: 'Senkronizasyon tamamlandı.',
      details: { 
        ...syncResult, // Mevcut syncResult değerlerini al
        failedPages: failedPages // Hatalı sayfaları ekle
       }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Ürün senkronizasyon hatası:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    // Servislerden fırlatılan hatayı doğrudan detay olarak ekle
    return NextResponse.json({
        error: 'Ürün senkronizasyonu sırasında bir hata oluştu.',
        details: message,
    }, { status: 500 });
  }
} 