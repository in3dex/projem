'use server';

import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

interface ActionResult {
    success: boolean;
    error?: string;
}

export async function updateProductCostPrice(productId: string, newCostPrice: number): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Yetkisiz erişim." };
    }
    const userId = session.user.id;

    if (typeof newCostPrice !== 'number' || newCostPrice < 0) {
        return { success: false, error: "Geçersiz maliyet fiyatı." };
    }

    try {
        // Ürünün kullanıcıya ait olup olmadığını kontrol et
        const product = await db.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });

        if (!product) {
            return { success: false, error: "Ürün bulunamadı." };
        }

        if (product.userId !== userId) {
            return { success: false, error: "Bu ürünü güncelleme yetkiniz yok." };
        }

        await db.product.update({
            where: { id: productId },
            data: {
                costPrice: newCostPrice,
            },
        });

        // İlgili sayfaları yeniden doğrula (cache temizle)
        revalidatePath("/dashboard/karlilik-analizi");
        revalidatePath(`/api/products/${productId}/calculate-breakdown`); // Detay modalı için
        revalidatePath(`/api/products/${productId}/recommend-price`); // Detay modalı için
        revalidatePath("/dashboard/products"); // Ürünler sayfası için

        return { success: true };

    } catch (error: unknown) {
        console.error("Ürün maliyeti güncelleme hatası:", error);
        let errorMessage = "Maliyet güncellenirken bir sunucu hatası oluştu.";
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Prisma'ya özgü hataları yakala (örn: unique constraint)
            errorMessage = `Veritabanı hatası: ${error.code}`;
        }
        else if (error instanceof Error) {
             errorMessage = error.message;
         }
        return { success: false, error: errorMessage };
    }
} 