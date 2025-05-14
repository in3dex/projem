import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateProfileDetailsSchema = z.object({
  phone: z.string().min(10, 'Telefon numarası en az 10 karakter olmalıdır.').max(15, 'Telefon numarası en fazla 15 karakter olabilir.').optional().nullable(),
  address: z.string().min(5, 'Adres en az 5 karakter olmalıdır.').max(200, 'Adres en fazla 200 karakter olabilir.').optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = UpdateProfileDetailsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { phone, address } = validation.data;

    // Güncellenecek alanları belirle (sadece dolu gelenler)
    const dataToUpdate: { phone?: string | null; address?: string | null } = {};
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (address !== undefined) dataToUpdate.address = address;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'Güncellenecek bilgi bulunamadı.', user: session.user }, { status: 200 });
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, phone: true, address: true, role: true, image: true },
    });

    // Session'ı güncellemek için NextAuth'a yeni kullanıcı verilerini döndürmüyoruz,
    // client tarafı useSession().update() kullanacak.
    // Sadece başarı mesajı ve güncellenmiş kullanıcı verisini döndürelim.
    return NextResponse.json({ 
      message: 'Profil bilgileri başarıyla güncellendi.', 
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        image: updatedUser.image
      }
    });

  } catch (error) {
    console.error('[API_UPDATE_PROFILE_DETAILS_ERROR]', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
} 