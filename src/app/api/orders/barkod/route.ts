import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';
// import bwipjs from 'bwip-js'; // bwip-js kaldırıldı
import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from 'xmldom'; // Node.js için SVG üretimi
// import { Prisma } from '@prisma/client'; // Prisma tiplerini geçici olarak kaldırıyoruz
import { generateCombinedBarcodeHtml } from '@/lib/utils/barcode-generator'; // Barkod HTML oluşturma

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // Kullanıcı bilgilerini (logoUrl dahil) ve barkod ayarlarını çek
    const userWithSettings = await db.user.findUnique({
      where: { id: userId },
      include: {
        barcodeSetting: true,
      },
    });

    if (!userWithSettings) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    let barcodeSettings = userWithSettings.barcodeSetting;
    // Eğer ayar yoksa, varsayılanları oluştur (DB'ye kaydetmek daha iyi olabilir ama şimdilik böyle)
    if (!barcodeSettings) {
      barcodeSettings = {
        id: '', userId: userId, includeLogo: false, includeOrderNumber: true, includeCustomerName: true,
        includeCustomerAddress: true, includeProductList: false, includeShippingProvider: true,
        includeBarcodeText: true, barcodeType: 'CODE128', createdAt: new Date(), updatedAt: new Date()
      };
    }

    // 2. orderNumber'ı URL query parametresinden al
    const searchParams = request.nextUrl.searchParams;
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json({ error: `URL'de 'orderNumber' query parametresi gereklidir.` }, { status: 400 });
    }

    // 3. Sipariş bilgilerini, müşteri, adres ve ürünleri (eğer ayar açıksa) çek
    const orderIncludeOptions: any = {
      customer: true,
      shipmentPackages: true,
      shipmentAddress: true, // Adres için ekledik
      invoiceAddress: true, // Fatura adresi gerekebilir diye ekledik
    };
    if (barcodeSettings.includeProductList) {
      orderIncludeOptions.items = true; // Ürünleri sadece ayar açıksa getir
    }

    // Prisma include tipini any olarak ayarlayalım
    const includeArgs: any = orderIncludeOptions;

    // Siparişi ve ilişkili verileri getir
    const order: any = await db.trendyolOrder.findUnique({
      where: { orderNumber: orderNumber },
      include: includeArgs
    });

    // Type guard yerine basit kontrol
    if (!order || !order.customer || !order.shipmentAddress) {
      const missingData = !order ? 'Sipariş' : (!order.customer ? 'Müşteri' : 'Teslimat Adresi');
      return NextResponse.json({ error: `${missingData} bilgisi bulunamadı.` }, { status: 404 });
    }

    // 4. Kargo takip numarasını ve sağlayıcıyı al (Önce siparişten, sonra paketlerden)
    let cargoTrackingNumber: string | null | undefined = order.cargoTrackingNumber;
    let cargoProviderName: string | null | undefined = order.cargoProviderName;

    if (!cargoTrackingNumber) {
      const trackablePackage = order.shipmentPackages.find((pkg: any) => !!pkg.cargoTrackingNumber);
      if (trackablePackage) {
        cargoTrackingNumber = trackablePackage.cargoTrackingNumber;
        cargoProviderName = trackablePackage.cargoProviderName;
      }
    }

    if (!cargoTrackingNumber) {
      return NextResponse.json({ error: 'Bu siparişe veya ilişkili paketlerine ait geçerli bir kargo takip numarası bulunamadı.' }, { status: 400 });
    }

    // 5. Barkod resmini oluştur (JsBarcode ile) - Boyutları artırdık
    let barcodeSvg: string;
    try {
      const xmlSerializer = new XMLSerializer();
      const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
      const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      JsBarcode(svgNode, cargoTrackingNumber, {
        format: barcodeSettings.barcodeType.toUpperCase(),
        xmlDocument: document,
        displayValue: barcodeSettings.includeBarcodeText,
        // textMargin: 2, // text özelliğini kullanalım
        // fontSize: 14, // font özelliğini kullanalım
        font: "monospace",
        textAlign: "center",
        textPosition: "bottom",
        fontOptions: "bold",
        lineColor: '#000000',
        width: 2.5, // Modül genişliğini artırarak barkodu büyütelim
        height: 80, // Barkod yüksekliğini artıralım
        margin: 15 // Kenar boşluğu
      });

      barcodeSvg = xmlSerializer.serializeToString(svgNode);
      barcodeSvg = `data:image/svg+xml;base64,${Buffer.from(barcodeSvg).toString('base64')}`;

    } catch (e: unknown) {
      console.error("JsBarcode ile barkod oluşturma hatası:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("JsBarcode hatası detay:", errorMessage);
      return NextResponse.json({ error: 'Barkod resmi oluşturulurken bir hata oluştu.', details: errorMessage }, { status: 500 });
    }

    // 6. HTML içeriğini oluştur (Yeni Tasarım)
    const { customer, shipmentAddress } = order;
    const logoUrl = userWithSettings.logoUrl;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kargo Etiketi - ${escapeHtml(order.orderNumber)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff; /* Yazdırma için beyaz arka plan */
          }
          .label-container {
            /* A4 kağıda yatay sığacak şekilde boyutlandırma (yaklaşık 190mm x 95mm) */
            width: 180mm;
            height: 90mm;
            border: 1px solid #333;
            padding: 5mm;
            margin: 10mm auto; /* A4 üzerinde ortalamak için */
            display: grid;
            grid-template-columns: 1fr 1fr; /* İki ana sütun */
            grid-template-rows: auto 1fr auto; /* Başlık, içerik, barkod */
            grid-template-areas:
              "header header"
              "recipient sender"
              "products products"
              "barcode barcode";
            gap: 4mm;
            box-sizing: border-box;
            background-color: white;
            font-size: 10pt;
            line-height: 1.3;
          }
          .label-header {
            grid-area: header;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          .label-header .logo img {
            max-height: 15mm; /* Logo yüksekliği sınırı */
            max-width: 40mm;
          }
          .label-header .provider-info {
            text-align: right;
            font-size: 9pt;
          }
          .recipient-info { grid-area: recipient; border: 1px solid #eee; padding: 3mm; }
          .sender-info { grid-area: sender; border: 1px solid #eee; padding: 3mm; font-size: 9pt; } /* Gönderici bilgileri daha küçük olabilir */
          .product-list { grid-area: products; border-top: 1px solid #eee; padding-top: 3mm; max-height: 25mm; overflow-y: auto; }
          .barcode-section { grid-area: barcode; border-top: 1px solid #ccc; padding-top: 4mm; text-align: center; }

          .section-title { font-weight: bold; margin-bottom: 1.5mm; color: #333; font-size: 11pt; }
          .address { margin-top: 1mm; }
          .product-list table { width: 100%; border-collapse: collapse; font-size: 8pt; }
          .product-list th, .product-list td { border: 1px solid #eee; padding: 1mm; text-align: left; }
          .product-list th { background-color: #f8f8f8; font-weight: bold; }
          .barcode-section img {
             max-width: 95%; /* Barkodun taşmasını önle */
             height: auto;
             margin-bottom: 1mm;
          }
           /* Yazdırma stilleri */
          @media print {
            body { background-color: white; margin: 0; }
            .label-container { margin: 0; border: none; width: 100%; height: auto; } /* Yazdırma için tam sayfa */
            @page { size: A4; margin: 10mm; } /* A4 ve kenar boşlukları */
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="label-header">
            <div class="logo">
              ${barcodeSettings.includeLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo">` : '<span>&nbsp;</span>'}
            </div>
            <div class="provider-info">
              ${barcodeSettings.includeShippingProvider && cargoProviderName ? `Kargo: <strong>${escapeHtml(cargoProviderName)}</strong><br>` : ''}
              ${barcodeSettings.includeOrderNumber ? `Sipariş No: <strong>${escapeHtml(order.orderNumber)}</strong>` : ''}
            </div>
          </div>

          <div class="recipient-info">
            <div class="section-title">Alıcı Bilgileri</div>
            ${barcodeSettings.includeCustomerName ? `<strong>${escapeHtml(customer.firstName)} ${escapeHtml(customer.lastName)}</strong><br>` : ''}
            ${barcodeSettings.includeCustomerAddress && shipmentAddress ? `
              <div class="address">
                ${escapeHtml(shipmentAddress.fullAddress || '')}<br>
                ${escapeHtml(shipmentAddress.district || '')} / ${escapeHtml(shipmentAddress.city || '')}${shipmentAddress.postalCode ? ` - ${escapeHtml(shipmentAddress.postalCode)}` : ''}<br>
                ${escapeHtml(shipmentAddress.countryCode || '')}
                ${shipmentAddress.phone ? `<br>Tel: ${escapeHtml(shipmentAddress.phone)}` : ''}
              </div>
            ` : ''}
          </div>

          <div class="sender-info">
            <div class="section-title">Gönderici Bilgileri</div>
            Ad Soyad: ${escapeHtml(userWithSettings.name || 'Satıcı Adı')} <br>
            Email: ${escapeHtml(userWithSettings.email)} <br>
            Telefon: ${escapeHtml(userWithSettings.phone || 'Telefon Yok')}
            <!-- Buraya daha detaylı gönderici adresi eklenebilir -->
          </div>

          ${barcodeSettings.includeProductList && order.items && order.items.length > 0 ? `
            <div class="product-list">
              <div class="section-title">Ürünler</div>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Ürün Adı</th>
                    <th>Adet</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map((item: any) => `
                    <tr>
                      <td>${escapeHtml(item.merchantSku)}</td>
                      <td>${escapeHtml(item.productName)}</td>
                      <td>${item.quantity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="product-list" style="border:none;"></div>'}

          <div class="barcode-section">
             <!-- SVG barkod JsBarcode tarafından oluşturulacak ve base64 olarak eklenecek -->
             <img src="${barcodeSvg}" alt="Kargo Takip Barkodu" />
             <!-- JsBarcode içindeki displayValue:true metni gösterir, bu nedenle alttaki div'e gerek kalmayabilir -->
             <!-- ${barcodeSettings.includeBarcodeText ? `<div class="barcode-text">${escapeHtml(cargoTrackingNumber)}</div>` : ''} -->
          </div>

        </div>
      </body>
      </html>
    `;

    // 8. HTML içeriğini yanıt olarak döndür
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Yazdırmayı kolaylaştırmak için başlık ekleyebiliriz
        'Content-Disposition': `inline; filename="etiket-${order.orderNumber}.html"`
      },
    });

  } catch (error: unknown) {
    console.error("Barkod oluşturma API genel hata:", error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: 'Barkod etiketi oluşturulurken bir hata oluştu.', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        }
        const userId = session.user.id;

        // ... (rest of the function using userId) ...

    } catch (error) {
        // ... (error handling) ...
    }
} 