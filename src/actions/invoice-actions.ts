"use server";

import { revalidatePath } from "next/cache";
import { PrismaClient, InvoiceStatus, SubscriptionStatus, Role } from "@prisma/client";
// import { auth } from "@/auth"; // next-auth v5 ile auth objesini import etme yolu
import { auth } from "@/lib/auth/auth"; // Doğru import yolu

const prisma = new PrismaClient();

// Helper function to check for admin role
async function verifyAdminRole() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Yetkisiz erişim.");
  }
  return session.user;
}

/**
 * Admin paneli için tüm faturaları getirir.
 */
export async function getInvoicesForAdmin() {
  try {
    await verifyAdminRole();
    const invoices = await prisma.invoice.findMany({
      include: {
        user: { // Kullanıcı bilgilerini dahil et
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subscription: { // Abonelik bilgilerini dahil et (opsiyonel)
            select: {
                id: true,
                status: true,
                planId: true, // Belki plan adı da gösterilebilir
            }
        }
      },
      orderBy: {
        createdAt: "desc", // En yeni faturalar üstte
      },
    });
    return invoices;
  } catch (error) {
    console.error("Faturalar getirilirken hata oluştu:", error);
    // Hata durumunda boş dizi veya null döndürmek yerine hatayı yukarı fırlatabiliriz
    // veya spesifik bir hata mesajı içeren bir nesne döndürebiliriz.
    // Şimdilik boş dizi döndürelim, UI tarafında bunu yönetelim.
    // return []; 
    // VEYA:
    throw error; // Hatanın UI'da yakalanması için
  }
}

/**
 * Bir faturayı onaylar ve ilişkili aboneliği aktif eder.
 * @param invoiceId Onaylanacak faturanın ID'si
 */
export async function approveInvoice(invoiceId: string) {
  try {
    await verifyAdminRole();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Faturayı bul
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { subscription: true } // İlişkili aboneliği de al
      });

      if (!invoice) {
        throw new Error("Fatura bulunamadı.");
      }

      // Sadece ödeme bekleyen faturalar onaylanabilir
      if (invoice.status !== InvoiceStatus.PENDING) {
         throw new Error(`Fatura durumu '${invoice.status}' olduğu için onaylanamaz.`);
      }

      // 2. Faturayı PAID olarak güncelle
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
      });

      // 3. İlişkili aboneliği bul ve ACTIVE yap (eğer PENDING_PAYMENT ise)
      if (invoice.subscription && invoice.subscription.status === SubscriptionStatus.PENDING_PAYMENT) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId! }, // invoice.subscription varsa subscriptionId null olamaz
          data: { status: SubscriptionStatus.ACTIVE },
        });
      } else if (invoice.subscription) {
          console.warn(`Fatura ${invoiceId} onaylandı ancak abonelik ${invoice.subscription.id} durumu (${invoice.subscription.status}) PENDING_PAYMENT olmadığından güncellenmedi.`);
      } else {
          console.warn(`Fatura ${invoiceId} onaylandı ancak ilişkili abonelik bulunamadı veya faturada subscriptionId eksik.`);
      }

      return updatedInvoice;
    });

    // Veriyi yenile
    revalidatePath("/admin/faturalar");
    // Abonelik sayfasını da yenilemek iyi olabilir (varsa)
    if (result.userId) {
        // Kullanıcının dashboard'daki abonelik sayfasını da yenileyebiliriz,
        // ancak spesifik bir yol bilmiyorsak genel dashboard'u yenilemek güvenli olabilir.
        // Veya bu yenilemeyi UI tarafına bırakabiliriz.
         revalidatePath("/dashboard/abonelik"); // Varsayılan abonelik sayfası yolu
         revalidatePath("/dashboard"); // Genel dashboard
    }


    return { success: true, invoice: result };
  } catch (error: unknown) {
    console.error("Fatura onaylanırken hata:", error);
     let errorMessage = "Fatura onaylanırken bir hata oluştu.";
     if (error instanceof Error) {
       errorMessage = error.message; // Prisma veya kontrol hatalarını göster
     }
    return { success: false, error: errorMessage };
  }
}

/**
 * Bir faturayı iptal eder.
 * @param invoiceId İptal edilecek faturanın ID'si
 */
export async function cancelInvoice(invoiceId: string) {
  try {
    await verifyAdminRole();

     // Faturayı bul ve durumunu kontrol et
     const invoice = await prisma.invoice.findUnique({
         where: { id: invoiceId },
         select: { status: true }
     });

     if (!invoice) {
         throw new Error("Fatura bulunamadı.");
     }

     // Ödenmiş faturalar iptal edilemez varsayımı
     if (invoice.status === InvoiceStatus.PAID) {
         throw new Error("Ödenmiş faturalar iptal edilemez.");
     }
     // Zaten iptal edilmişse işlem yapma
      if (invoice.status === InvoiceStatus.CANCELED) {
          return { success: true, message: "Fatura zaten iptal edilmiş." };
      }


    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.CANCELED },
    });

    // Veriyi yenile
    revalidatePath("/admin/faturalar");

    // İptalin aboneliğe etkisini burada ekleyebiliriz.
    // Örneğin, iptal edilen faturaya bağlı PENDING_PAYMENT durumundaki
    // aboneliği de CANCELED yapmak mantıklı olabilir.
    // const subscription = await prisma.subscription.findUnique({ where: { id: updatedInvoice.subscriptionId } });
    // if (subscription && subscription.status === SubscriptionStatus.PENDING_PAYMENT) {
    //     await prisma.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.CANCELED } });
    //     revalidatePath("/dashboard/abonelik");
    // }


    return { success: true, invoice: updatedInvoice };
  } catch (error: unknown) {
     console.error("Fatura iptal edilirken hata:", error);
     let errorMessage = "Fatura iptal edilirken bir hata oluştu.";
      if (error instanceof Error) {
        errorMessage = error.message; // Prisma veya kontrol hatalarını göster
      }
    return { success: false, error: errorMessage };
  }
} 