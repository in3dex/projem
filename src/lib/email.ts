import nodemailer from 'nodemailer';
import { PrismaClient, EmailTemplateType, NotificationType, SmtpSettings } from '@prisma/client';

const prisma = new PrismaClient();
const SETTINGS_ID = "singleton";

interface MailOptions {
  to: string;       // Alıcı e-posta adresi
  subject: string;   // E-posta konusu
  text?: string;      // Düz metin içerik
  html?: string;      // HTML içerik
}

async function getSmtpSettings() {
  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    return settings;
  } catch (error) {
    console.error("SMTP ayarları alınırken hata:", error);
    return null;
  }
}

export async function sendMail({ to, subject, text, html }: MailOptions): Promise<boolean> {
  const settings = await getSmtpSettings();

  if (!settings || !settings.host || !settings.port || !settings.from || !settings.fromName) {
    console.error("SMTP ayarları eksik veya bulunamadı. E-posta gönderilemiyor.");
    return false;
  }

  // Şifre varsa auth objesini oluştur, yoksa null bırak
  const authConfig = settings.username && settings.password 
    ? { user: settings.username, pass: settings.password } 
    : undefined;

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure ?? false, // settings.secure null ise false kullan
    auth: authConfig,
    // Gerekirse TLS ayarları eklenebilir
    // tls: {
    //   ciphers: 'SSLv3'
    // }
  });

  const mailOptions = {
    from: `"${settings.fromName}" <${settings.from}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.verify(); // Önce bağlantıyı doğrula
    console.log('SMTP sunucusuna başarıyla bağlanıldı.');
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-posta gönderildi: ${info.messageId} -> ${to}`);
    return true;
  } catch (error) {
    console.error("E-posta gönderme hatası:", error);
    return false;
  } finally {
     await prisma.$disconnect(); // Her işlem sonrası bağlantıyı kapat
  }
}

// --- YENİ: Şablonlu E-posta Gönderme Fonksiyonu ---

interface TemplatedMailOptions {
  to: string;
  templateType: EmailTemplateType;
  // Şablondaki değişkenleri doldurmak için veri objesi
  data: Record<string, any>; 
}

// Basit bir değişken değiştirme fonksiyonu
function replacePlaceholders(template: string, data: Record<string, any>): string {
  let result = template;
  for (const key in data) {
    const regex = new RegExp(`{{\s*${key}\s*}}`, 'g'); // {{ variableName }}
    result = result.replace(regex, String(data[key]));
  }
  return result;
}

export async function sendTemplatedMail({
  to,
  templateType,
  data,
}: TemplatedMailOptions): Promise<boolean> {
  const smtpSettings = await getSmtpSettings();

  // 1. Genel SMTP ayarlarını ve aktifliğini kontrol et
  if (
    !smtpSettings || 
    !smtpSettings.host || 
    !smtpSettings.port || 
    !smtpSettings.from || 
    !smtpSettings.fromName
  ) {
    console.warn(`E-posta gönderimi (${templateType}) atlandı: SMTP ayarları eksik veya genel bildirimler kapalı.`);
    return false;
  }

  // 2. İlgili şablonu bul ve aktifliğini kontrol et
  let emailTemplate;
  try {
    emailTemplate = await prisma.emailTemplate.findUnique({
      where: { type: templateType },
    });

    if (!emailTemplate || !emailTemplate.isActive) {
      console.warn(`E-posta gönderimi (${templateType}) atlandı: Şablon bulunamadı veya pasif.`);
      return false;
    }
  } catch (error) {
    console.error(`E-posta şablonu (${templateType}) alınırken hata:`, error);
    return false;
  }

  // 3. Şablondaki değişkenleri doldur
  const subject = replacePlaceholders(emailTemplate.subject, data);
  const htmlBody = replacePlaceholders(emailTemplate.htmlBody, data);

  // 4. Mevcut sendMail fonksiyonunu kullanarak gönder
  //    Burada text versiyonu şimdilik oluşturmuyoruz, sadece HTML gönderiyoruz.
  const success = await sendMail({
    to,
    subject,
    html: htmlBody,
  });

  return success;
} 