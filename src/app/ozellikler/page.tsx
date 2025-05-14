"use client";

import { 
  CheckCircle,
  ArrowRight,
  ShoppingCart,
  Package,
  BarChart3,
  Zap,
  Shield,
  Settings,
  Users,
  FileText,
  RefreshCw,
  AlertTriangle,
  LifeBuoy
} from "lucide-react";
// import Image from "next/image"; // Kaldırıldı, artık kullanılmıyor
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const featuresData = [
  {
    value: "urun-yonetimi",
    title: "Akıllı Ürün Yönetimi",
    Icon: Package,
    description: "Trendyol mağazanızdaki binlerce ürünü yönetmek artık gözünüzü korkutmasın! TrendEntegre'nin Akıllı Ürün Yönetimi modülü, tüm ürünlerinizi tek, kullanıcı dostu bir panelden kontrol etmenizi sağlar. Excel'den toplu ürün yükleme, mevcut ürünleri detaylıca düzenleme, anlık stok ve fiyat senkronizasyonu gibi güçlü araçlarla operasyonel yükünüzü hafifletin. Otomatik kategori eşleştirme ve varyasyon yönetimi sayesinde ürünlerinizi doğru müşteriye, doğru şekilde sunarak satış potansiyelinizi maksimize edin.",
    subFeatures: [
      { text: "Excel veya CSV ile binlerce ürünü saniyeler içinde sisteme yükleyin veya güncelleyin.", icon: Package },
      { text: "Trendyol kategorileri ile kendi kategorilerinizi akıllıca eşleştirin, ürünlerinizin doğru listelenmesini sağlayın.", icon: Settings },
      { text: "Fiziksel mağaza veya diğer platformlardaki stoklarınızla Trendyol stoklarınızı hatasız ve anlık olarak senkronize edin.", icon: RefreshCw },
      { text: "Renk, beden, numara gibi tüm ürün varyasyonlarınızı kolayca yönetin, her varyant için ayrı stok ve fiyat takibi yapın.", icon: Zap },
      { text: "Hangi ürünlerin daha çok sattığını, hangilerinin ilgi gördüğünü detaylı raporlarla analiz edin, stratejinizi veriye dayandırın.", icon: BarChart3 },
      { text: "Belirli koşullara göre (örneğin stok bitince) ürünlerinizi otomatik olarak aktif veya pasif yapın, manuel takibe son verin.", icon: AlertTriangle }
    ],
    ctaText: "Ürün Yönetim Detayları",
    ctaLink: "/kayit?feature=urun-yonetimi"
  },
  {
    value: "siparis-yonetimi",
    title: "Otomatik Sipariş Akışı ve Yönetimi",
    Icon: ShoppingCart,
    description: "Sipariş yoğunluğu arttıkça hata yapma riskiniz de artar. TrendEntegre, Trendyol'dan gelen tüm siparişlerinizi otomatik olarak sisteme alır, işler ve kargo süreçlerinizi entegre çözümlerle hızlandırır. Sipariş onaylama, faturalandırma, kargo etiketi basma gibi tekrarlayan görevleri otomatikleştirerek zamandan tasarruf edin ve müşteri memnuniyetini en üst seviyeye taşıyın. Siparişlerin her aşamasını tek bir ekrandan takip edin.",
    subFeatures: [
      { text: "Trendyol'dan gelen yeni siparişleriniz anında TrendEntegre paneline düşsün, hiçbir siparişi kaçırmayın.", icon: ShoppingCart },
      { text: "Anlaşmalı kargo firmalarınızla tam entegrasyon sağlayın, kargo takip numaralarını otomatik oluşturun ve müşterilerinize iletin.", icon: Package },
      { text: "Yüzlerce siparişi tek tıkla onaylayın, e-Fatura/e-Arşiv faturalarını otomatik kesin ve kargoya hazır hale getirin.", icon: FileText },
      { text: "GİB portalı ile tam uyumlu e-Fatura ve e-Arşiv belgelerinizi yasal zorunluluklara uygun şekilde oluşturun ve saklayın.", icon: FileText },
      { text: "Her sipariş ve müşteri için özel notlar, etiketler ekleyerek takibinizi kolaylaştırın, kişiselleştirilmiş hizmet sunun.", icon: Users },
      { text: "İade ve değişim taleplerini merkezi bir yerden yönetin, müşteri iletişimini ve çözüm süreçlerini hızlandırın.", icon: RefreshCw }
    ],
    ctaText: "Sipariş Yönetim Detayları",
    ctaLink: "/kayit?feature=siparis-yonetimi"
  },
  {
    value: "raporlama-analiz",
    title: "Kapsamlı Raporlama ve İş Zekası",
    Icon: BarChart3,
    description: "E-ticarette başarının anahtarı veridir! TrendEntegre'nin gelişmiş raporlama ve analiz modülü, işletmenizin performansını her açıdan ölçmenizi sağlar. Anlık satış verileri, detaylı ürün ve kategori analizleri, müşteri davranışları ve karlılık raporları ile doğru zamanda doğru kararları alın. Hangi ürünlerin yıldız olduğunu, hangi kampanyaların işe yaradığını net bir şekilde görerek pazarlama ve stok stratejilerinizi optimize edin.",
    subFeatures: [
      { text: "Günlük, haftalık, aylık satış trendlerinizi, sipariş adetlerinizi ve cironuzu anlık grafiklerle takip edin.", icon: BarChart3 },
      { text: "En çok satan ürünlerinizi, en karlı kategorilerinizi ve marka performanslarınızı detaylı raporlarla inceleyin.", icon: Package },
      { text: "Müşteri yaşam boyu değeri, sepet ortalaması gibi metriklerle müşteri tabanınızı daha iyi anlayın, sadakat programları geliştirin.", icon: Users },
      { text: "Ürün maliyetlerinizi, Trendyol komisyonlarını ve diğer giderlerinizi hesaba katarak gerçek net karlılığınızı ölçün.", icon: Zap },
      { text: "İhtiyaçlarınıza özel raporlar oluşturun veya hazır şablonları kullanarak hızlıca analizlere başlayın.", icon: Settings },
      { text: "Tüm raporlarınızı ve analizlerinizi Excel, PDF gibi formatlarda kolayca dışa aktarın, ekip arkadaşlarınızla paylaşın.", icon: FileText }
    ],
    ctaText: "Raporlama ve Analiz Detayları",
    ctaLink: "/kayit?feature=raporlama"
  }
];

export default function OzelliklerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-muted/40 via-background to-muted/50 dark:from-muted/30 dark:via-background dark:to-muted/40">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="inline-block rounded-lg bg-primary/10 dark:bg-primary/20 px-5 py-2.5 text-base font-semibold text-primary dark:text-primary tracking-wider uppercase shadow-sm">
                TrendEntegre Özellikleri
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground leading-tight">
                E-Ticaretinizi Yeni Bir Seviyeye Taşıyın
              </h1>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-xl leading-relaxed">
                Trendyol mağazanız için geliştirdiğimiz kapsamlı entegrasyon çözümleriyle tanışın. İş süreçlerinizi otomatikleştirin, verimliliğinizi artırın ve satışlarınızı katlayın.
              </p>
            </div>
          </div>
        </section>

        {/* Özellikler Tabs Section */}
        <section className="w-full py-16 md:py-20 lg:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <Tabs defaultValue={featuresData[0].value} className="w-full">
              <div className="flex justify-center mb-10 lg:mb-12">
                <TabsList className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-muted/60 dark:bg-muted/40 rounded-xl shadow-md">
                  {featuresData.map((feature) => (
                    <TabsTrigger 
                      key={feature.value} 
                      value={feature.value}
                      className="text-sm sm:text-base font-medium py-3 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <feature.Icon className="mr-2 h-5 w-5 hidden sm:inline-block" />
                      {feature.title.split(' ')[0]} Yönetimi 
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              {featuresData.map((feature) => (
                <TabsContent key={feature.value} value={feature.value} className="mt-8 focus-visible:ring-0 focus-visible:outline-none">
                  <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
                    <div className={`space-y-6 ${feature.value === 'siparis-yonetimi' ? 'lg:order-last' : ''}`}> {/* Sipariş Yönetimi için ikon sağda */}
                      <div className="flex items-center gap-3 mb-2">
                        <feature.Icon className="h-8 w-8 text-primary" />
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">{feature.title}</h2>
                    </div>
                      <p className="text-muted-foreground md:text-lg leading-relaxed">
                        {feature.description}
                      </p>
                      <ul className="space-y-3 mt-5">
                        {feature.subFeatures.map((sub, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <sub.icon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-foreground/90 text-base leading-relaxed">{sub.text}</span>
                      </li>
                        ))}
                    </ul>
                      <div className="pt-6">
                        <Button size="lg" asChild className="shadow-md hover:shadow-primary/40 transition-shadow duration-300">
                          <Link href={feature.ctaLink}>
                            {feature.ctaText} <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                    {/* Görsel yerine Büyük İkon Alanı */}
                    <div className={`flex items-center justify-center p-6 md:p-10 lg:p-12 bg-gradient-to-br from-muted/30 via-background to-muted/40 dark:from-muted/20 dark:via-background dark:to-muted/30 rounded-2xl shadow-xl border-2 border-border/10 aspect-square min-h-[300px] lg:min-h-[350px] transform group-hover:scale-105 transition-transform duration-300 group ${feature.value !== 'siparis-yonetimi' ? 'lg:order-last' : ''}`}> {/* Sipariş Yönetimi dışında ikon sağda */}
                      <feature.Icon className="w-28 h-28 md:w-36 md:h-36 lg:w-48 lg:h-48 text-primary opacity-70 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.25} />
                  </div>
                </div>
              </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Ek Özellikler veya Genel Faydalar Bölümü */}
        <section className="w-full py-16 md:py-20 lg:py-28 bg-muted/20 dark:bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-accent/10 dark:bg-accent/20 px-5 py-2.5 text-base font-semibold text-accent-foreground dark:text-accent-foreground tracking-wider uppercase shadow-sm">
                DAHA FAZLASI
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                Entegrasyonun Ötesinde Sunduklarımız
                </h2>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-xl leading-relaxed">
                TrendEntegre, sadece bir araç olmanın ötesinde, e-ticaret başarınız için kapsamlı bir destek ve sürekli gelişim sunar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Kullanıcı Dostu Arayüz", description: "Karmaşık olmayan, anlaşılır ve modern arayüzümüzle tüm işlemleri kolayca gerçekleştirin.", icon: Settings },
                { title: "7/24 Kesintisiz Destek", description: "Karşılaşabileceğiniz her türlü sorunda uzman ekibimiz bir tık uzağınızda.", icon: LifeBuoy },
                { title: "Sürekli Güncellemeler", description: "Trendyol API ve e-ticaret trendlerine göre sürekli güncellenen, yaşayan bir platform.", icon: RefreshCw },
                { title: "Gelişmiş Güvenlik", description: "Verilerinizin güvenliği en üst düzeyde. SSL şifreleme ve modern güvenlik önlemleri.", icon: Shield },
                { title: "Esnek API Entegrasyonu", description: "İhtiyaçlarınıza göre özelleştirilebilen, diğer sistemlerinizle konuşabilen esnek yapı.", icon: Zap },
                { title: "Eğitim ve Kaynaklar", description: "Platformu en verimli şekilde kullanmanız için kapsamlı dokümantasyon ve eğitim materyalleri.", icon: FileText }
              ].map((item, index) => (
                <div key={index} className="flex flex-col p-6 bg-card rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 border border-border/20">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 h-12 w-12 mb-5 shadow-sm">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-grow">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="relative rounded-2xl overflow-hidden p-8 md:p-12 lg:p-16 bg-gradient-to-r from-primary to-accent shadow-2xl">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full bg-primary/20 bg-grid-slate-900/[0.04] [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-slate-900/50 dark:[mask-image:linear-gradient(0deg,transparent,white)]"
                ></div>
              <div className="relative text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-primary-foreground">
                  Trendyol'da Satışlarınızı Artırmaya Hazır Mısınız?
                </h2>
                <p className="mt-6 text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
                  TrendEntegre ile otomasyonun gücünü keşfedin, operasyonel yükünüzü hafifletin ve işletmenizi bir sonraki seviyeye taşıyın.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                  <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <Link href="/kayit">
                      14 Gün Ücretsiz Dene
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors duration-300">
                    <Link href="/iletisim">Satış Ekibiyle Görüş</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
} 