import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { Session } from "next-auth"; // Session tipini import et

/**
 * Sunucu tarafında (Server Components, API Routes, Server Actions) 
 * geçerli kullanıcı oturumunu alır.
 */
export async function getCurrentSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

/**
 * Sunucu tarafında geçerli kullanıcı bilgilerini (varsa) alır.
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user;
}

/**
 * Sunucu tarafında kullanıcının admin olup olmadığını kontrol eder.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
} 