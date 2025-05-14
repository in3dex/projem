import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ChevronRight, Package, ShoppingCart, Zap, SettingsIcon, Shield, UserPlus, LinkIcon, PlayCircle, Clock, BarChart2, Scaling, LifeBuoy, RefreshCw, DatabaseZap } from "lucide-react";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { HomePricingSection } from "@/components/home/pricing-section";
import ClientHomeWrapper from "@/components/home/client-home-wrapper";

// Ana sayfa bileşeni - Server Component
export default function Home() {
  return (
    <ClientHomeWrapper>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-muted/30 via-background to-muted/30 dark:from-muted/20 dark:via-background dark:to-muted/20">
          <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center gap-10 lg:gap-16">
            <div className="space-y-7 flex-1 text-center md:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground leading-tight">
                Trendyol Mağazanızı TrendEntegre ile Otomatikleştirin ve Büyütün
              </h1>
              <p className="text-lg text-muted-foreground md:max-w-[90%] lg:text-xl leading-relaxed">
                Sipariş yönetimi, ürün senkronizasyonu, kargo takibi ve daha fazlasını tek bir platformdan kolayca yönetin. Manuel iş yükünüzü azaltın, verimliliğinizi artırın ve e-ticarette rekabette öne geçin.
              </p>
              <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 mt-6">
                <Button size="lg" className="shadow-lg hover:shadow-primary/50 transition-shadow duration-300">
                  Ücretsiz Denemeye Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow duration-300">
                  Canlı Demoyu İncele
                </Button>
              </div>
            </div>
            <div className="flex-1 flex justify-center mt-10 md:mt-0">
              <div className="w-full max-w-lg relative h-[380px] rounded-xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 dark:from-primary/40 dark:via-accent/30 dark:to-secondary/40 opacity-75"></div>
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="flex flex-col items-center justify-center bg-background/80 dark:bg-background/70 backdrop-blur-md rounded-lg p-10 shadow-xl text-center">
                    <ShoppingCart className="h-16 w-16 text-primary mb-5 animate-bounce" />
                    <span className="text-3xl font-bold text-foreground">TrendEntegre</span>
                    <span className="text-md text-muted-foreground mt-1">Akıllı Trendyol Entegrasyonu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Özellikler */}
        <section id="ozellikler" className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-accent/10 dark:bg-accent/20 px-4 py-2 text-sm font-semibold text-accent-foreground dark:text-accent-foreground tracking-wider uppercase">
                TEMEL ÖZELLİKLER
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                E-Ticaretinizi Güçlendiren Çözümler
              </h2>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                TrendEntegre, Trendyol mağazanızın her yönünü optimize etmek için geliştirilmiş kapsamlı özellikler sunar. İşletmenizin potansiyelini en üst düzeye çıkarın.
              </p>
            </div>
            <div className="mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {[
                { icon: ShoppingCart, title: "Otomatik Sipariş Akışı", description: "Yeni siparişler otomatik olarak sisteminize düşsün, faturalansın ve kargoya hazır hale gelsin. Manuel giriş hatalarını ortadan kaldırın.", link: "/ozellikler#siparis" },
                { icon: Package, title: "Anlık Ürün ve Stok Yönetimi", description: "Ürün bilgilerinizi, fiyatlarınızı ve stok adetlerinizi Trendyol ile gerçek zamanlı senkronize edin. Fazla satış veya stoksuz kalma sorunlarına son.", link: "/ozellikler#urun" },
                { icon: BarChart3, title: "Karlılık ve Performans Analizi", description: "Detaylı satış, maliyet ve karlılık raporları ile işletmenizin finansal sağlığını takip edin, stratejik kararlarınızı veriye dayandırın.", link: "/ozellikler#rapor" },
                { icon: Zap, title: "Hızlı ve Güvenilir Entegrasyon", description: "Modern altyapımız sayesinde kesintisiz ve yıldırım hızında veri akışının keyfini çıkarın. Teknik aksaklıklara zaman kaybetmeyin.", link: "/ozellikler#guncelleme" },
                { icon: Shield, title: "Gelişmiş Veri Güvenliği", description: "Müşteri ve sipariş bilgileriniz, en güncel şifreleme teknolojileri ve güvenlik protokolleri ile her zaman koruma altında.", link: "/ozellikler#guvenlik" },
                { icon: SettingsIcon, title: "Kişiselleştirilebilir Ayarlar", description: "İş akışlarınıza ve tercihlerinize göre entegrasyon ayarlarını özelleştirin. Tamamen size özel bir deneyim.", link: "/ozellikler#moduler" }
              ].map((feature, index) => (
                <Card key={index} className="bg-card/80 dark:bg-card/70 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
                  <CardHeader className="pb-3 items-center text-center md:items-start md:text-left">
                    <div className={`rounded-full w-14 h-14 flex items-center justify-center bg-gradient-to-br from-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'accent'}/20 to-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'accent'}/10 mb-5 shadow-md`}>
                      <feature.icon className={`h-7 w-7 text-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary-foreground' : 'accent-foreground'} dark:text-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary-foreground' : 'accent-foreground'}`} />
                  </div>
                    <CardTitle className="text-xl font-semibold text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                  <CardContent className="flex-1 text-center md:text-left">
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {feature.description}
                  </p>
                </CardContent>
                  <CardFooter className="justify-center md:justify-start pt-4">
                    <Link href={feature.link} className="text-sm font-medium text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/80 inline-flex items-center gap-1 transition-colors">
                      Daha Fazla Bilgi
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Nasıl Çalışır? Bölümü */}
        <section id="nasil-calisir" className="w-full py-16 md:py-24 lg:py-32 bg-muted/20 dark:bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-primary/10 dark:bg-primary/20 px-4 py-2 text-sm font-semibold text-primary dark:text-primary tracking-wider uppercase">
                SADECE 3 ADIMDA
                  </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                TrendEntegre ile Başlamak Çok Kolay
              </h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                Karmaşık kurulum süreçlerini unutun. TrendEntegre ile dakikalar içinde Trendyol mağazanızı entegre edin ve otomasyonun keyfini çıkarın.
              </p>
                  </div>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12 items-start">
              {[
                { step: 1, title: "Hesabınızı Oluşturun", description: "Hızlı ve kolay bir kayıt süreciyle TrendEntegre hesabınızı oluşturun ve platformumuza erişin.", icon: UserPlus },
                { step: 2, title: "Trendyol Mağazanızı Bağlayın", description: "API bilgilerinizi girerek Trendyol mağazanızla güvenli bir şekilde bağlantı kurun.", icon: LinkIcon },
                { step: 3, title: "Otomasyonu Başlatın", description: "Sipariş, ürün ve kargo ayarlarınızı yapılandırın ve TrendEntegre'nin işlerinizi otomatik yönetmesine izin verin.", icon: PlayCircle }
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="relative mb-6">
                    <div className="absolute -top-8 -left-8 bg-primary/10 text-primary font-bold text-4xl rounded-full w-16 h-16 flex items-center justify-center shadow-md">
                      {item.step}
                  </div>
                    <item.icon className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Paket Karşılaştırma - Veritabanından Çekilen */}
        <section id="fiyatlandirma" className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-muted/40 via-background to-muted/40 dark:from-muted/30 dark:via-background dark:to-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
               <div className="inline-block rounded-lg bg-secondary/10 dark:bg-secondary/20 px-4 py-2 text-sm font-semibold text-secondary-foreground dark:text-secondary-foreground tracking-wider uppercase">
                FİYATLANDIRMA PLANLARI
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                İşletmenize Özel Çözümler, Şeffaf Fiyatlar
              </h2>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                Her ölçekteki işletmeye uygun, esnek ve rekabetçi fiyatlandırma planlarımızla bütçenizi en verimli şekilde kullanın. İhtiyaçlarınıza en uygun paketi seçin.
              </p>
            </div>

            <Suspense fallback={
              <div className="grid gap-6 mt-12 md:grid-cols-3 mx-auto max-w-5xl">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="flex flex-col">
                    <CardHeader>
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-10 w-28 mt-4" />
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            }>
              <HomePricingSection />
            </Suspense>
            
            <div className="text-center mt-12 lg:mt-16">
              <p className="text-muted-foreground mb-5 text-md lg:text-lg leading-relaxed">
                Farklı ihtiyaçlarınız mı var veya özel bir kurumsal çözüm mü arıyorsunuz? <br className="hidden sm:block" /> Size özel teklifler için bizimle iletişime geçin.
              </p>
              <Button variant="outline" size="lg" asChild className="shadow-lg hover:shadow-primary/50 transition-shadow duration-300 border-primary text-primary hover:bg-primary/10">
                <Link href="/fiyatlandirma">Tüm Fiyatlandırma Seçenekleri</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Neden Bizi Seçmelisiniz? (Detaylı Avantajlar) */}
        <section id="neden-biz" className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-accent/10 dark:bg-accent/20 px-4 py-2 text-sm font-semibold text-accent-foreground dark:text-accent-foreground tracking-wider uppercase">
                TRENDENTEGRE FARKI
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                Neden TrendEntegre Sizin İçin En İyisi?
                  </h2>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                Sadece bir entegrasyon aracı değil, e-ticaretteki büyüme ortağınız olmayı hedefliyoruz. Müşteri odaklı yaklaşımımız ve sürekli gelişen teknolojimizle fark yaratıyoruz.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {[
                { title: "Maksimum Zaman Tasarrufu", description: "Tekrarlayan manuel görevleri otomatikleştirerek değerli zamanınızı stratejik işlerinize odaklanmak için geri kazanın.", icon: Clock },
                { title: "Operasyonel Verimlilik Artışı", description: "Hatasız ve hızlı iş akışları sayesinde sipariş karşılama sürenizi kısaltın, müşteri memnuniyetini artırın.", icon: BarChart2 },
                { title: "Ölçeklenebilir Altyapı", description: "İşletmeniz büyüdükçe artan sipariş ve ürün hacminizi sorunsuz bir şekilde yönetebilecek esnek ve güçlü bir altyapı sunuyoruz.", icon: Scaling },
                { title: "Kapsamlı Uzman Destek", description: "Karşılaştığınız her sorunda veya ihtiyacınız olduğunda, deneyimli destek ekibimiz hızlı ve etkili çözümlerle yanınızda.", icon: LifeBuoy },
                { title: "Sürekli İyileştirme ve Yenilik", description: "E-ticaret dünyasındaki son trendleri ve teknolojileri yakından takip ederek platformumuzu sürekli güncelliyor ve yeni özellikler ekliyoruz.", icon: RefreshCw },
                { title: "Veri Odaklı Kararlar", description: "Anlaşılır raporlar ve analiz araçları ile satış performansınızı, müşteri davranışlarını ve pazar trendlerini daha iyi anlayın.", icon: DatabaseZap }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4 p-6 bg-card/70 dark:bg-card/60 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className={`flex-shrink-0 rounded-md p-3 bg-gradient-to-br from-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'accent'}/20 to-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'accent'}/10`}>
                    <item.icon className={`h-6 w-6 text-${index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary-foreground' : 'accent-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
                      </div>
                    </div>
        </section>

        {/* Sıkça Sorulan Sorular (SSS) */}
        <section id="sss" className="w-full py-16 md:py-24 lg:py-32 bg-muted/20 dark:bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-primary/10 dark:bg-primary/20 px-4 py-2 text-sm font-semibold text-primary dark:text-primary tracking-wider uppercase">
                MERAK EDİLENLER
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                Sıkça Sorulan Sorular
              </h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                TrendEntegre hakkında en çok merak edilen soruların yanıtlarını burada bulabilirsiniz.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-6">
              {[
                { q: "TrendEntegre kurulumu ne kadar sürer?", a: "TrendEntegre'yi Trendyol mağazanıza bağlamak genellikle sadece birkaç dakikanızı alır. Kullanıcı dostu arayüzümüz sayesinde herhangi bir teknik bilgiye ihtiyaç duymadan kurulumu tamamlayabilirsiniz." },
                { q: "Veri güvenliğim nasıl sağlanıyor?", a: "Veri güvenliğiniz bizim için en önemli önceliktir. Tüm bağlantılar SSL ile şifrelenir ve kişisel verileriniz en güncel güvenlik standartlarına uygun olarak korunur. API anahtarlarınız güvenli bir şekilde saklanır." },
                { q: "Hangi Trendyol süreçlerini otomatikleştirebilirim?", a: "TrendEntegre ile siparişlerin alınması, işlenmesi, faturalandırılması, kargo bilgilerinin güncellenmesi, ürün ve stok senkronizasyonu gibi birçok kritik Trendyol sürecini otomatikleştirebilirsiniz." },
                { q: "Fiyatlandırma planları arasında geçiş yapabilir miyim?", a: "Evet, işletmenizin ihtiyaçları değiştikçe fiyatlandırma planları arasında kolayca geçiş yapabilirsiniz. Esnek planlarımız, büyümenize paralel olarak size en uygun çözümü sunar." },
                { q: "Destek almak istediğimde ne yapmalıyım?", a: "Uzman destek ekibimiz, e-posta veya platformumuz üzerinden açacağınız destek talepleri aracılığıyla size yardımcı olmaktan mutluluk duyacaktır. Sorularınıza en kısa sürede yanıt vermeyi hedefliyoruz." }
              ].map((faq, index) => (
                <details key={index} className="group bg-card p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                  <summary className="flex justify-between items-center font-medium text-foreground cursor-pointer list-none">
                    {faq.q}
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Bölümü */}
        <section className="w-full py-16 md:py-28 lg:py-36">
          <div className="container mx-auto px-4 md:px-6">
            <div className="relative rounded-xl overflow-hidden p-8 md:p-12 lg:p-16 bg-gradient-to-r from-primary to-accent shadow-2xl">
              <div
                aria-hidden="true"
                className="absolute inset-0 w-full h-full bg-primary/20 bg-grid-slate-900/[0.04] [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-slate-900/50 dark:[mask-image:linear-gradient(0deg,transparent,white)]"
              ></div>
              <div className="relative text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-primary-foreground">
                  Entegrasyon Devrimine Katılmaya Hazır Mısınız?
                </h2>
                <p className="mt-6 text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
                  Trendyol mağazanızı bir üst seviyeye taşımanın tam zamanı. Güçlü otomasyon araçlarımız ve kullanıcı dostu arayüzümüzle farkı hemen hissedin.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                  <Button size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    Ücretsiz Denemeye Başla
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors duration-300">
                    Satış Danışmanıyla Görüş
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </ClientHomeWrapper>
  );
}
