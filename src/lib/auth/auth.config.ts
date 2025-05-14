import type { NextAuthConfig } from 'next-auth';
import { Role } from '@prisma/client';

// Edge Runtime uyumlu config
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/giris',
    signOut: '/cikis',
    error: '/giris',
  },
  callbacks: {
    async authorized({ auth, request }) {
      const { nextUrl } = request;
      
      // Middleware içeriği (erişim kontrolü) burada kalacak.
      // auth objesi zaten Edge Runtime ile uyumludur.
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role as Role | undefined;
      const isAdminLoginPage = nextUrl.pathname === '/admin/giris';
      const isGeneralLoginPage = nextUrl.pathname === '/giris';
      const isRegisterPage = nextUrl.pathname === '/kayit';
      const isOnAuthPage = isAdminLoginPage || isGeneralLoginPage || isRegisterPage;
      const isOnAdminPanel = nextUrl.pathname.startsWith('/admin');
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnAuthPage) {
        if (isLoggedIn) {
          const redirectUrlPath = userRole === Role.ADMIN ? '/admin' : '/dashboard';
          return Response.redirect(new URL(redirectUrlPath, nextUrl.origin));
        }
        return true;
      }
      if (isOnAdminPanel) {
        if (!isLoggedIn) {
          const adminLoginUrl = new URL('/admin/giris', nextUrl.origin);
          adminLoginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
          return Response.redirect(adminLoginUrl);
        }
        if (userRole !== Role.ADMIN) {
          return Response.redirect(new URL('/', nextUrl.origin)); 
        }
        return true;
      }
      if (isOnDashboard || nextUrl.pathname === '/') { 
        if (!isLoggedIn) {
          const loginUrl = new URL('/giris', nextUrl.origin);
          loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
          return Response.redirect(loginUrl);
        }
        return true; 
      }
      return true;
    },
  },
}; 