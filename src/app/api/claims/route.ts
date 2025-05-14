'use server'

import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import { ClaimService } from '@/lib/services/claim-service'
import { serializeBigInts } from '@/lib/utils/serialization' // BigInt serialize etmek için yardımcı fonksiyon
import type { JwtPayload } from 'jsonwebtoken' // JwtPayload tipini import edelim
import { z } from 'zod'
import { SubscriptionStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
    }
    const userId = session.user.id

    // ---------- YENİ: Abonelik Kontrolü Başlangıç ----------
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { status: true } // Sadece durumu kontrol etmek yeterli
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      console.warn(`Kullanıcı ${userId} için aktif abonelik bulunamadı. İade senkronizasyonu engellendi.`);
      // Senkronizasyon isteği ise hata döndür, normal GET isteği devam edebilir (opsiyonel)
      const { searchParams } = new URL(request.url)
      if (searchParams.get('sync') === 'true') { 
          return NextResponse.json({
            error: 'Aktif Abonelik Gerekli',
            details: 'Bu işlemi gerçekleştirmek için aktif bir aboneliğe sahip olmanız gerekmektedir.'
          }, { status: 402 }); // 402 Payment Required
      } // else: normal veri çekme isteği için devam et?
    }
    // ---------- YENİ: Abonelik Kontrolü Bitiş ----------

    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const sync = searchParams.get('sync') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const size = parseInt(searchParams.get('size') || '10')
    const status = searchParams.get('status') || undefined
    const searchTerm = searchParams.get('search') || undefined
    // TODO: startDate ve endDate filtrelerini de ekle

    // API ayarlarını al
    const apiSettings = await prisma.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      console.warn(`API ayarları bulunamadı, Kullanıcı ID: ${userId}`);
      return NextResponse.json({ error: 'API ayarları bulunamadı. Lütfen Ayarlar sayfasından bilgilerinizi girin.' }, { status: 400 })
    }

    const claimService = new ClaimService(userId, apiSettings)

    // Senkronizasyon istenmişse ve abonelik aktifse yap
    if (sync && subscription?.status === SubscriptionStatus.ACTIVE) {
      console.log('İade senkronizasyonu başlatılıyor...')
      // Strateji 1: Tüm önemli iade statüleri için ayrı ayrı senkronizasyon yap
      const statusesToSync: string[] = [
        "Created", 
        "WaitingInAction", 
        "Accepted", 
        "Rejected", 
        "Unresolved", 
        "InAnalysis",
        "Cancelled" // Cancelled da önemli olabilir
      ];
      let totalSyncedThisSession = 0;

      for (const statusToSync of statusesToSync) {
        console.log(`Senkronize edilecek iade statüsü: ${statusToSync}`);
        try {
          // orderByField ve orderByDirection varsayılan olarak ClaimService içinde LastModifiedDate, DESC olacak
          const syncResult = await claimService.syncClaims({
            claimItemStatus: statusToSync 
            // size: 50, // ClaimService içinde varsayılan 50. İstenirse buradan override edilebilir.
          });
          console.log(`${statusToSync} statüsü için ${syncResult.syncedCount} iade işlendi. API toplam ${syncResult.totalPages} sayfa bildirdi, son işlenen sayfa ${syncResult.currentPage}.`);
          totalSyncedThisSession += syncResult.syncedCount;
        } catch (e) {
          console.error(`${statusToSync} statüsündeki iadeler senkronize edilirken hata oluştu:`, e);
          // Bir statüde hata olursa logla ve diğerleriyle devam et
        }
      }
      console.log(`Tüm statüler için iade senkronizasyonu tamamlandı. Bu oturumda toplam ${totalSyncedThisSession} iade işlendi.`);
    }

    // Veritabanından iadeleri al
    const { claims, totalCount } = await claimService.getClaimsFromDb({
      page,
      size,
      status: status === 'all' ? undefined : status, // 'all' seçeneği için filtreyi kaldır
      searchTerm,
    })

    // Yanıtı serialize et (BigInt ve Json alanları için)
    const serializableClaims = claims.map(claim => ({
      ...claim,
      // BigInt alanları serialize ediliyor
      claimItems: claim.claimItems.map(item => serializeBigInts(item)),
      // JSON alanları zaten string veya null
      rejectedPackageInfo: claim.rejectedPackageInfo ? JSON.parse(claim.rejectedPackageInfo as string) : null,
      replacementPackageInfo: claim.replacementPackageInfo ? JSON.parse(claim.replacementPackageInfo as string) : null,
    }));

    const totalPages = Math.ceil(totalCount / size)

    return NextResponse.json({
      data: serializableClaims,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: size,
      },
    })

  } catch (error) {
    console.error('[API/CLAIMS_GET] Hata:', error)
    const errorMessage = error instanceof Error ? error.message : 'İadeler getirilirken sunucu hatası oluştu.'
    // Özel hata mesajları (örn: API ayarları eksik) ClaimService'den gelebilir
    const statusCode = (error as any).status || 500; // Hata servisten geliyorsa status kodunu kullan
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 