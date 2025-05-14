"use server";

import { PrismaClient, Plan, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { planSchema, PlanFormData } from "@/lib/validations/plan";
import { z } from "zod";

const prisma = new PrismaClient();

// Yardımcı fonksiyon: Özellikleri JSON'a çevir (şimdilik string olarak bırakıyoruz)
// function parseFeatures(featuresString?: string): JsonValue | null {
//   if (!featuresString) return null;
//   try {
//     // Basitçe virgülle ayrılmış stringleri array'e çevirelim
//     return featuresString.split(',').map(f => f.trim()).filter(f => f);
//   } catch (error) {
//     console.error("Özellikler JSON parse hatası:", error);
//     return null; // Hata durumunda null döndür
//   }
// }

// --- CREATE PLAN --- 
export async function createPlan(formData: PlanFormData): Promise<{ success: boolean; message: string; plan?: Plan }> {
  try {
    const validatedData = planSchema.parse(formData);

    // features alanını parse etme (her satır bir özellik)
    const featuresArray = validatedData.features
        ? validatedData.features.split('\n').map(f => f.trim()).filter(f => f)
        : [];

    const newPlan = await prisma.plan.create({
      data: {
        ...validatedData,
        priceMonthly: validatedData.priceMonthly ?? null,
        priceYearly: validatedData.priceYearly ?? null,
        maxProducts: validatedData.maxProducts ?? null,
        maxOrders: validatedData.maxOrders ?? null,
        maxUsers: validatedData.maxUsers ?? null,
        features: featuresArray, // JSON olarak kaydet
      },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/fiyatlandirma");
    
    return { success: true, message: "Plan başarıyla oluşturuldu.", plan: newPlan };

  } catch (error) {
    console.error("Plan oluşturma hatası:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Doğrulama hatası: ${error.errors.map(e => e.message).join(", ")}` };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       return { success: false, message: "Bu isimde bir plan zaten mevcut." };
    }
    return { success: false, message: "Plan oluşturulurken bir hata oluştu." };
  }
}

// --- UPDATE PLAN --- 
export async function updatePlan(planId: string, formData: PlanFormData): Promise<{ success: boolean; message: string; plan?: Plan }> {
   if (!planId) {
      return { success: false, message: "Plan ID'si gerekli." };
   }
   
  try {
    const validatedData = planSchema.parse(formData);
    
    const featuresArray = validatedData.features
        ? validatedData.features.split('\n').map(f => f.trim()).filter(f => f)
        : [];

    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: {
         name: validatedData.name,
         description: validatedData.description,
         priceMonthly: validatedData.priceMonthly ?? null,
         priceYearly: validatedData.priceYearly ?? null,
         features: featuresArray,
         isActive: validatedData.isActive,
         maxProducts: validatedData.maxProducts ?? null,
         maxMonthlyOrders: validatedData.maxOrders ?? null,
      },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/fiyatlandirma");

    return { success: true, message: "Plan başarıyla güncellendi.", plan: updatedPlan };

  } catch (error) {
    console.error(`Plan (${planId}) güncelleme hatası:`, error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Doğrulama hatası: ${error.errors.map(e => e.message).join(", ")}` };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       const target = (error.meta?.target as string[])?.join(', ') || 'Bilinmeyen alan';
       return { success: false, message: `Güncelleme başarısız. Belirtilen değer (${target}) başka bir planda zaten kullanılıyor.` };
    }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return { success: false, message: "Güncellenecek plan bulunamadı." };
    }
    return { success: false, message: "Plan güncellenirken bir hata oluştu." };
  }
}

// --- UPDATE PLAN STATUS --- 
export async function updatePlanStatus(planId: string, newStatus: boolean): Promise<{ success: boolean; message: string }> {
   if (!planId) {
      return { success: false, message: "Plan ID'si gerekli." };
   }
   
  try {
    await prisma.plan.update({
      where: { id: planId },
      data: { isActive: newStatus },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/fiyatlandirma");

    return { success: true, message: `Plan durumu başarıyla ${newStatus ? 'Aktif' : 'Pasif'} olarak güncellendi.` };

  } catch (error) {
    console.error(`Plan (${planId}) durum güncelleme hatası:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return { success: false, message: "Durumu güncellenecek plan bulunamadı." };
    }
    return { success: false, message: "Plan durumu güncellenirken bir hata oluştu." };
  }
}

// --- DELETE PLAN --- 
export async function deletePlan(planId: string): Promise<{ success: boolean; message: string }> {
   if (!planId) {
      return { success: false, message: "Plan ID'si gerekli." };
   }

  try {
     const activeSubscriptions = await prisma.subscription.count({
       where: {
         planId: planId,
         // status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } // Gerekirse aktifleri kontrol et
       },
     });

     if (activeSubscriptions > 0) {
       return {
         success: false,
         message: `Bu plan silinemez çünkü ${activeSubscriptions} adet ilişkili abonelik bulunmaktadır.`,
       };
     }

    await prisma.plan.delete({
      where: { id: planId },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/fiyatlandirma");

    return { success: true, message: "Plan başarıyla silindi." };

  } catch (error) {
    console.error(`Plan (${planId}) silme hatası:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return { success: false, message: "Silinecek plan bulunamadı." };
    }
    return { success: false, message: "Plan silinirken bir hata oluştu." };
  }
} 