import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import { getBaseUrl } from '@/lib/utils';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    // PayTR ayarlarını veritabanından çek
    const odemeAyarlari = await db.odemeAyarlari.findUnique({
      where: { id: "singleton" },
    });

    if (!odemeAyarlari || !odemeAyarlari.paytrAktif) {
      console.error('[PayTR Invoice] PayTR ödeme yöntemi veritabanında aktif değil veya ayarlar bulunamadı.');
      return NextResponse.json({ error: 'PayTR ile ödeme şu anda kullanılamıyor.' }, { status: 503 });
    }

    const merchant_id = odemeAyarlari.paytrMerchantId;
    const merchant_key = odemeAyarlari.paytrMerchantKey;
    const merchant_salt = odemeAyarlari.paytrMerchantSalt;
    const test_mode_setting = odemeAyarlari.paytrTestMode || "0";

    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.error('[PayTR Invoice] Veritabanında PayTR API anahtarları (ID, Key, Salt) eksik.');
      return NextResponse.json({ error: 'Ödeme altyapısı yapılandırma hatası (DB). Lütfen yönetici ile iletişime geçin.' }, { status: 500 });
    }

    // Gelen isteği al
    const body = await request.json();
    const { merchant_oid } = body;

    if (!merchant_oid) {
      return NextResponse.json({ error: 'Geçersiz istek verisi: merchant_oid eksik' }, { status: 400 });
    }

    // Özel karakterleri temizle - PayTR sadece alfanumerik karakterlere izin verir
    const cleanMerchantOid = merchant_oid.replace(/[^a-zA-Z0-9]/g, '');

    // Fatura ile ilişkili aboneliği merchant_oid'den çıkar
    let subscriptionId = merchant_oid;
    if (merchant_oid.indexOf('_') > 0) {
      [subscriptionId] = merchant_oid.split('_');
    }
    
    // CUID olabilecek ilk bölümü abonelik ID olarak kullan
    // Genellikle ilk 25-30 karakter abonelik ID'sidir
    if (subscriptionId.length > 30) {
      subscriptionId = subscriptionId.substring(0, 25);
    }

    // Abonelik ve kullanıcı bilgilerini veritabanından çek
    const [subscription, user] = await Promise.all([
      db.subscription.findFirst({
        where: { id: subscriptionId, userId: session.user.id },
        include: { plan: true },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true, phone: true, address: true }
      })
    ]);

    if (!subscription) {
      return NextResponse.json({ error: "Abonelik bulunamadı." }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    // Kullanıcı profil bilgileri kontrolü
    if (!user.phone || !user.address) {
      console.warn(`[PayTR Invoice] Kullanıcı ${session.user.id} için profil bilgileri (telefon/adres) veritabanında eksik.`);
      return NextResponse.json({ error: "Ödeme yapabilmek için profilinizdeki telefon ve adres bilgileri eksiksiz olmalıdır. Lütfen profilinizi güncelleyin." }, { status: 400 });
    }

    // İlgili faturayı bul
    const invoice = await db.invoice.findFirst({
      where: {
        subscriptionId: subscription.id,
        userId: session.user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Ödenmemiş fatura bulunamadı." }, { status: 404 });
    }

    // PayTR için parametreleri hazırla
    const paytr_iframe_url = "https://www.paytr.com/odeme/api/get-token";
    const user_ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                  request.headers.get('x-real-ip') || 
                  '127.0.0.1';
    
    const email = user.email || '';
    const payment_amount_val = Math.round(invoice.amount * 100); // TL -> Kuruş
    const user_name_val = user.name || '';
    const user_address_val = user.address || '';
    const user_phone_val = user.phone || '';
    const user_basket_val = Buffer.from(JSON.stringify([[subscription.plan?.name || 'Abonelik', (payment_amount_val / 100).toFixed(2), 1]])).toString('base64');
    const merchant_ok_url_val = `${getBaseUrl()}/odeme/basarili?oid=${cleanMerchantOid}`;
    const merchant_fail_url_val = `${getBaseUrl()}/odeme/basarisiz?oid=${cleanMerchantOid}`;
    const currency_val = invoice.currency || 'TRY';
    const test_mode_val = test_mode_setting === "1" ? "1" : "0";
    const debug_on_val = 1;
    const no_installment_val = 0;
    const max_installment_val = 0;

    console.log('[PayTR Invoice] İstek hazırlanıyor:', {
      merchant_oid: cleanMerchantOid,
      user_ip,
      payment_amount: payment_amount_val,
      test_mode: test_mode_val,
      invoice_id: invoice.id
    });

    // PayTR Token Oluşturma
    const hash_str = `${merchant_id}${user_ip}${cleanMerchantOid}${email}${payment_amount_val}${user_basket_val}${no_installment_val}${max_installment_val}${currency_val}${test_mode_val}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

    const params = new URLSearchParams({
      merchant_id,
      user_ip: user_ip,
      merchant_oid: cleanMerchantOid,
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

    // PayTR API'ye istek gönder
    console.log('[PayTR Invoice] İstek gönderiliyor...');
    const paytrResponse = await fetch(paytr_iframe_url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });

    if (!paytrResponse.ok) {
      const errorBody = await paytrResponse.text();
      console.error(`[PayTR Invoice] PayTR API Hatası: ${paytrResponse.status} ${paytrResponse.statusText}`, errorBody);
      throw new Error(`PayTR API ile iletişim kurulamadı. Durum: ${paytrResponse.status}. Detay: ${errorBody}`);
    }

    const paytrData = await paytrResponse.json();
    console.log('[PayTR Invoice] PayTR API Yanıtı:', paytrData);

    if (paytrData.status === 'failed') {
      console.error('[PayTR Invoice] PayTR Token Alınamadı (status failed):', paytrData.reason);
      return NextResponse.json({ error: `Ödeme başlatılamadı: ${paytrData.reason}` }, { status: 400 });
    }

    return NextResponse.json({ 
      status: 'success', 
      token: paytrData.token, 
      merchant_oid: cleanMerchantOid,
      invoice_id: invoice.id
    });

  } catch (error: any) {
    console.error('[PAYTR_INVOICE_ERROR]', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Sunucu hatası oluştu.' }, { status: 500 });
  }
} 