"use server";

import { PrismaClient, SmtpSettings } from "@prisma/client";
import { sendMail } from "@/lib/email"; // Doğrudan mail gönderme fonksiyonu
import { revalidatePath } from "next/cache";
import * as z from "zod";

const prisma = new PrismaClient();

// Yeni: SMTP Ayarları Form Şeması
const smtpSettingsSchema = z.object({
  host: z.string().min(3, "Host gerekli"),
  port: z.number().int().positive("Geçerli bir port girin"),
  secure: z.boolean(),
  username: z.string().optional().transform(e => e === "" ? undefined : e),
  password: z.string().optional().transform(e => e === "" ? undefined : e),
  from: z.string().email("Geçerli bir gönderen e-posta adresi girin").optional().transform(e => e === "" ? undefined : e),
  fromName: z.string().min(2, "Gönderen adı gerekli"),
});

// Yeni: SMTP ayarlarını getirme fonksiyonu
export async function getSmtpSettings(): Promise<SmtpSettings | null> {
    try {
      // TODO: Admin rol kontrolü eklenmeli
      const settings = await prisma.smtpSettings.findUnique({
        where: { id: "singleton" }, // Sabit ID varsayımı
      });
      return settings;
    } catch (error) {
      console.error("SMTP ayarları getirilirken hata:", error);
      throw new Error("SMTP ayarları alınamadı.");
    }
  }

// Yeni: SMTP ayarlarını güncelleme/oluşturma fonksiyonu
export async function updateSmtpSettings(data: unknown): Promise<ActionResult> {
    try {
        // TODO: Admin rol kontrolü eklenmeli
        const validationResult = smtpSettingsSchema.safeParse(data);
        if (!validationResult.success) {
          // Hataları formatlayabiliriz
          const errors = validationResult.error.flatten().fieldErrors;
          return { success: false, error: `Geçersiz veri: ${JSON.stringify(errors)}` };
        }

        const settingsData = validationResult.data;

        // Sabit ID ile güncelle veya oluştur (upsert)
        const upsertData = {
            host: settingsData.host,
            port: settingsData.port,
            secure: settingsData.secure,
            username: settingsData.username,
            password: settingsData.password,
            from: settingsData.from,
            fromName: settingsData.fromName,
        };

        await prisma.smtpSettings.upsert({
            where: { id: "singleton" },
            update: upsertData,
            create: { 
                id: "singleton",
                ...upsertData
            },
        });

        revalidatePath("/admin/settings/email"); // Cache temizle (yol güncellendi)
        return { success: true };

    } catch (error) {
        console.error("SMTP ayarları güncellenirken hata:", error);
        return { success: false, error: "Veritabanı hatası oluştu." };
    }
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function sendTestEmail(toEmail: string): Promise<ActionResult> {
  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, error: "Geçerli bir test e-posta adresi girin." };
  }

  try {
    // Kaydedilmiş SMTP ayarlarını al
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
    });

    console.log("--- SMTP Ayarları Kontrol Öncesi Loglar ---");
    console.log("Ayarlar objesi:", settings);
    console.log("settings === null:", settings === null);
    console.log("settings === undefined:", settings === undefined);
    console.log("typeof settings:", typeof settings);
    console.log("settings?.host:", settings?.host, " | typeof host:", typeof settings?.host);
    console.log("settings?.port:", settings?.port, " | typeof port:", typeof settings?.port);
    console.log("settings?.from:", settings?.from, " | typeof from:", typeof settings?.from);
    console.log("settings?.fromName:", settings?.fromName, " | typeof fromName:", typeof settings?.fromName);
    console.log("--- Log Sonu ---");

    // Hem null/undefined hem de boş string kontrolü yapalım
    const isSettingsIncomplete = (
      !settings || 
      !settings.host || settings.host === "" ||
      !settings.port || 
      !settings.from || settings.from === "" || 
      !settings.fromName || settings.fromName === ""
    );

    if (isSettingsIncomplete) {
      console.error("SMTP ayarları eksik veya bulunamadı. E-posta gönderilemiyor.");
      console.error("Kontrol Detayları:", {
        settingsExists: !!settings,
        hostValue: settings?.host,
        hostIsEmptyString: settings?.host === "",
        portValue: settings?.port,
        fromValue: settings?.from,
        fromIsEmptyString: settings?.from === "",
        fromNameValue: settings?.fromName,
        fromNameIsEmptyString: settings?.fromName === "",
        // username ve password kontrol edilmiyor, ama loglayabiliriz
        usernameValue: settings?.username,
        passwordExists: !!settings?.password // Şifreyi loglamayalım, varlığını kontrol edelim
      });
      return { success: false, error: "SMTP ayarları eksik veya kaydedilmemiş." };
    }

    console.log("SMTP ayarları başarıyla çekildi, test e-posta gönderiliyor...");
    console.log("Ayarlar:", { // Çekilen ayarları logla
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      from: settings.from,
      fromName: settings.fromName,
    });

    // Test e-postası gönder
    const subject = "Projem SMTP Test E-postası";
    const text = "Bu, Projem platformundan gönderilen bir test e-postasıdır. SMTP ayarlarınız doğru yapılandırılmış.";
    const html = `<p>${text}</p>`;

    // sendMail fonksiyonu SMTP ayarlarını zaten kendisi alıyor
    const mailSent = await sendMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    if (mailSent) {
      return { success: true };
    } else {
      // sendMail içindeki hata loglanır, burada genel bir mesaj verebiliriz
      return { success: false, error: "E-posta gönderilemedi. SMTP ayarlarını ve konsol loglarını kontrol edin." };
    }

  } catch (error) {
    console.error("Test e-postası gönderme hatası:", error);
    return { success: false, error: "Sunucu tarafında bir hata oluştu." };
  }
} 