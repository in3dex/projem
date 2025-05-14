import NextAuth from 'next-auth';
import { edgeAuthConfig } from './edge-auth.config';
import CredentialsProvider from 'next-auth/providers/credentials';

// Edge middleware için minimum gerekli yapılandırma
// İstemci ve middleware'in çalışması için gereken en az yapılandırma
export const edgeConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      // Edge runtime'da Prisma kullanmıyoruz, sadece credentials doğrulama
      async authorize() {
        // Edge runtime'da sadece credentials provider'ı tanımlıyoruz
        // Actual authorization will happen on the server
        return null;
      }
    })
  ],
  ...edgeAuthConfig,
  debug: true // Sorun giderme için debug modunu aktifleştiriyoruz
};

// Edge runtime için NextAuth yapılandırması (middleware)
export const { auth } = NextAuth(edgeConfig); 