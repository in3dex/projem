// clear-trendyol-data.ts
import { db } from '../src/lib/db';

async function clearTrendyolData() {
  console.log('Trendyol verilerini temizleme işlemi başlatılıyor...');

  try {
    // İlişkili tablolardaki verileri silme sırası önemli 
    // (foreign key kısıtlamaları nedeniyle)
    
    // 1. Önce sipariş durumlarını sil
    console.log('Sipariş durumları siliniyor...');
    const deletedStatuses = await db.trendyolOrderStatus.deleteMany();
    console.log(`${deletedStatuses.count} adet sipariş durumu silindi.`);
    
    // 2. Sipariş ürünlerini sil
    console.log('Sipariş ürünleri siliniyor...');
    const deletedItems = await db.trendyolOrderItem.deleteMany();
    console.log(`${deletedItems.count} adet sipariş ürünü silindi.`);
    
    // 3. Siparişleri sil
    console.log('Siparişler siliniyor...');
    const deletedOrders = await db.trendyolOrder.deleteMany();
    console.log(`${deletedOrders.count} adet sipariş silindi.`);
    
    // 4. Adresleri sil
    console.log('Adresler siliniyor...');
    const deletedAddresses = await db.trendyolAddress.deleteMany();
    console.log(`${deletedAddresses.count} adet adres silindi.`);
    
    // 5. Müşterileri sil
    console.log('Müşteriler siliniyor...');
    const deletedCustomers = await db.trendyolCustomer.deleteMany();
    console.log(`${deletedCustomers.count} adet müşteri silindi.`);
    
    console.log('Tüm Trendyol verileri başarıyla temizlendi.');
  } catch (error) {
    console.error('Veri temizleme hatası:', error);
  } finally {
    await db.$disconnect();
  }
}

// Fonksiyonu çalıştır
clearTrendyolData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('İşlem hatası:', error);
    process.exit(1);
  }); 