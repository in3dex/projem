import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Kullanıcıya ait ürünlerin olduğu markaları ve kategorileri çek
    // Doğrudan Brand ve Category tablolarını çekmek yerine, kullanıcının
    // ürünlerinin ilişkili olduğu Brand ve Category'leri çekmek daha doğru olur.
    
    // Markaları Çek
    const brands = await db.brand.findMany({
      where: {
        // Sadece bu kullanıcıya ait ürünlerin olduğu markaları listele
        products: {
          some: { userId: userId }
        }
      },
      select: {
        id: true, // Frontend'de value için
        name: true // Frontend'de göstermek için
      },
      orderBy: {
        name: 'asc' // Alfabetik sırala
      }
    });

    // Kategorileri Çek
    const categories = await db.category.findMany({
      where: {
        // Sadece bu kullanıcıya ait ürünlerin olduğu kategorileri listele
        products: {
          some: { userId: userId }
        }
      },
      select: {
        id: true, // Frontend'de value için
        name: true // Frontend'de göstermek için
      },
      orderBy: {
        name: 'asc' // Alfabetik sırala
      }
    });

    // 3. Yanıtı Oluştur
    return NextResponse.json({ 
        brands: brands,
        categories: categories
     });

  } catch (error: unknown) {
    console.error("Filtre seçenekleri alınırken hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ 
        error: 'Filtre seçenekleri alınırken bir hata oluştu.', 
        details: message 
    }, { status: 500 });
  }
} 