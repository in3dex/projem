import { PrismaClient, BillingInterval, EmailTemplateType, Role, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Örnek Plan Verileri
const plansData = [
  {
    id: 'plan_basic_monthly', // Benzersiz bir ID verelim
    name: 'Temel Paket (Aylık)',
    description: 'Başlangıç seviyesi kullanıcılar için aylık temel özellikler.',
    priceMonthly: 59.90,
    priceYearly: null, // Aylık planda yıllık fiyat yok
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
    priceYearly: 1499.90, // Yıllık fiyat (örneğin 2 ay indirimli)
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
    priceYearly: 4999.90, // Örnek yıllık fiyat
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
    maxProducts: null, // Sınırsız
    maxMonthlyOrders: null, // Sınırsız
  },
];

// Örnek Kullanıcı Verileri - Şifre: 'password'
// WSL ortamında bcrypt'in native modülünü derlemek sorun çıkardığı için şifreyi doğrudan kaydediyoruz
// NOT: Hash'lenmemiş şifre sadece geliştirme ortamında kullanılmalıdır!
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
  {
    id: 'pro-user-1',
    name: 'Pro Kullanıcı',
    email: 'pro@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.USER,
    logoUrl: 'https://placehold.co/400x200/png?text=Pro+Logo',
    companyName: 'XYZ Bilişim A.Ş.',
    address: 'Teknoloji Bulvarı, No: 78, Bursa',
    phone: '05551112266',
    isActive: true,
  },
  {
    id: 'enterprise-user-1',
    name: 'Kurumsal Kullanıcı',
    email: 'enterprise@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.USER,
    logoUrl: 'https://placehold.co/400x200/png?text=Enterprise+Logo',
    companyName: 'Dev Holding A.Ş.',
    address: 'Kurumsal Plaza, Kat: 10, Ankara',
    phone: '05551112277',
    isActive: true,
  },
  {
    id: 'inactive-user-1',
    name: 'Pasif Kullanıcı',
    email: 'inactive@example.com',
    password: '$2a$10$M0t6hx8r4Ce4c6WV1QTrwuHjyVVSvf3YCjIALV9VmXwqQdQa/uVLu', // 'password'
    role: Role.USER,
    companyName: 'Pasif Şirket Ltd.',
    address: 'Eski Cadde, No: 5, Antalya',
    phone: '05551112288',
    isActive: false,
  }
];

// Abonelik Verileri
const subscriptionsData = [
  {
    userId: 'basic-user-1',
    planId: 'plan_basic_monthly',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTH,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
    paymentMethod: 'paytr',
    paymentProvider: 'PAYTR',
  },
  {
    userId: 'pro-user-1',
    planId: 'plan_pro_monthly',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTH,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
    paymentMethod: 'paytr',
    paymentProvider: 'PAYTR',
  },
  {
    userId: 'enterprise-user-1',
    planId: 'plan_enterprise_yearly',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.YEAR,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 gün sonra
    paymentMethod: 'eft',
    paymentProvider: 'EFT',
  },
  {
    userId: 'inactive-user-1',
    planId: 'plan_basic_monthly',
    status: SubscriptionStatus.CANCELED,
    billingInterval: BillingInterval.MONTH,
    currentPeriodStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 gün önce başlamış
    currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 gün sonra bitecek
    canceledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 gün önce iptal edilmiş
    cancelAtPeriodEnd: true,
    paymentMethod: 'paytr',
    paymentProvider: 'PAYTR',
  }
];

// Örnek E-posta Şablonu Verileri
const emailTemplatesData = [
  {
    type: EmailTemplateType.WELCOME,
    subject: "Projem'e Hoş Geldiniz!",
    description: 'Yeni kullanıcı kaydolduğunda gönderilen hoş geldiniz e-postası.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>Projem platformuna hoş geldiniz! Hesabınızı başarıyla oluşturdunuz.</p>
      <p>Platformu keşfetmeye başlamak için <a href="{{loginUrl}}">buraya tıklayın</a>.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.PASSWORD_RESET,
    subject: 'Projem Şifre Sıfırlama İsteği',
    description: 'Kullanıcı şifre sıfırlama talebinde bulunduğunda gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>Hesabınız için bir şifre sıfırlama isteği aldık.</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (bu bağlantı {{validMinutes}} dakika geçerlidir):</p>
      <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
      <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.ORDER_CONFIRMATION,
    subject: 'Siparişiniz Alındı - {{orderNumber}}',
    description: 'Yeni bir sipariş oluşturulduğunda müşteriye gönderilen onay e-postası.',
    htmlBody: `
      <p>Merhaba {{customerName}},</p>
      <p>{{orderNumber}} numaralı siparişiniz başarıyla alınmıştır.</p>
      <p>Sipariş detaylarınızı görüntülemek için <a href="{{orderDetailsUrl}}">buraya tıklayın</a>.</p>
      <p>Siparişiniz kargoya verildiğinde sizi tekrar bilgilendireceğiz.</p>
      <p>Teşekkürler,<br/>{{shopName}}</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.ORDER_SHIPPED,
    subject: 'Siparişiniz Kargolandı - {{orderNumber}}',
    description: 'Sipariş kargoya verildiğinde müşteriye gönderilen bildirim.',
    htmlBody: `
      <p>Merhaba {{customerName}},</p>
      <p>{{orderNumber}} numaralı siparişiniz kargoya verilmiştir.</p>
      <p>Kargo Takip Numarası: {{trackingNumber}}</p>
      <p>Kargo Firması: {{shippingProvider}}</p>
      <p>Tahmini teslimat tarihi: {{estimatedDeliveryDate}}</p>
      <p>Kargonuzu takip etmek için <a href="{{trackingUrl}}">buraya tıklayın</a>.</p>
      <p>Teşekkürler,<br/>{{shopName}}</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.NEW_ORDER_ADMIN,
    subject: 'Yeni Sipariş Alındı - {{orderNumber}}',
    description: 'Yeni bir sipariş geldiğinde yöneticiye/mağazaya gönderilen bildirim.',
    htmlBody: `
      <p>Merhaba,</p>
      <p>{{orderNumber}} numaralı yeni bir sipariş aldınız.</p>
      <p>Müşteri: {{customerName}}</p>
      <p>Toplam Tutar: {{totalAmount}} {{currencyCode}}</p>
      <p>Siparişi görüntülemek için <a href="{{adminOrderUrl}}">buraya tıklayın</a>.</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.QUESTION_ANSWERED,
    subject: 'Sorunuz Cevaplandı - {{productName}}',
    description: 'Müşterinin sorduğu ürün sorusu cevaplandığında gönderilir.',
    htmlBody: `
      <p>Merhaba {{customerName}},</p>
      <p>'{{productName}}' ürünü hakkında sorduğunuz soru cevaplanmıştır.</p>
      <p><b>Soru:</b> {{questionText}}</p>
      <p><b>Cevap:</b> {{answerText}}</p>
      <p>Sorunuzu ve cevabını görüntülemek için <a href="{{questionUrl}}">buraya tıklayın</a>.</p>
      <p>Teşekkürler,<br/>{{shopName}}</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.SUBSCRIPTION_STARTED,
    subject: 'Aboneliğiniz Başlatıldı - {{planName}}',
    description: 'Yeni bir abonelik başarıyla başlatıldığında (ödeme sonrası) gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliğiniz başarıyla başlatılmıştır.</p>
      <p>Abonelik başlangıç tarihi: {{startDate}}</p>
      <p>Sonraki yenileme tarihi: {{endDate}}</p>
      <p>Kontrol paneline erişmek için <a href="{{dashboardUrl}}">buraya tıklayın</a>.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.SUBSCRIPTION_CANCELED,
    subject: 'Aboneliğiniz İptal Edildi - {{planName}}',
    description: 'Kullanıcı veya admin tarafından bir abonelik iptal edildiğinde gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliğiniz {{cancelDate}} tarihinde isteğiniz üzerine iptal edilmiştir.</p>
      <p>Aboneliğiniz {{endDate}} tarihine kadar aktif kalacaktır.</p>
      <p>Fikrinizi değiştirirseniz veya farklı bir plana geçmek isterseniz bizimle iletişime geçebilirsiniz.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.PAYMENT_INSTRUCTIONS_EFT,
    subject: 'Ödeme Talimatları - {{planName}} Aboneliği',
    description: 'EFT/Havale ile ödeme seçeneği seçildiğinde ödeme bilgileri gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliği için EFT/Havale ile ödeme seçeneğini seçtiniz.</p>
      <p>Ödeme Tutarı: <strong>{{amount}} {{currency}}</strong></p>
      <p>Lütfen aşağıdaki banka hesabına ödemeyi gerçekleştirin:</p>
      <p>
        Banka: {{bankAccountName}}<br/>
        IBAN: {{iban}}
      </p>
      <p><strong>ÖNEMLİ:</strong> Açıklama kısmına referans numaranızı yazmayı unutmayın: <strong>{{paymentReference}}</strong></p>
      <p>Ödemeniz onaylandıktan sonra aboneliğiniz aktif edilecektir (Genellikle 1 iş günü içinde).</p>
      <p>Son Ödeme Tarihi: {{paymentDueDate}}</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.PAYMENT_RECEIVED,
    subject: 'Ödemeniz Alındı - {{planName}} Aboneliği',
    description: 'Yapılan EFT/Havale ödemesi onaylandığında gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliği için {{amount}} {{currency}} tutarındaki ödemeniz {{paymentDate}} tarihinde alınmış ve onaylanmıştır.</p>
      <p>Aboneliğiniz şimdi aktif durumdadır.</p>
      <p>Kontrol paneline erişmek için <a href="{{dashboardUrl}}">buraya tıklayın</a>.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.PAYMENT_FAILED,
    subject: 'Abonelik Ödemesi Başarısız - {{planName}}',
    description: 'Abonelik için otomatik ödeme alınamadığında gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliğiniz için {{paymentAttemptDate}} tarihinde yapılan {{amount}} {{currency}} tutarındaki ödeme denemesi başarısız olmuştur.</p>
      <p>Lütfen ödeme bilgilerinizi kontrol edip güncellemek için aşağıdaki bağlantıyı ziyaret edin:</p>
      <p><a href="{{updatePaymentMethodUrl}}">Ödeme Yöntemini Güncelle</a></p>
      <p>Ödeme kısa süre içinde tekrar denenecektir. Sorun devam ederse aboneliğiniz askıya alınabilir.</p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
  {
    type: EmailTemplateType.SUBSCRIPTION_RENEWAL_REMINDER,
    subject: 'Aboneliğiniz Yakında Yenilenecek - {{planName}}',
    description: 'Abonelik yenilenme tarihinden birkaç gün önce hatırlatma gönderilir.',
    htmlBody: `
      <p>Merhaba {{userName}},</p>
      <p>'{{planName}}' aboneliğiniz {{renewalDate}} tarihinde otomatik olarak yenilenecektir.</p>
      <p>Yenileme tutarı: {{amount}} {{currency}}</p>
      <p>Herhangi bir değişiklik yapmak isterseniz abonelik ayarlarınızı ziyaret edebilirsiniz:</p>
      <p><a href="{{manageSubscriptionUrl}}">Aboneliği Yönet</a></p>
      <p>Teşekkürler,<br/>Projem Ekibi</p>
    `,
    isActive: true,
  },
];

// Banka Hesapları Verileri
const bankAccountsData = [
  {
    id: 'bank-account-1',
    bankaAdi: 'Garanti BBVA',
    subeKodu: '123',
    hesapNumarasi: '12345678',
    iban: 'TR123456789012345678901234',
    hesapSahibi: 'Projem Teknoloji Ltd. Şti.',
    isActive: true,
  },
  {
    id: 'bank-account-2',
    bankaAdi: 'Yapı Kredi',
    subeKodu: '456',
    hesapNumarasi: '87654321',
    iban: 'TR987654321098765432109876',
    hesapSahibi: 'Projem Teknoloji Ltd. Şti.',
    isActive: true,
  },
  {
    id: 'bank-account-3',
    bankaAdi: 'İş Bankası',
    subeKodu: '789',
    hesapNumarasi: '13579246',
    iban: 'TR246813579024681357902468',
    hesapSahibi: 'Projem Teknoloji Ltd. Şti.',
    isActive: true,
  },
];

// Ödeme Ayarları
const paymentSettings = {
  id: 'singleton',
  eftAktif: true,
  paytrAktif: true,
  paytrMerchantId: "123456", // Örnek değer
  paytrMerchantKey: "examplekey123456", // Örnek değer
  paytrMerchantSalt: "examplesalt123456", // Örnek değer
  paytrTestMode: "1", // Test modu aktif
};

// Otomasyon Ayarları
const automationSettings = {
  id: 'singleton',
  invoiceGenerationDaysBeforeEnd: 7,
  invoiceDueDays: 7,
  overdueMarkDays: 3,
  cancelSubscriptionAfterOverdueDays: 30,
  sendSubscriptionEndingSoonEmail: true,
  daysBeforeEndingToSendEmail: 7,
  sendPaymentOverdueEmail: true,
  sendSubscriptionCancelledEmail: true,
  syncEnabled: false,
  syncIntervalHours: 24,
  syncOrders: true,
  syncProducts: true,
  syncClaims: true,
  syncCustomerQuestions: true,
};

async function main() {
  console.log(`--- Starting seed script execution ---`);

  try {
  console.log(`Seeding başlangıcı...`);

  // Planları seed et
  console.log('Planlar seed ediliyor...');
  for (const plan of plansData) {
    const upsertedPlan = await prisma.plan.upsert({
        where: { id: plan.id },
        update: plan,
        create: plan,
    });
      console.log(`Plan ${upsertedPlan.name} (ID: ${upsertedPlan.id}) oluşturuldu/güncellendi.`);
  }

    // Kullanıcıları seed et
    console.log('Kullanıcılar seed ediliyor...');
    for (const userData of usersData) {
      const upsertedUser = await prisma.user.upsert({
        where: { id: userData.id },
        update: userData,
        create: userData,
      });
      console.log(`Kullanıcı ${upsertedUser.name} (ID: ${upsertedUser.id}, Rol: ${upsertedUser.role}) oluşturuldu/güncellendi.`);
    }

    // Abonelikleri seed et
    console.log('Abonelikler seed ediliyor...');
    for (const subscriptionData of subscriptionsData) {
      // Her abonelik için önce id oluşturalım
      const subscriptionId = `subscription-${subscriptionData.userId}`;
      
      const upsertedSubscription = await prisma.subscription.upsert({
        where: { id: subscriptionId },
        update: subscriptionData,
        create: { id: subscriptionId, ...subscriptionData },
      });
      console.log(`Abonelik (ID: ${upsertedSubscription.id}, Plan: ${upsertedSubscription.planId}, Kullanıcı: ${upsertedSubscription.userId}) oluşturuldu/güncellendi.`);
  }

  // E-posta Şablonlarını seed et
  console.log('E-posta şablonları seed ediliyor...');
  for (const template of emailTemplatesData) {
    const upsertedTemplate = await prisma.emailTemplate.upsert({
        where: { type: template.type },
        update: template,
        create: template,
      });
      console.log(`E-posta şablonu ${upsertedTemplate.type} oluşturuldu/güncellendi.`);
    }

    // Banka Hesaplarını seed et
    console.log('Banka hesapları seed ediliyor...');
    for (const bankAccount of bankAccountsData) {
    const upsertedBankAccount = await prisma.bankaHesabi.upsert({
        where: { id: bankAccount.id },
        update: bankAccount,
        create: bankAccount,
    });
    console.log(`Banka hesabı ${upsertedBankAccount.bankaAdi} (ID: ${upsertedBankAccount.id}) oluşturuldu/güncellendi.`);
    }

    // Ödeme Ayarlarını seed et
    console.log('Ödeme ayarları seed ediliyor...');
    const upsertedPaymentSettings = await prisma.odemeAyarlari.upsert({
      where: { id: paymentSettings.id },
      update: paymentSettings,
      create: paymentSettings,
    });
    console.log(`Ödeme ayarları (EFT Aktif: ${upsertedPaymentSettings.eftAktif}, PayTR Aktif: ${upsertedPaymentSettings.paytrAktif}) oluşturuldu/güncellendi.`);

    // Otomasyon Ayarlarını seed et
    console.log('Otomasyon ayarları seed ediliyor...');
    const upsertedAutomationSettings = await prisma.automationSettings.upsert({
      where: { id: automationSettings.id },
      update: automationSettings,
      create: automationSettings,
    });
    console.log(`Otomasyon ayarları oluşturuldu/güncellendi.`);

    console.log(`Seeding başarıyla tamamlandı.`);
    console.log("--- Seed script finished successfully ---");

  } catch (error) {
    console.error("!!! Seeding failed !!!", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("--- Prisma Client disconnected ---");
  }
}

main(); 