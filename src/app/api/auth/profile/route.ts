import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // Kullanıcıyı bul
    const user = await userService.findUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcı bilgilerini döndür (hassas alanları hariç tut)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        logoUrl: user.logoUrl,
        companyName: user.companyName,
        address: user.address,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Profil bilgileri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Profil bilgileri getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// PATCH Fonksiyonu (Yeni)
// Güncellenebilecek alanlar için Zod şeması
const updateProfileSchema = z.object({
  name: z.string().min(1, "İsim boş olamaz").optional(),
  phone: z.string().optional().nullable(), // Telefon opsiyonel ve null olabilir
  // image: z.string().url("Geçersiz resim URL'i").optional().nullable(), // Şimdilik URL güncelleme
  // logoUrl: z.string().url("Geçersiz logo URL'i").optional().nullable(), // Şimdilik URL güncelleme
  companyName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
}).strict(); // Sadece tanımlanan alanların güncellenmesine izin ver

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // İstek gövdesini al ve doğrula
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (error) { 
        return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }
    
    const validationResult = updateProfileSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: validationResult.error.errors }, { status: 400 });
    }
    const dataToUpdate = validationResult.data;

    // Güncellenecek veri yoksa hata döndür
    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: 'Güncellenecek veri bulunamadı' }, { status: 400 });
    }

    // Kullanıcıyı güncelle (userService içinde updateUser fonksiyonu olmalı)
    const updatedUser = await userService.updateUser(userId, dataToUpdate);

    // Başarılı yanıtı döndür (güncellenmiş kullanıcı verisi ile)
     return NextResponse.json({
      message: "Profil başarıyla güncellendi",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,         
        image: updatedUser.image,
        logoUrl: updatedUser.logoUrl,     
        companyName: updatedUser.companyName, 
        address: updatedUser.address,       
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt, 
      }
    });

  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    // Spesifik hataları yakala (örn: kullanıcı bulunamadı)
    if (error instanceof Error && error.message.includes("bulunamadı")) {
       return NextResponse.json({ error: 'Güncellenecek kullanıcı bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Profil güncellenirken bir hata oluştu' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // ... (rest of the function using userId) ...

  } catch (error) {
    // ... existing error handling ...
  }
} 