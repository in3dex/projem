'use server'

import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { ClaimService } from '@/lib/services/claim-service'
import { z } from 'zod'

// İstek body şeması
const approveSchema = z.object({
  claimId: z.string().uuid("Geçersiz Claim ID formatı."),
  claimLineItemIdList: z.array(z.string().uuid("Geçersiz Claim Item ID formatı.")).min(1, "En az bir iade kalemi seçilmelidir."),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json();
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.errors }, { status: 400 });
    }

    const { claimId, claimLineItemIdList } = validation.data;

    // API ayarlarını al
    const apiSettings = await db.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      return NextResponse.json({ error: 'API ayarları bulunamadı.' }, { status: 400 })
    }

    const claimService = new ClaimService(userId, apiSettings)
    
    // İadeyi onayla
    await claimService.approveClaimItems(claimId, claimLineItemIdList);

    // Başarı yanıtı
    return NextResponse.json({ message: 'Seçili iade kalemleri başarıyla onaylandı.' })

  } catch (error) {
    console.error('[API/CLAIMS_APPROVE_PUT] Hata:', error)
    const errorMessage = error instanceof Error ? error.message : 'İade onaylanırken sunucu hatası oluştu.'
     // Trendyol API'den gelen spesifik hataları yakalamak için status kontrolü
    const statusCode = (error as any).response?.status || (error as any).status || 500; 
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 