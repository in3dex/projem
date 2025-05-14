import { auth } from "@/lib/auth/edge-auth";
// authConfig importunu kaldırıyoruz
// import { authConfig } from "@/lib/auth/auth.config";
import { Role } from "@prisma/client"; // authorized callback'inde kullanılıyor
import { NextRequest, NextResponse } from "next/server";

// authConfig içindeki authorized callback'ini buraya taşıyoruz.
// Middleware'i doğrudan import ettiğimiz auth fonksiyonu olarak tanımla.
// authorized callback'i NextAuth tarafından otomatik olarak çağrılacak.

// auth'u middleware olarak yeniden adlandırmaya gerek yok, doğrudan export default auth kullanabiliriz.
// export const { auth: middleware } = NextAuth(authConfig);

// export default middleware yapısını kullanalım
// export default middleware;

// Middleware'in hangi yollarda çalışacağını belirtir.
// authorized callback'i bu yollardaki istekler için çalışacak.
export const config = {
  matcher: [
    // Admin paneli yolları:
    '/admin/:path*',
    // Admin giriş sayfası (bizim yapılandırmamızda (admin-auth) grubu altında):
    '/admin/giris',
    // Kullanıcı paneli yolları:
    '/dashboard/:path*',
    // Giriş/kayıt sayfaları (giriş yapmış kullanıcıları yönlendirmek için):
    '/giris',
    '/kayit',
    // Ödeme sayfası için middleware çalıştırmak gerekli (PayTR iframe CSP için)
    '/odeme' 
  ],
};

// NextAuth v5 ile middleware olarak auth fonksiyonunu doğrudan kullanıyoruz
// authorized callback'i edge-auth.config.ts içinde tanımlanmıştır

// CSP Başlığı Tanımı ve ekleme mantığı next.config.ts'ye taşındı.
/*
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' www.paytr.com cdn.paytr.com",
  "child-src 'self' www.paytr.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' www.paytr.com cdn.paytr.com",
  "font-src 'self'",
  "frame-src 'self' www.paytr.com",
].join('; ') + ';';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const authResponse = await auth(request);

  const response = authResponse instanceof NextResponse ? authResponse : NextResponse.next({ request });

  const modifiedHeaders = new Headers(response.headers);

  // CSP başlığı artık next.config.ts'de yönetiliyor, buradan kaldırıldı
  // modifiedHeaders.set(
  //   'Content-Security-Policy',
  //   ContentSecurityPolicy
  // );

  const finalResponse = new NextResponse(response.body, { 
    status: response.status,
    statusText: response.statusText,
    headers: modifiedHeaders,
  });

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      finalResponse.headers.append(key, value);
    }
  });

  return finalResponse;
}
*/

// NextAuth v5 ile middleware olarak auth fonksiyonunu doğrudan export ediyoruz.
// authorized callback edge-auth.config.ts içinde tanımlıdır.
export { auth as middleware };

// Middleware'i doğrudan export default etmiyoruz, yukarıdaki async fonksiyonu kullanıyoruz.
// export default auth; 