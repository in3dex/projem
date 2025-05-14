import { PrismaClient, User, Role, ApiSettings } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TrendyolApiClientService, TrendyolApiError } from './trendyol-api-client';
import { db } from '@/lib/db';

const prisma = new PrismaClient();

export interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
  shopId?: string;
  shopName?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  image?: string;
  phone?: string;
  logoUrl?: string;
  companyName?: string;
  address?: string;
}

export interface UpdateApiSettingsInput {
  sellerId?: string;
  apiKey?: string;
  apiSecret?: string;
}

export const userService = {
  /**
   * Yeni kullanıcı oluşturur
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { password, ...userData } = input;
    
    // Şifreyi hashle
    const salt = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
  },
  
  /**
   * E-posta adresine göre kullanıcı bulur
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },
  
  /**
   * ID'ye göre kullanıcı bulur
   */
  async findUserById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  },
  
  /**
   * ID'ye göre kullanıcıyı bildirim ayarlarıyla birlikte bulur.
   * Webhook handler için gerekli.
   */
  async findUserByIdWithSettings(id: string): Promise<(User & { notifyOnOrderStatusUpdate: boolean }) | null> {
    return db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        password: true,
        image: true,
        phone: true,
        logoUrl: true,
        companyName: true,
        address: true,
        role: true,
        isActive: true,
        lastLogin: true,
        webhookApiKey: true,
        trendyolWebhookId: true,
        shopName: true,
        createdAt: true,
        updatedAt: true,
        notifyOnOrderStatusUpdate: true
      }
    });
  },
  
  /**
   * Kullanıcı profil bilgilerini günceller.
   * Sadece belirli alanların güncellenmesine izin verir.
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const updateData: Partial<User> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.image !== undefined) updateData.image = input.image;
    if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
    if (input.companyName !== undefined) updateData.companyName = input.companyName;
    if (input.address !== undefined) updateData.address = input.address;
    
    if (Object.keys(updateData).length === 0) {
        const currentUser = await this.findUserById(id);
        if (!currentUser) throw new Error("Kullanıcı bulunamadı");
        console.warn("Güncellenecek profil verisi sağlanmadı.")
        return currentUser;
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  },
  
  /**
   * Kullanıcı girişini doğrular
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.isActive) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Son giriş tarihini güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    return user;
  },
  
  /**
   * Tüm kullanıcıları listeler
   */
  async getAllUsers(skip = 0, take = 20): Promise<User[]> {
    return prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  },
  
  /**
   * Kullanıcıyı siler
   */
  async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  },
  
  /**
   * Kullanıcıyı devre dışı bırakır
   */
  async deactivateUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },
  
  /**
   * E-posta doğrulamasını yapar
   */
  async verifyEmail(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { emailVerified: new Date() },
    });
  },
  
  /**
   * Kullanıcının Trendyol API ayarlarını (ApiSettings modeli) günceller veya oluşturur.
   * Eğer ilk kez ayar yapılıyorsa veya mevcut webhook anahtarı yoksa User üzerinde yeni bir webhookApiKey oluşturur.
   * Başarılı güncelleme sonrası Trendyol webhook'unu otomatik olarak oluşturur.
   */
  async updateApiSettings(userId: string, input: UpdateApiSettingsInput): Promise<{user: User, apiSettings: ApiSettings}> {
    const { sellerId, apiKey, apiSecret } = input;

    // Input kontrolü: Tüm bilgiler sağlandı mı?
    if (!sellerId || !apiKey || !apiSecret) {
      throw new Error("Eksik API bilgileri: Seller ID, API Key ve API Secret gereklidir.");
    }

    // Mevcut kullanıcıyı ve ilişkili ApiSettings'i bul
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { apiSettings: true },
    });

    if (!user) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    let updatedApiSettings: ApiSettings;
    const userUpdateData: Partial<User> = {}; // User üzerinde yapılacak güncellemeler
    let requiresWebhookCreation = false;

    // 1. webhookApiKey oluşturma (Eğer yoksa User üzerinde)
    if (!user.webhookApiKey) {
      userUpdateData.webhookApiKey = crypto.randomBytes(32).toString('hex');
      console.log(`Kullanıcı ${userId} için yeni webhookApiKey oluşturuldu.`);
      requiresWebhookCreation = true; // Yeni anahtar varsa webhook oluşturulmalı
    }

    // 2. ApiSettings güncelleme veya oluşturma
    const apiSettingsData = {
      sellerID: sellerId,
      apiKey: apiKey,
      apiSecret: apiSecret, // Secret artık burada saklanacak
      userId: userId, // İlişkiyi kur
    };

    if (user.apiSettings) {
      // Mevcut ApiSettings'i güncelle
      console.log(`Kullanıcı ${userId} için ApiSettings güncelleniyor.`);
      updatedApiSettings = await db.apiSettings.update({
        where: { id: user.apiSettings.id },
        data: apiSettingsData,
      });
      // Eğer bilgiler değiştiyse veya önceden webhook yoksa webhook oluşturmayı tetikle
      if (!user.trendyolWebhookId || 
          user.apiSettings.sellerID !== sellerId || 
          user.apiSettings.apiKey !== apiKey || 
          user.apiSettings.apiSecret !== apiSecret) {
           requiresWebhookCreation = true; 
      }
    } else {
      // Yeni ApiSettings oluştur
      console.log(`Kullanıcı ${userId} için yeni ApiSettings oluşturuluyor.`);
      updatedApiSettings = await db.apiSettings.create({
        data: apiSettingsData,
      });
      requiresWebhookCreation = true; // Yeni ayar varsa webhook oluşturulmalı
    }
    
    // 3. User üzerinde webhookApiKey güncellemesi varsa yap
    let finalUser = user; 
    if (Object.keys(userUpdateData).length > 0) {
        finalUser = await db.user.update({
           where: { id: userId },
           data: userUpdateData,
           include: { apiSettings: true } // Güncellenmiş kullanıcıyı ayarlarıyla al
        });
    }
    
    const currentWebhookApiKey = finalUser.webhookApiKey;

    // 4. Webhook oluşturma (Eğer gerekiyorsa)
    if (requiresWebhookCreation && currentWebhookApiKey) {
      try {
        console.log(`Kullanıcı ${userId} için Trendyol webhook oluşturuluyor/güncelleniyor...`);
        const trendyolClient = new TrendyolApiClientService({
          sellerId: updatedApiSettings.sellerID,
          apiKey: updatedApiSettings.apiKey,
          apiSecret: updatedApiSettings.apiSecret,
        });

        // Not: Trendyol API'si webhook güncellemesini desteklemiyorsa, 
        // var olanı silip yenisini oluşturmak gerekebilir (trendyolWebhookId kontrolü ile).
        // Şimdilik sadece create çağırıyoruz.
        const webhookResponse = await trendyolClient.createWebhook({
          userId: finalUser.id,
          sellerId: updatedApiSettings.sellerID, 
          webhookApiKey: currentWebhookApiKey, // User üzerindeki anahtarı kullan
          subscribedStatuses: [],
        });

        if (webhookResponse && webhookResponse.id) {
          // User üzerinde trendyolWebhookId'yi güncelle
          await db.user.update({
            where: { id: userId },
            data: { trendyolWebhookId: webhookResponse.id.toString() },
          });
          finalUser.trendyolWebhookId = webhookResponse.id.toString(); // finalUser nesnesini de güncelleyelim
          console.log(`Kullanıcı ${userId} için Trendyol webhook başarıyla oluşturuldu/güncellendi. ID: ${webhookResponse.id}`);
        } else {
           console.warn(`Kullanıcı ${userId} için webhook oluşturuldu/güncellendi ancak Trendyol ID dönmedi. Yanıt:`, webhookResponse);
        }

      } catch (error: unknown) {
        console.error(`Kullanıcı ${userId} için Trendyol webhook oluşturma/güncelleme hatası:`, error);
        if (error instanceof TrendyolApiError) {
            console.error("Trendyol API Hata Detayı:", error.details);
            // Hata mesajını kullanıcıya iletmek için fırlatabiliriz
            // throw new Error(`Webhook oluşturulamadı: ${error.message}`);
        } else if (error instanceof Error) {
           console.error("Genel Hata:", error.message);
        } else {
           console.error("Bilinmeyen Hata Tipi:", error);
        }
        // Hata oluşsa bile işlemi devam ettirip kullanıcı ve ayar bilgisini dönebiliriz.
        // Arayüz bu durumu ele alabilir.
      }
    }

    // Güncellenmiş User ve ApiSettings bilgilerini döndür
    // Eğer finalUser güncellenmediyse user'ı kullan, güncellenmiş ayarları ekle
    const resultUser = await db.user.findUnique({ where: { id: userId } }); // En son halini al
    if (!resultUser) throw new Error("Kullanıcı bulunamadı (son kontrol).");

    return { user: resultUser, apiSettings: updatedApiSettings };
  },
  
  // Yeni fonksiyonlar: Bildirim Ayarları
  async getNotificationSettings(userId: string): Promise<{ notifyOnOrderStatusUpdate: boolean } | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { notifyOnOrderStatusUpdate: true }
    });
    return user ? { notifyOnOrderStatusUpdate: user.notifyOnOrderStatusUpdate } : null;
  },

  async updateNotificationSettings(userId: string, settings: { notifyOnOrderStatusUpdate: boolean }): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: {
        notifyOnOrderStatusUpdate: settings.notifyOnOrderStatusUpdate,
      }
    });
  },

  /**
   * ID'ye göre kullanıcıyı API ayarlarıyla birlikte bulur.
   * @param userId Kullanıcı ID'si
   * @returns ApiSettings nesnesi veya null
   */
  async findApiSettingsByUserId(userId: string): Promise<ApiSettings | null> {
    return db.apiSettings.findUnique({
        where: { userId },
    });
  },
};

export default userService; 