"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
// import { getCurrentUser } from "@/lib/auth/session"; // Eski helper kaldırıldı
// import { auth } from "@/../auth-handler"; // Eski import
import { auth } from "@/lib/auth/auth"; // Yeni alias importu
import { db } from "@/lib/db"; // Prisma client instance
import { Role } from "@prisma/client";

// --- Zod Şemaları ---
const UpdateEftSchema = z.object({
  eftAktif: z.boolean(),
});

// YENİ: PayTR Durumu Güncelleme Şeması
const UpdatePaytrSchema = z.object({
  paytrAktif: z.boolean(),
  paytrMerchantId: z.string().optional().nullable(),
  paytrMerchantKey: z.string().optional().nullable(),
  paytrMerchantSalt: z.string().optional().nullable(),
  paytrTestMode: z.enum(["0", "1"]).default("0"), // "0": Canlı mod, "1": Test modu
}).refine(data => {
    if (data.paytrAktif && (!data.paytrMerchantId || !data.paytrMerchantKey || !data.paytrMerchantSalt)) {
        return false;
    }
    return true;
}, {
    message: "PayTR aktif ise Mağaza No, Anahtar ve Gizli Anahtar alanları zorunludur.",
    // Path belirtmek, hatayı belirli bir alana bağlayabilir:
    path: ["paytrMerchantId"], // veya form geneline bağlamak için path kullanmayabiliriz.
});

const BankaHesabiSchema = z.object({
  bankaAdi: z.string().min(1, "Banka adı gereklidir."),
  subeKodu: z.string().optional().nullable(),
  hesapNumarasi: z.string().optional().nullable(),
  iban: z.string().min(20, "Geçerli bir IBAN girin.").max(34, "Geçerli bir IBAN girin.").refine((iban) => /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(iban.toUpperCase()), "Geçersiz IBAN formatı."),
  hesapSahibi: z.string().min(1, "Hesap sahibi adı gereklidir."),
  isActive: z.boolean().default(true),
});

// Güncelleme için ID de gerekecek
const UpdateBankaHesabiSchema = BankaHesabiSchema.extend({
  id: z.string().cuid("Geçersiz Hesap ID"),
});

const DeleteBankaHesabiSchema = z.object({
   id: z.string().cuid("Geçersiz Hesap ID"),
});

// --- Yardımcı Fonksiyonlar ---

// Sadece Admin yetkisi kontrolü
async function ensureAdmin() {
  const session = await auth(); // Doğrudan auth() kullan
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Yetkisiz erişim.");
  }
  return session.user;
}

// --- Ana Fonksiyonlar ---

/**
 * Ödeme ayarlarını ve banka hesaplarını getirir.
 * Sadece admin tarafından erişilebilir olmalı (sayfada kontrol edilecek veya burada eklenecek).
 */
export async function getOdemeAyarlari() {
  try {
    const user = await ensureAdmin(); // Yetki kontrolü (ensureAdmin artık auth() kullanıyor)

    // OdemeAyarlari'ndan ilk kaydı bulmaya çalış (singleton pattern varsayımı)
    let ayarlar = await db.odemeAyarlari.findFirst({
        select: {
            id: true,
            eftAktif: true,
            paytrAktif: true,
            paytrMerchantId: true,
            paytrMerchantKey: true,
            paytrMerchantSalt: true,
            paytrTestMode: true,
        }
    });

    // Eğer ayarlar yoksa, varsayılan değerlerle oluştur
    if (!ayarlar) {
      console.log("Ödeme ayarları bulunamadı, varsayılan oluşturuluyor...");
      ayarlar = await db.odemeAyarlari.create({
        data: {
          // id: 'singleton', // Sabit bir ID kullanmak daha iyi olabilir
          eftAktif: false, // Varsayılan olarak kapalı
        },
      });
    }

    const bankaHesaplari = await db.bankaHesabi.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      ayarlar: ayarlar,
      bankaHesaplari,
    };
  } catch (error: any) {
    console.error("Ödeme ayarları getirilirken hata:", error);
    return {
      success: false,
      message: error.message || "Ayarlar getirilirken bir sunucu hatası oluştu.",
      ayarlar: null,
      bankaHesaplari: [],
    };
  }
}

// Önceki state tipi
interface ActionState {
  success: boolean;
  message: string;
}

export async function updateEftDurumu(
  previousState: ActionState, // İlk argüman: önceki state
  formData: FormData        // İkinci argüman: form verisi
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return {
        success: false,
        message: "Yetkisiz erişim veya oturum bulunamadı.",
      };
    }

    const validatedFields = UpdateEftSchema.safeParse({
      eftAktif: formData.get("eftAktif") === "true", // FormData'dan boolean'a çevir
    });

    if (!validatedFields.success) {
      return {
        success: false,
        message:
          validatedFields.error.flatten().fieldErrors.eftAktif?.join(", ") ||
          "Geçersiz veri.",
      };
    }

    const { eftAktif } = validatedFields.data;

    await db.odemeAyarlari.updateMany({
      data: {
        eftAktif: eftAktif,
      },
      });

    revalidatePath("/admin/settings/odeme-saglayicilari");
    return {
      success: true,
      message: `Banka Havalesi / EFT durumu başarıyla ${eftAktif ? 'aktif' : 'pasif'} hale getirildi.`,
    };
  } catch (error) {
    console.error("EFT durumu güncellenirken hata:", error);
     return {
      success: false,
      message: "Bir hata oluştu. EFT durumu güncellenemedi.",
    };
  }
}

// YENİ: PayTR Ayarlarını (Aktif durumu ve API bilgileri) Güncelleme Action'ı
export async function updatePaytrAyarlari(
  data: z.infer<typeof UpdatePaytrSchema>
): Promise<{ success: boolean; message?: string, errors?: any }> {
  try {
    await ensureAdmin(); // Yetki kontrolü

    // Formdan gelen veriyi Zod ile tekrar doğrula (güvenlik katmanı)
    const validatedFields = UpdatePaytrSchema.safeParse(data);
    if (!validatedFields.success) {
        // refine hatası varsa onu döndür
        const errorMessages = validatedFields.error.flatten();
        const formErrorMessage = errorMessages.formErrors.join(', ') || "Geçersiz veri.";
        return { success: false, message: formErrorMessage, errors: errorMessages.fieldErrors };
    }

    const { paytrAktif, paytrMerchantId, paytrMerchantKey, paytrMerchantSalt, paytrTestMode } = validatedFields.data;

    // Önce mevcut kayıtları kontrol et
    const existingSettings = await db.odemeAyarlari.findUnique({
      where: { id: 'singleton' },
    });

    if (existingSettings) {
      // Mevcut kayıt varsa güncelle
      await db.odemeAyarlari.update({
        where: { id: 'singleton' },
        data: {
          paytrAktif,
          paytrMerchantId,
          paytrMerchantKey,
          paytrMerchantSalt,
          paytrTestMode,
        },
      });
    } else {
      // Kayıt yoksa oluştur
      await db.odemeAyarlari.create({
      data: {
          id: 'singleton',
          paytrAktif,
          paytrMerchantId,
          paytrMerchantKey,
          paytrMerchantSalt,
          paytrTestMode,
          eftAktif: false, // Varsayılan değer
        },
      });
    }

    // Güncellemeden emin olmak için kayıtları tekrar oku ve kontrol et
    const updatedSettings = await db.odemeAyarlari.findUnique({
      where: { id: 'singleton' },
      select: { paytrAktif: true, paytrTestMode: true }
    });

    console.log("[PayTR Ayar Güncelleme] Yeni ayarlar:", { 
      paytrAktif: updatedSettings?.paytrAktif, 
      paytrTestMode: updatedSettings?.paytrTestMode 
    });

    revalidatePath("/admin/settings/odeme-saglayicilari");
    return {
      success: true,
      message: `PayTR ayarları başarıyla güncellendi.`,
    };
  } catch (error: any) {
    console.error("PayTR ayarları güncellenirken hata:", error);
    return {
      success: false,
      message: error.message || "Bir sunucu hatası oluştu.",
    };
  }
}

// --- Banka Hesabı CRUD Action'ları ---

/**
 * Yeni banka hesabı ekler.
 * @param previousState useFormState tarafından yönetilen önceki durum.
 * @param data Formdan gelen doğrulanmamış veri.
 */
export async function addBankaHesabi(previousState: any, data: unknown) {
  try {
    await ensureAdmin(); // Yetki kontrolü

    // Gelen veriyi Zod şeması ile doğrula
    const validatedFields = BankaHesabiSchema.safeParse(data);

    if (!validatedFields.success) {
      console.error("Banka hesabı doğrulama hatası:", validatedFields.error.flatten().fieldErrors);
      return { success: false, message: "Geçersiz veri. Lütfen formu kontrol edin.", errors: validatedFields.error.flatten().fieldErrors };
    }

    await db.bankaHesabi.create({
      data: validatedFields.data as any,
    });

    revalidatePath("/admin/settings/odeme-saglayicilari");
    return { success: true, message: "Banka hesabı başarıyla eklendi." };

  } catch (error: any) {
    console.error("Banka hesabı eklenirken hata:", error);
    return { success: false, message: error.message || "Banka hesabı eklenirken bir sunucu hatası oluştu.", errors: {} };
  }
}

/**
 * Mevcut bir banka hesabını günceller.
 * @param previousState useFormState tarafından yönetilen önceki durum.
 * @param data Formdan gelen doğrulanmamış veri (ID içermeli).
 */
export async function updateBankaHesabi(previousState: any, data: unknown) {
  try {
    await ensureAdmin(); // Yetki kontrolü

    // Gelen veriyi Zod şeması ile doğrula
    const validatedFields = UpdateBankaHesabiSchema.safeParse(data);

    if (!validatedFields.success) {
      console.error("Banka hesabı güncelleme doğrulama hatası:", validatedFields.error.flatten().fieldErrors);
      return { success: false, message: "Geçersiz veri. Lütfen formu kontrol edin.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { id, ...updateData } = validatedFields.data;

    await db.bankaHesabi.update({
      where: { id },
      data: updateData as any,
    });

    revalidatePath("/admin/settings/odeme-saglayicilari");
    return { success: true, message: "Banka hesabı başarıyla güncellendi." };

  } catch (error: any) {
    console.error("Banka hesabı güncellenirken hata:", error);
    if (error.code === 'P2025') {
      return { success: false, message: "Güncellenecek banka hesabı bulunamadı.", errors: {} };
    }
    return { success: false, message: error.message || "Banka hesabı güncellenirken bir sunucu hatası oluştu.", errors: {} };
  }
}

/**
 * Bir banka hesabını siler.
 * @param previousState useFormState tarafından yönetilen önceki durum.
 * @param formData Formdan gelen FormData (sadece ID içermeli).
 */
export async function deleteBankaHesabi(previousState: any, formData: FormData) {
  try {
    await ensureAdmin(); // Yetki kontrolü

     const data = { id: formData.get("id") };
     const validatedFields = DeleteBankaHesabiSchema.safeParse(data);

    if (!validatedFields.success) {
      console.error("Banka hesabı silme doğrulama hatası:", validatedFields.error.flatten().fieldErrors);
      return { success: false, message: "Geçersiz Hesap ID." };
    }
    
    const { id } = validatedFields.data;

    await db.bankaHesabi.delete({
      where: { id },
    });

    revalidatePath("/admin/settings/odeme-saglayicilari");
    return { success: true, message: "Banka hesabı başarıyla silindi." };

  } catch (error: any) {
    console.error("Banka hesabı silinirken hata:", error);
    if (error.code === 'P2025') {
      return { success: false, message: "Silinecek banka hesabı bulunamadı." };
    }
    return { success: false, message: error.message || "Banka hesabı silinirken bir sunucu hatası oluştu." };
  }
}

// TODO: Banka hesabı ekleme, güncelleme, silme işlemleri için frontend bileşenleri oluşturulacak.

// TODO: addBankaHesabi, updateBankaHesabi, deleteBankaHesabi fonksiyonları eklenecek 