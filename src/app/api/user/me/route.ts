import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API_USER_ME] Hata:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
} 