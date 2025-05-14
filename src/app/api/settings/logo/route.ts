import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';

// Desteklenen dosya tipleri ve maksimum boyut (örnek: 2MB)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Form Verisini Al
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Logo dosyası bulunamadı.' }, { status: 400 });
    }

    // 3. Dosya Kontrolleri
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Geçersiz dosya tipi. Sadece JPEG, PNG, WEBP veya GIF yükleyebilirsiniz.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB.` }, { status: 400 });
    }

    // 4. Dosyayı Sunucuya Kaydetme
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Yükleme klasörünü oluştur (varsa hata vermez)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos');
    await mkdir(uploadDir, { recursive: true });

    // Benzersiz dosya adı oluştur (örneğin: userId-timestamp.ext)
    const fileExtension = file.name.split('.').pop() || 'png'; // Uzantı yoksa png varsay
    const filename = `${userId}-${Date.now()}.${fileExtension}`;
    const filepath = join(uploadDir, filename);

    // Dosyayı yaz
    await writeFile(filepath, buffer);

    // 5. Dosya URL'sini Oluştur (public klasörüne göre)
    const logoUrl = `/uploads/logos/${filename}`; // Tarayıcıdan erişilecek URL

    // 6. Veritabanını Güncelle
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { logoUrl: logoUrl },
      select: { logoUrl: true }, // Sadece güncellenen alanı döndür
    });

    return NextResponse.json({ success: true, logoUrl: updatedUser.logoUrl });

  } catch (error) {
    console.error("Logo yükleme hatası:", error);
    // Dosya sistemi hataları veya diğer hatalar olabilir
    return NextResponse.json({ error: 'Logo yüklenirken bir sunucu hatası oluştu.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // ... (rest of DELETE logic using userId) ...

  } catch (error) {
    // ... (error handling) ...
  }
} 