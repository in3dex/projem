import fs from 'fs';
import path from 'path';
import { TrendyolOrderStorageService } from '../src/lib/services/trendyol-order-storage-service';

async function syncTrendyolOrders() {
  console.log('Trendyol siparişlerini senkronizasyon işlemi başlatılıyor...');

  try {
    // API yanıt dosyasını oku
    const apiFilePath = path.resolve(process.cwd(), 'api-siarpis-yaniti.json');
    console.log(`Dosya okunuyor: ${apiFilePath}`);
    
    if (!fs.existsSync(apiFilePath)) {
      throw new Error(`Dosya bulunamadı: ${apiFilePath}`);
    }
    
    const apiResponse = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));
    
    if (!apiResponse || !apiResponse.content || !Array.isArray(apiResponse.content)) {
      throw new Error('Geçersiz API yanıtı formatı: "content" dizisi bulunamadı');
    }
    
    const orders = apiResponse.content;
    console.log(`Toplam ${orders.length} sipariş bulundu.`);
    
    // Siparişleri veritabanına kaydet
    console.log('Siparişler veritabanına kaydediliyor...');
    
    const result = await TrendyolOrderStorageService.saveMultipleOrders(orders);
    
    console.log('Senkronizasyon tamamlandı:');
    console.log(`- Toplam Sipariş: ${result.total}`);
    console.log(`- Başarılı: ${result.success}`);
    console.log(`- Başarısız: ${result.failed}`);
    
    if (result.failed > 0) {
      console.warn(`⚠️ ${result.failed} adet sipariş kaydedilemedi!`);
    } else {
      console.log('✅ Tüm siparişler başarıyla kaydedildi!');
    }
  } catch (error) {
    console.error('Senkronizasyon hatası:', error);
  }
}

// Fonksiyonu çalıştır
syncTrendyolOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('İşlem hatası:', error);
    process.exit(1);
  }); 