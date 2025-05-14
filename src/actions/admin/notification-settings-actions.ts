"use server";

import { PrismaClient, NotificationType } from "@prisma/client";
import * as z from "zod";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// Formdan gelen verinin şeması
// Sadece genel ayarı içeriyor şimdilik
const settingsFormSchema = z.object({
  notificationsEnabled: z.boolean(),
  // Tür bazlı ayarlar eklenecek
  // ...(Object.fromEntries(
  //   Object.values(NotificationType).map(type => [type, z.boolean()])
  // ) as Record<NotificationType, z.ZodBoolean>)
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface ActionResult {
  success: boolean;
  error?: string;
}

// Ayarları getirme fonksiyonu
// Şimdilik sadece SmtpSettings'den genel durumu alıyor
export async function getNotificationSettings(): Promise<SettingsFormValues | null> {
  try {
    const smtpSettings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" }, // Singleton ID
    });

    // Varsayılan değerleri burada oluşturabiliriz
    const defaultSettings: SettingsFormValues = {
      notificationsEnabled: smtpSettings?.notificationsEnabled ?? true,
      // Tür bazlı varsayılanlar (şimdilik hepsi true)
      // ...(Object.fromEntries(
      //   Object.values(NotificationType).map(type => [type, true])
      // ) as Record<NotificationType, boolean>)
    };

    // Eğer tür bazlı ayarlar ayrı bir yerde tutuluyorsa, burada birleştirilir

    return defaultSettings;

  } catch (error) {
    console.error("Bildirim ayarları getirilirken hata:", error);
    return null;
  }
}

// Ayarları güncelleme fonksiyonu
export async function updateNotificationSettings(data: unknown): Promise<ActionResult> {
  const validationResult = settingsFormSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Geçersiz veri." };
  }

  const { notificationsEnabled, ...typeSettings } = validationResult.data;

  try {
    // 1. Genel durumu güncelle (SmtpSettings)
    await prisma.smtpSettings.upsert({
      where: { id: "singleton" },
      update: { notificationsEnabled },
      create: {
        id: "singleton",
        notificationsEnabled,
        // Diğer SMTP alanları için varsayılanlar veya null
      },
    });

    // 2. Tür bazlı ayarları güncelle (henüz implemente edilmedi)
    // Örneğin: await updateTypeBasedSettings(typeSettings);

    revalidatePath("/admin/settings/notification-settings"); // Cache temizle
    return { success: true };

  } catch (error) {
    console.error("Prisma bildirim ayarları güncelleme hatası:", error);
    return { success: false, error: "Veritabanı hatası oluştu." };
  }
} 