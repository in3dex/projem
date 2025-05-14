import { auth } from "@/lib/auth/auth";
import { Role } from "@prisma/client";

export async function verifyAdminRole() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Yetkisiz erişim.");
  }
  return session.user;
} 