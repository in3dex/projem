import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { Client } from 'basic-ftp';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- FTP Bilgileri (Doğrudan kod içinde olması güvenlik riski taşır, ortam değişkenlerinden okunması önerilir) ---
const FTP_CONFIG = {
  host: '144.76.153.213',
  user: 'trendentegre',
  password: 'Eypakts45+', // Şifrenizde özel karakterler varsa escape edilmesi gerekebilir.
  port: 21, // FTP portu eklendi
  secure: false, // Gerekirse true veya 'implicit' olarak değiştirin
};

// --- Yedekleme Ayarları ---
const PROJECT_ROOT = process.cwd();
const BACKUP_DIR_NAME = 'ftp-backups'; // Yerel geçici yedeklerin tutulacağı klasör adı
const LOCAL_BACKUP_PATH = path.join(PROJECT_ROOT, BACKUP_DIR_NAME);
const ZIP_EXCLUDE_PATTERNS = [
  'node_modules/*',
  '.git/*',
  'dist/*',
  'build/*',
  '.next/*',
  '*.zip',
  '*.tar.gz',
  `${BACKUP_DIR_NAME}/*`, // Oluşturulan yedek klasörünü de hariç tut
  'coverage/*',
  '.vscode/*',
  '.idea/*',
  'logs/*',
  '*.log',
  'temp/*',
  'tmp/*',
  'prisma/dev.db', // Örnek: Geliştirme veritabanı
  'prisma/dev.db-journal'
];

async function createLocalBackupDir(): Promise<void> {
  try {
    await fs.access(LOCAL_BACKUP_PATH);
  } catch (error) {
    // Klasör yoksa oluştur
    console.log(`Geçici yedekleme klasörü (${LOCAL_BACKUP_PATH}) oluşturuluyor...`);
    await fs.mkdir(LOCAL_BACKUP_PATH, { recursive: true });
  }
}

async function createZipArchive(zipFileName: string): Promise<string> {
  const zipFilePath = path.join(LOCAL_BACKUP_PATH, zipFileName);
  const excludeArgs = ZIP_EXCLUDE_PATTERNS.map(pattern => `-x "${pattern}"`).join(' ');
  
  // Proje kök dizinindeki her şeyi alır, belirtilenleri hariç tutar.
  // ÖNEMLİ: `zip` komutunun sisteminizde kurulu olması gerekir.
  // -r: recursive, -q: quiet
  const command = `zip -r -q "${zipFilePath}" . ${excludeArgs}`;

  console.log(`Proje arşivleniyor: ${zipFileName}...`);
  console.log(`Çalıştırılacak komut: zip -r -q "${zipFilePath}" . ${excludeArgs.substring(0, 100)}...`); // Komutun tamamı çok uzun olabilir diye kısa kesit

  try {
    // Komutu proje kök dizininde çalıştır
    const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_ROOT });
    if (stderr) {
      console.warn('ZIP oluşturma sırasında stderr çıktısı:', stderr);
    }
    console.log('Proje başarıyla arşivlendi:', zipFilePath);
    return zipFilePath;
  } catch (error) {
    console.error('ZIP arşivleme hatası:', error);
    throw error; // Hatanın yukarıya iletilmesi
  }
}

async function uploadToFtp(filePath: string, fileName: string): Promise<void> {
  const client = new Client();
  // client.ftp.verbose = true; // Detaylı loglama için
  try {
    console.log(`FTP sunucusuna bağlanılıyor: ${FTP_CONFIG.host}...`);
    await client.access(FTP_CONFIG);
    console.log('FTP bağlantısı başarılı.');

    console.log(`Dosya yükleniyor: ${fileName} -> FTP sunucusuna...`);
    await client.uploadFrom(filePath, fileName);
    console.log('Dosya başarıyla FTP sunucusuna yüklendi.');
  } catch (error) {
    console.error('FTP yükleme hatası:', error);
    throw error;
  } finally {
    client.close();
    console.log('FTP bağlantısı kapatıldı.');
  }
}

async function deleteLocalFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Yerel dosya başarıyla silindi: ${filePath}`);
  } catch (error) {
    console.error(`Yerel dosya silme hatası (${filePath}):`, error);
    // Bu hatanın genel süreci durdurmaması için throw etmiyoruz, sadece logluyoruz.
  }
}

async function main() {
  console.log('Otomatik FTP yedekleme betiği başlatıldı...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Proje adını package.json'dan almayı deneyebiliriz veya sabit bir isim kullanabiliriz
  // Şimdilik sabit bir isim kullanıyorum:
  const projectName = path.basename(PROJECT_ROOT) || 'proje';
  const zipFileName = `${projectName}-yedek-${timestamp}.zip`;

  let localZipPath: string | null = null;

  try {
    await createLocalBackupDir();
    localZipPath = await createZipArchive(zipFileName);
    await uploadToFtp(localZipPath, zipFileName); // Uzak sunucudaki dosya adı yerel ile aynı olacak
    
    // Yükleme başarılıysa yerel dosyayı sil
    console.log('Yükleme başarılı, yerel yedek dosyası siliniyor...');
    await deleteLocalFile(localZipPath);

    console.log('FTP yedekleme işlemi başarıyla tamamlandı!');
  } catch (error) {
    console.error('FTP yedekleme sürecinde bir hata oluştu:', error);
    if (localZipPath) {
      console.warn(`İşlem sırasında hata oluştuğu için yerel yedek dosyası (${localZipPath}) silinmedi. Lütfen manuel kontrol ediniz.`);
    }
    process.exitCode = 1; // Hata koduyla çık
  }
}

main(); 