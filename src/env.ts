import { z } from "zod";

/**
 * `.env` dosyanızdaki ortam değişkenlerini buraya yazın.
 * SADECE sunucu tarafında kullanılacak değişkenler için `process.env` kullanın.
 * İstemci tarafında da kullanılacak değişkenlerin başına `NEXT_PUBLIC_` ekleyin.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL geçerli bir URL olmalı"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET boş olamaz"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL geçerli bir URL olmalı").optional(),
  
  // PayTR ile ilgili .env'de saklanabilecek yapılandırma değerleri
  PAYTR_IFRAME_URL: z.string().url("PAYTR_IFRAME_URL geçerli bir URL olmalı").default("https://www.paytr.com/odeme/api/get-token"),
  PAYTR_TEST_MODE: z.enum(["0", "1"]).default("0").describe("PayTR Test Modu: 1 = Test, 0 = Canlı"),

  // Diğer genel ortam değişkenleri buraya eklenebilir
  // Örnek: SMTP_HOST: z.string().optional(),
  // NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Geçersiz veya eksik ortam değişkenleri:",
    parsedEnv.error.flatten().fieldErrors,
  );
  // Geliştirme ortamında daha fazla detay göster
  if (process.env.NODE_ENV !== 'production') {
    // console.error("Tüm process.env:", process.env); // Hata ayıklama için
  }
  throw new Error("Ortam değişkenleri yüklenemedi. Lütfen .env dosyanızı ve src/env.ts şemasını kontrol edin.");
}

export const env = parsedEnv.data; 