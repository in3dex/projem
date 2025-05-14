import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // Kullanıcıya ait tüm ürünleri sil
    const deleteResult = await db.product.deleteMany({ where: { userId } });

    console.log(`[CLEAR_PRODUCTS] User ${userId}: Deleted ${deleteResult.count} products`);
    return NextResponse.json({ 
      message: 'Tüm ürünler başarıyla silindi.',
      deletedProducts: deleteResult.count
    });

  } catch (error) {
    console.error('Ürünler temizlenirken hata:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    return NextResponse.json({ error: 'Ürünler temizlenemedi.', message }, { status: 500 });
  }
} 