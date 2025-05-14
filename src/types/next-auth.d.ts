import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Role } from "@prisma/client"; // Prisma'daki Role enumunu import et

// JWT tipini genişlet (authorize'dan dönen tüm alanları içerebilir)
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: Role;
    phone?: string | null;
    companyName?: string | null;
    address?: string | null;
    // logoUrl?: string | null; // Gerekirse eklenebilir
  }
}

// Session tipini genişlet (Client tarafında kullanılacak alanlar)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      phone?: string | null;       // Eklenen alan
      companyName?: string | null; // Eklenen alan
      address?: string | null;     // Eklenen alan
      // logoUrl?: string | null;    // Gerekirse eklenebilir
    } & DefaultSession["user"]; // name, email, image gibi varsayılan alanları koru
  }

  // User tipini genişlet (authorize fonksiyonundan dönen tip ile eşleşmeli)
  interface User extends DefaultUser {
     id: string; // DefaultUser'da id opsiyonel olabilir, zorunlu yapalım
     role?: Role;
     phone?: string | null;
     companyName?: string | null;
     address?: string | null;
     // logoUrl?: string | null;
  }
} 