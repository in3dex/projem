// import { handlers } from "../../../../../auth-handler"; // Eski import
import { handlers } from "@/lib/auth/auth"; // Yeni alias importu

export const { GET, POST } = handlers;
export const runtime = 'nodejs'; // bcryptjs ve Prisma uyumluluğu için Node.js runtime'ı belirtildi

// Bu dosya artık çok daha basit olacak. 