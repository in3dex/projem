'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { db } from '@/lib/db' // Prisma instance için db importu
import { ClaimService } from '@/lib/services/claim-service'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
    }
    const userId = session.user.id

    // API ayarlarını al
    const apiSettings = await db.apiSettings.findUnique({
      where: { userId },
    })

    if (!apiSettings) {
      return NextResponse.json({ error: 'API ayarları bulunamadı.' }, { status: 400 })
    }

    const claimService = new ClaimService(userId, apiSettings)
    const reasons = await claimService.getClaimIssueReasons()

    return NextResponse.json({ data: reasons })

  } catch (error) {
    console.error('[API/CLAIMS_ISSUE_REASONS_GET] Hata:', error)
    const errorMessage = error instanceof Error ? error.message : 'İade red sebepleri getirilirken sunucu hatası oluştu.'
    const statusCode = (error as any).status || 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
} 