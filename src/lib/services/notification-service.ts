// 'use server'; // Bu satırı kaldır veya yorumla

import { db } from '@/lib/db'
import { Notification, NotificationType, Prisma } from '@prisma/client'

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  message: string
  relatedId?: string
  relatedUrl?: string
}

export const notificationService = {
  /**
   * Yeni bir bildirim oluşturur.
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    try {
      const notification = await db.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          message: input.message,
          relatedId: input.relatedId,
          relatedUrl: input.relatedUrl,
          isRead: false, // Varsayılan olarak okunmadı
        },
      })
      console.log(`Bildirim oluşturuldu: Kullanıcı ID: ${input.userId}, Tip: ${input.type}`);
      return notification;
    } catch (error) {
      console.error('Bildirim oluşturulurken hata oluştu:', error)
      // Hata durumunda null dönmek yerine hatayı tekrar fırlatabiliriz
      // Bu, çağıran fonksiyonun hatayı yönetmesine olanak tanır
      throw new Error('Bildirim oluşturulamadı.'); 
    }
  },

  /**
   * Belirli bir kullanıcı için bildirimleri getirir.
   *
   * @param userId Kullanıcı ID'si
   * @param limit Kaç bildirim getirileceği (varsayılan: 20)
   * @param onlyUnread Sadece okunmamışları mı getirsin? (varsayılan: false)
   * @returns Notification dizisi
   */
  async getNotificationsForUser(
    userId: string,
    limit: number = 20,
    onlyUnread: boolean = false
  ): Promise<Notification[]> {
    try {
      const whereClause: { userId: string; isRead?: boolean } = { userId };
      if (onlyUnread) {
        whereClause.isRead = false;
      }

      return await db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error(`Kullanıcı ${userId} için bildirimler getirilirken hata:`, error);
      return []; // Hata durumunda boş dizi dön
    }
  },

  /**
   * Bir kullanıcının tüm bildirimlerini okundu olarak işaretler.
   *
   * @param userId Kullanıcı ID'si
   * @returns Güncelleme işleminin sonucu
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      return await db.notification.updateMany({
        where: {
          userId: userId,
          isRead: false, // Sadece okunmamışları güncelle
        },
        data: {
          isRead: true,
          updatedAt: new Date(), // Okunma zamanını da güncelleyelim
        },
      });
    } catch (error) {
      console.error(`Kullanıcı ${userId} için bildirimler okunurken hata:`, error);
      throw new Error('Bildirimler okundu olarak işaretlenemedi.');
    }
  },
  
  /**
   * Belirli bir bildirimi okundu olarak işaretler.
   *
   * @param notificationId Bildirim ID'si
   * @param userId Yetkilendirme için Kullanıcı ID'si
   * @returns Güncellenen bildirim veya null
   */
  async markOneAsRead(notificationId: string, userId: string): Promise<Notification | null> {
     try {
      // Önce bildirimin kullanıcıya ait olup olmadığını kontrol et
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.userId !== userId) {
        console.warn(`Yetkisiz erişim denemesi: Bildirim ${notificationId}, Kullanıcı ${userId}`);
        return null; // Veya hata fırlat
      }

      if (notification.isRead) {
        return notification; // Zaten okunmuş
      }

      return await db.notification.update({
        where: { id: notificationId },
        data: { 
          isRead: true,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      console.error(`Bildirim ${notificationId} okunurken hata:`, error);
      throw new Error('Bildirim okundu olarak işaretlenemedi.');
    }
  },

  /**
   * Kullanıcının okunmamış bildirim sayısını getirir.
   *
   * @param userId Kullanıcı ID'si
   * @returns Okunmamış bildirim sayısı
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await db.notification.count({
        where: {
          userId: userId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error(`Kullanıcı ${userId} için okunmamış bildirim sayısı alınırken hata:`, error);
      return 0;
    }
  },

  /**
   * Kullanıcının bildirimlerini listeler (sayfalama ile).
   */
  async getNotifications(userId: string, options: { page?: number, size?: number, onlyUnread?: boolean } = {}): Promise<{ notifications: any[], totalCount: number }> {
     const page = options.page || 1;
     const size = options.size || 10;
     const skip = (page - 1) * size;

     const whereClause: Prisma.NotificationWhereInput = {
         userId: userId,
     };
     if (options.onlyUnread) {
         whereClause.isRead = false;
     }

     try {
         const notifications = await db.notification.findMany({
             where: whereClause,
             orderBy: { createdAt: 'desc' },
             skip: skip,
             take: size,
         });
         const totalCount = await db.notification.count({ where: whereClause });
         return { notifications, totalCount };
     } catch (error) {
         console.error('Bildirimler alınırken hata:', error);
         return { notifications: [], totalCount: 0 }; // Hata durumunda boş dön
     }
   },

   /**
   * Belirli bildirimleri okundu olarak işaretler.
   */
   async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<number> {
       if (!notificationIds || notificationIds.length === 0) {
           return 0;
       }
       try {
           const result = await db.notification.updateMany({
               where: {
                   userId: userId,
                   id: { in: notificationIds },
                   isRead: false, // Sadece okunmamışları güncelle
               },
               data: { isRead: true },
           });
           console.log(`${result.count} bildirim okundu olarak işaretlendi.`);
           return result.count;
       } catch (error) {
           console.error('Bildirimler okundu olarak işaretlenirken hata:', error);
           return 0;
       }
   },

   /**
   * Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler.
   */
   async markAllNotificationsAsRead(userId: string): Promise<number> {
        try {
           const result = await db.notification.updateMany({
               where: {
                   userId: userId,
                   isRead: false,
               },
               data: { isRead: true },
           });
           console.log(`Kullanıcı ${userId} için ${result.count} bildirim okundu olarak işaretlendi.`);
           return result.count;
       } catch (error) {
           console.error('Tüm bildirimler okundu olarak işaretlenirken hata:', error);
           return 0;
       }
   },

   // Belirli bildirimleri okundu olarak işaretleme fonksiyonu
   async markSpecificAsRead(userId: string, notificationIds: string[]) {
     try {
       const updateResult = await db.notification.updateMany({
         where: {
           userId: userId,
           id: {
             in: notificationIds
           },
           isRead: false // Sadece okunmamış olanları güncelle
         },
         data: {
           isRead: true,
           updatedAt: new Date()
         }
       });

       return { success: true, count: updateResult.count };
     } catch (error) {
       console.error('Belirli bildirimleri okundu işaretleme hatası:', error);
       throw error;
     }
   }

  // TODO: Bildirim silme fonksiyonu (opsiyonel)
} 