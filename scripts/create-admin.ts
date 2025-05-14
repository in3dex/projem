import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
// import { randomBytes } from 'crypto'; // Rastgele şifre oluşturma şimdilik kullanılmıyor

const prisma = new PrismaClient();

async function main() {
  const usersToCreate = [
    {
      email: 'a@b.c',
      name: 'Admin Kullanıcı',
      password: 'Password1.', // Şifre (hashlenecek)
      role: Role.ADMIN,
    },
    {
      email: 'd@e.f',
      name: 'Normal Kullanıcı',
      password: 'Password1.', // Şifre (hashlenecek)
      role: Role.USER,
    },
  ];

  console.log(`⏳ Kullanıcılar oluşturuluyor/güncelleniyor...`);

  try {
    for (const userData of usersToCreate) {
      const { email, name, password, role } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          // Kullanıcı zaten varsa güncellenecek alanlar (opsiyonel)
          // Şifre veya rol güncellemesi istenirse buraya eklenebilir
          // Örn: password: hashedPassword, role: role
          name, // Adı güncelleyelim
          isActive: true, // Aktif olduğundan emin olalım
        },
        create: {
          email,
          name,
          password: hashedPassword,
          role,
          emailVerified: role === Role.ADMIN ? new Date() : null, // Admin ise e-posta doğrulanmış olsun
          isActive: true,
        },
      });

      if (user) {
        console.log(`✅ Kullanıcı (${email}) başarıyla ${user.createdAt.getTime() !== user.updatedAt.getTime() ? 'güncellendi' : 'oluşturuldu'}. Rol: ${user.role}`);
      } else {
         console.log(`ℹ️ Kullanıcı (${email}) ile ilgili bir işlem yapılamadı (belki zaten güncel?).`);
      }
    }
    console.log(`------------------------------------------`);
    console.log(`✨ Tüm kullanıcı işlemleri tamamlandı.`);
    console.log(`   Admin E-posta: a@b.c`);
    console.log(`   Normal Kullanıcı E-posta: d@e.f`);
    console.log(`   Kullanılan Şifre: Password1.`);
    console.log(`------------------------------------------`);

  } catch (error) {
    console.error('❌ Kullanıcı oluşturma/güncelleme sırasında hata:', error);
    process.exit(1); // Hata durumunda script'i sonlandır
  } finally {
    await prisma.$disconnect(); // Prisma bağlantısını kapat
  }
}

main(); 