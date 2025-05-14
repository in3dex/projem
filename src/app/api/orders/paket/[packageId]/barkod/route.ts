import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
import { generateCargoLabel } from '@/lib/services/trendyol-order-service';
import BwipJs from 'bwip-js'; // Default import
// Prisma tiplerini doğru yerden import etmeyi deneyelim (veya global tipleri varsayalım)
// import type { BarcodeSetting, TrendyolOrderItem, Prisma, TrendyolAddress, TrendyolCustomer } from '@/generated/prisma/index'; 
// Yukarıdaki yol yanlışsa, global tiplere güvenelim veya doğru yolu bulalım.
// Şimdilik any kullanarak devam edelim, ancak bu ideal değil.

// Yardımcı fonksiyon: HTML içinde kullanılacak veriyi güvenli hale getirir
function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Varsayılan Barkod Ayarları Tipi
interface DefaultBarcodeSettings {
    includeOrderNumber: boolean;
    includeCustomerName: boolean;
    includeCustomerAddress: boolean;
    includeProductList: boolean;
    includeShippingProvider: boolean;
    includeBarcodeText: boolean;
    includeLogo: boolean;
    barcodeType: string;
};

const defaultBarcodeSettings: DefaultBarcodeSettings = {
    includeOrderNumber: true, includeCustomerName: true, includeCustomerAddress: true,
    includeProductList: false, includeShippingProvider: true, includeBarcodeText: true,
    includeLogo: false, barcodeType: 'CODE128',
};

// Prisma tiplerini any ile geçelim (geçici çözüm)
type BarcodeSetting = any;
type TrendyolOrderItem = any;
type TrendyolAddress = any;
type TrendyolCustomer = any;
type User = any;

export async function GET(
  request: NextRequest,
  context: { params: { packageId: string } } 
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const packageId = context.params.packageId;
    if (!packageId || isNaN(Number(packageId))) {
      return NextResponse.json({ error: `Gecerli bir paket ID saglanmadi.` }, { status: 400 }); 
    }
    const trendyolPackageId = BigInt(packageId);

    const user: User | null = await db.user.findUnique({
      where: { id: userId },
      select: {
        logoUrl: true,
        barcodeSetting: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const barcodeSettings: BarcodeSetting | DefaultBarcodeSettings = user.barcodeSetting || defaultBarcodeSettings;
    const userLogoUrl = user.logoUrl;

    const includeItemsQuery = barcodeSettings.includeProductList ? { 
      select: { 
        productName: true,
        quantity: true,
        merchantSku: true,
      }
     } : false;
     
    const shipmentPackage = await db.trendyolShipmentPackage.findUnique({
      where: { trendyolPackageId: trendyolPackageId },
      include: {
        order: { 
          include: {
            customer: true, 
            items: includeItemsQuery,
            shipmentAddress: true,
          }
        }
      }
    });

    if (!shipmentPackage || !shipmentPackage.order || !shipmentPackage.order.customer || !shipmentPackage.order.shipmentAddress) {
      return NextResponse.json({ error: 'Paket veya ilişkili sipariş/müşteri/adres bilgisi bulunamadı veya eksik.' }, { status: 404 });
    }

    const cargoTrackingNumber = shipmentPackage.cargoTrackingNumber;
    if (!cargoTrackingNumber) {
      return NextResponse.json({ error: 'Bu paket için henüz kargo takip numarası atanmamış.' }, { status: 400 });
    }

    let barcodePngBase64: string;
    try {
      barcodePngBase64 = await new Promise<string>((resolve, reject) => {
        BwipJs.toBuffer({
          bcid: barcodeSettings.barcodeType.toLowerCase(), 
          text: cargoTrackingNumber,         
          scale: 3,                      
          height: 15,                    
          includetext: barcodeSettings.includeBarcodeText, 
          textxalign: 'center',
        }, (err, pngBuffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(`data:image/png;base64,${pngBuffer.toString('base64')}`);
          }
        });
      });

    } catch (e) {
      console.error("Barkod oluşturma hatası:", e);
      return NextResponse.json({ error: 'Barkod resmi oluşturulurken bir hata oluştu.' }, { status: 500 });
    }

    const orderData = shipmentPackage.order;
    const customerData: TrendyolCustomer = orderData.customer;
    const shipmentAddress: TrendyolAddress = orderData.shipmentAddress;
    const itemsData: TrendyolOrderItem[] | undefined = barcodeSettings.includeProductList ? orderData.items : undefined; 
    
    const addressParts = [
        shipmentAddress.address1,
        shipmentAddress.address2,
        shipmentAddress.neighborhood,
        shipmentAddress.district,
        shipmentAddress.city,
        shipmentAddress.postalCode
    ].filter(part => !!part); 
    const fullAddress = addressParts.join(', ') || 'Adres belirtilmemiş';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kargo Barkodu - ${escapeHtml(orderData.orderNumber)}</title>
        <style>
          /* Stillendirme aynı kaldı */
           @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff;
            width: 210mm; 
            min-height: 297mm;
            box-sizing: border-box;
          }
          .label-container {
            border: 1px solid #ccc;
            padding: 15mm;
            margin: 10mm; 
            min-height: calc(297mm - 40mm);
            display: flex;
            flex-direction: column;
            background-color: white;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            min-height: 40px;
          }
          .logo-container img {
             max-width: 150px;
             max-height: 60px;
             object-fit: contain;
          }
           .provider-info {
            font-size: 9pt;
            color: #666;
            text-align: right;
          }
          .section {
            border: 1px dashed #eee;
            padding: 10px;
            margin-bottom: 15px;
          }
          .section-title { font-size: 10pt; font-weight: bold; margin-bottom: 5px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 3px;}
          .info-grid { display: grid; grid-template-columns: 100px 1fr; gap: 5px 10px; font-size: 10pt; }
          .info-grid label { font-weight: 500; color: #333; }
          .info-grid span { word-break: break-word; }
          .address { font-size: 10pt; line-height: 1.4; margin-top: 5px; }
          .product-list { list-style: none; padding: 0; margin: 5px 0 0 0; font-size: 9pt; }
          .product-list li { border-bottom: 1px dotted #eee; padding: 3px 0; }
          .product-list li:last-child { border-bottom: none; }
          .product-list .sku { color: #666; font-size: 8pt; margin-left: 5px;}
          .barcode-section { text-align: center; margin-top: auto; padding-top: 15px; border-top: 1px solid #eee; }
          .barcode-section img { max-width: 90%; height: auto; }
          .barcode-text { font-size: 11pt; font-weight: bold; margin-top: 5px; letter-spacing: 1px; }

          @media print {
            body { margin: 0; padding: 0; width: auto; min-height: auto; background-color: white; }
            .label-container { margin: 0; border: none; padding: 10mm; min-height: calc(297mm - 20mm); }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="header-section">
            <div class="logo-container">
              ${barcodeSettings.includeLogo && userLogoUrl ? `<img src="${escapeHtml(userLogoUrl)}" alt="Logo">` : ''}
            </div>
            ${barcodeSettings.includeShippingProvider && shipmentPackage.cargoProviderName ? `<div class="provider-info">Kargo Firması:<br><strong>${escapeHtml(shipmentPackage.cargoProviderName)}</strong></div>` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Alıcı Bilgileri</div>
            <div class="info-grid">
              ${barcodeSettings.includeOrderNumber ? `<label>Sipariş No:</label><span>${escapeHtml(orderData.orderNumber)}</span>` : ''}
              ${barcodeSettings.includeCustomerName ? `<label>Ad Soyad:</label><span>${escapeHtml(customerData.firstName)} ${escapeHtml(customerData.lastName)}</span>` : ''}
            </div>
            ${barcodeSettings.includeCustomerAddress ? `
              <div class="address">
                <strong>Adres:</strong><br>
                ${escapeHtml(fullAddress)} 
              </div>
            ` : ''}
          </div>

          ${barcodeSettings.includeProductList && itemsData && itemsData.length > 0 ? `
            <div class="section">
              <div class="section-title">Ürünler (${itemsData.length} kalem)</div>
              <ul class="product-list">
                ${itemsData.map((item) => 
                  `<li>
                     ${escapeHtml(item.productName)} (${item.quantity} Adet)
                     ${item.merchantSku ? `<span class="sku">SKU: ${escapeHtml(item.merchantSku)}</span>` : ''}
                   </li>`
                 ).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="barcode-section">
            ${!barcodeSettings.includeLogo ? `<div class="section-title">Kargo Barkodu</div>` : ''} 
            <img src="${barcodePngBase64}" alt="Kargo Barkodu" />
            ${barcodeSettings.includeBarcodeText ? `<div class="barcode-text">${escapeHtml(cargoTrackingNumber)}</div>` : ''}
          </div>
          
        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: unknown) {
    console.error("Barkod oluşturma API genel hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    let status = 500;
    if (error instanceof Error && error.message.includes("BigInt")) {
        status = 400; 
    }
    return NextResponse.json({ error: 'Barkod etiketi oluşturulurken bir hata oluştu.', details: message }, { status });
  }
} 