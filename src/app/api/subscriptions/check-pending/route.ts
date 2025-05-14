import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { Plan, SubscriptionStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json({ error: "Plan ID eksik." }, { status: 400 });
    }

    const pendingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        planId: planId,
        status: SubscriptionStatus.PENDING_PAYMENT,
      },
      include: {
        plan: true, // Plan bilgilerini de çekelim (amount vs. için)
      }
    });

    if (pendingSubscription && pendingSubscription.plan) {
      return NextResponse.json({
        hasPending: true,
        subscription: {
          id: pendingSubscription.id,
          amount: pendingSubscription.plan.priceMonthly, // Ya da faturadan gelen tutar
          currency: pendingSubscription.plan.currency,
          planId: pendingSubscription.planId,
          status: pendingSubscription.status,
        },
      });
    } else {
      return NextResponse.json({ hasPending: false, subscription: null }, { status: 200 });
    }
  } catch (error) {
    console.error("Bekleyen abonelik kontrol hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası.", details: (error as Error).message },
      { status: 500 }
    );
  }
} 