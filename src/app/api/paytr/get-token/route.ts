import { NextRequest, NextResponse } from "next/server";

// Bu endpoint artık kullanımdan kaldırıldı. Yeni endpoint'e yönlendirme yapılıyor.
export async function POST(request: NextRequest) {
  console.log('[API_REDIRECT] /api/paytr/get-token -> /api/payment/paytr/pay-invoice');
  
  // İsteği yeni API endpointine yönlendir
  const url = new URL(request.url);
  const newUrl = new URL('/api/payment/paytr/pay-invoice', url.origin);
  
  // Orijinal isteğin body'sini al
  const body = await request.json();
  
  try {
    // Yeni API endpointine isteği yönlendir
    const response = await fetch(newUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '', // Oturum bilgilerini aktar
      },
      body: JSON.stringify(body),
    });
    
    // API yanıtını olduğu gibi döndür
    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch (error: any) {
    console.error('[API_REDIRECT_ERROR]', error.message);
    return NextResponse.json(
      { 
        error: 'Yönlendirme sırasında bir hata oluştu. Lütfen doğrudan /api/payment/paytr/pay-invoice endpoint\'ini kullanın.',
        originalError: error.message
      }, 
      { status: 500 }
    );
  }
} 