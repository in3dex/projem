import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { ArrowRight, Mail, Send, CreditCard, Clock, Settings } from 'lucide-react';

// Ayar kartı verileri
const settingsCards = [
  {
    title: "Site Genel Ayarları",
    description: "Logo, favicon, SEO, iletişim ve sosyal medya ayarlarını yönetin.",
    href: "/admin/settings/site-ayarlari",
    icon: Settings
  },
  {
    title: "Ödeme Sağlayıcıları",
    description: "Ödeme yöntemlerinizi (EFT, PayTR vb.) yönetin.",
    href: "/admin/settings/odeme-saglayicilari",
    icon: CreditCard
  },
  {
    title: "E-posta (SMTP) Ayarları",
    description: "Sistem e-postaları için SMTP sunucu ayarlarını yönetin.",
    href: "/admin/settings/email",
    icon: Send
  },
  {
    title: "E-posta Şablonları",
    description: "Otomatik gönderilen e-posta içeriklerini düzenleyin.",
    href: "/admin/settings/email-templates",
    icon: Mail
  },
  {
    title: "Otomasyon Ayarları",
    description: "Otomatik fatura ve abonelik iptal zamanlamalarını ayarlayın.",
    href: "/admin/settings/automation",
    icon: Clock
  },
  // Diğer ayar sayfaları buraya eklenebilir
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-3xl font-bold tracking-tight">Ayarlar</h3>
        <p className="text-sm text-muted-foreground">
          Sistem genelindeki ayarları yönetin.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link href={card.href} key={card.href}>
            <Card className="flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200 cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                   <card.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>{card.title}</CardTitle>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              {/* Sağ alt köşeye ok ikonu eklenebilir (opsiyonel) */}
               <div className="p-6 pt-0 mt-auto text-right">
                 <ArrowRight className="inline-block h-5 w-5 text-muted-foreground" />
               </div> 
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 