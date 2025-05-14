import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth/auth';

const prisma = new PrismaClient();

// GET - Kullanıcıları Listele
export async function GET(request: Request) {
    const session = await auth();
    // Sadece adminler kullanıcıları listeleyebilir
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // USER, ADMIN, EDITOR
    const minimal = searchParams.get('minimal') === 'true'; // Sadece id ve name/email döndür

    const whereClause: any = {};
    if (role && ['USER', 'ADMIN', 'EDITOR'].includes(role.toUpperCase())) {
        whereClause.role = role.toUpperCase();
    }

    try {
        const users = await prisma.user.findMany({
            where: whereClause,
            select: minimal 
                ? { id: true, name: true, email: true } // Minimal veri
                : { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLogin: true, image: true }, // Daha fazla veri (opsiyonel)
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(users);

    } catch (error) {
        console.error('Kullanıcıları listeleme hatası:', error);
        return NextResponse.json({ error: 'Kullanıcılar listelenirken bir hata oluştu.' }, { status: 500 });
    }
}

// Diğer metodlar (POST, PUT, DELETE) gerekirse buraya eklenebilir 