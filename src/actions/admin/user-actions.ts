"use server";

import { PrismaClient, Role } from "@prisma/client";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// Formdan gelen verinin şeması (UserForm'daki ile aynı olmalı)
const userFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  companyName: z.string().optional(),
});

// Action'ın dönüş tipi için arayüz
interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createUser(data: unknown): Promise<ActionResult> {
  // 1. Gelen veriyi doğrula
  const validationResult = userFormSchema.safeParse(data);
  if (!validationResult.success) {
    // İlk hatayı alıp döndürelim
    const firstError = validationResult.error.errors[0]?.message;
    return { success: false, error: firstError || "Geçersiz veri." };
  }

  const { name, email, password, role, companyName } = validationResult.data;

  try {
    // 2. E-posta zaten var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "Bu e-posta adresi zaten kullanılıyor." };
    }

    // 3. Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10); // Kullanım aynı kalabilir

    // 4. Kullanıcıyı veritabanına ekle
    await prisma.user.create({
      data: {
        name: name || null, // Opsiyonel alanlar için null kontrolü
        email,
        password: hashedPassword,
        role,
        companyName: companyName || null, 
        // emailVerified: null, // E-posta doğrulama gerekirse eklenebilir
        // image: null, // Varsayılan resim veya boş bırakılabilir
        // isActive: true, // Varsayılan olarak aktif
      },
    });

    // 5. Başarılı yanıt ve cache temizleme
    revalidatePath("/admin/users"); // Kullanıcı listesi sayfasının cache'ini temizle
    return { success: true };

  } catch (error) {
    console.error("Prisma kullanıcı oluşturma hatası:", error);
    // Prisma'ya özgü hataları daha detaylı yakalayabiliriz (örn: P2002 unique constraint)
    // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    //   return { success: false, error: "Benzersiz alan hatası (örn: e-posta)." };
    // }
    return { success: false, error: "Veritabanı hatası oluştu." };
  }
} 