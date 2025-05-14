'use server'

import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import { ClaimService } from '@/lib/services/claim-service'
import type { JwtPayload } from 'jsonwebtoken'

const prisma = new PrismaClient()
// const claimService = new ClaimService() // Global ve parametresiz instance kaldırıldı

// RouteParams arayüzünü kaldır
// interface RouteParams {
//     params: { claimItemId: string } // Dinamik segmentten gelen parametre
// }

// Fonksiyon imzasını standart App Router formatına çevir
export async function GET(
    request: NextRequest,
    { params }: { params: { claimItemId: string } }
) {
    // claimItemId'yi try bloğunun dışında tanımla
    const claimItemId = params?.claimItemId;
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
        }
        const userId = session.user.id

        // params objesinin varlığını kontrol et ve claimItemId'yi al
        if (!claimItemId) {
            return NextResponse.json({ error: 'İade kalemi ID\'si eksik.' }, { status: 400 });
        }

        // API ayarlarını al
        const apiSettings = await prisma.apiSettings.findUnique({
            where: { userId },
        });

        if (!apiSettings) {
            console.warn(`API ayarları bulunamadı, Kullanıcı ID: ${userId}`);
            return NextResponse.json({ error: 'API ayarları bulunamadı. Lütfen Ayarlar sayfasından bilgilerinizi girin.' }, { status: 400 });
        }

        // Veritabanından claim item'ı bulup Trendyol ID'sini almamız GEREKEBİLİR.
        // Ancak audit log endpoint'i doğrudan Trendyol'un claimItem ID'sini (UUID) istiyor.
        // Frontend'den bu UUID'nin gelmesini bekleyeceğiz.
        // Eğer veritabanı ID'si geliyorsa, önce onu bulup trendyolClaimItemId'yi almamız lazım.
        // Şimdilik URL'den gelenin Trendyol ID'si olduğunu varsayıyoruz.

        const claimServiceInstance = new ClaimService(userId, apiSettings); // Yeni instance oluştur

        // Audit loglarını al
        const auditLogs = await claimServiceInstance.getClaimItemAudits(claimItemId);

        // Timestamp'leri Date nesnesine çevirmeye gerek yok, frontend halledebilir.
        // Yanıtı doğrudan döndürelim.
        return NextResponse.json({ data: auditLogs });

    } catch (error) {
        console.error(`[API/CLAIMS_AUDIT_GET] Hata (ClaimItemID: ${claimItemId}):`, error);
        const errorMessage = error instanceof Error ? error.message : 'Audit logları getirilirken sunucu hatası oluştu.';
        const statusCode = (error as any).status || 500;
        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { claimItemId: string } }
) {
    // claimItemId'yi try bloğunun dışında tanımla
    const claimItemId = params?.claimItemId;
    try {
        // 1. Kimlik Doğrulama
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
        }
        const userId = session.user.id

        // 2. Parametreleri Al
        if (!claimItemId) {
            return NextResponse.json({ error: 'İade kalemi ID\'si eksik.' }, { status: 400 });
        }

        // 3. Body'yi Al (auditReason için)
        const body = await request.json();
        const auditReason = body?.auditReason;
        if (!auditReason) {
             return NextResponse.json({ error: 'Denetleme nedeni (auditReason) eksik.' }, { status: 400 });
        }

        // 4. API Ayarlarını Al
        const apiSettings = await prisma.apiSettings.findUnique({
            where: { userId: userId },
        });
        if (!apiSettings || !apiSettings.apiKey || !apiSettings.apiSecret || !apiSettings.sellerID) {
            return NextResponse.json({ error: 'API ayarları eksik veya bulunamadı.' }, { status: 400 });
        }

        // 5. Servis Fonksiyonunu Çağır
        // claimService yerine yeni bir instance oluşturulmalı
        const claimServiceInstance = new ClaimService(userId, apiSettings);
        // auditClaimItem metodu ClaimService'te tanımlı değil, bunu eklememiz gerekecek.
        // Şimdilik bu kısmı yorum satırına alıyorum, önce GET'i düzeltelim.
        /*
        await claimServiceInstance.auditClaimItem(
            claimItemId,
            auditReason
        );
        */
        // auditClaimItem metodunu ClaimService'e ekledikten sonra burayı açmalıyız.
        // Şimdilik sadece 200 döndürelim veya hata verelim.
        return NextResponse.json({ error: 'Audit POST metodu henüz implemente edilmedi.' }, { status: 501 });

        // return NextResponse.json({ message: 'İade kalemi başarıyla denetlendi.' }, { status: 200 });

    } catch (error: unknown) {
        console.error(`İade denetleme hatası (ClaimItemID: ${claimItemId}):`, error);
        const errorMessage = error instanceof Error ? error.message : 'İade kalemi denetlenirken bir hata oluştu.';
        const statusCode = (error as any).status || 500;
        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
} 