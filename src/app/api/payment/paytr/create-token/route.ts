import { NextResponse } from "next/server";
// NextRequest importu request objesinin tipi için kullanılmıyorsa kaldırılabilir.
// import { NextRequest } from "next/server"; 
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
// import { env } from '@/env'; // Bu satır kaldırıldı
import { getBaseUrl } from '@/lib/utils';
import { z } from 'zod';

// const PAYTR_IFRAME_URL = "https://www.paytr.com/odeme/api/get-token"; // Bu artık env objesinden gelecek

const CreateTokenPayloadSchema = z.object({
  planId: z.string(),
  totalAmount: z.number().int().positive('Toplam tutar pozitif olmalı'),
  pendingSubscriptionId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    // Adım 0: PayTR Ayarlarını Veritabanından Çek
    const odemeAyarlari = await db.odemeAyarlari.findUnique({
      where: { id: "singleton" },
    });

    if (!odemeAyarlari || !odemeAyarlari.paytrAktif) {
      console.error('[PayTR Token] PayTR ödeme yöntemi veritabanında aktif değil veya ayarlar bulunamadı.');
      return NextResponse.json({ error: 'PayTR ile ödeme şu anda kullanılamıyor.' }, { status: 503 });
    }

    const merchant_id = odemeAyarlari.paytrMerchantId;
    const merchant_key = odemeAyarlari.paytrMerchantKey;
    const merchant_salt = odemeAyarlari.paytrMerchantSalt;
    const test_mode_setting = odemeAyarlari.paytrTestMode || "0"; // DB'den, yoksa varsayılan "0" (Canlı)

    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.error('[PayTR Token] Veritabanında PayTR API anahtarları (ID, Key, Salt) eksik.');
      return NextResponse.json({ error: 'Ödeme altyapısı yapılandırma hatası (DB). Lütfen yönetici ile iletişime geçin.' }, { status: 500 });
    }

    console.log('[PayTR Token] Ödeme ayarları:', { 
      merchant_id, 
      paytrAktif: odemeAyarlari.paytrAktif,
      test_mode: test_mode_setting
    });
    
    // Adım 1: Gelen isteği doğrula
    const body = await request.json();
    const validation = CreateTokenPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { planId, totalAmount, pendingSubscriptionId } = validation.data;

    // Adım 2: Kullanıcı ve Plan bilgilerini veritabanından çek
    const [user, plan] = await Promise.all([
      db.user.findUnique({ 
        where: { id: session.user.id }, 
        select: { email: true, name: true, phone: true, address: true } 
      }),
      db.plan.findUnique({ where: { id: planId }, select: { name: true } })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }
    if (!plan) {
      return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
    }

    // Adım 3: Kullanıcı Profil Bilgileri Kontrolü
    if (!user.phone || !user.address) {
      console.warn(`[PayTR Token] Kullanıcı ${session.user.id} için profil bilgileri (telefon/adres) veritabanında eksik.`);
      return NextResponse.json({ error: "Ödeme yapabilmek için profilinizdeki telefon ve adres bilgileri eksiksiz olmalıdır. Lütfen profilinizi güncelleyin." }, { status: 400 });
    }

    // Adım 4: PayTR için Diğer Parametreleri Hazırla
    const paytr_iframe_url = "https://www.paytr.com/odeme/api/get-token"; // PayTR API endpoint'i sabit
    const user_ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
    
    // merchant_oid oluşturulurken özel karakterleri kaldır ve alfanumerik yap
    let raw_merchant_oid = pendingSubscriptionId || `ORDER${Date.now()}`;
    // Özel karakterleri kaldır ve alfanumerik bir ID oluştur
    const merchant_oid = raw_merchant_oid.replace(/[^a-zA-Z0-9]/g, "") + crypto.randomBytes(4).toString('hex');
    
    const email = user.email || ''; 
    const payment_amount_val = totalAmount; 
    const user_name_val = user.name || ''; 
    const user_address_val = user.address || ''; 
    const user_phone_val = user.phone || ''; 
    const user_basket_val = Buffer.from(JSON.stringify([[plan.name, (payment_amount_val / 100).toFixed(2), 1]])).toString('base64');
    const merchant_ok_url_val = `${getBaseUrl()}/odeme/basarili?oid=${merchant_oid}`;
    const merchant_fail_url_val = `${getBaseUrl()}/odeme/basarisiz?oid=${merchant_oid}`;
    const currency_val = 'TRY';
    // Test modu için doğru değeri kullan (PayTR dökümanına göre "0" veya "1" olmalı)
    const test_mode_val = test_mode_setting === "1" ? "1" : "0"; 
    // Debug modunu 1 olarak ayarla (hata mesajlarını görmek için)
    const debug_on_val = 1; 
    const no_installment_val = 0; 
    const max_installment_val = 0; 

    console.log('[PayTR Token] İstek hazırlanıyor:', { 
      merchant_oid, 
      user_ip, 
      payment_amount: payment_amount_val,
      test_mode: test_mode_val
    });

    // Adım 5: PayTR Token Oluşturma
    const hash_str = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount_val}${user_basket_val}${no_installment_val}${max_installment_val}${currency_val}${test_mode_val}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

    const params = new URLSearchParams({
      merchant_id,
      user_ip: user_ip,
      merchant_oid: merchant_oid,
      email: email,
      payment_amount: payment_amount_val.toString(),
      paytr_token,
      user_basket: user_basket_val,
      debug_on: debug_on_val.toString(),
      client_lang: 'tr',
      user_name: user_name_val,
      user_address: user_address_val,
      user_phone: user_phone_val,
      merchant_ok_url: merchant_ok_url_val,
      merchant_fail_url: merchant_fail_url_val,
      output_type: 'json',
      no_installment: no_installment_val.toString(),
      max_installment: max_installment_val.toString(),
      currency: currency_val,
      test_mode: test_mode_val,
    });
    
    // Adım 6: PayTR API'ye İstek Gönderme
    console.log('[PayTR Token] İstek gönderiliyor...');
    const paytrResponse = await fetch(paytr_iframe_url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });

    if (!paytrResponse.ok) {
      const errorBody = await paytrResponse.text();
      console.error(`[PayTR Token] PayTR API Hatası: ${paytrResponse.status} ${paytrResponse.statusText}`, errorBody);
      throw new Error(`PayTR API ile iletişim kurulamadı. Durum: ${paytrResponse.status}. Detay: ${errorBody}`);
    }

    const paytrData = await paytrResponse.json();
    console.log('[PayTR Token] PayTR API Yanıtı:', paytrData);

    if (paytrData.status === 'failed') {
      console.error('[PayTR Token] PayTR Token Alınamadı (status failed):', paytrData.reason);
      return NextResponse.json({ error: `Ödeme başlatılamadı: ${paytrData.reason}` }, { status: 400 });
    }

    return NextResponse.json({ status: 'success', token: paytrData.token, merchant_oid: merchant_oid });

  } catch (error: any) {
    console.error('[API_PAYTR_CREATE_TOKEN_ERROR]', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Sunucu hatası oluştu.' }, { status: 500 });
  }
} 