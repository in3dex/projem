import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const categoryCommissions = await db.categoryCommission.findMany({
      where: { userId },
      include: { // İlişkili kategori bilgisini de alalım
        category: {
          select: { id: true, name: true } 
        }
      },
      orderBy: {
        category: { name: 'asc' } 
      },
    });

    return NextResponse.json(categoryCommissions, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/CategoryCommissions GET List] Hata:", error);
    const message = error instanceof Error ? error.message : 'Kategori komisyonları getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 