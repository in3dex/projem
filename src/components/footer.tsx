import Link from "next/link";
import { Mail, MapPin, Phone, ExternalLink, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface FooterProps {
  siteName?: string | null;
  footerText?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  // İleride sosyal medya linkleri de eklenebilir
}

export function Footer({
  siteName,
  footerText,
  contactEmail,
  contactPhone,
  contactAddress,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const defaultSiteName = "Projem";
  const defaultFooterText = `© ${currentYear} ${siteName || defaultSiteName}. Tüm hakları saklıdır.`;

  return (
    <footer className="bg-muted/40 w-full py-8 mt-16">
      <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-primary">{siteName || defaultSiteName}</h3>
          <p className="text-sm text-muted-foreground">
            Trendyol entegrasyonunuzla e-ticaret süreçlerinizi otomatikleştirin ve verimliliğinizi artırın.
          </p>
          {/* GitHub ve API Docs linkleri statik kalabilir veya ayarlanabilir hale getirilebilir */}
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" className="h-8 gap-2 asChild">
              <Link href="#" aria-label="GitHub">
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2 asChild">
              <Link href="#" aria-label="API Docs">
                <ExternalLink className="h-4 w-4" />
                <span>API Docs</span>
              </Link>
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Sayfalar</h3>
          <ul className="grid gap-2 text-sm">
            <li><Link href="/" className="hover:text-primary">Anasayfa</Link></li>
            <li><Link href="/ozellikler" className="hover:text-primary">Özellikler</Link></li>
            <li><Link href="/fiyatlandirma" className="hover:text-primary">Fiyatlandırma</Link></li>
            <li><Link href="/iletisim" className="hover:text-primary">İletişim</Link></li>
            <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
            {/* <li><Link href="/giris" className="hover:text-primary">Giriş Yap</Link></li> */}
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Kaynaklar</h3>
          <ul className="grid gap-2 text-sm">
            <li><Link href="/dokumanlar" className="hover:text-primary">Dokümantasyon</Link></li>
            <li><Link href="/sss" className="hover:text-primary">SSS</Link></li>
            <li><Link href="/gizlilik-politikasi" className="hover:text-primary">Gizlilik Politikası</Link></li>
            <li><Link href="/kullanim-kosullari" className="hover:text-primary">Kullanım Koşulları</Link></li>
            <li><Link href="/hakkimizda" className="hover:text-primary">Hakkımızda</Link></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">İletişim</h3>
          <div className="grid gap-4 text-sm">
            {contactAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{contactAddress}</span>
              </div>
            )}
            {contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{contactPhone}</span>
              </div>
            )}
            {contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-primary break-all">{contactEmail}</a>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <span className="font-medium">Bültenimize Abone Olun</span>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="E-posta adresiniz"
                  className="h-9"
                  aria-label="Bülten için e-posta"
                />
                <Button size="sm">Abone Ol</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="container mx-auto px-4 md:px-6 text-center text-sm text-muted-foreground">
        <p>{footerText || defaultFooterText}</p>
      </div>
    </footer>
  );
} 