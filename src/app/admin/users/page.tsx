import { PrismaClient } from "@prisma/client";
import { UsersTable } from "@/components/admin/users/users-table";
import { columns } from "@/components/admin/users/columns"; // Kolonları import edelim

const prisma = new PrismaClient();

// Sayfanın dinamik olmasını ve cachlenmemesini sağlayalım
export const dynamic = "force-dynamic"; 

export default async function AdminUsersPage() {

  // Tüm kullanıcıları çekelim (gerekli alanları seçerek)
  // Çok fazla kullanıcı varsa paginasyon eklemek gerekebilir
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      image: true, // Avatar için
      createdAt: true, 
    },
    orderBy: {
      createdAt: 'desc', // En yeni kullanıcılar üstte
    },
  });

  // Kullanıcı verisini tablo bileşenine gönderelim
  return (
    <div className="space-y-4">
      {/* Başlık AdminHeader'da zaten var, isterseniz burada ek açıklama olabilir */}
      {/* <h2 className="text-2xl font-semibold">Kullanıcı Yönetimi</h2> */}
      
      {/* Kullanıcı tablosunu göster */}
       <UsersTable columns={columns} data={users} />
    </div>
  );
} 