import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { createToken, createCookie } from '@/lib/auth/jwt';
import { sendTemplatedMail } from '@/lib/email';
import { EmailTemplateType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // İstek gövdesinden verileri al
    const body = await request.json();
    const { name, email, password } = body;

    // Zorunlu alanları kontrol et
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur' },
        { status: 400 }
      );
    }
    
    // E-posta formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin' },
        { status: 400 }
      );
    }
    
    // Şifre uzunluğunu kontrol et
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      );
    }

    // E-posta adresi zaten kullanılıyor mu diye kontrol et
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanılıyor' },
        { status: 409 }
      );
    }

    // Yeni kullanıcı oluştur
    const user = await userService.createUser({
      name,
      email,
      password,
    });

    // !!! YENİ: Hoşgeldin E-postası Gönderme !!!
    if (user) {
      try {
        // Gerekli verileri hazırla
        const emailData = {
          userName: user.name || user.email, // Kullanıcının adı yoksa e-postası
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/giris` // Ortam değişkeninden site URL'si
        };
        
        await sendTemplatedMail({
          to: user.email,
          templateType: EmailTemplateType.WELCOME,
          data: emailData
        });
        console.log(`Hoşgeldin e-postası gönderildi: ${user.email}`);
      } catch (emailError) {
        // E-posta gönderimi başarısız olursa sadece logla, kayıt işlemini engelleme
        console.error(`Hoşgeldin e-postası gönderme hatası (${user.email}):`, emailError);
      }
    }
    // !!! E-posta Gönderme Bitiş !!!

    // JWT token oluştur (artık asenkron)
    const token = await createToken(user);
    
    // Cookie oluştur
    const cookie = createCookie(token);

    // Başarılı yanıt döndür ve cookie ayarla
    const response = NextResponse.json(
      { 
        message: 'Kayıt başarılı',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    );
    
    // Cookie'yi ayarla
    response.headers.set('Set-Cookie', cookie);
    
    console.log('Kayıt başarılı, cookie ayarlandı:', cookie);

    return response;
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return NextResponse.json(
      { error: 'Kayıt işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
} 