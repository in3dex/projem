import axios, { AxiosError } from 'axios';
import { Buffer } from 'buffer';
import { ApiSettings, PrismaClient } from '@prisma/client';
import { db } from '@/lib/db'; // db importu eklendi
import { TrendyolApiClientService } from '@/lib/services/trendyol-api-client'; // API Client importu eklendi

// API'den gelen ürün tipi (product-sync-service'ten kopyalandı)
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

// Trendyol API yanıt tipi (fetchLimitedTrendyolProducts ve fetchAllTrendyolProductsForUser için ortak)
interface TrendyolProductApiResponse {
  content: TrendyolApiProduct[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// fetchLimitedTrendyolProducts için sonuç tipi
interface FetchResult {
  products: TrendyolApiProduct[];
  totalFetched: number;
  errors: string[];
}

// fetchAllTrendyolProductsForUser için sonuç tipi (hatalı sayfaları da içerecek şekilde)
interface FetchAllResult {
  products: TrendyolApiProduct[];
  failedPages: number[];
}

const PAGE_SIZE = 50; // Sayfa başına ürün sayısı
const TRENDYOL_API_BASE_URL_PROD = 'https://api.trendyol.com/sapigw';
const TRENDYOL_API_PAGE_SIZE = 50; // fetchAll için de kullanalım

/**
 * Trendyol API'sinden belirtilen sayfa limitine kadar ürün verisi çeker.
 * @param apiSettings Kullanıcının API ayarları (sellerID, apiKey, apiSecret içerir).
 * @param pageLimit Çekilecek maksimum sayfa sayısı.
 * @returns Çekilen ürünlerin listesi, toplam çekilen ürün sayısı ve hatalar.
 */
export async function fetchLimitedTrendyolProducts(
  apiSettings: ApiSettings,
  pageLimit: number = 20 // Varsayılan olarak 20 sayfa
): Promise<FetchResult> {
  if (!apiSettings || !apiSettings.sellerID || !apiSettings.apiKey || !apiSettings.apiSecret) {
    throw new Error('Trendyol API kimlik bilgileri eksik veya geçersiz.');
  }

  const allProducts: TrendyolApiProduct[] = [];
  const errors: string[] = [];
  let currentPage = 0;
  let totalPages = 1; 

  // Kimlik Doğrulama Başlıklarını Hazırla
  const credentialsBuffer = Buffer.from(`${apiSettings.apiKey}:${apiSettings.apiSecret}`).toString('base64');
  const authHeader = `Basic ${credentialsBuffer}`;
  const userAgent = `SellerID=${apiSettings.sellerID} - SelfIntegration`; // sellerID modeldeki gibi büyük D
  const headers = {
      'User-Agent': userAgent,
      'Authorization': authHeader,
      'Content-Type': 'application/json'
  };

  console.log(`Test: Trendyol'dan ürün çekme başlatıldı. Satıcı ID: ${apiSettings.sellerID}, Sayfa Limiti: ${pageLimit}`);

  try {
    while (currentPage < totalPages && currentPage < pageLimit) {
      const pageToFetch = currentPage;
      console.log(` - Sayfa ${pageToFetch + 1} çekiliyor... (Limit: ${pageLimit})`);
      const apiUrl = `${TRENDYOL_API_BASE_URL_PROD}/suppliers/${apiSettings.sellerID}/products`;
      const params = {
          page: pageToFetch,
          size: PAGE_SIZE,
          approved: true // Sadece onaylıları çekelim
      };

      try {
          const response = await axios.get<TrendyolProductApiResponse>(apiUrl, {
              headers: headers,
              params: params,
              timeout: 15000 // 15 saniye timeout
          });

          if (response.data && response.data.content) {
              allProducts.push(...response.data.content);
              totalPages = response.data.totalPages ?? totalPages;
          } else {
              const errorMsg = `Sayfa ${pageToFetch + 1} çekilemedi veya boş içerik döndü. Yanıt: ${JSON.stringify(response.data)}`;
              console.warn(errorMsg);
              errors.push(errorMsg);
              // Bu sayfada hata olsa bile diğerlerine devam edebilir veya durabiliriz.
              // Şimdilik devam edelim ama loglayalım.
          }
      } catch (pageError: any) {
          let errorMsg = `Sayfa ${pageToFetch + 1} çekilirken hata oluştu: `;
          if (axios.isAxiosError(pageError)) {
            errorMsg += ` ${pageError.response?.status || 'No Status'} - ${pageError.message}`;
            console.error(errorMsg, pageError.response?.data);
            errors.push(`${errorMsg} - Data: ${JSON.stringify(pageError.response?.data)}`);
          } else {
             errorMsg += pageError.message;
             console.error(errorMsg, pageError);
             errors.push(errorMsg);
          }
         // Hata durumunda döngüden çıkmak daha güvenli olabilir.
         break; 
      }
      currentPage++;
    }

    console.log(`Test: Toplam ${allProducts.length} ürün başarıyla Trendyol'dan çekildi (${currentPage} sayfa denendi).`);

  } catch (error: any) {
    console.error("Test: Trendyol ürünleri çekilirken genel hata:", error);
    errors.push(`Genel API hatası: ${error.message}`);
  }

  return {
    products: allProducts,
    totalFetched: allProducts.length,
    errors,
  };
}

// --- YENİ FONKSİYON: fetchAllTrendyolProductsForUser --- 
/**
 * Kullanıcının TÜM Trendyol ürünlerini çeker.
 * @param userId Kullanıcının ID'si.
 * @returns Çekilen ürünlerin listesi ve çekilemeyen sayfaların numaraları.
 */
export async function fetchAllTrendyolProductsForUser(userId: string): Promise<FetchAllResult> {
  let allProducts: TrendyolApiProduct[] = [];
  const failedPages: number[] = [];
  let currentPage = 0;
  let totalPages = 1;

  console.log(`Kullanıcı ${userId} için tüm Trendyol ürünleri çekiliyor...`);

  const integration = await db.apiSettings.findUnique({ where: { userId: userId } });
  if (!integration || !integration.sellerID || !integration.apiKey || !integration.apiSecret) {
    throw new Error('Kullanıcı için Trendyol API entegrasyon bilgileri bulunamadı veya eksik.');
  }
  const credentials = {
    sellerId: integration.sellerID,
    apiKey: integration.apiKey,
    apiSecret: integration.apiSecret,
  };
  const apiClient = new TrendyolApiClientService(credentials);

  try {
    do {
      const pageToFetch = currentPage;
      const params = {
        page: currentPage,
        size: TRENDYOL_API_PAGE_SIZE,
        approved: true,
      };

      console.log(` - Sayfa ${currentPage + 1} çekiliyor...`);
      
      try {
        // --- LINTER DÜZELTME: Parametreleri string'e çevir --- 
        // URLSearchParams için değerleri string yap
        const stringParams: Record<string, string> = {};
        for (const key in params) {
            stringParams[key] = String((params as any)[key]);
        }
        const queryParams = new URLSearchParams(stringParams).toString();
        const endpoint = `/suppliers/${integration.sellerID}/products?${queryParams}`;
        
        const response = await apiClient.request<TrendyolProductApiResponse>(endpoint, 'GET');

        if (response && response.content) {
          allProducts = allProducts.concat(response.content);
          totalPages = response.totalPages; 
        } else {
          console.warn(`Sayfa ${currentPage + 1} için ürün verisi alınamadı veya boş.`);
          failedPages.push(currentPage);
        }
      } catch (pageError: any) {
        console.error(`Trendyol ürünleri çekilirken hata oluştu (Kullanıcı: ${userId}, Sayfa: ${pageToFetch + 1}):`, pageError.message || pageError);
        if (pageError.response?.data) {
            console.error("Trendyol API Hata Detayı:", pageError.response.data);
        }
        failedPages.push(pageToFetch);
      }
      
      currentPage++;

      console.log(`   -> Sayfa ${currentPage} işlendi. Toplam ürün: ${allProducts.length}. Kalan sayfalar: ${totalPages - currentPage}. Hatalı sayfalar: ${failedPages.length}`);

    } while (currentPage < totalPages);

    console.log(`Toplam ${allProducts.length} ürün Trendyol'dan çekildi (Kullanıcı: ${userId}). ${failedPages.length} sayfa çekilemedi.`);

    // ---------- YENİ: onSale durumuna göre sıralama ----------
    allProducts.sort((a, b) => {
      // onSale true olanları başa al (true = 1, false = 0 gibi düşünerek b'den a'yı çıkar)
      return (b.onSale ? 1 : 0) - (a.onSale ? 1 : 0);
    });
    console.log(` - Ürünler 'onSale' durumuna göre sıralandı.`);
    // ---------- Sıralama Bitiş ----------

    return { products: allProducts, failedPages: failedPages };

  } catch (error: any) {
    console.error(`Trendyol ürünleri çekilirken genel bir hata oluştu (Kullanıcı: ${userId}):`, error.message || error);
    throw new Error(`Trendyol ürünleri çekilemedi. Genel Hata: ${error.message}`);
  }
} 