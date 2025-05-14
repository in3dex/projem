import NextAuth from 'next-auth';
// Prisma adapter ve client importlarına gerek yok, authOptions içinde tanımlı
// import { PrismaAdapter } from '@auth/prisma-adapter';
// import { PrismaClient } from '@prisma/client';

// auth.config.ts artık sadece middleware için, tam config auth-options.ts'de
// import { authConfig } from './auth.config'; 
import { authOptions } from './auth-options'; // auth-options.ts'den tam configi al
import { authConfig } from './auth.config';
import { Role } from '@prisma/client'; // Role tipini import ediyoruz

// const prisma = new PrismaClient(); // authOptions içinde tanımlı

// NextAuth v5 yapılandırmasını oluşturuyoruz
// İki konfigürasyon dosyasını birleştirerek tam yapılandırmayı oluşturuyoruz
const mergedConfig = {
  ...authOptions,
  ...authConfig,
  callbacks: {
    // authOptions'daki callback'leri koruyoruz ve öncelik veriyoruz
    ...authOptions.callbacks,
    
    // Rol bilgisinin doğru aktarıldığından emin olmak için JWT callback'ini ekliyoruz
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Role bilgisini açıkça ayarla
        if ('role' in user && user.role) {
          token.role = user.role;
        }
        // Debug log
        // console.log('JWT token oluşturuldu:', {
        //   email: token.email,
        //   role: token.role,
        //   userId: token.id
        // });
      }
      return token;
    },
    
    // Rol bilgisinin doğru aktarıldığından emin olmak için session callback'ini ekliyoruz
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // Role bilgisini açıkça session'a aktar
        session.user.role = token.role as Role;
        // Debug log
        // console.log('Session oluşturuldu:', {
        //   email: session?.user?.email,
        //   role: session?.user?.role,
        //   userId: session?.user?.id
        // });
      }
      return session;
    },
    
    // Edge-auth.config.ts'den gelen authorized callback'ini koruyalım
    authorized: authConfig.callbacks.authorized
  }
};

// NextAuth'u oluşturuyoruz
const { handlers, auth, signIn, signOut } = NextAuth(mergedConfig);

// API fonksiyonlarını export ediyoruz
export { handlers, auth, signIn, signOut }; 