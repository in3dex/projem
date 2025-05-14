import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// BankaHesabi tipini admin ve lib'deki ile aynı tutalım
interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string | null;
    hesapNumarasi?: string | null;
    iban: string;
    hesapSahibi: string;
}

export async function GET() {
    // Burada yetkilendirme kontrolü yapılabilir (örneğin, sadece giriş yapmış kullanıcılar)

    try {
        // 1. Ödeme ayarlarını veritabanından al (Tek bir ayar olduğunu varsayıyoruz)
        const odemeAyarlari = await prisma.odemeAyarlari.findFirst();
        const eftAktif = odemeAyarlari?.eftAktif ?? false;
        const paytrAktif = odemeAyarlari?.paytrAktif ?? false;

        // 2. Aktif banka hesaplarını veritabanından al
        let aktifHesaplar: BankaHesabi[] = [];
        if (eftAktif) {
            aktifHesaplar = await prisma.bankaHesabi.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    bankaAdi: true,
                    subeKodu: true,
                    hesapNumarasi: true,
                    iban: true,
                    hesapSahibi: true,
                }
            });
        }

        // 3. Aktif ödeme yöntemlerini oluştur
        const aktifYontemler = [];

        if (eftAktif && aktifHesaplar.length > 0) {
            aktifYontemler.push({
                type: 'eft',
                label: 'Banka Havalesi / EFT',
                accounts: aktifHesaplar,
            });
        }

        if (paytrAktif) {
            aktifYontemler.push({
                type: 'paytr',
                label: 'Kredi Kartı / Banka Kartı (PayTR)',
            });
        }

        // Gelecekte diğer ödeme yöntemleri (örn. Kredi Kartı) için de mantık eklenebilir
        // if (odemeAyarlari?.stripeAktif) { ... }

        return NextResponse.json({ odemeYontemleri: aktifYontemler });

    } catch (error) {
        console.error("Ödeme yöntemleri alınırken hata:", error);
        return NextResponse.json({ message: 'Ödeme yöntemleri alınırken bir hata oluştu.' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}