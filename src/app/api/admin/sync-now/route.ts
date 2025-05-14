import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { 
    syncAllOrders, 
    syncAllProducts, 
    syncAllClaims, 
    syncAllCustomerQuestions 
} from "@/lib/services/sync-service"; // Doğru sync servisinden import et

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Bu işlem için yetkiniz yok." },
        { status: 403 }
      );
    }

    const automationSettings = await db.automationSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!automationSettings) {
      // Ayarlar bulunamazsa bile manuel senkronizasyon denenebilir mi?
      // Veya hata mı döndürmeli? Şimdilik hata döndürelim.
      return NextResponse.json(
        { success: false, message: "Otomasyon ayarları bulunamadı." },
        { status: 404 }
      );
    }
    
    console.log("[SYNC-NOW] Manuel senkronizasyon başlatılıyor (Ayarlara göre)...");
    const combinedResults = [];
    let overallStatus: string = "Başarılı";
    let syncExecuted = false; // En az bir senkronizasyon çalıştırıldı mı?

    if (automationSettings.syncOrders) {
      console.log("[SYNC-NOW] syncAllOrders çağrılıyor...");
      const orderResults = await syncAllOrders(automationSettings);
      combinedResults.push(...orderResults);
      if (orderResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
      syncExecuted = true;
    }

    if (automationSettings.syncProducts) {
      console.log("[SYNC-NOW] syncAllProducts çağrılıyor...");
      const productResults = await syncAllProducts(automationSettings);
      combinedResults.push(...productResults);
      if (productResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
      syncExecuted = true;
    }

    if (automationSettings.syncClaims) {
      console.log("[SYNC-NOW] syncAllClaims çağrılıyor...");
      const claimResults = await syncAllClaims(automationSettings);
      combinedResults.push(...claimResults);
      if (claimResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
      syncExecuted = true;
    }

    if (automationSettings.syncCustomerQuestions) {
      console.log("[SYNC-NOW] syncAllCustomerQuestions çağrılıyor...");
      const questionResults = await syncAllCustomerQuestions(automationSettings);
      combinedResults.push(...questionResults);
      if (questionResults.some(r => r.status === 'Başarısız')) overallStatus = "Kısmen Başarısız";
      syncExecuted = true;
    }
    
    if (!syncExecuted) {
        return NextResponse.json({
          success: true, 
          message: "Ayarlarda aktif senkronizasyon bulunmadığı için işlem yapılmadı.",
          details: [],
          executedAt: new Date().toISOString(),
        });
    }

    // Manuel senkronizasyon yapıldığında da lastSyncTime güncellenmeli (eğer tümü başarılıysa?)
    // Şimdilik her manuel çalıştırmada güncelleyelim.
    await db.automationSettings.update({
        where: { id: "singleton" },
        data: { lastSyncTime: new Date() }, // Veya sadece başarılıysa güncellenebilir
    });
    

    console.log(`[SYNC-NOW] Manuel senkronizasyon tamamlandı. Genel Durum: ${overallStatus}`);
    return NextResponse.json({
      success: true, // API isteği başarılı, detaylar combinedResults içinde
      message: `Manuel senkronizasyon tamamlandı. Genel Durum: ${overallStatus}`,
      details: combinedResults,
      executedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("[SYNC-NOW] API genel hatası:", error.message, error.stack);
    return NextResponse.json(
      {
        success: false,
        message: "Senkronizasyon sırasında genel bir hata oluştu.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST_OLD fonksiyonu artık gereksiz, kaldırılabilir. 