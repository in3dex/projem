import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { TrendyolApiClientService } from '@/lib/services/trendyol-api-client';
import { createCargoLabel } from '@/lib/services/trendyol-order-service';

// İzin verilen kargo firmaları
const ALLOWED_CARGO_PROVIDERS = [
  "YKMP", "ARASMP", "SURATMP", "HOROZMP", "MNGMP", 
  "PTTMP", "CEVAMP", "TEXMP", "KOLAYGELSINMP"
];

// İstek Body şeması
const changeCargoProviderSchema = z.object({
  cargoProvider: z.string().refine(val => ALLOWED_CARGO_PROVIDERS.includes(val), {
    message: "Geçersiz kargo firması kodu."
  })
});

// Trendyol'dan gelen paket detayı için tip (gerekli alanlar)
interface TrendyolPackageDetail {
  id: number;
  orderNumber: string;
  status: string; // Bu alana ihtiyacımız var
  lines?: any[]; // Paket detayında gelebilecek diğer alanlar (örn: getShipmentPackage için)
  // Diğer alanlar eklenebilir...
}

// Kargo firması değişikliği için İZİN VERİLEN STATÜLER
const ALLOWED_STATUSES_FOR_CHANGE = ["Created", "Invoiced"]; // 'Invoiced' eklendi

// Trendyol'dan gelen sipariş listesi yanıtı için (tek sipariş çeksek bile liste dönebilir)
interface TrendyolOrderListResponse {
  content: TrendyolApiOrder[]; // trendyol-order-storage-service.ts'deki tipi kullanalım
  // Diğer alanlar (page, size etc.) olabilir ama burada sadece content lazım
}

// trendyol-order-storage-service.ts'den TrendyolApiOrder tipini alalım
// (Bu tipin TrendyolOrderStorageService dosyasında export edildiğini varsayıyoruz)
interface TrendyolApiOrder { 
  id: number | bigint; 
  orderNumber: string; 
  orderDate: number; 
  status: string;
  shipmentPackageStatus: string;
  grossAmount: number;
  totalDiscount: number;
  totalTyDiscount: number;
  totalPrice: number;
  currencyCode: string;
  cargoTrackingNumber?: string | number | null;
  cargoProviderName?: string | null;
  cargoTrackingLink?: string | null;
  customerId: number | bigint;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  shipmentAddress: any; // Basitlik adına any, normalde TrendyolApiAddress olmalı
  invoiceAddress: any; // Basitlik adına any, normalde TrendyolApiAddress olmalı
  lines: any[]; // Basitlik adına any, normalde TrendyolApiOrderItem[] olmalı
  packageHistories?: any[];
  // ... diğer gerekli alanlar storage service'den bakılabilir
}

export async function PUT(
  request: NextRequest,
  context: { params: { packageId: string } } 
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const apiSettings = await db.apiSettings.findUnique({ 
      where: { userId: userId }, 
      select: { sellerID: true, apiKey: true, apiSecret: true } 
    });
    if (!apiSettings?.sellerID || !apiSettings?.apiKey || !apiSettings?.apiSecret) {
      return NextResponse.json({ error: 'API ayarları bulunamadı.' }, { status: 400 });
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const packageIdString = pathSegments[pathSegments.length - 2]; 
    if (!packageIdString || isNaN(Number(packageIdString))) {
      return NextResponse.json({ error: `URL'den gecerli bir paket ID alinamadi.` }, { status: 400 }); 
    }
    const trendyolPackageId = BigInt(packageIdString);
    if (trendyolPackageId <= BigInt(0)) {
      return NextResponse.json({ error: `Gecerli bir paket ID gereklidir.` }, { status: 400 }); 
    }

    const body = await request.json();
    const validation = changeCargoProviderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verisi', details: validation.error.format() }, { status: 400 });
    }
    const { cargoProvider } = validation.data;

    const apiClient = new TrendyolApiClientService({
        sellerId: apiSettings.sellerID!,
        apiKey: apiSettings.apiKey!,
        apiSecret: apiSettings.apiSecret!,
    }, 'live');

    const changeCargoEndpoint = `/suppliers/${apiSettings.sellerID}/shipment-packages/${trendyolPackageId.toString()}/cargo-providers`;
    const apiPayload = { cargoProvider };
    console.log(`Trendyol Kargo Degistirme Istegi: PUT ${changeCargoEndpoint} Payload:`, apiPayload);
    await apiClient.request<void>(changeCargoEndpoint, 'PUT', apiPayload); 

    console.log(`Trendyol Kargo Degistirme Basarili: Paket ID ${trendyolPackageId}, Yeni Kargo: ${cargoProvider}`);
    
    let orderNumberToSync: string | null = null;
    try {
      const packageWithOrder = await db.trendyolShipmentPackage.findUnique({
        where: { trendyolPackageId: trendyolPackageId },
        select: { order: { select: { orderNumber: true } } }
      });
      orderNumberToSync = packageWithOrder?.order?.orderNumber ?? null;

      if (orderNumberToSync) {
        console.log(`Kargo degisikligi sonrasi otomatik senkronizasyon tetikleniyor: Siparis No ${orderNumberToSync}`);
        
        const syncApiUrl = new URL('/api/orders/sync', request.url).toString();
        fetch(syncApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': session.cookies.toString()
          },
          body: JSON.stringify({ orderNumber: orderNumberToSync })
        }).then(async (res) => {
          if (res.ok) {
            console.log(`Siparis ${orderNumberToSync} icin otomatik senkronizasyon istegi basariyla gonderildi.`);
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error(`Siparis ${orderNumberToSync} icin otomatik senkronizasyon istegi basarisiz oldu: ${res.status}`, errorData);
          }
        }).catch(err => {
          console.error(`Siparis ${orderNumberToSync} icin otomatik senkronizasyon API cagrisi sirasinda network hatasi:`, err);
        });

      } else {
        console.warn(`Kargo degistirildi (Paket ID: ${trendyolPackageId}) ancak ilgili sipariş numarasi DB'de bulunamadi, otomatik senkronizasyon tetiklenemedi.`);
      }
    } catch (dbError: unknown) {
      console.error(`Kargo degisikligi sonrasi siparis numarasi alinirken DB hatasi (Paket ID: ${trendyolPackageId}):`, dbError);
    }

    return NextResponse.json({ success: true, message: 'Kargo firmasi basariyla degistirildi. Siparisin otomatik senkronizasyonu tetiklendi.' });

  } catch (error: unknown) {
    console.error("Kargo firmasi degistirme API genel hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatasi olustu.';
    let status = 500;
    if (error instanceof Error && error.message.includes("Trendyol API Hatası:")) {
        const match = error.message.match(/Trendyol API Hatası: (\d+)/);
        if (match && match[1]) {
            status = parseInt(match[1], 10);
        }
    }
    return NextResponse.json({ error: 'Kargo firmasi degistirilirken bir hata olustu.', details: message }, { status });
  }
} 