import { NextRequest, NextResponse } from 'next/server';
// import { fetchTrendyolProductsSample } from '@/lib/services/trendyol-product-service'; // Hatalı import
import { fetchLimitedTrendyolProducts } from '@/lib/services/product-services/trendyol-fetch-service'; // Doğru import
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { db } from '@/lib/db'; // db importu eklendi
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  console.log("Test endpoint'i çağrıldı: /api/test/fetch-trendyol-products");

  try {
    const session = await auth(); // auth() kullanıldı
    if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id; // userId oturumdan alındı

    // 2. Kullanıcının API ayarlarını çek
    const apiSettings = await db.apiSettings.findUnique({ where: { userId } });
    if (!apiSettings) {
        return NextResponse.json({ error: 'Kullanıcı için API ayarları bulunamadı.' }, { status: 400 });
    }

    // 3. Servis fonksiyonunu çağır (Fonksiyon adı ve parametreleri güncellendi)
    // const productData = await fetchTrendyolProductsSample(userId, 1, 5); // Eski çağrı
    const pageLimit = 1; // Örnek için 1 sayfa çekelim
    const result = await fetchLimitedTrendyolProducts(apiSettings, pageLimit);

    // Hataları kontrol et (servis artık hata fırlatmak yerine errors array dönüyor)
    if (result.errors.length > 0) {
      console.error("Ürün çekme sırasında hatalar:", result.errors);
      // İsteğe bağlı olarak ilk hatayı döndürebiliriz veya genel bir mesaj verebiliriz
      return NextResponse.json({ error: "Trendyol'dan ürün çekilirken hatalar oluştu.", details: result.errors }, { status: 500 });
    }

    // 4. Yanıtı işle
    const productData = result.products; // Ürünleri al
    const productsToSave = productData ?? []; // Null ise boş array

    const filePath = path.join(process.cwd(), 'trendyol-sample-products.json');
    await fs.writeFile(filePath, JSON.stringify(productsToSave, null, 2), 'utf8');
    console.log(`Örnek ürün verisi başarıyla şuraya kaydedildi: ${filePath}`);

    return NextResponse.json({ 
      message: `Başarılı! ${productsToSave.length} ürün örneği ${filePath} dosyasına kaydedildi. (${result.totalFetched} ürün çekildi)`, 
      filePath: filePath 
    });

  } catch (error: unknown) {
    console.error("Test endpoint hatası:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Trendyol ürünleri çekilirken veya kaydedilirken bir hata oluştu.', 
        details: message 
    }, { status: 500 });
  }
}
