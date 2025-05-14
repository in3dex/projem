import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon, SendIcon } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { PrismaClient, SiteSettings } from '@prisma/client';
import ContactForm from './contact-form';

const prisma = new PrismaClient();

async function getSiteSettings(): Promise<SiteSettings | null> {
  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[getSiteSettings - IletisimPage] Docker build detected, returning null for site settings.");
    return null;
  }
  const settings = await prisma.siteSettings.findFirst();
  return settings;
}

export default async function IletisimPage() {
  let siteSettings: SiteSettings | null = null;

  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[IletisimPage] Docker build detected, using default contact info.");
    // siteSettings null kalacak, varsayılanlar kullanılacak
  } else {
    try {
      siteSettings = await getSiteSettings();
    } catch (error) {
      console.error("Error fetching site settings for IletisimPage:", error);
      // Hata durumunda siteSettings null kalacak, varsayılanlar kullanılacak
    }
  }

  const defaultContact = {
    email: "iletisim@siteadi.com",
    phone: "0850 123 4567",
    address: "Adres bilgisi bulunamadı.",
  };

  const contactEmail = siteSettings?.contactEmail || defaultContact.email;
  const contactPhone = siteSettings?.contactPhone || defaultContact.phone;
  const contactAddress = siteSettings?.contactAddress || defaultContact.address;
  
  const socialLinks = [
    { name: 'Facebook', href: siteSettings?.socialFacebook, icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0C5.37 0 0 5.41 0 12.07C0 18.1 4.39 23.09 10.12 24V15.56H7.08V12.07H10.12V9.41C10.12 6.38 11.91 4.72 14.65 4.72C15.97 4.72 17.34 4.96 17.34 4.96V7.94H15.83C14.34 7.94 13.87 8.87 13.87 9.82V12.07H17.2L16.67 15.56H13.87V24C19.61 23.09 24 18.1 24 12.07Z"/></svg> },
    { name: 'Instagram', href: siteSettings?.socialInstagram, icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C14.717 2 15.056 2.01 16.122 2.06C17.187 2.11 17.912 2.277 18.55 2.525C19.21 2.779 19.766 3.123 20.322 3.678C20.8305 4.1779 21.224 4.78259 21.475 5.45C21.722 6.087 21.89 6.813 21.94 7.878C21.987 8.944 22 9.283 22 12C22 14.717 21.99 15.056 21.94 16.122C21.89 17.187 21.722 17.912 21.475 18.55C21.2247 19.2178 20.8311 19.8226 20.322 20.322C19.822 20.8303 19.2173 21.2238 18.55 21.475C17.913 21.722 17.187 21.89 16.122 21.94C15.056 21.987 14.717 22 12 22C9.283 22 8.944 21.99 7.878 21.94C6.813 21.89 6.088 21.722 5.45 21.475C4.78233 21.2245 4.17753 20.8309 3.678 20.322C3.16941 19.8222 2.77593 19.2175 2.525 18.55C2.277 17.913 2.11 17.187 2.06 16.122C2.013 15.056 2 14.717 2 12C2 9.283 2.01 8.944 2.06 7.878C2.11 6.812 2.277 6.088 2.525 5.45C2.77524 4.78218 3.1688 4.17732 3.678 3.678C4.17767 3.16923 4.78243 2.77573 5.45 2.525C6.088 2.277 6.812 2.11 7.878 2.06C8.944 2.013 9.283 2 12 2ZM12 7C10.6739 7 9.40215 7.52678 8.46447 8.46447C7.52678 9.40215 7 10.6739 7 12C7 13.3261 7.52678 14.5979 8.46447 15.5355C9.40215 16.4732 10.6739 17 12 17C13.3261 17 14.5979 16.4732 15.5355 15.5355C16.4732 14.5979 17 13.3261 17 12C17 10.6739 16.4732 9.40215 15.5355 8.46447C14.5979 7.52678 13.3261 7 12 7ZM18.5 6.75C18.5 6.41848 18.3683 6.10054 18.1339 5.86612C17.8995 5.6317 17.5815 5.5 17.25 5.5C16.9185 5.5 16.6005 5.6317 16.3661 5.86612C16.1317 6.10054 16 6.41848 16 6.75C16 7.08152 16.1317 7.39946 16.3661 7.63388C16.6005 7.8683 16.9185 8 17.25 8C17.5815 8 17.8995 7.8683 18.1339 7.63388C18.3683 7.39946 18.5 7.08152 18.5 6.75ZM12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9Z"/></svg> },
    { name: 'X (Twitter)', href: siteSettings?.socialX, icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.15,7.38 3.07,4.76C2.64,5.45 2.42,6.24 2.42,7.07C2.42,8.61 3.17,9.95 4.31,10.74C3.63,10.72 3,10.53 2.46,10.21V10.26C2.46,12.37 3.93,14.09 5.89,14.5C5.44,14.64 4.96,14.71 4.47,14.71C4.16,14.71 3.86,14.68 3.57,14.62C4.1,16.35 5.72,17.59 7.68,17.63C6.22,18.78 4.38,19.5 2.37,19.5C2.04,19.5 1.72,19.48 1.4,19.41C3.33,20.79 5.7,21.62 8.28,21.62C16.42,21.62 20.29,14.85 20.29,8.97C20.29,8.76 20.29,8.55 20.28,8.34C21.11,7.72 21.85,6.93 22.46,6Z"/></svg> },
    { name: 'LinkedIn', href: siteSettings?.socialLinkedin, icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.4701 2.00002H3.53006C2.69006 2.00002 2.00006 2.69002 2.00006 3.53002V20.47C2.00006 21.31 2.69006 22 3.53006 22H20.4701C21.3101 22 22.0001 21.31 22.0001 20.47V3.53002C22.0001 2.69002 21.3101 2.00002 20.4701 2.00002ZM8.09006 18.74H5.09006V9.74002H8.09006V18.74ZM6.59006 8.48002C5.65006 8.48002 4.90006 7.73002 4.90006 6.80002C4.90006 5.87002 5.65006 5.12002 6.59006 5.12002C7.52006 5.12002 8.28006 5.87002 8.28006 6.80002C8.28006 7.73002 7.52006 8.48002 6.59006 8.48002ZM18.9101 18.74H15.9101V14.18C15.9101 13.12 15.8901 11.75 14.4301 11.75C12.9501 11.75 12.7301 12.91 12.7301 14.11V18.74H9.73006V9.74002H12.6101V11H12.6501C13.0401 10.27 13.9801 9.50002 15.3701 9.50002C18.4101 9.50002 18.9101 11.42 18.9101 13.98V18.74Z"/></svg> },
    { name: 'Youtube', href: siteSettings?.socialYoutube, icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582,6.186 C21.329,5.438 20.787,4.875 20.076,4.605 C18.334,4 12,4 12,4 C12,4 5.666,4 3.924,4.605 C3.213,4.875 2.671,5.438 2.418,6.186 C1.833,7.974 1.833,12 1.833,12 C1.833,12 1.833,16.026 2.418,17.814 C2.671,18.562 3.213,19.125 3.924,19.395 C5.666,20 12,20 12,20 C12,20 18.334,20 20.076,19.395 C20.787,19.125 21.329,18.562 21.582,17.814 C22.167,16.026 22.167,12 22.167,12 C22.167,12 22.167,7.974 21.582,6.186 Z M9.75,15.528 L9.75,8.472 L15.834,12 L9.75,15.528 Z"/></svg> },
  ].filter(link => link.href);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                  İletişim
                </div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {siteSettings?.siteName || "Bizimle"} İletişime Geçin
                </h1>
                <p className="max-w-[85%] mx-auto text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Sorularınız, önerileriniz veya işbirliği talepleriniz için her zaman buradayız
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">İletişim Bilgilerimiz</h2>
                  <p className="text-muted-foreground mb-6">
                    Aşağıdaki iletişim kanallarından bize ulaşabilir veya formu doldurarak mesaj gönderebilirsiniz.
                  </p>
                </div>
                
                <div className="grid gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <MailIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <a href={`mailto:${contactEmail}`} className="hover:underline">
                          {contactEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <PhoneIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Telefon</h3>
                      <p className="text-sm text-muted-foreground mt-1">{contactPhone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <MapPinIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Adres</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                        {contactAddress}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t">
                  <h3 className="font-medium mb-4">Çalışma Saatlerimiz</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-medium">Pazartesi - Cuma</p>
                      <p className="text-muted-foreground">09:00 - 18:00</p>
                    </div>
                    <div>
                      <p className="font-medium">Cumartesi</p>
                      <p className="text-muted-foreground">10:00 - 14:00</p>
                    </div>
                    <div className="col-span-2 mt-2">
                      <p className="font-medium">Pazar</p>
                      <p className="text-muted-foreground">Kapalı</p>
                    </div>
                  </div>
                </div>
                
                {socialLinks.length > 0 && (
                  <div className="pt-6 border-t">
                    <h3 className="font-medium mb-4">Sosyal Medya</h3>
                    <div className="flex gap-4">
                      {socialLinks.map((link) => (
                        <Link 
                          key={link.name}
                          href={link.href!}
                          className="bg-muted hover:bg-muted/80 p-2 rounded-full"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.name}
                        >
                          {link.icon}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center">
              <div className="space-y-4 max-w-[800px]">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Ofisimiz
                </h2>
                <p className="text-muted-foreground md:text-xl">
                  İstanbul'un kalbinde yer alan modern ofisimizde sizleri ağırlamaktan mutluluk duyarız
                </p>
              </div>
              <div className="mt-8 w-full h-[400px] rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3007.9358310750303!2d29.006849915734316!3d41.07620732398726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab7a2a2c3b963%3A0x7671d1b9817b8519!2sLevent%2C%20B%C3%BCy%C3%BCkdere%20Cd.%2C%2034330%20%C5%9Ei%C5%9Fli%2F%C4%B0stanbul!5e0!3m2!1str!2str!4v1652785878659!5m2!1str!2str"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer 
        siteName={siteSettings?.siteName}
        footerText={siteSettings?.footerText}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </div>
  );
} 