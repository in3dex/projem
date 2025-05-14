import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client'; // Kaldırıldı
import { auth } from '@/lib/auth/auth';
// import bcrypt from 'bcryptjs'; // PUT içinde kullanılmıyor, kaldırılabilir
// import * as z from 'zod'; // PUT içinde Zod şeması kullanılmıyor, kaldırılabilir
import { prisma } from "@/lib/db"; // Sadece bunu kullanacağız

// const prismaClient = new PrismaClient(); // Kaldırıldı

// GET: Mevcut kullanıcı profilini getir
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 401 });
  }

  try {
    const userProfile = await prisma.user.findUnique({ // prisma kullanıldı
      where: { id: session.user.id },
      select: { 
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        address: true,
        image: true,
        logoUrl: true,
        shopName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Profil bilgileri alınırken hata:", error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  } finally {
    // await prisma.$disconnect(); // Genellikle global instance için disconnect çağrılmaz
  }
}

// PUT: Kullanıcı profilini güncelle

// Zod şeması bu dosyada tanımlı ama PUT içinde kullanılmıyor.
// const profileUpdateSchema = z.object({
//     name: z.string().optional().nullable(),
//     phone: z.string().optional().nullable(),
//     companyName: z.string().optional().nullable(),
//     address: z.string().optional().nullable(),
//     image: z.string().url().optional().nullable(),
//     logoUrl: z.string().url().optional().nullable(),
//     shopName: z.string().optional().nullable(),
// });

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    // Gelen body doğrudan updateData olarak kullanılabilir veya belirli alanlar seçilebilir.
    // Şimdiki implementasyon body'den phone, address, name alıyor.
    const { phone, address, name /*, companyName */ } = body;

    const updateData: { phone?: string; address?: string; name?: string; /* companyName?: string; */ } = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (name !== undefined) updateData.name = name;
    // if (companyName !== undefined) updateData.companyName = companyName;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Güncellenecek bilgi bulunamadı." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({ // prisma kullanıldı
      where: { id: userId },
      data: updateData,
      // Select ile dönen veriyi kısıtlayabiliriz, şimdilik tüm user dönüyor.
    });

    return NextResponse.json({ message: "Profil başarıyla güncellendi.", user: updatedUser });

  } catch (error) {
    console.error("[UpdateProfile Error]:", error);
    return NextResponse.json(
      { error: "Profil güncellenirken bir hata oluştu.", details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect(); // Genellikle global instance için disconnect çağrılmaz
  }
} 