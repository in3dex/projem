// Edge Runtime uyumlu config - sadece middleware için kullanılacak
import { Role, User as PrismaUser } from '@prisma/client';
import { NextAuthConfig, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Next.js'in kendi Request ve Response tiplerini kullanıyoruz
import { NextRequest, NextResponse } from 'next/server';

// NextAuth'un beklediği Session.user tipini genişletiyoruz
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: Role; // Rol bilgisini ekliyoruz
    };
  }

  // Opsiyonel: default User interface'i genişletebilirsiniz eğer gerekiyorsa
  // interface User extends PrismaUser {}
}

// NextAuth'un beklediği JWT tipini genişletiyoruz
declare module "next-auth/jwt" {
  interface JWT {
    id?: string; // Kullanıcı ID'si (opsiyonel yapıyoruz çünkü ilk oluşturulduğunda user objesinden gelir)
    role?: Role; // Rol bilgisini ekliyoruz
  }
}

interface AuthorizedParams {
  // auth Session veya null olabilir, NextAuth v4/v5 uyumu için
  auth: Session | null;
  request: NextRequest;
}

// Edge uyumlu olması için, middleware konfigürasyonu şeklinde export et
export const edgeAuthConfig: NextAuthConfig = {
  pages: {
    signIn: '/giris',
    signOut: '/cikis',
    error: '/giris',
  },
  callbacks: {
    // JWT callback: Token oluşturulurken veya güncellenirken çalışır
    // user sadece signIn sırasında gelir, bu yüzden tip tanımında optional olabilir.
    async jwt({ token, user, account, profile, isNewUser }) {
      // user objesi sadece oturum açarken gelir. Token'a kullanıcı ID'sini ve rolünü ekle.
      if (user) {
        token.id = user.id; // Default NextAuth User veya AdapterUser id sağlar
        // user objesinin rol alanına sahip olduğunu varsayıyoruz (AdapterUser durumunda)
        // @ts-ignore // AdapterUser her zaman role içermeyebilir, type safety için kontrol edelim
        if (user.role) {
           // @ts-ignore
          token.role = user.role as Role; // Rolü token'a ekle
        }
      }
      // Debug logları kaldırıldı
      return token; // Genişletilmiş CustomToken tipine dönüştürmeye gerek yok, declare module ile JWT tipi genişletildi
    },

    // Session callback: Session her kontrol edildiğinde çalışır (Middleware dahil)
    // token her zaman tanımlı olmalı, ancak session initial null olabilir
    async session({ session, token }) {
      // Token'daki bilgileri session objesine ekle (middleware auth objesi bu session'ı kullanır)
      if (token && session?.user) { // session?.user kontrolü ekledik
        session.user.id = token.id as string;
        // Token'daki rol bilgisini session'a aktar
        if(token.role) {
           session.user.role = token.role as Role;
        }
        // Debug logları kaldırıldı
      }
      return session; // Declare module ile Session tipi zaten genişletildi
    },

    // Authorized callback: Middleware'de her istek geldiğinde çalışır
    // auth Session veya null olabilir
    async authorized({ auth, request }: AuthorizedParams) {
      const { nextUrl } = request;
      // auth?.user kontrolü ile null durumunu ele alıyoruz
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;

      // Debug logları kaldırıldı

      const isAdminLoginPage = nextUrl.pathname === '/admin/giris';
      const isGeneralLoginPage = nextUrl.pathname === '/giris';
      const isRegisterPage = nextUrl.pathname === '/kayit';
      const isOnAuthPage = isAdminLoginPage || isGeneralLoginPage || isRegisterPage;
      const isOnAdminPanel = nextUrl.pathname.startsWith('/admin') && !isAdminLoginPage;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      // 1. Giriş/kayıt sayfaları kontrolü
      if (isOnAuthPage) {
        if (isLoggedIn) {
          const redirectUrlPath = userRole === Role.ADMIN ? '/admin' : '/dashboard';
          return Response.redirect(new URL(redirectUrlPath, nextUrl.origin));
        }
        return true; // Giriş yapmamış kullanıcı giriş/kayıt sayfalarına erişebilir
      }

      // 2. Admin paneli kontrolü
      if (isOnAdminPanel) {
        if (!isLoggedIn) {
          const adminLoginUrl = new URL('/admin/giris', nextUrl.origin);
          adminLoginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
          return Response.redirect(adminLoginUrl);
        }

        // Kullanıcı giriş yapmış ancak ADMIN rolü değilse
        // Artık userRole burada doğru gelmeli
        if (userRole !== Role.ADMIN) {
          return Response.redirect(new URL('/dashboard', nextUrl.origin));
        }

        return true; // Admin rolündeki kullanıcı admin paneline erişebilir
      }

      // 3. Dashboard kontrolü
      if (isOnDashboard) {
        if (!isLoggedIn) {
          const loginUrl = new URL('/giris', nextUrl.origin);
          loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
          return Response.redirect(loginUrl);
        }
        return true; // Giriş yapmış tüm kullanıcılar dashboard'a erişebilir
      }

      // 4. Diğer tüm sayfalar için erişime izin ver
      return true;
    },
  },
}; 