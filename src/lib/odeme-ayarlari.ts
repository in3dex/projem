// Bu dosya, ödeme ayarlarını (şimdilik sadece banka hesapları) 
// getirmek için kullanılacak mantığı içerir.
// Gelecekte burası API çağrıları veya veritabanı sorguları ile değiştirilecektir.

// BankaHesabi tipini admin sayfasındaki ile aynı tutalım
interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string;
    hesapNumarasi: string;
    iban: string;
    hesapSahibi: string;
}

// Simüle edilmiş ayarlar
const simulatedSettings = {
    isEftEnabled: true, // Yönetim panelinden bu değer okunacak
    bankaHesaplari: [
        {
            id: '1',
            bankaAdi: 'Örnek Banka A.Ş.',
            iban: 'TR00 0000 0000 0000 0000 0000',
            hesapSahibi: 'Projem Teknoloji Ltd. Şti.',
            // Şube Kodu ve Hesap Numarası gibi diğer detaylar da eklenebilir
        },
        // Yönetim panelinden eklenen diğer hesaplar da buraya gelmeli
    ] as BankaHesabi[],
};

/**
 * Aktif banka havalesi/EFT hesaplarını getirir.
 * @returns {Promise<BankaHesabi[] | null>} Aktif hesapların listesi veya EFT aktif değilse null döner.
 */
export const getAktifBankaHesaplari = async (): Promise<BankaHesabi[] | null> => {
    // Simülasyon: Gerçekte burada API'den veya veritabanından ayarlar okunur.
    console.log("Simulating fetching payment settings...");
    await new Promise(resolve => setTimeout(resolve, 50)); // Küçük bir gecikme simülasyonu

    if (simulatedSettings.isEftEnabled) {
        return simulatedSettings.bankaHesaplari;
    }

    return null;
};

/**
 * Belirli bir ödeme yönteminin aktif olup olmadığını kontrol eder.
 * @param yontem 'eft' gibi bir tanımlayıcı.
 * @returns {Promise<boolean>} Yöntemin aktif olup olmadığı.
 */
export const isOdemeYontemiAktif = async (yontem: 'eft'): Promise<boolean> => {
     // Simülasyon
    if (yontem === 'eft') {
        return simulatedSettings.isEftEnabled;
    }
    // Diğer yöntemler için kontroller eklenebilir
    return false;
} 