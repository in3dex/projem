import { PrismaClient, TrendyolClaim, TrendyolClaimItem, ApiSettings, TrendyolOrderItem, User } from '@prisma/client'
import { TrendyolApiClientService, TrendyolApiError } from '@/lib/services/trendyol-api-client'
import { Prisma } from '@prisma/client' // Prisma namespace importu

// Trendyol API'den gelen ana iade nesnesi tipi
interface TrendyolApiClaim {
  id: string // claimId (UUID)
  orderNumber: string
  orderDate: number // timestamp ms
  customerFirstName: string
  customerLastName: string
  claimDate: number // timestamp ms
  cargoTrackingNumber?: string
  cargoTrackingLink?: string
  cargoSenderNumber?: string
  cargoProviderName?: string
  orderShipmentPackageId?: number
  replacementOutboundpackageinfo?: any // JSON
  rejectedpackageinfo?: any // JSON
  items: TrendyolApiClaimOrderLine[]
  lastModifiedDate: number // timestamp ms
  orderOutboundPackageId?: number
}

// Trendyol API'den gelen iade içindeki sipariş/ürün satırı
interface TrendyolApiClaimOrderLine {
  orderLine: {
    id: number // Trendyol OrderLine ID
    productName: string
    barcode: string
    merchantSku: string
    productColor: string
    productSize: string
    price: number
    vatBaseAmount: number
    salesCampaignId: number
    productCategory: string
    lineItems?: any // Gerekirse detaylandırılır
  }
  claimItems: TrendyolApiClaimItem[]
}

// Trendyol API'den gelen iade kalemi
interface TrendyolApiClaimItem {
  id: string // claimItem ID (UUID)
  orderLineItemId: number // Trendyol OrderLineItem ID (BigInt olacak)
  customerClaimItemReason: {
    id: number
    name: string
    externalReasonId?: number
    code?: string
  }
  trendyolClaimItemReason?: { // Opsiyonel olabilir
    id: number
    name: string
    externalReasonId?: number
    code?: string
  }
  claimItemStatus: {
    name: string // Created, Accepted vb.
  }
  note?: string
  customerNote?: string
  resolved: boolean
  autoAccepted?: boolean
  acceptedBySeller?: boolean
  autoApproveDate?: number // timestamp ms
}

// Trendyol API'den gelen iade audit log tipi
interface TrendyolApiClaimAudit {
  claimId: string
  claimItemId: string
  previousStatus: string
  newStatus: string
  userInfoDocument: {
    executorId?: string
    executorApp?: string
    executorUser?: string
  }
  date: number // timestamp ms
}

interface SyncClaimsResponse {
  syncedCount: number
  totalPages: number
  currentPage: number
}

export class ClaimService {
  private prisma: PrismaClient
  private apiClient: TrendyolApiClientService
  private userId: string
  private apiSettings: ApiSettings

  constructor(userId: string, apiSettings: ApiSettings) {
    this.prisma = new PrismaClient()
    this.userId = userId
    this.apiSettings = apiSettings
    this.apiClient = new TrendyolApiClientService({
        apiKey: apiSettings.apiKey,
        apiSecret: apiSettings.apiSecret,
        sellerId: apiSettings.sellerID
    });
  }

  /**
   * Trendyol'dan iadeleri çeker ve veritabanına senkronize eder.
   */
  async syncClaims(options: {
    status?: string, // Bu parametre artık doğrudan kullanılmıyor, claimItemStatus öncelikli
    claimItemStatus?: string, 
    startDate?: number, 
    endDate?: number, 
    // page?: number, // page parametresi artık metod içinde yönetilecek
    size?: number,
    orderByField?: 'ClaimDate' | 'LastModifiedDate',
    orderByDirection?: 'ASC' | 'DESC'
  } = {}): Promise<SyncClaimsResponse> {
    console.log('syncClaims çağrıldı, seçenekler:', options)
    let totalSyncedCount = 0
    let currentPageToFetch = 0 // Trendyol API'si 0-indexed page kullanıyor
    const size = options.size || 50 // Varsayılan size
    let totalPagesFromApi = 1 // API'den gelen toplam sayfa sayısı
    let lastProcessedPage = -1 // API'den dönen son işlenmiş sayfa numarasını tutmak için

    try {
      const endpoint = `/integration/order/sellers/${this.apiSettings.sellerID}/claims`

      do {
      const params: Record<string, string | number | undefined> = {
          page: currentPageToFetch,
        size: size,
        claimItemStatus: options.claimItemStatus,
        startDate: options.startDate,
        endDate: options.endDate,
        orderByField: options.orderByField || 'LastModifiedDate',
        orderByDirection: options.orderByDirection || 'DESC'
      }

      const queryParams = new URLSearchParams()
      for (const key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined) {
          queryParams.append(key, String(params[key]))
        }
      }
      const fullEndpoint = `${endpoint}?${queryParams.toString()}`

        console.log(`Trendyol getClaims API isteği (Sayfa: ${currentPageToFetch}):`, fullEndpoint);
        const response = await this.apiClient.request<{ content: TrendyolApiClaim[] | null, totalPages: number, page: number, totalElements: number }>(fullEndpoint, 'GET')

        if (!response || response.page === undefined || response.totalPages === undefined || response.totalElements === undefined) {
          console.error(`Trendyol API'den (getClaims) beklenen yanıt yapısı alınamadı (Sayfa: ${currentPageToFetch}):`, response);
          if (currentPageToFetch === 0) {
            throw new Error("Trendyol API'den (getClaims) ilk sayfada geçersiz yanıt yapısı alındı.");
          }
          break; 
        }
        
        if (currentPageToFetch === 0 && (!response.content || response.content.length === 0)) {
            console.log(`${options.claimItemStatus || 'Tüm'} statüsü için ilk sayfada iade bulunamadı.`);
            totalPagesFromApi = response.totalPages;
            lastProcessedPage = response.page;
            break;
        }
        
        if (!response.content || response.content.length === 0) {
            console.log(`Sayfa ${currentPageToFetch} için iade bulunamadı (content null veya boş), muhtemelen son sayfa işlendi.`);
            break;
      }

      const claimsToProcess = response.content;
        totalPagesFromApi = response.totalPages;
        lastProcessedPage = response.page;

        console.log(`Trendyol API'den ${claimsToProcess.length} iade talebi alındı. Gelen Sayfa: ${response.page}, Toplam Sayfa: ${totalPagesFromApi}`);

      for (const claim of claimsToProcess) {
        const claimData = {
          userId: this.userId,
          trendyolClaimId: claim.id,
          orderNumber: claim.orderNumber,
          orderDate: new Date(claim.orderDate),
          customerFirstName: claim.customerFirstName,
          customerLastName: claim.customerLastName,
          claimDate: new Date(claim.claimDate),
          cargoTrackingNumber: claim.cargoTrackingNumber ? String(claim.cargoTrackingNumber) : null,
          cargoProviderName: claim.cargoProviderName,
          cargoSenderNumber: claim.cargoSenderNumber || null,
          cargoTrackingLink: claim.cargoTrackingLink || null,
          rejectedPackageInfo: claim.rejectedpackageinfo ? JSON.stringify(claim.rejectedpackageinfo) as Prisma.InputJsonValue : Prisma.JsonNull,
          replacementPackageInfo: claim.replacementOutboundpackageinfo ? JSON.stringify(claim.replacementOutboundpackageinfo) as Prisma.InputJsonValue : Prisma.JsonNull,
          lastModifiedDate: new Date(claim.lastModifiedDate),
        };

        const upsertedClaim = await this.prisma.trendyolClaim.upsert({
          where: { trendyolClaimId: claim.id },
          update: claimData,
          create: claimData,
        });

        for (const orderLine of claim.items) {
          for (const claimItem of orderLine.claimItems) {
            const orderItem = await this.prisma.trendyolOrderItem.findUnique({
              where: { trendyolId: BigInt(claimItem.orderLineItemId) }
            });

            const claimItemData = {
              claimId: upsertedClaim.id,
              trendyolClaimItemId: claimItem.id,
                trendyolOrderLineId: BigInt(orderLine.orderLine.id),
              trendyolOrderLineItemId: BigInt(claimItem.orderLineItemId),
                trendyolOrderItemId: orderItem?.id,
              productName: orderLine.orderLine.productName,
              barcode: orderLine.orderLine.barcode,
              merchantSku: orderLine.orderLine.merchantSku,
              productColor: orderLine.orderLine.productColor,
              productSize: orderLine.orderLine.productSize,
              price: orderLine.orderLine.price,
              vatBaseAmount: orderLine.orderLine.vatBaseAmount,
              productCategory: orderLine.orderLine.productCategory,
              customerReasonId: claimItem.customerClaimItemReason.id,
              customerReasonName: claimItem.customerClaimItemReason.name,
              customerReasonCode: claimItem.customerClaimItemReason.code,
              trendyolReasonId: claimItem.trendyolClaimItemReason?.id,
              trendyolReasonName: claimItem.trendyolClaimItemReason?.name,
              trendyolReasonCode: claimItem.trendyolClaimItemReason?.code,
              status: claimItem.claimItemStatus.name,
              note: claimItem.note,
              customerNote: claimItem.customerNote,
              resolved: claimItem.resolved,
              autoAccepted: claimItem.autoAccepted,
              acceptedBySeller: claimItem.acceptedBySeller,
              autoApproveDate: claimItem.autoApproveDate ? new Date(claimItem.autoApproveDate) : undefined,
            };

            await this.prisma.trendyolClaimItem.upsert({
              where: { trendyolClaimItemId: claimItem.id },
              update: claimItemData,
              create: claimItemData,
            });
            }
          }
          totalSyncedCount++;
        }
        
        if (claimsToProcess.length < size) {
            console.log("Alınan iade sayısı, istenen boyuttan az, muhtemelen son sayfa.");
            break; 
        }

        currentPageToFetch++; 

      } while (currentPageToFetch < totalPagesFromApi);

      console.log(`${totalSyncedCount} iade talebi veritabanına senkronize edildi/güncellendi.`);
      return { syncedCount: totalSyncedCount, totalPages: totalPagesFromApi, currentPage: lastProcessedPage };

    } catch (error) {
      console.error('İade senkronizasyonu sırasında hata:', error);
      if (error instanceof Error) {
        console.error('API Hatası Detayı:', error.message);
        // API'den gelen hata detaylarını loglamak için
        if ((error as any).response?.data) {
            console.error('API Yanıt Hatası:', (error as any).response.data);
        }
      }
      throw new Error(`İade senkronizasyonu başarısız: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Veritabanındaki iadeleri filtreleyerek ve sayfalayarak getirir.
   */
  async getClaimsFromDb(options: {
    status?: string, // ClaimItem status
    page?: number,
    size?: number,
    searchTerm?: string, // Sipariş no, Müşteri adı, ürün adı vs.
    startDate?: Date, // claimDate >= startDate
    endDate?: Date // claimDate <= endDate
  }): Promise<{ claims: (TrendyolClaim & { claimItems: TrendyolClaimItem[] })[], totalCount: number }> {
    const page = options.page || 1
    const size = options.size || 10
    const skip = (page - 1) * size

    const whereClause: Prisma.TrendyolClaimWhereInput = {
      userId: this.userId,
    };

    if (options.startDate || options.endDate) {
        whereClause.claimDate = {};
        if (options.startDate) whereClause.claimDate.gte = options.startDate;
        if (options.endDate) whereClause.claimDate.lte = options.endDate;
    }

    if (options.status) {
        // Duruma göre filtreleme claimItems üzerinden yapılır
        whereClause.claimItems = {
            some: { status: options.status }
        }
    }

    if (options.searchTerm) {
        const search = options.searchTerm;
        whereClause.OR = [
            { orderNumber: { contains: search } },
            { customerFirstName: { contains: search } },
            { customerLastName: { contains: search } },
            { cargoTrackingNumber: { contains: search } },
            { claimItems: { some: { productName: { contains: search } } } },
            { claimItems: { some: { barcode: { contains: search } } } },
            { claimItems: { some: { merchantSku: { contains: search } } } },
        ];
    }

    const claims = await this.prisma.trendyolClaim.findMany({
      where: whereClause,
      include: {
        claimItems: true, // İade kalemlerini de getir
      },
      orderBy: {
        claimDate: 'desc' // Veya lastModifiedDate
      },
      skip: skip,
      take: size,
    });

    const totalCount = await this.prisma.trendyolClaim.count({
      where: whereClause
    });

    return { claims, totalCount };
  }

  /**
   * Belirli bir iade kaleminin denetim (audit) loglarını getirir.
   * @param claimItemId Veritabanındaki TrendyolClaimItem ID'si DEĞİL, Trendyol'un verdiği claimItem ID (UUID string)
   */
  async getClaimItemAudits(trendyolClaimItemId: string): Promise<TrendyolApiClaimAudit[]> {
    console.log(`getClaimItemAudits çağrıldı, trendyolClaimItemId: ${trendyolClaimItemId}`) ;
    try {
        // Yeni endpoint: https://apigw.trendyol.com/integration/order/sellers/{sellerId}/claims/items/{claimItemsId}/audit
        const endpoint = `/integration/order/sellers/${this.apiSettings.sellerID}/claims/items/${trendyolClaimItemId}/audit`;

        const response = await this.apiClient.request<TrendyolApiClaimAudit[]>(endpoint, 'GET');

        if (!response) {
            console.warn(`Audit logları alınamadı veya boş geldi: ${trendyolClaimItemId}`);
            return []; // Hata vermek yerine boş array dönebiliriz.
        }
        console.log(`${response.length} adet audit log bulundu: ${trendyolClaimItemId}`);
        return response;

    } catch (error) {
        console.error(`İade kalemi (${trendyolClaimItemId}) audit logları alınırken hata oluştu:`, error);
         if (error instanceof Error) {
            console.error('API Hatası Detayı:', error.message);
        }
        // Hata durumunda boş array dönebiliriz veya hatayı yukarıya fırlatabiliriz.
        // Şimdilik boş array dönelim, frontend tarafında kontrol edilebilir.
        // throw new Error(`Audit logları alınamadı: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
  }

  /**
   * Trendyol'dan iade reddetme sebeplerini çeker.
   */
  async getClaimIssueReasons(): Promise<any[]> { // Dönen tip daha belirgin olmalı (API yanıtına göre)
    console.log(`getClaimIssueReasons çağrıldı`);
    try {
        // YENİ ENDPOINT: GET /integration/order/claim-issue-reasons (sellerId içermiyor)
        const endpoint = `/integration/order/claim-issue-reasons`;
        console.log('Integration API İsteği: GET', endpoint);
        
        // Bu endpoint için sellerId gerekmiyor, bu yüzden apiClient'ı doğrudan kullanabiliriz
        // veya apiClient içinde sellerId'yi opsiyonel yapacak bir düzenleme gerekebilir.
        // Şimdilik sellerId olmadan deniyoruz, apiClient.request bunu destekliyorsa.
        const response = await this.apiClient.request<any[]>(endpoint, 'GET');
        
        if (!response) { // Yanıtın doğrudan dizi olduğunu varsayıyoruz, dokümana göre
            console.error("İade red sebepleri API'sinden beklenen yanıt alınamadı.", response);
            throw new Error("İade red sebepleri alınamadı: Geçersiz API yanıtı");
        }
        console.log('İade red sebepleri API yanıtı:', response);
        return response; // Yanıt doğrudan dizi olmalı

    } catch (error: any) {
        console.error('İade red sebepleri alınırken hata oluştu:', error);
        if (error.isAxiosError && error.response) {
            console.error('API Yanıt Hatası:', error.response.data);
        } else if (error instanceof TrendyolApiError) {
            console.error('API Hatası Detayı:', error.message, error.details);
        } else {
            console.error('Bilinmeyen Hata Detayı:', error.message);
        }
        throw new Error(`İade red sebepleri alınamadı: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Belirtilen iade kalemlerini onaylar.
   * @param claimId Ana iade talebinin Trendyol ID'si (UUID string)
   * @param claimLineItemIdList Onaylanacak iade kalemlerinin Trendyol ID listesi (UUID string[])
   */
  async approveClaimItems(claimId: string, claimLineItemIdList: string[]): Promise<boolean> {
    console.log(`approveClaimItems çağrıldı, claimId: ${claimId}, items: ${claimLineItemIdList.join(', ')}`);
    try {
      const endpoint = `/integration/order/sellers/${this.apiSettings.sellerID}/claims/${claimId}/items/approve`;
      const body = {
        claimLineItemIdList: claimLineItemIdList,
        params: {} 
      };

      await this.apiClient.request<void>(endpoint, 'PUT', body);
      console.log(`API: İade kalemleri başarıyla onaylandı: ${claimLineItemIdList.join(', ')}`);
      
      // API başarılı olduktan sonra veritabanını güncelle
      try {
        const updateResult = await this.prisma.trendyolClaimItem.updateMany({
          where: {
            // trendyolClaimItemId alanı unique olduğu için bu alanı kullanıyoruz.
            // claimId kontrolü de eklenebilir ama trendyolClaimItemId yeterli olmalı.
            trendyolClaimItemId: {
              in: claimLineItemIdList
            }
          },
          data: {
            status: 'Accepted' // Statüyü 'Accepted' olarak güncelle
            // Not: Trendyol'un 'WaitingFraudCheck' durumuna alabileceğini unutmayın.
            // Bir sonraki sync bu durumu düzeltecektir.
          }
        });
        console.log(`DB: ${updateResult.count} iade kalemi durumu 'Accepted' olarak güncellendi.`);
      } catch (dbError) {
          console.error(`Veritabanı güncelleme hatası (approveClaimItems - ClaimID: ${claimId}):`, dbError);
          // API başarılı olsa bile DB hatası olursa işlemi yine de başarılı kabul edebiliriz,
          // çünkü bir sonraki senkronizasyon durumu düzeltecektir.
          // Ancak hatayı loglamak önemlidir.
      }

      return true;
      
    } catch (error) {
      console.error(`İade kalemleri onaylanırken hata oluştu (ClaimID: ${claimId}):`, error);
      if (error instanceof Error) {
          console.error('API Hatası Detayı:', error.message);
      }
      throw error;
    }
  }

  /**
   * Belirtilen iade kalemini/kalemlerini belirtilen sebeple reddeder.
   * @param claimId Ana iade talebinin Trendyol ID'si (UUID string)
   * @param claimLineItemIdList Reddedilecek iade kalemlerinin Trendyol ID listesi (UUID string[])
   * @param reasonId İade red sebebi ID'si (getClaimIssueReasons'dan alınır)
   * @param description Reddetme açıklaması
   */
  async rejectClaimItem(
    claimId: string, 
    claimLineItemIdList: string[], 
    reasonId: number, 
    description: string
  ): Promise<boolean> {
    console.log(`rejectClaimItem çağrıldı, claimId: ${claimId}, items: ${claimLineItemIdList.join(', ')}, reasonId: ${reasonId}`);
    try {
      const queryParams = new URLSearchParams({
        claimIssueReasonId: String(reasonId),
        claimLineItemIdList: claimLineItemIdList.join(','),
        description: description
      });
      const endpoint = `/integration/order/sellers/${this.apiSettings.sellerID}/claims/${claimId}/issue?${queryParams.toString()}`;
      
      await this.apiClient.request<void>(endpoint, 'POST', {}); 
      console.log(`API: İade kalemleri başarıyla reddedildi: ${claimLineItemIdList.join(', ')}`);
      
      // API başarılı olduktan sonra veritabanını güncelle
      try {
        const updateResult = await this.prisma.trendyolClaimItem.updateMany({
          where: {
            trendyolClaimItemId: {
              in: claimLineItemIdList
            }
          },
          data: {
            status: 'Rejected' // Statüyü 'Rejected' olarak güncelle
            // Reddetme notunu (description) da buraya ekleyebiliriz, 
            // ancak API'ye gönderdiğimiz not mu, yoksa farklı bir not mu saklamalıyız? 
            // Şimdilik sadece status güncelliyoruz.
            // note: description // Opsiyonel: Satıcı notunu da güncelle
          }
        });
        console.log(`DB: ${updateResult.count} iade kalemi durumu 'Rejected' olarak güncellendi.`);
      } catch (dbError) {
          console.error(`Veritabanı güncelleme hatası (rejectClaimItem - ClaimID: ${claimId}):`, dbError);
          // Hata loglanır ama işlem başarılı kabul edilir.
      }

      return true;

    } catch (error) {
      console.error(`İade kalemleri reddedilirken hata oluştu (ClaimID: ${claimId}):`, error);
      if (error instanceof Error) {
          console.error('API Hatası Detayı:', error.message);
      }
      throw error;
    }
  }

  // TODO: İade kabul etme - Gerekirse eklenecek
  // TODO: İade red sebeplerini çekme (getClaimsIssueReasons) - Gerekirse eklenecek
} 