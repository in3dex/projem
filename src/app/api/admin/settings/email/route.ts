import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { auth } from '@/lib/auth/auth';

const prisma = new PrismaClient();
const SETTINGS_ID = "singleton"; // Modeldeki sabit ID

// Mevcut SMTP ayarlarını getir
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
  }

  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    // Ayar yoksa boş bir obje döndür, frontend bunu handle etmeli
    return NextResponse.json(settings || {}); 
  } catch (error) {
    console.error("SMTP ayarları alınırken hata:", error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// SMTP ayarlarını güncelle/oluştur
export async function PUT(request: Request) {
   const session = await auth();
   if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
   }

   try {
    const body = await request.json();
    
    // TODO: Gelen body'i Zod ile validate et
    const {
        host,
        port,
        secure,
        user,
        pass, // Dikkat: Şifre düz metin olarak saklanmamalı!
        fromEmail,
        fromName
    } = body;

    const updatedSettings = await prisma.smtpSettings.upsert({
        where: { id: SETTINGS_ID },
        update: {
            host,
            port: port ? parseInt(port, 10) : null,
            secure: typeof secure === 'boolean' ? secure : null,
            user,
            pass, // TODO: Şifreyi şifreleyerek sakla veya güvenli bir yöntem kullan
            fromEmail,
            fromName
        },
        create: {
            id: SETTINGS_ID,
            host,
            port: port ? parseInt(port, 10) : null,
            secure: typeof secure === 'boolean' ? secure : null,
            user,
            pass,
            fromEmail,
            fromName
        }
    });

    return NextResponse.json(updatedSettings);

   } catch (error) {
     console.error("SMTP ayarları güncellenirken hata:", error);
     return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
   } finally {
     await prisma.$disconnect();
   }
} 