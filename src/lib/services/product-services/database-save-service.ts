import { db } from '@/lib/db';
import { Prisma, LimitType } from '@prisma/client';
import { checkLimit, getCurrentProductCount, LimitError } from '@/lib/limits';

// API'den gelen ürün tipi (fetch servisinden kopyalandı)
// TODO: Merkezi bir yere taşı
interface TrendyolApiProduct {
  barcode: string; 
  title: string;
  description?: string | null;
  productMainId: string;
  brandId: number;
  brand: string;
  categoryId?: number;
  pimCategoryId?: number;
  categoryName: string;
  quantity: number;
  stockCode: string | null;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  images: { url: string }[];
  attributes: { attributeId: number; attributeName?: string; attributeValue?: string; attributeValueId?: number; customAttributeValue?: string }[];
  id: string; // Trendyol listing ID
  productContentId?: number;
  approved: boolean;
  archived: boolean;
  locked: boolean;
  onSale: boolean;
  rejected: boolean;
  blacklisted: boolean;
  hasActiveCampaign?: boolean;
  createDateTime: number;
  lastUpdateDate: number;
  productUrl?: string;
  dimensionalWeight?: number;
  stockUnitType?: string;
  rejectReasonDetails?: any[];
  hasHtmlContent?: boolean;
  platformListingId?: string;
  productCode?: number;
}

// Hata formatı (opsiyonel, eğer merkezi bir hata tipiniz yoksa)
interface ProcessingError {
  barcode?: string | null;
  error: string;
}

// Kaydetme sonucu tipi
interface SaveResult {
  productsUpserted: number;
  brandsCreated: number;
  categoriesCreated: number;
  errors: ProcessingError[];
}

/**
 * Çekilen Trendyol ürünlerini veritabanına kaydeder.
 * Önce mevcut ürünleri siler, sonra her ürünü upsert eder.
 * @param userId İşlemi yapan kullanıcının ID'si.
 * @param products Kaydedilecek ürün listesi.
 * @returns Kaydetme işleminin özeti.
 */
export async function saveProductsToDatabase(
    userId: string, 
    products: TrendyolApiProduct[]
): Promise<SaveResult> {
  const result: SaveResult = {
    productsUpserted: 0,
    brandsCreated: 0,
    categoriesCreated: 0,
    errors: [],
  };

  // Mevcut marka ve kategorileri önbelleğe al
  const existingBrandsMap = await db.brand.findMany({ select: { trendyolId: true, id: true } });
  const existingBrands = new Map(existingBrandsMap.map(b => [b.trendyolId, b.id]));

  const existingCategoriesMap = await db.category.findMany({ select: { trendyolId: true, id: true } });
  const existingCategories = new Map(existingCategoriesMap.map(c => [c.trendyolId, c.id]));

  // --- Limit Kontrolü Başlangıç ---
  let currentProductCount = await getCurrentProductCount(userId);
  // --- Limit Kontrolü Bitiş ---

  console.log(`[SaveProducts] Kullanıcı ${userId} için başlangıç ürün sayısı: ${currentProductCount}`);

  for (const item of products) {
     if (!item.barcode) {
      console.warn(`[SaveProducts] - Barkodsuz öğe atlandı: ${item.title} (Trendyol ID: ${item.id})`);
      result.errors.push({ barcode: 'YOK', error: 'Barkod eksik, ürün işlenemedi.' });
      continue;
    }
    
    try {
      // Marka ve Kategori işlemleri (önceki kod gibi)
      let brandId = existingBrands.get(item.brandId);
      if (!brandId) {
        const newBrand = await db.brand.create({
          data: { trendyolId: item.brandId, name: item.brand },
        });
        brandId = newBrand.id;
        existingBrands.set(item.brandId, brandId);
        result.brandsCreated++;
      }

      // 4. Kategoriyi Bul veya Oluştur
      const trendyolCategoryId = item.pimCategoryId ?? item.categoryId;
      if (!trendyolCategoryId) {
        throw new Error(`Kategori ID (pimCategoryId veya categoryId) bulunamadı.`);
      }
      let categoryId = existingCategories.get(trendyolCategoryId);
      if (!categoryId) {
        const newCategory = await db.category.create({
          data: { trendyolId: trendyolCategoryId, name: item.categoryName },
        });
        categoryId = newCategory.id;
        existingCategories.set(trendyolCategoryId, categoryId);
        result.categoriesCreated++;
      }

      // Ürün verisini hazırla (önceki kod gibi)
      const productData: any = {
        userId: userId,
        brandId: brandId,
        categoryId: categoryId,
        trendyolId: item.id,
        productMainId: item.productMainId,
        trendyolContentId: item.productContentId,
        barcode: item.barcode,
        stockCode: item.stockCode,
        platformListingId: item.platformListingId,
        productCode: item.productCode,
        title: item.title,
        description: item.description || null,
        listPrice: item.listPrice,
        salePrice: item.salePrice,
        quantity: item.quantity,
        vatRate: item.vatRate,
        dimensionalWeight: item.dimensionalWeight,
        stockUnitType: item.stockUnitType,
        productUrl: item.productUrl || null,
        hasHtmlContent: item.hasHtmlContent || false,
        approved: item.approved,
        archived: item.archived,
        locked: item.locked,
        onSale: item.onSale,
        rejected: item.rejected,
        blacklisted: item.blacklisted,
        hasActiveCampaign: item.hasActiveCampaign,
        images: item.images as Prisma.InputJsonValue,
        attributes: item.attributes as Prisma.InputJsonValue,
        rejectReasonDetails: item.rejectReasonDetails as Prisma.InputJsonValue | undefined,
        trendyolCreateDateTime: item.createDateTime ? new Date(item.createDateTime) : null,
        trendyolLastUpdateDate: item.lastUpdateDate ? new Date(item.lastUpdateDate) : null,
      };
      
      // Veritabanında ürünü ara
      const existingProduct = await db.product.findUnique({
        where: { trendyolId: item.id },
      });

      if (existingProduct) {
        // Ürün varsa güncelle
        await db.product.update({
          where: { id: existingProduct.id },
          data: productData,
        });
        result.productsUpserted++;
      } else {
        // --- Limit Kontrolü ---
        try {
            // DEBUG: LimitType ve PRODUCT_COUNT değerlerini logla
            console.log('[DEBUG] LimitType:', LimitType);
            console.log('[DEBUG] LimitType.PRODUCT_COUNT:', LimitType?.PRODUCT_COUNT);

            // Not: currentProductCount, döngü başında DB'den alınan sayıdır.
            // Eğer bu sync işlemi sırasında çok sayıda yeni ürün ekleniyorsa,
            // her create sonrası currentProductCount'u artırmak daha doğru olur.
            await checkLimit(userId, LimitType.PRODUCT_COUNT, currentProductCount);
        } catch (limitError) {
            if (limitError instanceof LimitError) {
                console.warn(`[SaveProducts] Kullanıcı ${userId} için ürün limiti aşıldı (Ürün: ${item.barcode}). İşlem atlanıyor.`);
                result.errors.push({ barcode: item.barcode, error: limitError.message });
                continue; // Bu ürünü atla, döngüye devam et
            } else {
                // Beklenmedik başka bir hata varsa tekrar fırlat
                throw limitError;
            }
        }
        // --- Limit Kontrolü Bitiş ---

        // Ürün yoksa ve limit aşılmadıysa oluştur
        await db.product.create({
          data: productData as Prisma.ProductCreateInput,
        });
        currentProductCount++; // Başarıyla oluşturulduysa sayacı artır
      result.productsUpserted++;
        console.log(`[SaveProducts] Kullanıcı ${userId} için ürün oluşturuldu. Yeni sayı: ${currentProductCount}`);
      }

    } catch (error: any) {
      console.error(`[SaveProducts] Ürün işlenirken hata (Barkod: ${item.barcode}):`, error);
      result.errors.push({ barcode: item.barcode, error: error.message || 'Bilinmeyen bir hata oluştu.' });
    }
  }

  console.log(`[SaveProducts] İşlem tamamlandı. Upsert: ${result.productsUpserted}, Hata: ${result.errors.length}`);
  return result;
}

// --- product-sync-service.ts'den taşınan kod BAŞLANGIÇ ---

// Trendyol API'sinden gelen ürün tipi (Her öğe artık bir Product)
interface TrendyolApiProduct {
  barcode: string; // Unique identifier for upsert
  title: string;
  description?: string | null;
  productMainId: string; // Keep for reference
  brandId: number;
  brand: string;
  categoryId?: number;
  pimCategoryId?: number;
  categoryName: string;
  quantity: number;
  stockCode: string | null;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  images: { url: string }[];
  attributes: { attributeId: number; attributeName?: string; attributeValue?: string; attributeValueId?: number; customAttributeValue?: string }[];
  id: string; // Trendyol listing ID
  productContentId?: number; // Made optional as per schema
  approved: boolean;
  archived: boolean;
  locked: boolean;
  onSale: boolean;
  rejected: boolean;
  blacklisted: boolean;
  hasActiveCampaign?: boolean;
  createDateTime: number;
  lastUpdateDate: number;
  productUrl?: string;
  dimensionalWeight?: number;
  stockUnitType?: string;
  rejectReasonDetails?: any[];
  hasHtmlContent?: boolean;
  platformListingId?: string;
  productCode?: number;
  // costPrice will be handled separately
}

// Senkronizasyon sonucu tipi güncellendi
interface SyncResult {
  productsUpserted: number;
  productsDeleted: number;
  brandsCreated: number;
  categoriesCreated: number;
  errors: ProcessingError[];
}

/**
 * Trendyol'dan çekilen ürün verilerini veritabanı ile senkronize eder.
 * Önce mevcut ürünleri siler, sonra her Trendyol ürününü ayrı bir Product olarak oluşturur/günceller.
 * Marka ve Kategori kayıtlarını bulur veya oluşturur.
 * @param userId Senkronizasyonu yapan kullanıcının ID'si.
 * @param trendyolProducts Trendyol API'sinden çekilen ham ürün verileri.
 * @returns Senkronizasyon işleminin özeti.
 */
export async function syncProductsWithDatabase(userId: string, trendyolProducts: TrendyolApiProduct[]): Promise<SyncResult> {
  const result: SyncResult = {
    productsUpserted: 0,
    productsDeleted: 0,
    brandsCreated: 0,
    categoriesCreated: 0,
    errors: [],
  };

  // Mevcut veritabanı ürünlerini, marka ve kategorileri al
  const dbProductsMap = new Map((await db.product.findMany({ where: { userId }, select: { id: true, trendyolId: true }})).map(p => [p.trendyolId, p.id]));
  const trendyolProductIds = new Set(trendyolProducts.map(p => p.id));

  const existingBrandsMap = await db.brand.findMany({ select: { trendyolId: true, id: true } });
  const existingBrands = new Map(existingBrandsMap.map(b => [b.trendyolId, b.id]));

  const existingCategoriesMap = await db.category.findMany({ select: { trendyolId: true, id: true } });
  const existingCategories = new Map(existingCategoriesMap.map(c => [c.trendyolId, c.id]));

  // --- Limit Kontrolü Başlangıç ---
  let currentProductCount = dbProductsMap.size; // Başlangıç sayısını mevcut DB'den alalım
  // Veya daha güvenli: currentProductCount = await getCurrentProductCount(userId);
  // --- Limit Kontrolü Bitiş ---
  console.log(`[SyncProducts] Kullanıcı ${userId} için başlangıç ürün sayısı: ${currentProductCount}`);

  const BATCH_SIZE_FOR_DELAY = 50;
  const DELAY_MS = 15;
  let processedCount = 0;

  console.log('[SyncProducts] Trendyol ürünleri veritabanına işleniyor...');
  for (const item of trendyolProducts) {
     if (!item.barcode) {
      console.warn(`[SyncProducts] Barkodsuz öğe atlandı: ${item.title} (Trendyol ID: ${item.id})`);
      result.errors.push({ barcode: 'YOK', error: 'Barkod eksik, ürün işlenemedi.' });
      continue;
    }

    processedCount++;
    if (processedCount % BATCH_SIZE_FOR_DELAY === 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    try {
      // Marka ve Kategori işlemleri (önceki kod gibi)
      let brandId = existingBrands.get(item.brandId);
      if (!brandId) {
        const newBrand = await db.brand.create({
          data: {
            trendyolId: item.brandId,
            name: item.brand,
          },
        });
        brandId = newBrand.id;
        existingBrands.set(item.brandId, brandId);
        result.brandsCreated++;
      }

      // 4. Kategoriyi Bul veya Oluştur
      const trendyolCategoryId = item.pimCategoryId ?? item.categoryId;
      if (!trendyolCategoryId) {
        throw new Error(`Kategori ID (pimCategoryId veya categoryId) bulunamadı.`);
      }
      let categoryId = existingCategories.get(trendyolCategoryId);
      if (!categoryId) {
        const newCategory = await db.category.create({
          data: {
            trendyolId: trendyolCategoryId,
            name: item.categoryName,
          },
        });
        categoryId = newCategory.id;
        existingCategories.set(trendyolCategoryId, categoryId);
        result.categoriesCreated++;
      }

      // Ürün verisini hazırla (önceki kod gibi)
      const productData: any = {
        userId: userId,
        brandId: brandId,
        categoryId: categoryId,
        trendyolId: item.id,
        productMainId: item.productMainId,
        trendyolContentId: item.productContentId,
        barcode: item.barcode,
        stockCode: item.stockCode,
        platformListingId: item.platformListingId,
        productCode: item.productCode,
        title: item.title,
        description: item.description || null,
        listPrice: item.listPrice,
        salePrice: item.salePrice,
        quantity: item.quantity,
        vatRate: item.vatRate,
        dimensionalWeight: item.dimensionalWeight,
        stockUnitType: item.stockUnitType,
        productUrl: item.productUrl || null,
        hasHtmlContent: item.hasHtmlContent || false,
        approved: item.approved,
        archived: item.archived,
        locked: item.locked,
        onSale: item.onSale,
        rejected: item.rejected,
        blacklisted: item.blacklisted,
        hasActiveCampaign: item.hasActiveCampaign,
        images: item.images as Prisma.InputJsonValue,
        attributes: item.attributes as Prisma.InputJsonValue,
        rejectReasonDetails: item.rejectReasonDetails as Prisma.InputJsonValue | undefined,
        trendyolCreateDateTime: item.createDateTime ? new Date(item.createDateTime) : null,
        trendyolLastUpdateDate: item.lastUpdateDate ? new Date(item.lastUpdateDate) : null,
      };

      // Veritabanında ürünü trendyolId ile ara
      const existingProductId = dbProductsMap.get(item.id);

      if (existingProductId) {
        // Ürün varsa güncelle
        await db.product.update({
          where: { id: existingProductId },
          data: productData,
        });
        result.productsUpserted++;
      } else {
        // --- Limit Kontrolü ---
        try {
            // DEBUG: LimitType ve PRODUCT_COUNT değerlerini logla
            console.log('[DEBUG] LimitType:', LimitType);
            console.log('[DEBUG] LimitType.PRODUCT_COUNT:', LimitType?.PRODUCT_COUNT);

            // Not: currentProductCount, döngü başında DB'den alınan sayıdır.
            // Eğer bu sync işlemi sırasında çok sayıda yeni ürün ekleniyorsa,
            // her create sonrası currentProductCount'u artırmak daha doğru olur.
            await checkLimit(userId, LimitType.PRODUCT_COUNT, currentProductCount);
        } catch (limitError) {
            if (limitError instanceof LimitError) {
                // Limit hatası durumunda uyarı ver ve döngüyü sonlandır
                console.warn(`[SyncProducts] Kullanıcı ${userId} için ürün limiti (${(limitError as any).limit ?? 'bilinmiyor'}) aşıldı. Senkronizasyon bu kullanıcı için durduruluyor. (Hatanın tetiklendiği ürün: ${item.barcode})`);
                result.errors.push({ barcode: item.barcode, error: limitError.message });
                break; // Döngüyü sonlandır, sonraki ürünlere geçme
            } else {
                // Beklenmedik başka bir hata varsa, onu fırlat
                throw limitError;
            }
        }
        // --- Limit Kontrolü Bitiş ---

        // Ürün yoksa ve limit aşılmadıysa oluştur
        await db.product.create({
          data: productData as Prisma.ProductCreateInput,
        });
        currentProductCount++; // Yeni ürün eklendi, sayacı artır
        result.productsUpserted++;
        console.log(`[SyncProducts] Kullanıcı ${userId} için ürün oluşturuldu. Yeni sayı: ${currentProductCount}`);
      }

    } catch (error: any) {
      console.error(`[SyncProducts] Ürün işlenirken hata (Barkod: ${item.barcode}):`, error);
      result.errors.push({ barcode: item.barcode, error: error.message || 'Bilinmeyen bir hata oluştu.' });
    }
  }

  // Trendyol listesinde olmayan ama veritabanında olan ürünleri bul ve sil (veya işaretle)
  const productsToDelete = [];
  for (const [trendyolId, dbId] of dbProductsMap.entries()) {
    if (!trendyolProductIds.has(trendyolId)) {
      productsToDelete.push(dbId);
    }
  }

  if (productsToDelete.length > 0) {
    console.log(`[SyncProducts] Veritabanından ${productsToDelete.length} ürün siliniyor...`);
    // Dikkat: Bu işlem geri alınamaz. Silmek yerine 'isActive: false' yapmak daha güvenli olabilir.
    const deleteResult = await db.product.deleteMany({
      where: {
        id: { in: productsToDelete },
        userId: userId, // Güvenlik için userId kontrolü ekleyelim
      },
    });
    result.productsDeleted = deleteResult.count;
    console.log(`[SyncProducts] ${result.productsDeleted} ürün silindi.`);
  }

  console.log(`[SyncProducts] İşlem tamamlandı. Upsert: ${result.productsUpserted}, Silinen: ${result.productsDeleted}, Hata: ${result.errors.length}`);
  return result;
}
// --- product-sync-service.ts'den taşınan kod BİTİŞ --- 