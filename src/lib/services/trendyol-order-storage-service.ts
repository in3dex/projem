import { TrendyolOrder } from '@prisma/client'; // Döndürülecek tip için import
import { db } from '@/lib/db';

// API'den gelen sipariş verisi için daha belirgin bir tip (İhtiyaç duyulan alanları ekleyin)
// Bu tip api-siarpis-yaniti.json'a göre genişletilebilir.
interface TrendyolApiOrder {
  id: number | bigint; // Bu alanın Trendyol Paket ID'si olduğunu varsayıyoruz.
  orderNumber: string;
  orderDate: number; // Timestamp ms
  status: string;
  shipmentPackageStatus: string;
  grossAmount: number;
  totalDiscount: number;
  totalTyDiscount: number;
  totalPrice: number;
  currencyCode: string;
  cargoTrackingNumber?: string | number | null;
  cargoProviderName?: string | null;
  cargoTrackingLink?: string | null;
  deliveryType?: string | null;
  deliveryAddressType?: string | null;
  estimatedDeliveryStartDate?: number | null;
  estimatedDeliveryEndDate?: number | null;
  agreedDeliveryDate?: number | null;
  fastDelivery?: boolean;
  fastDeliveryType?: string | null;
  originShipmentDate?: number | null;
  lastModifiedDate?: number | null;
  commercial?: boolean;
  micro?: boolean;
  giftBoxRequested?: boolean;
  taxNumber?: string | null;
  invoiceLink?: string | null;
  deliveredByService?: boolean;
  customerId: number | bigint;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  shipmentAddress: TrendyolApiAddress;
  invoiceAddress: TrendyolApiAddress;
  lines: TrendyolApiOrderItem[];
  packageHistories?: TrendyolApiStatusHistory[];
  shipmentPackages?: any[]; // Assuming any type for shipmentPackages
  // ... api-siarpis-yaniti.json'daki diğer alanlar eklenebilir
}

interface TrendyolApiAddress {
  id: number | bigint;
  firstName: string;
  lastName: string;
  fullName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  fullAddress: string;
  city: string;
  cityCode?: number | null;
  district?: string | null;
  districtId?: number | null;
  neighborhood?: string | null;
  neighborhoodId?: number | null;
  postalCode?: string | null;
  countryCode: string;
  phone?: string | null;
}

interface TrendyolApiOrderItem {
  id: number | bigint;
  productCode: string | number | null;
  productName: string;
  merchantSku: string;
  barcode?: string | null;
  productSize?: string | null;
  productOrigin?: string | null;
  quantity: number;
  price: number;
  amount: number;
  discount: number;
  tyDiscount: number;
  vatBaseAmount: number;
  orderLineItemStatusName: string;
}

interface TrendyolApiStatusHistory {
  status: string;
  createdDate: number; // Timestamp ms
}

export class TrendyolOrderStorageService {
  /**
   * Webhook'tan gelen sipariş/paket verisini işler.
   * @param userId İşlemi yapan kullanıcı ID'si
   * @param payload Webhook'tan gelen ham sipariş/paket verisi
   * @returns Kaydedilen/güncellenen TrendyolOrder nesnesinin temel bilgileri
   */
  static async saveOrUpdateOrderFromWebhook(userId: string, payload: TrendyolApiOrder): Promise<Pick<TrendyolOrder, 'id' | 'orderNumber' | 'status'> > {
      console.log(`[Webhook İşleyici] Kullanıcı ${userId} için sipariş ${payload.orderNumber} işleniyor.`);
      try {
          // Mevcut transaction metodunu kullan
          const savedOrderId = await this.saveOrderTransactional(userId, payload);
          // Başarılı işlem sonrası gerekli bilgileri döndür
          return { 
              id: savedOrderId, 
              orderNumber: payload.orderNumber, 
              status: payload.status // Veya payload.shipmentPackageStatus
            };
      } catch (error) {
          console.error(`[Webhook İşleyici] Sipariş ${payload.orderNumber} işlenirken hata:`, error);
          // Hatanın tekrar fırlatılması, çağıran handler'ın yakalamasını sağlar
          throw error; 
      }
  }

  /**
   * Tek bir siparişi ve ilişkili verilerini atomik bir işlemle kaydeder veya günceller.
   * @param userId Siparişin ait olduğu kullanıcı ID'si
   * @param order API'den gelen ham sipariş verisi
   * @returns Kaydedilen/güncellenen ana siparişin veritabanı ID'si ve işlemin tipi ('created' | 'updated')
   * @throws Hata durumunda exception fırlatır
   */
  static async saveOrderTransactional(userId: string, order: TrendyolApiOrder): Promise<{ id: string; operation: 'created' | 'updated' }> {
    const trendyolPackageId = BigInt(order.id); 
    const orderNumber = order.orderNumber;

    if (!orderNumber) { // trendyolPackageId kontrolü kaldırıldı, sadece orderNumber gerekli
      throw new Error('Gecersiz siparis verisi alindi (siparis no eksik).');
    }

    // Transaction sonucunu (orderId ve operation) döndürmek için değişken
    let finalResult: { id: string; operation: 'created' | 'updated' } | null = null;

    await db.$transaction(async (tx) => {
      // Önce siparişin var olup olmadığını kontrol et (transaction içinde)
      const existingOrder = await tx.trendyolOrder.findUnique({
        where: { orderNumber: orderNumber },
        select: { id: true }
      });
      const operationType = existingOrder ? 'updated' : 'created';

      // 1. Gönderim Adresini Upsert Et
      const shipmentAddrData = {
        trendyolId: BigInt(order.shipmentAddress.id),
        firstName: order.shipmentAddress.firstName,
        lastName: order.shipmentAddress.lastName,
        fullName: order.shipmentAddress.fullName,
        company: order.shipmentAddress.company,
        address1: order.shipmentAddress.address1,
        address2: order.shipmentAddress.address2,
        fullAddress: order.shipmentAddress.fullAddress,
        city: order.shipmentAddress.city,
        cityCode: order.shipmentAddress.cityCode,
        district: order.shipmentAddress.district,
        districtId: order.shipmentAddress.districtId,
        neighborhood: order.shipmentAddress.neighborhood,
        neighborhoodId: order.shipmentAddress.neighborhoodId,
        postalCode: order.shipmentAddress.postalCode,
        countryCode: order.shipmentAddress.countryCode,
        phone: order.shipmentAddress.phone,
      };
      const shipmentAddress = await tx.trendyolAddress.upsert({
        where: { trendyolId: BigInt(order.shipmentAddress.id) },
        update: shipmentAddrData,
        create: shipmentAddrData,
        select: { id: true },
      });

      // 2. Fatura Adresini Upsert Et
      const invoiceAddrData = {
        trendyolId: BigInt(order.invoiceAddress.id),
        firstName: order.invoiceAddress.firstName,
        lastName: order.invoiceAddress.lastName,
        fullName: order.invoiceAddress.fullName,
        company: order.invoiceAddress.company,
        address1: order.invoiceAddress.address1,
        address2: order.invoiceAddress.address2,
        fullAddress: order.invoiceAddress.fullAddress,
        city: order.invoiceAddress.city,
        cityCode: order.invoiceAddress.cityCode,
        district: order.invoiceAddress.district,
        districtId: order.invoiceAddress.districtId,
        neighborhood: order.invoiceAddress.neighborhood,
        neighborhoodId: order.invoiceAddress.neighborhoodId,
        postalCode: order.invoiceAddress.postalCode,
        countryCode: order.invoiceAddress.countryCode,
        phone: order.invoiceAddress.phone,
      };
      const invoiceAddress = await tx.trendyolAddress.upsert({
        where: { trendyolId: BigInt(order.invoiceAddress.id) },
        update: invoiceAddrData,
        create: invoiceAddrData,
        select: { id: true },
      });

      // 3. Müşteriyi Upsert Et
      const customerData = {
        trendyolId: BigInt(order.customerId),
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        email: order.customerEmail,
      };
      const customer = await tx.trendyolCustomer.upsert({
        where: { trendyolId: BigInt(order.customerId) },
        update: customerData,
        create: customerData,
        select: { id: true },
      });

      // 4. Ana Siparişi Upsert Et (orderNumber ile)
      const orderDataForUpdate = {
        status: order.status, 
        shipmentPackageStatus: order.shipmentPackageStatus, 
        lastModifiedDate: order.lastModifiedDate ? new Date(order.lastModifiedDate) : new Date(),
        customerId: customer.id,
        shipmentAddressId: shipmentAddress.id,
        invoiceAddressId: invoiceAddress.id,
        cargoTrackingNumber: order.cargoTrackingNumber?.toString(), 
        cargoTrackingLink: order.cargoTrackingLink,
        cargoProviderName: order.cargoProviderName,
        totalPrice: order.totalPrice, // Fiyat gibi alanlar da güncellenebilir
        grossAmount: order.grossAmount,
        totalDiscount: order.totalDiscount,
        totalTyDiscount: order.totalTyDiscount,
        isSynced: true,
      };
      const orderDataForCreate = {
            userId: userId,
            orderNumber: orderNumber, 
            orderDate: new Date(order.orderDate),
            status: order.status, 
            shipmentPackageStatus: order.shipmentPackageStatus,
            grossAmount: order.grossAmount,
            totalDiscount: order.totalDiscount,
            totalTyDiscount: order.totalTyDiscount,
            totalPrice: order.totalPrice,
            currencyCode: order.currencyCode,
            customerId: customer.id,
            shipmentAddressId: shipmentAddress.id,
            invoiceAddressId: invoiceAddress.id,
            isSynced: true, 
            cargoTrackingNumber: order.cargoTrackingNumber?.toString(), 
            cargoTrackingLink: order.cargoTrackingLink,
            cargoProviderName: order.cargoProviderName,
            deliveryType: order.deliveryType,
            deliveryAddressType: order.deliveryAddressType, 
            estimatedDeliveryStartDate: order.estimatedDeliveryStartDate ? new Date(order.estimatedDeliveryStartDate) : null,
            estimatedDeliveryEndDate: order.estimatedDeliveryEndDate ? new Date(order.estimatedDeliveryEndDate) : null,
            agreedDeliveryDate: order.agreedDeliveryDate ? new Date(order.agreedDeliveryDate) : null,
            fastDelivery: order.fastDelivery ?? false,
            fastDeliveryType: order.fastDeliveryType,
            originShipmentDate: order.originShipmentDate ? new Date(order.originShipmentDate) : null,
            commercial: order.commercial ?? false,
            micro: order.micro ?? false,
            giftBoxRequested: order.giftBoxRequested ?? false,
            taxNumber: order.taxNumber,
            invoiceLink: order.invoiceLink,
            deliveredByService: order.deliveredByService ?? false,
        };
      
      const savedOrder = await tx.trendyolOrder.upsert({
        where: { orderNumber: orderNumber },
        update: orderDataForUpdate,
        create: orderDataForCreate,
        select: { id: true }, // Sadece ID'yi seç yeterli
      });

      // 5. Sipariş Kalemlerini İşle (Önce eskileri sil, sonra yenileri ekle - basit yaklaşım)
      // Dikkat: Bu yaklaşım, kalem ID'lerinin değişmesine neden olabilir.
      // Daha sofistike: Mevcut kalemleri bul, API'dekilerle karşılaştır, güncelle/ekle/sil.
      await tx.trendyolOrderItem.deleteMany({ 
        where: { orderId: savedOrder.id }
      });
      if (order.lines && order.lines.length > 0) {
          await tx.trendyolOrderItem.createMany({
              data: order.lines.map(item => ({
            orderId: savedOrder.id,
            trendyolId: BigInt(item.id),
                  productCode: item.productCode?.toString(),
            productName: item.productName,
            merchantSku: item.merchantSku,
            barcode: item.barcode,
            productSize: item.productSize,
            productOrigin: item.productOrigin,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
            discount: item.discount,
            tyDiscount: item.tyDiscount,
            vatBaseAmount: item.vatBaseAmount,
            orderLineItemStatusName: item.orderLineItemStatusName,
              }))
          });
      }
      
      // 6. Durum Geçmişini İşle (Sadece yenileri ekle)
      if (order.packageHistories && order.packageHistories.length > 0) {
          const existingStatuses = await tx.trendyolOrderStatus.findMany({
              where: { orderId: savedOrder.id },
              select: { status: true, createdDate: true }
          });
          const existingStatusSet = new Set(existingStatuses.map(s => `${s.status}_${s.createdDate.toISOString()}`));

          const newStatuses = order.packageHistories
              .map(history => ({
              orderId: savedOrder.id,
              status: history.status,
              createdDate: new Date(history.createdDate),
              }))
              .filter(newStatus => !existingStatusSet.has(`${newStatus.status}_${newStatus.createdDate.toISOString()}`));

          if (newStatuses.length > 0) {
              await tx.trendyolOrderStatus.createMany({ data: newStatuses });
          }
      }

      // 7. Paketleri İşle (shipmentPackages - upsert mantığı eklenebilir)
      // Örnek: Eğer API yanıtında paket bilgisi varsa ve DB'de yoksa ekle/güncelle
      // Bu kısım API yanıtının detayına göre doldurulmalı
      if (order.shipmentPackages && order.shipmentPackages.length > 0) {
          for (const pkg of order.shipmentPackages) {
              const pkgId = BigInt(pkg.id);
              if (!pkgId) continue; // ID yoksa atla
              const pkgData = {
                  orderId: savedOrder.id,
                  trendyolPackageId: pkgId,
                  status: pkg.status, // veya pkg.shipmentPackageStatus?
                  // ... diğer paket alanları ... 
              };
              await tx.trendyolShipmentPackage.upsert({
                  where: { trendyolPackageId: pkgId }, // Paket ID'sine göre bul
                  update: pkgData,
                  create: { ...pkgData, /* create için ek alanlar */ },
              });
          }
      }

      // Sonucu dış değişkene ata
      finalResult = { id: savedOrder.id, operation: operationType };
    }); // Transaction sonu

    if (!finalResult) {
        throw new Error(`Sipariş ${orderNumber} için işlem sonucu alınamadı.`);
    }

    return finalResult; 
  }

  /**
   * Birden fazla siparişi toplu olarak kaydeder veya günceller.
   * Her sipariş için saveOrderTransactional çağırır.
   * @param userId Kullanıcı ID'si
   * @param orders API'den gelen sipariş listesi
   * @returns Başarılı, başarısız, yeni eklenen ve güncellenen sipariş sayıları
   */
  static async saveMultipleOrders(userId: string, orders: TrendyolApiOrder[]) {
    let successCount = 0;
    let failCount = 0;
    let newlyInsertedCount = 0;
    let updatedCount = 0;
    const failedOrders: { orderNumber: string; error: string }[] = [];

    for (const order of orders) {
      try {
        const result = await this.saveOrderTransactional(userId, order);
        successCount++;
        if (result.operation === 'created') {
            newlyInsertedCount++;
        } else {
            updatedCount++;
        }
      } catch (error: any) {
        failCount++;
        failedOrders.push({ 
          orderNumber: order.orderNumber || 'Bilinmiyor', 
            error: error.message || 'Bilinmeyen Hata'
        });
        console.error(`Sipariş ${order.orderNumber || '?'} kaydedilirken hata:`, error);
      }
    }

    return {
      success: successCount,
      failed: failCount,
      newlyInserted: newlyInsertedCount,
      updated: updatedCount,
      failedOrders: failedOrders,
    };
  }
}

// Dönüş tipi interface'i (yeni alanlar eklendi)
export interface OrderSaveResult {
  success: number;
  failed: number;
  newlyInserted: number;
  updated: number;
  failedOrders: { orderNumber: string; error: string }[];
} 