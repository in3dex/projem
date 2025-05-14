'use server'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/auth'
import { SubscriptionStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 })
    }
    const userId = session.user.id

    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { status: true } 
    });

    const isActive = subscription?.status === SubscriptionStatus.ACTIVE;

    return NextResponse.json({ isActive: isActive });

  } catch (error) {
    console.error('[API/USER/SUBSCRIPTION_STATUS_GET] Hata:', error)
    return NextResponse.json({ error: 'Abonelik durumu alınırken bir hata oluştu.' }, { status: 500 })
  }
} 