import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Çıkış yapmak için tokeni içeren cookie'yi sil
  const response = NextResponse.json(
    { message: 'Başarıyla çıkış yapıldı' },
    { status: 200 }
  );
  
  // Cookie'yi geçersiz kıl
  response.headers.set(
    'Set-Cookie',
    'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict'
  );
  
  return response;
} 