"use server";

import { PrismaClient, EmailTemplate, EmailTemplateType } from "@prisma/client";
import * as z from "zod";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// Yeni: Tüm şablonları getirme fonksiyonu
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    // TODO: Admin rol kontrolü eklenmeli (verifyAdminRole gibi)
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' } // Türe göre sırala
    });
    return templates;
  } catch (error) {
    console.error("E-posta şablonları getirilirken hata:", error);
    throw new Error("E-posta şablonları alınamadı.");
  }
}

// Formdan gelen verinin şeması
const templateFormSchema = z.object({
  id: z.string(),
  subject: z.string().min(3),
  description: z.string().optional(),
  htmlBody: z.string().min(10),
  isActive: z.boolean(),
});

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateEmailTemplate(data: unknown): Promise<ActionResult> {
  const validationResult = templateFormSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Geçersiz veri." };
  }

  const { id, ...updateData } = validationResult.data;

  try {
    await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/settings/email-templates"); // Cache temizle
    return { success: true };

  } catch (error) {
    console.error("Prisma e-posta şablonu güncelleme hatası:", error);
    return { success: false, error: "Veritabanı hatası oluştu." };
  }
}

// İlk çalıştırmada şablonları oluşturmak için bir seed fonksiyonu da eklenebilir
// (veya prisma seed kullanılabilir) 