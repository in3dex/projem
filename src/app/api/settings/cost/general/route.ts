import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';
// Kargo firması isimlerini almak için
import { shippingCostsData } from '@/lib/shipping-costs';

// Geçerli kargo firması isimlerini al
const validCarrierNames = shippingCostsData.map(c => c.name);

// Genel maliyet ayarlarını doğrulamak için şema (yeni alanlar eklendi)
const generalCostSettingsSchema = z.object({
  defaultShippingCost: z.number().nonnegative('Kargo maliyeti negatif olamaz').nullable().optional(),
  defaultCommissionRate: z.number().min(0, 'Komisyon oranı 0\'dan küçük olamaz').max(100, 'Komisyon oranı 100\'den büyük olamaz').nullable().optional(),
  defaultTaxRate: z.number().min(0, 'Stopaj oranı 0\'dan küçük olamaz').max(100, 'Stopaj oranı 100\'den büyük olamaz').nullable().optional(),
  defaultAdditionalCost: z.number().nonnegative('Ek masraf negatif olamaz').nullable().optional(),
  // Yeni alanlar için doğrulama
  defaultCarrierName: z.string().refine(val => validCarrierNames.includes(val), {
    message: "Geçersiz kargo firması adı",
  }).nullable().optional(),
  defaultDesi: z.number().nonnegative('Desi negatif olamaz').nullable().optional(),
  // Kâr Hesaplama Ayarları
  defaultProfitCalculationMethod: z.enum(["MARGIN", "MARKUP"]).nullable().optional(),
  defaultProfitRate: z.number().min(0, 'Kâr oranı 0\'dan küçük olamaz').nullable().optional(), // Üst limit yok?
  // KDV Ayarları
  salesVatRate: z.number().min(0).max(100).nullable().optional(),
  shippingVatRate: z.number().min(0).max(100).nullable().optional(),
  commissionVatRate: z.number().min(0).max(100).nullable().optional(),
  serviceFeeAmount: z.number().nonnegative('Hizmet bedeli tutarı negatif olamaz').nullable().optional(), // Yeni: Tutar
  serviceFeeVatRate: z.number().min(0, 'Hizmet bedeli KDV oranı 0\'dan küçük olamaz').max(100, 'Hizmet bedeli KDV oranı 100\'den büyük olamaz').nullable().optional(), // Yeni: KDV Oranı
  costVatRate: z.number().min(0).max(100).nullable().optional(),
  includeCostVat: z.boolean().optional(),
});

// GET: Mevcut ayarları getir
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    const settings = await db.generalCostSetting.findUnique({
      where: { userId },
    });

    // Ayar bulunamazsa varsayılan boş değerleri döndür (yeni alanlar dahil)
    const responseData = settings ?? {
        defaultShippingCost: null,
        defaultCommissionRate: null,
        defaultTaxRate: null,
        defaultAdditionalCost: null,
        defaultCarrierName: null,
        defaultDesi: null,
        // Yeni varsayılanlar
        defaultProfitCalculationMethod: "MARGIN", // Varsayılan MARGIN olsun
        defaultProfitRate: null,
        salesVatRate: 20,
        shippingVatRate: 20,
        commissionVatRate: 20,
        // serviceFeeRate yerine yeni alanlar
        serviceFeeAmount: 8.49, // Varsayılan KDV Hariç Tutar
        serviceFeeVatRate: 20, // Varsayılan KDV Oranı
        costVatRate: null,
        includeCostVat: false,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/GeneralCostSettings GET] Hata:", error);
    const message = error instanceof Error ? error.message : 'Ayarlar getirilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
}

// POST: Ayarları kaydet/güncelle (upsert)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!userId) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });

    let data: any;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 });
    }

    // Gelen veriyi doğrula ve temizle (boş stringleri null yap)
    const parseNumberOrNull = (value: any): number | null => {
        if (value === '' || value == null) return null;
        const num = Number(value);
        // Dikkat: NaN kontrolü önemli!
        return isNaN(num) ? null : num; 
    };
    const parseStringOrNull = (value: any): string | null => {
        if (value === '' || value == null) return null;
        return String(value);
    }
    const parseBooleanOrUndefined = (value: any): boolean | undefined => {
        if (value === '' || value == null) return undefined;
        return String(value).toLowerCase() === 'true';
    };

    const cleanedData = {
        defaultShippingCost: parseNumberOrNull(data.defaultShippingCost),
        defaultCommissionRate: parseNumberOrNull(data.defaultCommissionRate),
        defaultTaxRate: parseNumberOrNull(data.defaultTaxRate),
        defaultAdditionalCost: parseNumberOrNull(data.defaultAdditionalCost),
        // Yeni alanları temizle
        defaultCarrierName: parseStringOrNull(data.defaultCarrierName),
        defaultDesi: parseNumberOrNull(data.defaultDesi),
        // Yeni Alanları Temizle
        defaultProfitCalculationMethod: data.defaultProfitCalculationMethod === "MARGIN" || data.defaultProfitCalculationMethod === "MARKUP" ? data.defaultProfitCalculationMethod : null,
        defaultProfitRate: parseNumberOrNull(data.defaultProfitRate),
        salesVatRate: parseNumberOrNull(data.salesVatRate),
        shippingVatRate: parseNumberOrNull(data.shippingVatRate),
        commissionVatRate: parseNumberOrNull(data.commissionVatRate),
        // serviceFeeRate yerine yeni alanları temizle
        serviceFeeAmount: parseNumberOrNull(data.serviceFeeAmount),
        serviceFeeVatRate: parseNumberOrNull(data.serviceFeeVatRate),
        costVatRate: parseNumberOrNull(data.costVatRate),
        includeCostVat: parseBooleanOrUndefined(data.includeCostVat),
    };

    const validationResult = generalCostSettingsSchema.safeParse(cleanedData);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => {
        const path = err.path.join('.');
        return `Alan '${path}': ${err.message}`; // ` yerine ' kullanıldı
      });
      console.error("[API/GeneralCostSettings POST] Doğrulama Hatası:", validationResult.error.errors);
      return NextResponse.json({ error: 'Geçersiz veri formatı', details: errorMessages }, { status: 400 });
    }

    const validatedData = validationResult.data;
    console.log("[API/GeneralCostSettings POST] Doğrulanmış Veri:", validatedData);

    const updatedSettings = await db.generalCostSetting.upsert({
      where: { userId },
      update: validatedData, // Sadece doğrulanmış veriyi güncelle
      create: {
        ...validatedData, // Doğrulanmış veriyle oluştur
        userId: userId,
      },
    });

    console.log(`[API/GeneralCostSettings POST] Kullanıcı ${userId} için ayarlar kaydedildi/güncellendi.`);
    return NextResponse.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.', data: updatedSettings }, { status: 200 });

  } catch (error: unknown) {
    console.error("[API/GeneralCostSettings POST] Hata:", error);
    const message = error instanceof Error ? error.message : 'Ayarlar kaydedilirken bir hata oluştu.';
    return NextResponse.json({ error: 'Sunucu hatası', details: message }, { status: 500 });
  }
} 