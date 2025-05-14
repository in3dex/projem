import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
    syncAllOrders, 
    syncAllProducts, 
    syncAllClaims, 
    syncAllCustomerQuestions 
} from "@/lib/services/sync-service"; // Yeni sync servisinden import et
import { ApiSettings, AutomationSettings, SubscriptionStatus, User } from "@prisma/client";

interface UserWithApiSettings extends User {
  apiSettings: ApiSettings | null;
}

// Örnek ve yer tutucu senkronizasyon fonksiyonları
async function syncProductsForUser(userId: string, apiSettings: ApiSettings) {
  console.log(`[CRON] Kullanıcı ${userId} için ürünler senkronize ediliyor... (Simüle Edildi)`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simülasyon
  return { success: true, message: "Ürünler başarıyla senkronize edildi (Simüle)." };
}
async function syncClaimsForUser(userId: string, apiSettings: ApiSettings) {
  console.log(`[CRON] Kullanıcı ${userId} için iadeler senkronize ediliyor... (Simüle Edildi)`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simülasyon
  return { success: true, message: "İadeler başarıyla senkronize edildi (Simüle)." };
}
async function syncCustomerQuestionsForUser(userId: string, apiSettings: ApiSettings) {
  console.log(`[CRON] Kullanıcı ${userId} için müşteri soruları senkronize ediliyor... (Simüle Edildi)`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simülasyon
  return { success: true, message: "Müşteri soruları başarıyla senkronize edildi (Simüle)." };
}


export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    console.warn("[CRON] Yetkisiz cron job erişim denemesi.");
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    console.log("[CRON] Cron job çalıştırılıyor...");

    const automationSettings = await db.automationSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!automationSettings) {
      console.error("[CRON] Otomasyon ayarları bulunamadı.");
      return NextResponse.json({ error: "Otomasyon ayarları bulunamadı." }, { status: 500 });
    }

    if (!automationSettings.syncEnabled) {
      console.log("[CRON] Otomatik senkronizasyon devre dışı bırakılmış.");
      return NextResponse.json({ message: "Otomatik senkronizasyon devre dışı." });
    }

    const lastSyncTime = automationSettings.lastSyncTime || new Date(0);
    const now = new Date();
    const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastSync < automationSettings.syncIntervalHours) {
      console.log(`[CRON] Son senkronizasyondan bu yana ${hoursSinceLastSync.toFixed(2)} saat geçmiş. Minimum ${automationSettings.syncIntervalHours} saat gerekli.`);
      return NextResponse.json({ 
        message: "Son senkronizasyondan bu yana yeterli zaman geçmemiş.", 
        lastSync: lastSyncTime,
        nextSyncIn: (automationSettings.syncIntervalHours - hoursSinceLastSync).toFixed(2) + " saat"
      });
    }

    console.log("[CRON] Senkronizasyon işlemleri başlatılıyor...");
    const combinedResults = [];
    let overallStatus: string = "Başarılı";

    if (automationSettings.syncOrders) {
        console.log("[CRON] syncAllOrders çağrılıyor...");
        const orderResults = await syncAllOrders(automationSettings);
        combinedResults.push(...orderResults);
        if (orderResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
    }

    if (automationSettings.syncProducts) {
        console.log("[CRON] syncAllProducts çağrılıyor...");
        const productResults = await syncAllProducts(automationSettings);
        combinedResults.push(...productResults);
        if (productResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
    }

    if (automationSettings.syncClaims) {
        console.log("[CRON] syncAllClaims çağrılıyor...");
        const claimResults = await syncAllClaims(automationSettings);
        combinedResults.push(...claimResults);
         if (claimResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
    }

    if (automationSettings.syncCustomerQuestions) {
         console.log("[CRON] syncAllCustomerQuestions çağrılıyor...");
        const questionResults = await syncAllCustomerQuestions(automationSettings);
        combinedResults.push(...questionResults);
         if (questionResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
    }
    
    // Diğer otomasyon işlemleri buraya eklenebilir.

    await db.automationSettings.update({
      where: { id: "singleton" },
      data: { lastSyncTime: new Date() },
    });

    console.log(`[CRON] Cron işlemleri tamamlandı. Genel Durum: ${overallStatus}`);
    return NextResponse.json({ 
      message: `Cron işlemleri tamamlandı. Genel Durum: ${overallStatus}`,
      executedAt: now.toISOString(),
      details: combinedResults
    });

  } catch (error: any) {
    console.error("[CRON_ERROR] Genel Hata:", error.message, error.stack);
    return NextResponse.json({ error: "Cron işlemi sırasında genel bir hata oluştu.", details: error.message }, { status: 500 });
  }
}
