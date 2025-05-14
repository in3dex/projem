"use server";

import { type AutomationSettings } from "@prisma/client";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { auth } from "@/lib/auth/auth"; // Admin kontrolü için
import { db } from "@/lib/db"; // Named export'u kullanacağız

// Helper function (varsa ortak yerden import edilir)
async function verifyAdminRole() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Yetkisiz erişim.");
  }
}

// Form Şeması
const settingsSchema = z.object({
  // Zamanlama Ayarları
  invoiceGenerationDaysBeforeEnd: z.coerce.number().int().min(0).max(30, "En fazla 30 gün önce olabilir"),
  invoiceDueDays: z.coerce.number().int().min(1, "Vade en az 1 gün olmalı").max(30, "Vade en fazla 30 gün olabilir"),
  overdueMarkDays: z.coerce.number().int().min(1, "En az 1 gün sonra").max(30, "En fazla 30 gün sonra"),
  cancelSubscriptionAfterOverdueDays: z.coerce.number().int().min(1, "En az 1 gün sonra").max(90, "En fazla 90 gün sonra"),
  // E-posta Ayarları (Form ile aynı)
  sendSubscriptionEndingSoonEmail: z.boolean().default(true),
  daysBeforeEndingToSendEmail: z.coerce.number().int().min(1, "En az 1 gün önce").max(30, "En fazla 30 gün önce"),
  sendPaymentOverdueEmail: z.boolean().default(true),
  sendSubscriptionCancelledEmail: z.boolean().default(true),
  // Senkronizasyon Ayarları
  syncEnabled: z.boolean().default(false),
  syncIntervalHours: z.coerce.number().int().min(1, "En az 1 saat olmalı").max(168, "En fazla 7 gün (168 saat) olabilir"),
  syncOrders: z.boolean().default(true),
  syncProducts: z.boolean().default(true),
  syncClaims: z.boolean().default(true),
  syncCustomerQuestions: z.boolean().default(true),
});

type SettingsData = z.infer<typeof settingsSchema>;

interface ActionResult {
  success: boolean;
  error?: string;
}

// Ayarları getirme
export async function getAutomationSettings(): Promise<AutomationSettings | null> {
  try {
    // Not: Admin kontrolü burada gerekli olmayabilir, çünkü veritabanından sadece okunuyor.
    // Ancak güvenlik katmanı olarak eklenebilir.
    const settings = await db.automationSettings.findUnique({
      where: { id: "singleton" },
    });
    // Eğer settings null ise (ilk defa çalışıyor), varsayılanlarla oluşturabiliriz.
    if (!settings) {
         console.log("Otomasyon ayarları bulunamadı, varsayılanlarla oluşturuluyor...");
        return await db.automationSettings.create({
             data: { id: "singleton" } // Varsayılan değerler şemada tanımlı
         });
     }
    return settings;
  } catch (error) {
    console.error("Otomasyon ayarları getirilirken hata:", error);
    throw new Error("Otomasyon ayarları alınamadı.");
  }
}

// Ayarları güncelleme
export async function updateAutomationSettings(data: unknown): Promise<ActionResult> {
  try {
    await verifyAdminRole(); // Güncelleme için admin yetkisi şart

    const validationResult = settingsSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return { success: false, error: `Geçersiz veri: ${JSON.stringify(errors)}` };
    }

    const settingsData = validationResult.data;

    await db.automationSettings.update({
      where: { id: "singleton" },
      data: settingsData,
    });

    revalidatePath("/admin/settings/automation"); // Cache temizle
    return { success: true };

  } catch (error: unknown) {
    console.error("Otomasyon ayarları güncellenirken hata:", error);
     let errorMessage = "Ayarlar güncellenirken bir hata oluştu.";
     if (error instanceof Error) { errorMessage = error.message; }
    return { success: false, error: errorMessage };
  }
} 