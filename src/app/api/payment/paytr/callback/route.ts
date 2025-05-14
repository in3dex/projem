import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import { addMonths, addYears } from 'date-fns';

export async function POST(req: NextRequest) {
  console.log('PayTR Callback isteği alındı.');
  try {
    // 1. PayTR'dan gelen POST verisini al (form-urlencoded)
    const formData = await req.formData();
    const merchant_oid = formData.get('merchant_oid') as string;
    const status = formData.get('status') as string;
    const total_amount = formData.get('total_amount') as string; // Kuruş cinsinden (örn: 5990)
    const hash = formData.get('hash') as string;

    console.log('Callback Data:', {
        merchant_oid,
        status,
        total_amount,
        hash
    });

    // Gerekli alanlar var mı kontrol et
    if (!merchant_oid || !status || !total_amount || !hash) {
      console.error('Eksik callback verisi.');
      return new NextResponse('Error: Missing Data', { status: 400 }); // Hatalı istek olarak işaretle
    }

    // Özel karakterleri temizle (Alfanumerik temizlik yapmıyoruz çünkü callback'de gelen veriyi doğrulamak için hash hesaplarken orijinal halini kullanmamız gerekiyor)
    // Sadece subscriptionId çıkarma aşamasında temizlik yapacağız

    // 2. Ödeme Ayarlarını ve PayTR Key/Salt bilgilerini veritabanından al
    const odemeAyarlari = await db.odemeAyarlari.findFirst();

    if (!odemeAyarlari || !odemeAyarlari.paytrMerchantKey || !odemeAyarlari.paytrMerchantSalt) {
      console.error('PayTR API bilgileri (key/salt) callback için veritabanında eksik.');
      return new NextResponse('Error: Missing Configuration', { status: 500 });
    }
    
    const merchant_key = odemeAyarlari.paytrMerchantKey;
    const merchant_salt = odemeAyarlari.paytrMerchantSalt;

    // 3. Hash Doğrulaması
    const hash_str = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
    const calculated_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

    if (hash !== calculated_hash) {
      console.error('PayTR Callback HASH UYUŞMAZLIĞI!');
      console.log('Gelen Hash:', hash);
      console.log('Hesaplanan Hash:', calculated_hash);
      console.log('Hash için kullanılan string:', hash_str);
      // Güvenlik ihlali, işlemi durdur ve PayTR'a OK DÖNME!
      return new NextResponse('Error: Hash Mismatch', { status: 400 });
    }

    console.log('PayTR Callback HASH DOĞRULANDI.');

    // 4. merchant_oid'den subscriptionId'yi çıkar
    // PayTR tarafından gelen merchant_oid değerinde özel karakter olmayacak
    let subscriptionId = merchant_oid;
    
    // CUID genellikle 24-26 karakter uzunluğundadır
    // Alfanumerik ID'nin başındaki muhtemel abonelik ID'sini al
    if (subscriptionId.length > 30) {
      // Tahmini olarak ilk 25 karakteri abonelik ID olarak kabul et
      subscriptionId = subscriptionId.substring(0, 25);
      console.log(`Merchant OID'den subscriptionId ayıklandı: ${subscriptionId}`);
    }
    
    // Eğer "ORDER" ile başlıyorsa, bu bir normal ödeme (pendingSubscriptionId olarak gelmemiş)
    if (subscriptionId.startsWith('ORDER')) {
      console.log('ORDER formatında merchant_oid, doğrudan subscription ID kullanılamaz');
      
      // Son oluşturulan PENDING_PAYMENT aboneliği bul
      const latestPendingSubscription = await db.subscription.findFirst({
        where: {
          OR: [
            { status: SubscriptionStatus.PENDING_PAYMENT },
            { status: SubscriptionStatus.INACTIVE }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      });
      
      if (latestPendingSubscription) {
        subscriptionId = latestPendingSubscription.id;
        console.log(`ORDER formatındaki merchant_oid için en son oluşturulan abonelik bulundu: ${subscriptionId}`);
      } else {
        console.error('ORDER formatındaki merchant_oid için abonelik bulunamadı');
        console.warn('Ödeme başarılı ancak abonelik bilgisi bulunamadı! Merchant OID:', merchant_oid);
        // Hata dönmek yerine OK dönerek işlemi başarılı kılalım, sistem sonraki aşamada kendini düzeltebilir
        return new NextResponse('OK', { status: 200 });
      }
    }

    // 5. Hash doğrulandıysa ve işlem başarılıysa veritabanını güncelle
    if (status === 'success') {
        console.log(`Başarılı ödeme callback'i: ${merchant_oid}, Abonelik ID: ${subscriptionId}`);

        try {
            // Prisma Transaction ile Abonelik ve Faturayı Güncelle
            await db.$transaction(async (tx) => {
                // İlgili aboneliği bul
                const subscription = await tx.subscription.findUnique({
                    where: { id: subscriptionId },
                    include: {
                      plan: true
                    }
                });

                if (!subscription) {
                    console.error(`Callback için abonelik bulunamadı: ${subscriptionId}`);
                    
                    // Alternatif arama - herhangi bir bekleyen abonelik varsa
                    const anyPendingSubscription = await tx.subscription.findFirst({
                    where: {
                        OR: [
                          { status: SubscriptionStatus.PENDING_PAYMENT },
                          { status: SubscriptionStatus.INACTIVE }
                        ]
                      },
                      orderBy: { createdAt: 'desc' },
                      include: { plan: true }
                    });
                    
                    if (anyPendingSubscription) {
                      console.log(`Alternatif eşleşme bulundu, bu abonelik kullanılacak: ${anyPendingSubscription.id}`);
                      await updateSubscriptionAndInvoice(tx, anyPendingSubscription, total_amount);
                      return; // Transaction'ı tamamla
                    }
                    
                    throw new Error(`Abonelik bulunamadı: ${subscriptionId}`); 
                }

                await updateSubscriptionAndInvoice(tx, subscription, total_amount);
            });

            console.log(`Ödeme işlemi veritabanına başarıyla işlendi. Abonelik: ${subscriptionId}`);
        } catch (dbError: any) {
            console.error(`Callback veritabanı transaction hatası (${subscriptionId}):`, dbError.message);
            // Veritabanı hatası olsa bile PayTR'a OK döneriz, önemli olan PayTR'ın tekrar denemesi
            return new NextResponse('OK', { status: 200 });
        }
    } else {
      // Ödeme başarısız veya iptal edildi
      console.log(`Başarısız ödeme callback'i: ${merchant_oid}, Sebep: ${formData.get('failed_reason_msg')}`);
        
       try {
            // Abonelik durumunu güncelle (INACTIVE olarak)
         await db.subscription.updateMany({
                where: { 
                    id: subscriptionId, 
                    status: SubscriptionStatus.PENDING_PAYMENT 
                },
                data: { 
                    status: SubscriptionStatus.INACTIVE,
                    updatedAt: new Date()
                }
            });
            
            // İlgili faturaları da CANCELED olarak işaretle
            await db.invoice.updateMany({
                where: {
                    subscriptionId: subscriptionId,
                    status: InvoiceStatus.PENDING
                },
                data: {
                    status: InvoiceStatus.CANCELED,
                    updatedAt: new Date()
                }
            });
            
            console.log(`Başarısız ödeme veritabanına işlendi. Abonelik: ${subscriptionId}`);
        } catch (dbError: any) {
            console.error(`Başarısız ödeme veritabanı hatası (${subscriptionId}):`, dbError.message);
       }
    }

    // 6. PayTR'a işlemin alındığını bildir
    console.log("PayTR'a OK yanıtı gönderiliyor.");
    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error('PayTR Callback işlenirken genel hata:', error);
    // Genel hata durumunda bile PayTR'a OK dönmek gerekli
    return new NextResponse('OK', { status: 200 });
  }
}

// Yardımcı fonksiyon: Abonelik ve fatura güncelleme işlemleri
async function updateSubscriptionAndInvoice(
  tx: any, 
  subscription: any,
  total_amount: string
) {
  // Faturayı bul - Subscription ID ile ilişkili ve PENDING statüsünde
  const invoice = await tx.invoice.findFirst({
    where: {
      subscriptionId: subscription.id, 
      status: InvoiceStatus.PENDING
    }
  });

  // Fatura yoksa yeni oluştur
  if (!invoice) {
    console.warn(`Callback için ödeme bekleyen fatura bulunamadı: Subscription ID ${subscription.id}`);
    console.log('Eksik fatura için yeni bir fatura oluşturuluyor...');
    
    if (!subscription.plan) {
      throw new Error(`Abonelik için plan bilgisi bulunamadı: ${subscription.id}`);
    }
    
    // Eksik faturayı oluştur
    const newInvoice = await tx.invoice.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planName: subscription.plan.name,
        amount: parseInt(total_amount, 10) / 100, // PayTR kuruş olarak döndürüyor
        currency: subscription.plan.currency || 'TRY',
        status: InvoiceStatus.PAID, // Direkt ödendi olarak işaretle
        issueDate: new Date(),
        dueDate: new Date(),
        paidAt: new Date(),
        paymentMethod: 'PAYTR'
      }
    });
    
    console.log(`Yeni fatura oluşturuldu ve ödendi olarak işaretlendi: ${newInvoice.id}`);
  } else {
    // Mevcut faturayı güncelle
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paymentMethod: 'PAYTR'
      }
    });
    console.log(`Fatura ${invoice.id} PAID olarak güncellendi.`);
  }

  // Abonelik durumunu güncelle
  // Dönem başlangıç ve bitiş tarihleri hesaplanıyor
  const currentPeriodStart = new Date();
  let currentPeriodEnd: Date;
  
  if (subscription.billingInterval === 'MONTH') {
    currentPeriodEnd = addMonths(currentPeriodStart, 1);
  } else {
    currentPeriodEnd = addYears(currentPeriodStart, 1);
  }
  
  // Aboneliği ACTIVE olarak güncelle
  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      paymentProvider: 'PayTR',
      currentPeriodStart,
      currentPeriodEnd,
      updatedAt: new Date()
    },
  });
  
  console.log(`Abonelik ${subscription.id} ACTIVE olarak güncellendi.`);
} 