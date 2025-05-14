import { db } from "@/lib/db";
import { ApiSettings, AutomationSettings, SubscriptionStatus, User } from "@prisma/client";
import { TrendyolApiClientService } from "@/lib/services/trendyol-api-client";
import { TrendyolOrderService } from "@/lib/services/trendyol-order-service";
import { TrendyolOrderStorageService, OrderSaveResult } from "@/lib/services/trendyol-order-storage-service";
// TODO: Diğer servisleri import et (Product, Claim, Question)
// import { TrendyolProductService } from "@/lib/services/product-services/trendyol-product-service"; 
// import { TrendyolProductStorageService } from "@/lib/services/product-services/trendyol-product-storage-service";
// import { TrendyolClaimService } from "@/lib/services/claim-service"; // Veya ilgili servis adı
// import { TrendyolClaimStorageService } from "@/lib/services/claim-storage-service"; // Veya ilgili servis adı
// import { TrendyolCustomerQuestionService } from "@/lib/services/customer-question-service"; // Veya ilgili servis adı
// import { TrendyolCustomerQuestionStorageService } from "@/lib/services/customer-question-storage-service"; // Veya ilgili servis adı

interface UserWithApiSettings extends User {
  apiSettings: ApiSettings | null;
}

interface SyncResultDetail {
  userId: string;
  email: string | null;
  type: 'Siparişler' | 'Ürünler' | 'İadeler' | 'Müşteri Soruları';
  status: 'Başarılı' | 'Başarısız' | 'Atlandı';
  message?: string;
  error?: string;
  details?: any; // Örn: Kaydedilen sipariş sayısı
}

async function findUsersToSync(): Promise<UserWithApiSettings[]> {
  console.log("[SyncService] Senkronize edilecek kullanıcılar aranıyor...");
  try {
    // 1. Önce aktif kullanıcıları ve abonelikleri alıyoruz
    const users = await db.user.findMany({
      where: {
        isActive: true,
        subscription: { 
          status: SubscriptionStatus.ACTIVE,
        },
      },
      include: { 
        apiSettings: true 
      },
    }) as UserWithApiSettings[];
    
    console.log(`[SyncService] ${users.length} aktif kullanıcı bulundu.`);
    
    // 2. Geçerli API ayarları olan kullanıcıları filtreleyelim
    const usersWithValidApiSettings = users.filter(user => {
      // Kullanıcının API ayarları var mı?
      if (!user.apiSettings) {
        console.log(`[SyncService] Kullanıcı ${user.id} (${user.email}) için API ayarları bulunamadı.`);
        return false;
      }
      
      // API ayarlarında gereken alanlar var mı ve boş değil mi?
      const { apiKey, apiSecret, sellerID } = user.apiSettings;
      const hasValidSettings = 
        apiKey && apiKey.trim() !== '' && 
        apiSecret && apiSecret.trim() !== '' && 
        sellerID && sellerID.trim() !== '';
      
      if (!hasValidSettings) {
        console.log(`[SyncService] Kullanıcı ${user.id} (${user.email}) için eksik veya geçersiz API ayarları.`);
      }
      
      return hasValidSettings;
    });
    
    console.log(`[SyncService] ${usersWithValidApiSettings.length} kullanıcı API ayarlarına sahip ve senkronizasyon için uygun.`);
    return usersWithValidApiSettings;
  } catch (error) {
    console.error("[SyncService] Kullanıcılar aranırken hata:", error);
    // Hata durumunda boş dizi döndür
    return [];
  }
}

// --- Sipariş Senkronizasyonu ---
export async function syncAllOrders(automationSettings: AutomationSettings | null): Promise<SyncResultDetail[]> {
  const results: SyncResultDetail[] = [];
  if (!automationSettings) {
      console.error("[SyncService:Orders] Otomasyon ayarları yüklenemedi.");
      return [{ type: 'Siparişler', status: 'Başarısız', error: "Otomasyon ayarları bulunamadı.", userId: 'SYSTEM', email: null }];
  }
  
  const users = await findUsersToSync();
  if (!users.length) {
      return [{ type: 'Siparişler', status: 'Atlandı', message: "Senkronize edilecek uygun kullanıcı bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  console.log("[SyncService:Orders] Tüm kullanıcılar için sipariş senkronizasyonu başlıyor...");

  for (const user of users) {
    if (!user.apiSettings) continue;
    
    const { id: userId, email } = user;
    const apiSettings = user.apiSettings;

    console.log(`[SyncService:Orders] Kullanıcı ${userId} (${email}) için işlem başlıyor...`);
    try {
      // 1. API İstemcisini Oluştur (Doğru şekilde)
      const credentials = {
          sellerId: apiSettings.sellerID,
          apiKey: apiSettings.apiKey,
          apiSecret: apiSettings.apiSecret
      };
      // Ortamı belirle (Örn: .env dosyasından alınabilir)
      const environment = (process.env.NEXT_PUBLIC_TRENDYOL_ENV?.toLowerCase() === 'stage') ? 'stage' : 'live';
      const apiClient = new TrendyolApiClientService(credentials, environment);
      
      // 2. Siparişleri Çek (Örn: Son 7 gün - ayarlanabilir olmalı)
      // TODO: Tarih aralığını automationSettings'den veya başka bir yerden al
      const lookbackDays = 7; 
      const startDate = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
      const { orders: fetchedOrders, totalElements } = await TrendyolOrderService.fetchAllTrendyolOrdersForSync(apiClient, { startDate });
      console.log(`[SyncService:Orders] Kullanıcı ${userId} için ${fetchedOrders.length} (${totalElements} toplam) sipariş API'den çekildi.`);

      if (fetchedOrders.length > 0) {
        // 3. Siparişleri Kaydet/Güncelle
        const saveResult: OrderSaveResult = await TrendyolOrderStorageService.saveMultipleOrders(userId, fetchedOrders);
        console.log(`[SyncService:Orders] Kullanıcı ${userId} için ${saveResult.success} sipariş kaydedildi/güncellendi (${saveResult.newlyInserted} yeni, ${saveResult.updated} güncel), ${saveResult.failed} hata.`);
        results.push({ 
          userId, 
          email, 
          type: 'Siparişler', 
          status: saveResult.failed > 0 ? 'Başarısız' : 'Başarılı', 
          message: `Toplam ${totalElements} siparişten ${fetchedOrders.length} çekildi. ${saveResult.success} kaydedildi/güncellendi.`,
          details: saveResult, // Başarılı/başarısız sayılarını içerir
          error: saveResult.failed > 0 ? `${saveResult.failed} sipariş kaydedilirken hata oluştu.` : undefined
        });
      } else {
        results.push({ userId, email, type: 'Siparişler', status: 'Başarılı', message: `API'den yeni/güncel sipariş bulunamadı.` });
      }
    } catch (error: any) {
      console.error(`[SyncService:Orders] Kullanıcı ${userId} (${email}) için sipariş senkronizasyon hatası:`, error.message, error.stack);
      results.push({ userId, email, type: 'Siparişler', status: 'Başarısız', error: error.message });
    }
    console.log(`[SyncService:Orders] Kullanıcı ${userId} (${email}) için işlem tamamlandı.`);
  }

  console.log("[SyncService:Orders] Tüm kullanıcılar için sipariş senkronizasyonu tamamlandı.");
  return results;
}


// --- Ürün Senkronizasyonu (Yer Tutucu) ---
export async function syncAllProducts(automationSettings: AutomationSettings | null): Promise<SyncResultDetail[]> {
  const results: SyncResultDetail[] = [];
   if (!automationSettings) {
      console.error("[SyncService:Products] Otomasyon ayarları yüklenemedi.");
      return [{ type: 'Ürünler', status: 'Başarısız', error: "Otomasyon ayarları bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  const users = await findUsersToSync();
   if (!users.length) {
      return [{ type: 'Ürünler', status: 'Atlandı', message: "Senkronize edilecek uygun kullanıcı bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  console.log("[SyncService:Products] Tüm kullanıcılar için ürün senkronizasyonu başlıyor (Simüle Edildi)...");

  for (const user of users) {
     if (!user.apiSettings) continue;
    const { id: userId, email } = user;
    console.log(`[SyncService:Products] Kullanıcı ${userId} (${email}) için işlem başlıyor... (Simüle Edildi)`);
    try {
        // TODO: Gerçek TrendyolProductService.fetchAllProducts ve TrendyolProductStorageService.saveMultipleProducts çağrılarını ekle
        await new Promise(resolve => setTimeout(resolve, 200)); // Simülasyon
        results.push({ userId, email, type: 'Ürünler', status: 'Başarılı', message: 'Ürünler senkronize edildi (Simüle).' });
    } catch (error: any) {
         console.error(`[SyncService:Products] Kullanıcı ${userId} (${email}) için ürün senkronizasyon hatası:`, error.message);
        results.push({ userId, email, type: 'Ürünler', status: 'Başarısız', error: error.message });
    }
     console.log(`[SyncService:Products] Kullanıcı ${userId} (${email}) için işlem tamamlandı (Simüle Edildi).`);
  }
  
  console.log("[SyncService:Products] Tüm kullanıcılar için ürün senkronizasyonu tamamlandı (Simüle Edildi).");
  return results;
}

// --- İade Senkronizasyonu (Yer Tutucu) ---
export async function syncAllClaims(automationSettings: AutomationSettings | null): Promise<SyncResultDetail[]> {
  const results: SyncResultDetail[] = [];
   if (!automationSettings) {
      console.error("[SyncService:Claims] Otomasyon ayarları yüklenemedi.");
      return [{ type: 'İadeler', status: 'Başarısız', error: "Otomasyon ayarları bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  const users = await findUsersToSync();
   if (!users.length) {
      return [{ type: 'İadeler', status: 'Atlandı', message: "Senkronize edilecek uygun kullanıcı bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  console.log("[SyncService:Claims] Tüm kullanıcılar için iade senkronizasyonu başlıyor (Simüle Edildi)...");

  for (const user of users) {
     if (!user.apiSettings) continue;
    const { id: userId, email } = user;
    console.log(`[SyncService:Claims] Kullanıcı ${userId} (${email}) için işlem başlıyor... (Simüle Edildi)`);
    try {
        // TODO: Gerçek TrendyolClaimService.fetchAllClaims ve TrendyolClaimStorageService.saveMultipleClaims çağrılarını ekle
        await new Promise(resolve => setTimeout(resolve, 200)); // Simülasyon
        results.push({ userId, email, type: 'İadeler', status: 'Başarılı', message: 'İadeler senkronize edildi (Simüle).' });
    } catch (error: any) {
        console.error(`[SyncService:Claims] Kullanıcı ${userId} (${email}) için iade senkronizasyon hatası:`, error.message);
        results.push({ userId, email, type: 'İadeler', status: 'Başarısız', error: error.message });
    }
     console.log(`[SyncService:Claims] Kullanıcı ${userId} (${email}) için işlem tamamlandı (Simüle Edildi).`);
  }
  
  console.log("[SyncService:Claims] Tüm kullanıcılar için iade senkronizasyonu tamamlandı (Simüle Edildi).");
  return results;
}

// --- Müşteri Sorusu Senkronizasyonu (Yer Tutucu) ---
export async function syncAllCustomerQuestions(automationSettings: AutomationSettings | null): Promise<SyncResultDetail[]> {
  const results: SyncResultDetail[] = [];
   if (!automationSettings) {
      console.error("[SyncService:Questions] Otomasyon ayarları yüklenemedi.");
      return [{ type: 'Müşteri Soruları', status: 'Başarısız', error: "Otomasyon ayarları bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  const users = await findUsersToSync();
   if (!users.length) {
      return [{ type: 'Müşteri Soruları', status: 'Atlandı', message: "Senkronize edilecek uygun kullanıcı bulunamadı.", userId: 'SYSTEM', email: null }];
  }

  console.log("[SyncService:Questions] Tüm kullanıcılar için müşteri sorusu senkronizasyonu başlıyor (Simüle Edildi)...");

  for (const user of users) {
     if (!user.apiSettings) continue;
    const { id: userId, email } = user;
    console.log(`[SyncService:Questions] Kullanıcı ${userId} (${email}) için işlem başlıyor... (Simüle Edildi)`);
    try {
        // TODO: Gerçek TrendyolCustomerQuestionService.fetchAllQuestions ve TrendyolCustomerQuestionStorageService.saveMultipleQuestions çağrılarını ekle
        await new Promise(resolve => setTimeout(resolve, 200)); // Simülasyon
        results.push({ userId, email, type: 'Müşteri Soruları', status: 'Başarılı', message: 'Müşteri soruları senkronize edildi (Simüle).' });
    } catch (error: any) {
        console.error(`[SyncService:Questions] Kullanıcı ${userId} (${email}) için müşteri sorusu senkronizasyon hatası:`, error.message);
        results.push({ userId, email, type: 'Müşteri Soruları', status: 'Başarısız', error: error.message });
    }
     console.log(`[SyncService:Questions] Kullanıcı ${userId} (${email}) için işlem tamamlandı (Simüle Edildi).`);
  }
  
  console.log("[SyncService:Questions] Tüm kullanıcılar için müşteri sorusu senkronizasyonu tamamlandı (Simüle Edildi).");
  return results;
} 