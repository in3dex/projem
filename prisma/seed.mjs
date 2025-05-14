// seed.mjs - Doğrudan JavaScript ESM modülü olarak çalıştırılabilir
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enum değerlerini manuel olarak tanımlıyoruz (TypeScript enum'ları yerine)
const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR'
};

const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE', 
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  TRIALING: 'TRIALING',
  PENDING_PAYMENT: 'PENDING_PAYMENT'
};

const BillingInterval = {
  MONTH: 'MONTH',
  YEAR: 'YEAR'
};

const EmailTemplateType = {
  WELCOME: 'WELCOME',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ORDER_CONFIRMATION: 'ORDER_CONFIRMATION',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  NEW_ORDER_ADMIN: 'NEW_ORDER_ADMIN',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  SUBSCRIPTION_STARTED: 'SUBSCRIPTION_STARTED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  PAYMENT_INSTRUCTIONS_EFT: 'PAYMENT_INSTRUCTIONS_EFT',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_RENEWAL_REMINDER: 'SUBSCRIPTION_RENEWAL_REMINDER'
};

// Örnek Plan Verileri
const plansData = [
  {
    id: 'plan_basic_monthly',
    name: 'Temel Paket (Aylık)',
    description: 'Başlangıç seviyesi kullanıcılar için aylık temel özellikler.',
    priceMonthly: 59.90,
    priceYearly: null,
    features: [
      '100 Sipariş Takibi/Ay',
      'Temel Raporlama',
      'E-posta Desteği',
      '1 Kullanıcı',
    ],
    isActive: true,
    currency: 'TRY',
    maxProducts: 100,
    maxMonthlyOrders: 100,
  },
  {
    id: 'plan_pro_monthly',
    name: 'Profesyonel Paket (Aylık)',
    description: 'Büyüyen işletmeler için gelişmiş özellikler.',
    priceMonthly: 149.90,
    priceYearly: null,
    features: [
      '1000 Sipariş Takibi/Ay',
      'Gelişmiş Raporlama',
      'Öncelikli E-posta Desteği',
      'API Erişimi (Sınırlı)',
      '5 Kullanıcı',
    ],
    isActive: true,
    currency: 'TRY',
    maxProducts: 1000,
    maxMonthlyOrders: 1000,
  },
  {
    id: 'plan_pro_yearly',
    name: 'Profesyonel Paket (Yıllık)',
    description: 'Büyüyen işletmeler için gelişmiş özellikler (Yıllık Avantajlı Fiyat).',
    priceMonthly: null,
    priceYearly: 1499.90,
    features: [
      '1000 Sipariş Takibi/Ay',
      'Gelişmiş Raporlama',
      'Öncelikli E-posta Desteği',
      'API Erişimi (Sınırlı)',
      '5 Kullanıcı',
    ],
    isActive: true,
    currency: 'TRY',
    maxProducts: 1000,
    maxMonthlyOrders: 1000,
  },
  {
    id: 'plan_enterprise_yearly',
    name: 'Kurumsal Paket (Yıllık)',
    description: 'Büyük ölçekli işletmeler ve özel ihtiyaçlar için.',
    priceMonthly: null,
    priceYearly: 4999.90,
    features: [
      'Sınırsız Sipariş Takibi',
      'Özelleştirilmiş Raporlama',
      'Telefon ve E-posta Desteği',
      'Tam API Erişimi',
      'Sınırsız Kullanıcı',
      'Özel Entegrasyonlar',
    ],
    isActive: true,
    currency: 'TRY',
    maxProducts: null,
    maxMonthlyOrders: null,
  },
];

// Örnek Kullanıcı Verileri
const usersData = [
  {
    id: 'admin-user-1',
    name: 'Admin Kullanıcı',
    email: 'admin@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.ADMIN,
    logoUrl: 'https://placehold.co/400x200/png?text=Admin+Logo',
    companyName: 'Projem Teknoloji Ltd. Şti.',
    address: 'Örnek Mahallesi, Teknoloji Caddesi No: 123, Ankara',
    phone: '05551112233',
    isActive: true,
  },
  {
    id: 'editor-user-1',
    name: 'Editör Kullanıcı',
    email: 'editor@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.EDITOR,
    logoUrl: 'https://placehold.co/400x200/png?text=Editor+Logo',
    companyName: 'Editör Mağazası',
    address: 'Örnek Mahallesi, Editör Caddesi No: 45, İstanbul',
    phone: '05551112244',
    isActive: true,
  },
  {
    id: 'basic-user-1',
    name: 'Temel Kullanıcı',
    email: 'basic@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.USER,
    logoUrl: 'https://placehold.co/400x200/png?text=Basic+Logo',
    companyName: 'ABC Elektronik',
    address: 'Örnek Sokak, No: 10, İzmir',
    phone: '05551112255',
    isActive: true,
  },
];

// Ana seed fonksiyonu
async function main() {
  console.log(`Veritabanı seed işlemi başlatılıyor...`);

  // Planları oluştur
  console.log('Planlar oluşturuluyor...');
  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log(`${plansData.length} plan başarıyla oluşturuldu.`);

  // Kullanıcıları oluştur
  console.log('Kullanıcılar oluşturuluyor...');
  for (const user of usersData) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log(`${usersData.length} kullanıcı başarıyla oluşturuldu.`);

  console.log('Veritabanı seed işlemi tamamlandı!');
}

// Seed'i çalıştır ve sonra bağlantıyı kapat
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 