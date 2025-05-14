import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  context: { params: { planId: string } }
) {
  try {
    // Next.js 15+ ile gelen değişiklik: params await edilmeli
    const { planId } = await context.params;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID gerekli" },
        { status: 400 }
      );
    }

    // Planı veritabanından al
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan bulunamadı" },
        { status: 404 }
      );
    }

    // Features dizisine çevrilmesi
    const formattedPlan = {
      ...plan,
      features: Array.isArray(plan.features) 
        ? plan.features 
        : typeof plan.features === 'string' 
          ? [plan.features] 
          : [],
    };

    return NextResponse.json({ 
      plan: formattedPlan 
    });
  } catch (error) {
    console.error("Plan detayları getirme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
} 