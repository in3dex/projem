import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth/auth';

// BarcodeSetting güncelleme şeması
const updateBarcodeSettingsSchema = z.object({
  includeOrderNumber: z.boolean().optional(),
  includeCustomerName: z.boolean().optional(),
  includeCustomerAddress: z.boolean().optional(),
  includeProductList: z.boolean().optional(), // includeProductInfo yerine
  includeShippingProvider: z.boolean().optional(),
  includeBarcodeText: z.boolean().optional(),
  includeLogo: z.boolean().optional(),
  barcodeType: z.string().min(1, { message: "Barkod tipi boş olamaz" }).optional(), // Barkod tipi eklendi
});

// User güncelleme şeması kaldırıldı

// GET - Kullanıcının barkod ayarlarını getir
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    // Sadece barkod ayarlarını getir
    const barcodeSetting = await db.barcodeSetting.findUnique({
      where: { userId },
    });

    // Ayar yoksa null dönebiliriz, frontend varsayılanları kullanır
    if (!barcodeSetting) {
      return NextResponse.json(null); // veya varsayılan bir nesne döndür
      // Örneğin: return NextResponse.json({ includeOrderNumber: true, ..., barcodeType: 'CODE128' });
    }

    return NextResponse.json(barcodeSetting);

  } catch (error) {
    console.error("Barkod ayarları alınırken hata:", error);
    return NextResponse.json({ error: 'Ayarlar alınırken bir sunucu hatası oluştu.' }, { status: 500 });
  }
}

// PUT - Kullanıcının barkod ayarlarını güncelle
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    // Sadece barkod şemasını doğrula
    const barcodeValidation = updateBarcodeSettingsSchema.safeParse(body);

    if (!barcodeValidation.success) {
      return NextResponse.json({ error: 'Geçersiz veya eksik istek verisi', details: barcodeValidation.error.format() }, { status: 400 });
    }

    const barcodeDataToUpdate = barcodeValidation.data;

    // Eğer hiçbir veri gönderilmediyse hata ver
    if (Object.keys(barcodeDataToUpdate).length === 0) {
        return NextResponse.json({ error: 'Güncellenecek veri bulunamadı' }, { status: 400 });
    }

    // Güncelleme veya oluşturma işlemi
    const updatedSettings = await db.barcodeSetting.upsert({
      where: { userId },
      update: barcodeDataToUpdate,
      create: {
        userId,
        // create için varsayılanları Zod şemasından veya direkt olarak ayarlayabiliriz
        // Ancak upsert update kısmı boş olmayan veriyi alacağından create için de
        // gönderilen veriyi kullanmak yeterli olacaktır. Eksik kalanlar Prisma'daki
        // @default değerlerini alacaktır.
        ...barcodeDataToUpdate,
        // Eğer Zod şeması tüm alanları zorunlu kılmazsa, create kısmında
        // Prisma modelindeki @default olmayan alanlar için varsayılan sağlamak gerekebilir.
        // Mevcut şemada hepsi optional olduğu için Prisma defaultlarına güveniyoruz.
      },
    });


    return NextResponse.json({
        success: true,
        settings: updatedSettings,
    });

  } catch (error) {
    console.error("Barkod ayarları güncellenirken hata:", error);
    let errorMessage = 'Ayarlar güncellenirken bir sunucu hatası oluştu.';
    if (error instanceof Error) {
        // Prisma veya diğer bilinen hata türlerini kontrol et
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST metodu (güncelleme/oluşturma)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        }
        const userId = session.user.id;

        // ... (rest of POST logic using userId) ...

    } catch (error) {
        // ... (error handling) ...
    }
}