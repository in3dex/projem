import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';  // Next Auth v5'te değişti
import { db as prisma } from '@/lib/db';

export async function GET() {
  try {
    // Oturum bilgisini al (Next Auth v5 ile değişti)
    const session = await auth();
    
    // Kullanıcı rolünü veritabanından doğrudan kontrol et
    let dbUser = null;
    if (session?.user?.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, role: true, name: true }
      });
    }
    
    return NextResponse.json({
      sessionInfo: {
        authenticated: !!session,
        user: session?.user || null
      },
      dbUserInfo: dbUser,
      sessionDump: session
    }, { status: 200 });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Kullanıcı bilgileri alınamadı' }, { status: 500 });
  }
} 