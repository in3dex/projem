import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { Buffer } from 'buffer';

// Webhook için Input/Output tipleri (Eğer ayrı bir dosyada değillerse)
interface CreateWebhookInput {
  userId: string;
  sellerId: string;
  webhookApiKey: string;
  subscribedStatuses?: string[]; // Hangi durumlar dinlenecek?
}

interface CreateWebhookResponse {
  id: number; // Trendyol'un döndürdüğü webhook ID'si
  // Trendyol'dan dönebilecek diğer alanlar buraya eklenebilir
}

// Hata sınıfı
export class TrendyolApiError extends Error {
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'TrendyolApiError';
    this.details = details;
  }
}

// Ürün Güncelleme için Tipler
interface ProductUpdateImage {
  url: string;
}

interface ProductUpdateAttribute {
  attributeId: number;
  attributeValueId?: number; // attributeValueId veya customAttributeValue'dan biri olabilir
  customAttributeValue?: string;
}

// updateProductInfo metoduna gönderilecek her bir ürünün tipi
// API dokümanındaki zorunlu ve isteğe bağlı alanları içerir
export interface ProductUpdateItem {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  stockCode?: string; // API'de zorunlu görünüyor, emin olmak için kontrol edelim
  dimensionalWeight?: number; // API'de zorunlu görünüyor
  description?: string; // API'de zorunlu görünüyor
  vatRate?: number; // API'de zorunlu görünüyor
  // Şimdilik aşağıdaki alanları opsiyonel veya hariç tutuyoruz
  // deliveryDuration?: number; 
  // deliveryOption?: { deliveryDuration: number; fastDeliveryType: string; };
  // images?: ProductUpdateImage[]; 
  // attributes?: ProductUpdateAttribute[]; 
  // cargoCompanyId?: number; 
  // shipmentAddressId?: number; 
  // returningAddressId?: number; 
}

// Trendyol'un ürün güncelleme API'sinden dönen yanıtın tipi
interface ProductUpdateResponse {
  batchRequestId: string;
  // Trendyol'dan dönebilecek diğer alanlar buraya eklenebilir
}

// Fiyat/Stok Güncelleme için Tipler
export interface PriceInventoryUpdateItem {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
}

interface PriceInventoryUpdateResponse {
  batchRequestId: string;
}

export interface TrendyolCredentials {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
}

// Temel Trendyol API URL'leri
const TRENDYOL_API_BASE_URL_PROD = 'https://api.trendyol.com/sapigw';
const TRENDYOL_API_BASE_URL_STAGE = 'https://stageapi.trendyol.com/sapigw';
// Webhook API URL
const TRENDYOL_WEBHOOK_API_BASE_URL_PROD = 'https://apigw.trendyol.com/integrator';
const TRENDYOL_WEBHOOK_API_BASE_URL_STAGE = 'https://stageapigw.trendyol.com/integrator';

// Yeni: Ürün Entegrasyon API URL'leri (Silme işlemi için)
const TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_PROD = 'https://apigw.trendyol.com/integration';
const TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_STAGE = 'https://stageapigw.trendyol.com/integration';

// Ortam seçimi
const CURRENT_ENV = process.env.NEXT_PUBLIC_TRENDYOL_ENV || 'PRODUCTION';
const API_BASE_URL = CURRENT_ENV === 'PRODUCTION' ? TRENDYOL_API_BASE_URL_PROD : TRENDYOL_API_BASE_URL_STAGE;
const WEBHOOK_API_BASE_URL = CURRENT_ENV === 'PRODUCTION' ? TRENDYOL_WEBHOOK_API_BASE_URL_PROD : TRENDYOL_WEBHOOK_API_BASE_URL_STAGE;
// Yeni: Ürün entegrasyon API'si için kullanılacak Base URL
const PRODUCT_INTEGRATION_API_BASE_URL = CURRENT_ENV === 'PRODUCTION' ? TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_PROD : TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_STAGE;

// Uygulamanın public URL'si
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!APP_BASE_URL) {
    console.error("UYARI: NEXT_PUBLIC_APP_URL ortam değişkeni tanımlanmamış. Webhook oluşturma işlemi başarısız olabilir.");
}

interface DeleteProductItem {
  barcode: string;
}

export interface DeleteProductPayload {
  items: DeleteProductItem[];
}

interface DeleteProductResponse {
  batchRequestId: string;
}

// Yeni: getClaims için Parametre Arayüzü
export interface GetClaimsParams {
  claimIds?: string; // Virgülle ayrılmış ID listesi
  claimItemStatus?: 'Created' | 'WaitingInAction' | 'Accepted' | 'Cancelled' | 'Rejected' | 'Unresolved' | 'InAnalysis' | 'WaitingFraudCheck';
  endDate?: number; // timestamp ms
  startDate?: number; // timestamp ms
  orderNumber?: string;
  size?: number;
  page?: number;
}

// Yeni: getClaims Yanıt Arayüzleri
export interface TrendyolClaimReason {
  id: string;
  name: string;
  externalReasonId: number;
  code: string;
}

export interface TrendyolClaimItemStatus {
  name: string;
}

export interface TrendyolClaimItem {
  id: string; // claimLineItemIdList
  orderLineItemId: number;
  customerClaimItemReason: TrendyolClaimReason;
  trendyolClaimItemReason: TrendyolClaimReason;
  claimItemStatus: TrendyolClaimItemStatus;
  note: string;
  customerNote: string;
  resolved: boolean;
  autoAccepted: boolean;
  acceptedBySeller: boolean;
  autoApproveDate?: number;
}

export interface TrendyolClaimOrderLine {
  id: number;
  productName: string;
  barcode: string;
  merchantSku: string;
  productColor: string;
  productSize: string;
  price: number;
  vatBaseAmount: number;
  salesCampaignId: number;
  productCategory: string;
}

export interface TrendyolClaimItemDetail {
  orderLine: TrendyolClaimOrderLine;
  claimItems: TrendyolClaimItem[];
}

interface TrendyolPackageInfoItem {
  id: string; // claimItem.Id
}

export interface TrendyolReplacementPackageInfo {
  cargoTrackingNumber: string;
  cargoProviderName: string;
  cargoSenderNumber: string;
  cargoTrackingLink: string;
  packageid: number;
  items: TrendyolPackageInfoItem[]; // API yanıtında items array'i sadece string ID içeriyor gibi görünüyor, düzeltelim
}

export interface TrendyolRejectedPackageInfo {
  cargoTrackingNumber: string;
  cargoSenderNumber: string;
  cargoProviderName: string;
  cargoTrackingLink: string;
  packageid: number;
  items: TrendyolPackageInfoItem[]; // API yanıtında items array'i sadece string ID içeriyor gibi görünüyor, düzeltelim
}

export interface TrendyolClaim {
  id: string; // claimId
  orderNumber: string;
  orderDate: number; // timestamp ms
  customerFirstName: string;
  customerLastName: string;
  claimDate: number; // timestamp ms
  cargoTrackingNumber: string;
  cargoTrackingLink: string;
  cargoSenderNumber: string;
  cargoProviderName: string;
  orderShipmentPackageId: number;
  replacementOutboundpackageinfo?: TrendyolReplacementPackageInfo;
  rejectedpackageinfo?: TrendyolRejectedPackageInfo;
  items: TrendyolClaimItemDetail[];
  lastModifiedDate: number; // timestamp ms
  orderOutboundPackageId: number;
}

export interface GetClaimsResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: TrendyolClaim[];
}

// Yeni: BatchRequestResult için tip tanımı
export interface BatchItemResult {
  // Trendyol yanıtında item bilgisi requestItem içinde geliyor.
  requestItem?: { // Opsiyonel yapalım, her zaman gelmeyebilir
    barcode?: string;
    sku?: string;
    // requestItem içinde dönen diğer alanlar (örn: salePrice, quantity) eklenebilir.
    [key: string]: any; // Diğer olası alanlar için
  };
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'PENDING' | 'UNKNOWN'; // Olası durumlar
  failureReasons?: { key?: string; message: string }[]; // Hata nedenleri
  // Trendyol'un döndürebileceği diğer olası alanlar buraya eklenebilir
}

export interface BatchRequestResult {
  batchRequestId: string; // Sorgulanan ID
  status: 'COMPLETE' | 'PROCESSING' | 'PENDING' | 'FAILED'; // Batch'in genel durumu (ama item bazlı kontrol daha önemli)
  items: BatchItemResult[]; // İşlenen her item için sonuçlar
  requestDate?: number; // İstek zamanı (timestamp)
  // Trendyol'un döndürebileceği diğer olası alanlar buraya eklenebilir
}

export class TrendyolApiClientService {
  private readonly sellerId: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly userAgent: string;
  private apiClient: AxiosInstance; // api.trendyol.com/sapigw için
  private webhookApiClient: AxiosInstance; // apigw.trendyol.com/integrator için
  private integrationApiClient: AxiosInstance; // apigw.trendyol.com/integration için

  constructor(credentials: TrendyolCredentials, environment: 'live' | 'stage' = 'live') {
    if (!credentials || !credentials.sellerId || !credentials.apiKey || !credentials.apiSecret) {
      throw new Error('Trendyol API kimlik bilgileri eksik.');
    }
    this.sellerId = credentials.sellerId;
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.userAgent = `SellerID=${this.sellerId} - SelfIntegration`;

    const baseUrl = environment === 'live' ? TRENDYOL_API_BASE_URL_PROD : TRENDYOL_API_BASE_URL_STAGE;
    const webhookBaseUrl = environment === 'live' ? TRENDYOL_WEBHOOK_API_BASE_URL_PROD : TRENDYOL_WEBHOOK_API_BASE_URL_STAGE;
    const integrationBaseUrl = environment === 'live' ? TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_PROD : TRENDYOL_PRODUCT_INTEGRATION_API_BASE_URL_STAGE;

    this.apiClient = axios.create({
      baseURL: baseUrl,
      headers: this.getAuthHeaders(),
    });
    this._initializeResponseInterceptor(this.apiClient);

    this.webhookApiClient = axios.create({
        baseURL: webhookBaseUrl,
        headers: this.getAuthHeaders() // Webhook API'si için de aynı auth headerları kullanılıyor varsayımı
    });
    this._initializeResponseInterceptor(this.webhookApiClient);

    this.integrationApiClient = axios.create({
        baseURL: integrationBaseUrl,
        headers: this.getAuthHeaders() // Integration API için de auth headerları
    });
    this._initializeResponseInterceptor(this.integrationApiClient);
  }

  public getSellerId(): string {
    return this.sellerId;
  }

  // Hata yönetimi için interceptor
  private _initializeResponseInterceptor = (client: AxiosInstance) => {
    const interceptor = (error: AxiosError) => {
         console.error(
             `Trendyol API İsteği Sırasında Hata (${error.config?.method?.toUpperCase()} ${error.config?.url}):`,
             error
         );

         let errorMessage = 'Trendyol API ile iletişim kurulamadı.';
         let errorDetails = null;

      if (error.response) {
             errorMessage = `API Hatası: ${error.response.status} - ${error.response.statusText}`;
             errorDetails = error.response.data;
             console.error('API Yanıt Hatası:', errorDetails);
      } else if (error.request) {
             errorMessage = 'Trendyol API\'den yanıt alınamadı.';
      } else {
             errorMessage = `API isteği oluşturulurken hata: ${error.message}`;
      }

         return Promise.reject(new TrendyolApiError(errorMessage, errorDetails));
    };

    client.interceptors.response.use(response => response, interceptor);
  };

  // Auth headerlarını döndüren yardımcı metod
  getAuthHeaders(): Record<string, string> {
     const credentialsBuffer = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return {
      'User-Agent': this.userAgent,
      'Authorization': `Basic ${credentialsBuffer}`,
      'Content-Type': 'application/json'
    };
  }

  // Genel API istek metodu (endpoint'e göre client seçer)
  async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
    let clientToUse: AxiosInstance;
    let requestUrl = endpoint;

    // Endpoint'e göre doğru client'ı ve göreceli URL'i belirle
    if (endpoint.startsWith('/integrator/')) {
        clientToUse = this.webhookApiClient;
        requestUrl = endpoint.substring('/integrator'.length);
        console.log(`Webhook API İsteği: ${method} ${WEBHOOK_API_BASE_URL}${requestUrl}`);
    } else if (endpoint.startsWith('/integration/')) {
        clientToUse = this.integrationApiClient;
        requestUrl = endpoint.substring('/integration'.length);
        console.log(`Integration API İsteği: ${method} ${PRODUCT_INTEGRATION_API_BASE_URL}${requestUrl}`);
    } else {
        // Varsayılan olarak /sapigw client'ını kullan
        if (endpoint.startsWith('/sapigw')) {
             requestUrl = endpoint.substring('/sapigw'.length);
        }
        clientToUse = this.apiClient;
        console.log(`Default API İsteği: ${method} ${API_BASE_URL}${requestUrl}`);
    }

    const headers = this.getAuthHeaders();

    try {
      const response: AxiosResponse<T> = await clientToUse.request({
        method: method,
        url: requestUrl,
        headers: headers,
        data: body
      });
      return response.data;
    } catch (error) {
        console.error(`API isteği hatası (${method} ${requestUrl}):`, error instanceof TrendyolApiError ? error.details || error.message : error);
        throw error; // Hata interceptor tarafından işlendi, tekrar fırlat
    }
  }

  // --- Örnek Metodlar (request metodunu kullanırlar) ---

  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/suppliers/${this.sellerId}/addresses`, 'GET');
      return true;
    } catch (error) {
      console.error("API bağlantı testi başarısız:", error);
      return false;
    }
  }
  
  async getOrders(params?: Record<string, any>): Promise<any> {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/suppliers/${this.sellerId}/orders${queryParams ? '?' + queryParams : ''}`;
    return this.request<any>(endpoint, 'GET');
  }

  async getClaims(params?: GetClaimsParams): Promise<GetClaimsResponse> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    // Endpoint /integration/ ile başladığı için request metodu doğru client'ı seçecek
    const endpoint = `/integration/order/sellers/${this.sellerId}/claims${queryParams ? '?' + queryParams : ''}`;
    return this.request<GetClaimsResponse>(endpoint, 'GET');
  }

  async getClaimItemAudits(claimItemId: string): Promise<any[]> { // Tipi any[] olarak güncelledik
     // Endpoint /integration/ ile başladığı için request metodu doğru client'ı seçecek
    const endpoint = `/integration/order/sellers/${this.sellerId}/claims/items/${claimItemId}/audit`;
    return this.request<any[]>(endpoint, 'GET'); // Audit loglar array döner
  }

  async updatePriceAndInventory(items: PriceInventoryUpdateItem[]): Promise<string> {
    const payload = { items };
    // Bu endpoint /integration/inventory altında (Yeni dokümantasyona göre)
    const endpoint = `/integration/inventory/sellers/${this.sellerId}/products/price-and-inventory`;
    const response = await this.request<PriceInventoryUpdateResponse>(endpoint, 'POST', payload);
    return response.batchRequestId;
  }

  async updateProductInfo(items: ProductUpdateItem[]): Promise<string> {
      const payload = { items };
      // Bu endpoint /sapigw/ altında
      const endpoint = `/suppliers/${this.sellerId}/v2/products`;
      const response = await this.request<ProductUpdateResponse>(endpoint, 'PUT', payload);
      return response.batchRequestId;
  }

  async createWebhook(input: CreateWebhookInput): Promise<CreateWebhookResponse> {
    const { userId, sellerId, webhookApiKey, subscribedStatuses } = input;
    if (!APP_BASE_URL) {
          throw new Error("Uygulama URL'si (NEXT_PUBLIC_APP_URL) ayarlanmadığı için webhook oluşturulamıyor.");
      }
      // Webhook callback URL'i
      const callbackUrl = `${APP_BASE_URL}/api/webhook/trendyol?apiKey=${webhookApiKey}&userId=${userId}`;

      // Trendyol'a gönderilecek payload
      const payload = {
          sellerId: sellerId,
          callbackUrl: callbackUrl,
          // Varsayılan olarak tüm statüleri dinle veya parametreden gelenleri kullan
          subscribedStatuses: subscribedStatuses || [
              "NewOrder", "PackageStatusUpdate", "DeliveryStatusUpdate",
              "CancelledOrder", "ReturnCreated", "QuestionAnswered",
              "ClaimCreated", "ClaimStatusUpdate"
              // Diğer gerekli statüler eklenebilir
          ]
      };
      // Endpoint /integrator/ ile başladığı için request metodu doğru client'ı seçecek
      const endpoint = '/integrator/webhook/subscribe';
      return this.request<CreateWebhookResponse>(endpoint, 'POST', payload);
  }

  async deleteProduct(payload: DeleteProductPayload): Promise<string> {
      // Endpoint /integration/ ile başladığı için request metodu doğru client'ı seçecek
      const endpoint = `/integration/product/sellers/${this.sellerId}/products/delete`;
      const response = await this.request<DeleteProductResponse>(endpoint, 'DELETE', payload);
      return response.batchRequestId;
  }

  /**
   * Belirli bir batchRequestId ile gönderilen toplu işlemin sonucunu sorgular.
   * @param batchRequestId Sorgulanacak işlemin ID'si.
   * @returns İşlem sonucunu içeren nesne.
   * @throws TrendyolApiError API hatası durumunda.
   */
  async getBatchRequestResult(batchRequestId: string): Promise<BatchRequestResult> {
    // Trendyol Dokümanı (Toplu İşlem Kontrolü):
    // Endpoint: https://api.trendyol.com/sapigw/suppliers/{supplierId}/products/batch-requests/{batchRequestId}
    // Önemli Not: Fiyat ve stok güncellemesinde genel "status" alanı dönmeyecektir.
    // Items içerisindeki her bir item için ayrı "status" kontrol edilmelidir.

    const endpoint = `/suppliers/${this.sellerId}/products/batch-requests/${batchRequestId}`;

    try {
      // Bu istek /sapigw/ altında olduğu için this.apiClient kullanılmalı.
      const fullUrl = `${this.apiClient.defaults.baseURL}${endpoint}`;
      console.log(`[Trendyol Service] Fetching batch request result from SAPIGW API for ${batchRequestId}. URL: ${fullUrl}`);
      
      // apiClient (sapigw) kullanılıyor
      const response = await this.apiClient.get<BatchRequestResult>(endpoint); 
      
      // Dokümanda belirtildiği gibi, fiyat/stok güncellemeleri için genel batch status'u önemli değil.
      // console.log(`[Trendyol Service] Successfully fetched batch result for ${batchRequestId} from SAPIGW. Overall Batch Status (may not be relevant for price/stock): ${response.data.status}`);
      
      if (response.data.items && response.data.items.length > 0) {
        console.log(`[Trendyol Service] Batch items received for ${batchRequestId}. First item status: ${response.data.items[0]?.status}`);
        response.data.items.forEach(item => {
          if (item.status === 'FAILED') {
            console.warn(`[Trendyol Service] Batch item FAILED for ${batchRequestId} - Barcode: ${item.requestItem?.barcode || item.requestItem?.sku || 'N/A'}, Reasons:`, item.failureReasons);
          }
        });
      } else {
        console.warn(`[Trendyol Service] Batch result for ${batchRequestId} from SAPIGW did not contain any items or items array is empty.`);
      }
      return response.data;
    } catch (error: any) {
      const status = error.response?.status || 'Bilinmiyor';
      const responseData = error.response?.data;
      const errorMessage = responseData?.message || responseData?.errors?.[0]?.message || error.message || 'Batch sonucu alınırken bilinmeyen bir hata oluştu.';
      
      console.error(`[Trendyol Service] Error fetching batch request result for ${batchRequestId} from SAPIGW API. Status: ${status}, Message: ${errorMessage}, Details:`, responseData || error);
      
      throw new TrendyolApiError(`API Hatası: ${status} - ${errorMessage}`, responseData || error);
    }
  }

} 