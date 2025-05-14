import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        address: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const hasProfileInfo = !!(user.phone && user.address);

    return NextResponse.json({
      hasProfileInfo,
      phone: user.phone || null, // Eksikse null gönder
      address: user.address || null, // Eksikse null gönder
    });

  } catch (error) {
    console.error('[API_PROFILE_STATUS_ERROR]', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
} 