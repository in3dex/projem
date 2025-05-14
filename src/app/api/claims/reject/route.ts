'use server'

import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { ClaimService } from '@/lib/services/claim-service'
import { z } from 'zod'

// İstek body şeması
const rejectSchema = z.object({
  claimId: z.string().uuid("Geçersiz Claim ID formatı."),
  claimLineItemIdList: z.array(z.string().uuid("Geçersiz Claim Item ID formatı.")).min(1, "En az bir iade kalemi seçilmelidir."),
  reasonId: z.number().int().positive("Geçerli bir red sebebi ID'si girilmelidir."),
  description: z.string().min(1, "Red açıklaması zorunludur.").max(200, "Açıklama en fazla 200 karakter olabilir."), // Max karakter sayısı kontrol edilmeli
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.errors }, { status: 400 });
    }

    const { claimId, claimLineItemIdList, reasonId, description } = validation.data;

    // API ayarlarını al
    const apiSettings = await db.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      return NextResponse.json({ error: 'API ayarları bulunamadı.' }, { status: 400 })
    }

    const claimService = new ClaimService(userId, apiSettings)
    
    // İadeyi reddet
    await claimService.rejectClaimItem(claimId, claimLineItemIdList, reasonId, description);

    // Başarı yanıtı
    return NextResponse.json({ message: 'Seçili iade kalemleri başarıyla reddedildi.' })

  } catch (error) {
    console.error('[API/CLAIMS_REJECT_POST] Hata:', error)
    const errorMessage = error instanceof Error ? error.message : 'İade reddedilirken sunucu hatası oluştu.'
    const statusCode = (error as any).response?.status || (error as any).status || 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 