import { PrismaClient } from '@prisma/client';

// PrismaClient'ın global olarak kullanılması için
declare global {
  var prisma: PrismaClient | undefined;
}

// Geliştirme ortamında yeniden yükleme yapılırken çoklu PrismaClient örnekleri oluşmasını önlemek için
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// İki farklı export formatı sağlıyoruz
export default prisma;
export const db = prisma; 