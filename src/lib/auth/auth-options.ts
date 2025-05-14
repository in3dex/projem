import { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient, Role } from "@prisma/client"; 
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta veya şifre eksik.");
        }
        
        const email = credentials.email as string;
        const password = credentials.password as string;
        
        console.log(`Giriş denemesi: ${email}`);
        try {
          const user = await prisma.user.findUnique({
            where: { email }
          });
          if (!user) {
            throw new Error("E-posta veya şifre hatalı.");
          }
          if (!user.password) {
             throw new Error("Bu hesapla şifre girişi yapılamaz.");
          }
          const isPasswordValid = await bcrypt.compare(
            password,
            user.password
          );
          if (!isPasswordValid) {
            throw new Error("E-posta veya şifre hatalı.");
          }
          console.log(`Kimlik doğrulama başarılı: ${email}, Rol: ${user.role}`);
          return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              image: user.image 
          };
        } catch (error: any) {
            console.error("Authorize fonksiyonunda hata:", error.message || error);
            return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if ('role' in user && user.role) {
            token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/giris',
    signOut: '/cikis',
    error: '/giris',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 