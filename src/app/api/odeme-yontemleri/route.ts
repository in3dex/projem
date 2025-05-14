import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // İsteği mevcut API endpoint'ine yönlendir
    const url = new URL(request.url);
    const newUrl = new URL('/api/payment/methods', url.origin);
    
    console.log(`[API_REDIRECT] /api/odeme-yontemleri -> /api/payment/methods`);
    
    const response = await fetch(newUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('cookie') || '', // Oturum bilgilerini aktar
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ödeme yöntemleri alınamadı');
    }
    
    return NextResponse.json(await response.json());
    
  } catch (error: any) {
    console.error("Ödeme yöntemleri alınırken hata:", error);
    return NextResponse.json({ 
      error: error.message || "Ödeme yöntemleri alınamadı", 
      odemeYontemleri: [] 
    }, { status: 500 });
  }
} 