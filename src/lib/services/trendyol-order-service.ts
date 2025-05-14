// import type { ApiSettings } from '@/lib/db';
import { TrendyolApiClientService, TrendyolApiError } from '@/lib/services/trendyol-api-client';

export interface TrendyolOrderServiceOptions {
  status?: string;
  startDate?: number;
  endDate?: number;
  size?: number;
  orderNumbers?: string[];
}

// API'den gelen sipariş yanıtı için genel bir tip (ihtiyaç olursa genişletilebilir)
interface TrendyolOrderApiResponse {
  content: any[]; // Siparişlerin olduğu dizi, tipi daha detaylı olabilir
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class TrendyolOrderService {
  static async fetchOrdersFromTrendyol(settings: any, options: TrendyolOrderServiceOptions = {}) {
    const {
      status,
      startDate,
      endDate,
      size = 50,
      orderNumbers
    } = options;
    const supplierId = settings.sellerID || settings.supplierId;
    const apiKey = settings.apiKey;
    const apiSecret = settings.apiSecret;
    if (!supplierId || !apiKey || !apiSecret) throw new Error('Eksik Trendyol API ayarları');

    // Temel URL
    let url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/orders?size=${size}`;
    if (status) url += `&status=${status}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    url += `&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;

    // Auth
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': `${supplierId} - SelfIntegration`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trendyol API hatası: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  static async fetchAllTrendyolOrdersForSync(
    apiClient: TrendyolApiClientService, 
    options: {
      startDate?: number; // Timestamp ms
      endDate?: number;   // Timestamp ms
      status?: string;
      initialSize?: number;
    } = {}
  ): Promise<{ orders: any[]; totalElements: number; totalPages: number }> {
    let currentPage = 0;
    let totalPages = 1;
    const allOrders: any[] = [];
    const size = options.initialSize || 50; // Varsayılan sayfa boyutu
    let totalElements = 0;

    const startDate = options.startDate || (Date.now() - 90 * 24 * 60 * 60 * 1000); // Varsayılan son 90 gün
    const endDate = options.endDate || Date.now();

    console.log(`[fetchAllTrendyolOrdersForSync] Siparişler çekiliyor: ${new Date(startDate).toISOString()} - ${new Date(endDate).toISOString()}`);

    try {
      do {
        const params: Record<string, string | number | undefined> = {
          page: currentPage,
          size: size,
          startDate: startDate,
          endDate: endDate,
          status: options.status,
          orderByField: 'PackageLastModifiedDate',
          orderByDirection: 'DESC'
        };

        const queryParams = new URLSearchParams();
        for (const key in params) {
          if (params.hasOwnProperty(key) && params[key] !== undefined) {
            queryParams.append(key, String(params[key]));
          }
        }
        // sellerId apiClient'dan geldiği için endpoint'e eklenmiyor, apiClient bunu kendi hallediyor.
        const endpoint = `/integration/order/sellers/${apiClient.getSellerId()}/orders?${queryParams.toString()}`;
        
        console.log(` - Sayfa ${currentPage + 1} çekiliyor... Endpoint: ${endpoint}`);
        const response = await apiClient.request<TrendyolOrderApiResponse>(endpoint, 'GET');

        if (response && response.content) {
          allOrders.push(...response.content);
          totalPages = response.totalPages;
          totalElements = response.totalElements;
          if (currentPage === 0) { // İlk yanıttan toplam sayfa sayısını al
             console.log(`   -> Toplam ${totalElements} sipariş, ${totalPages} sayfa bulundu.`);
          }
        } else {
          console.warn(`Sayfa ${currentPage + 1} için sipariş verisi alınamadı veya boş.`);
          // Bir sayfada hata olsa bile devam et, belki diğerleri gelir.
          // Eğer API hatası TrendyolApiError ise, bu zaten yukarıda yakalanacaktır.
          if (currentPage > 0 && (!response || !response.content || response.content.length === 0)) {
            // Sonraki sayfalarda içerik yoksa ve hata da yoksa muhtemelen son sayfa
            console.log('   -> Muhtemelen son sayfa, döngüden çıkılıyor.');
            break;
          }
        }
        currentPage++;
      } while (currentPage < totalPages);

      console.log(`[fetchAllTrendyolOrdersForSync] Toplam ${allOrders.length} sipariş başarıyla çekildi.`);
      return { orders: allOrders, totalElements, totalPages };

    } catch (error) {
      console.error('[fetchAllTrendyolOrdersForSync] Siparişler çekilirken hata oluştu:', error);
      if (error instanceof TrendyolApiError) {
        console.error('   -> Trendyol API Hatası Detayları:', error.details);
      }
      // Hata durumunda boş bir array veya hata objesi döndürülebilir.
      // Şimdilik hatayı yukarı fırlatıyoruz, çağıran taraf yönetsin.
      throw error;
    }
  }

  // Son 15 günlük siparişler
  static async getRecentOrders(settings: any) {
    const now = Date.now();
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
    return this.fetchOrdersFromTrendyol(settings, { startDate: fifteenDaysAgo, endDate: now });
  }

  // Son 90 güne kadar tüm siparişler (sayfalama ile çekilmeli, burada örnek olarak ilk 200 sipariş)
  static async getAllOrdersWithinLimits(settings: any) {
    const now = Date.now();
    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
    return this.fetchOrdersFromTrendyol(settings, { startDate: threeMonthsAgo, endDate: now, size: 200 });
  }

  // Belirli tarih aralığı
  static async getOrdersByDateRange(settings: any, start: number, end: number) {
    return this.fetchOrdersFromTrendyol(settings, { startDate: start, endDate: end });
  }

  // Belirli sipariş numaraları (Trendyol API toplu orderNumber ile filtre desteklemez, burada örnek olarak ilk orderNumber ile çekiyoruz)
  static async syncSpecificOrders(settings: any, orderNumbers: string[]) {
    // Sadece ilk orderNumber ile çekim yapılır, Trendyol API toplu orderNumber ile filtreyi desteklemiyor
    if (!orderNumbers || orderNumbers.length === 0) return { content: [] };
    // Her sipariş için ayrı istek atılır
    const results = await Promise.all(orderNumbers.map(async (orderNumber) => {
      const url = `https://api.trendyol.com/sapigw/suppliers/${settings.sellerID}/orders?orderNumber=${orderNumber}`;
      const auth = Buffer.from(`${settings.apiKey}:${settings.apiSecret}`).toString('base64');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': `${settings.sellerID} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.content && data.content.length > 0 ? data.content[0] : null;
    }));
    return { content: results.filter(Boolean) };
  }
} 