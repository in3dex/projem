import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Zod şeması ile gelen veriyi doğrulayalım
const siteSettingsSchema = z.object({
  siteName: z.string().optional(),
  logoUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  logoDarkUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  faviconUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  appleTouchIconUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(), // Virgülle ayrılmış string olarak kalabilir, client'ta işlenebilir
  googleAnalyticsId: z.string().optional(),
  defaultOpenGraphImageUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  contactAddress: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal('')),
  contactWorkingHours: z.string().optional(),
  contactMapLat: z.string().optional(),
  contactMapLng: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
  showMapOnContactPage: z.boolean().optional(),
  socialFacebook: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialInstagram: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialX: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialLinkedin: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialYoutube: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialTiktok: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  socialWhatsapp: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
  footerText: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  headerScripts: z.string().optional(),
  footerScripts: z.string().optional(),
});

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
      return NextResponse.json(settings);
    } else {
      // Henüz ayar yoksa, boş bir obje veya varsayılan değerler döndürülebilir.
      // Ya da ilk ayar kaydını burada oluşturabiliriz.
      // Şimdilik boş bir obje gibi davranalım, client tarafı bunu yönetir.
      return NextResponse.json({}); 
    }
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return NextResponse.json(
      { error: "Ayarlar alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = siteSettingsSchema.parse(body);

    // Genellikle tek bir site ayarı olacağı için upsert kullanıyoruz.
    // Eğer birden fazla ayar seti yönetilecekse, id veya başka bir unique alan gerekir.
    // Şimdilik, ilk kaydı bulup güncelleyeceğiz veya yoksa oluşturacağız.
    const existingSettings = await prisma.siteSettings.findFirst();

    const settings = await prisma.siteSettings.upsert({
      where: { id: existingSettings?.id || "non-existent-id" }, // Eğer yoksa, create tetiklenir
      update: validatedData,
      create: validatedData,
    });

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error updating site settings:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Ayarlar güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
} 