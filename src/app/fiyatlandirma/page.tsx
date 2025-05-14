// Server Component - "use client" kullanılmıyor

import Link from "next/link";
import { Check, CheckCircle, HelpCircle, TrendingUp, Zap, Users, Shield, BarChart, Star, Info, XCircle, Package, ShoppingCart, FileText, LifeBuoy, RefreshCw, Settings, ArrowRight, ChevronRight } from "lucide-react";
import { PrismaClient, Plan } from "@prisma/client";
import { cn, formatCurrency } from "@/lib/utils";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { StartSubscriptionButton } from "@/components/fiyatlandirma/start-subscription-button";

// Server Component olduğu için Prisma doğrudan kullanılabilir
const prisma = new PrismaClient();

// export const revalidate = 3600; 

// Plan özelliklerinin gösterim metinleri ve ikonları için bir harita (opsiyonel, geliştirilebilir)
const featureDisplayMap: { [key: string]: { text: string; icon: React.ElementType } } = {
  maxProducts: { text: "Ürün Limiti", icon: Package },
  maxMonthlyOrders: { text: "Aylık Sipariş Limiti", icon: ShoppingCart },
  "Temel Raporlama": { text: "Temel Raporlama Araçları", icon: BarChart },
  "Gelişmiş Raporlama": { text: "Gelişmiş Raporlama ve Analiz", icon: TrendingUp },
  "API Erişimi": { text: "API Erişimi ve Entegrasyonlar", icon: Zap },
  "Öncelikli Destek": { text: "Öncelikli Destek Hattı", icon: LifeBuoy },
  "Otomatik Fatura": { text: "Otomatik Fatura Oluşturma", icon: FileText },
  "Stok Senkronizasyonu": { text: "Gerçek Zamanlı Stok Senkronizasyonu", icon: RefreshCw },
  "Kategori Eşleştirme": { text: "Akıllı Kategori Eşleştirme", icon: Settings },
  "Toplu İşlemler": { text: "Toplu Ürün/Sipariş İşlemleri", icon: Package },
  // ... daha fazla özellik eklenebilir
};

// Planların özelliklerini daha okunaklı hale getirmek için yardımcı fonksiyon
function renderPlanFeatures(features: any, plan: Plan) {
  const renderedFeatures: { text: string; icon: React.ElementType, included: boolean }[] = [];

  // String array olan features (veya diğer JSON yapısı)
  let featureList: string[] = [];
  if (Array.isArray(features)) {
    featureList = features as string[];
  } else if (typeof features === 'string') {
    // Eğer özellikler tek bir string ise (nadiren), onu tek elemanlı dizi yap
    featureList = [features];
  } // Başka JSON yapıları da burada ele alınabilir

  featureList.forEach((featureStr: string) => {
    const displayInfo = featureDisplayMap[featureStr] || { text: featureStr, icon: CheckCircle };
    renderedFeatures.push({ ...displayInfo, included: true });
  });

  // Limitler (her zaman gösterilecek, null değilse)
  if (plan.maxProducts !== null && plan.maxProducts !== undefined) renderedFeatures.push({ text: `${plan.maxProducts === 0 ? 'Limitsiz' : plan.maxProducts} Ürün`, icon: Package, included: true });
  if (plan.maxMonthlyOrders !== null && plan.maxMonthlyOrders !== undefined) renderedFeatures.push({ text: `${plan.maxMonthlyOrders === 0 ? 'Limitsiz' : plan.maxMonthlyOrders} Aylık Sipariş`, icon: ShoppingCart, included: true });

  // Limitsiz olanları sona atabiliriz veya özellik sırasını koruyabiliriz.
  // Örnek: return renderedFeatures.sort((a, b) => (a.text.includes("Limit") ? 1 : -1));
  return renderedFeatures;
}

// Tip tanımı: Karşılaştırma tablosundaki her satırın tipini belirtelim
interface ComparisonFeature { 
  name: string; 
  prop: keyof Plan | 'features'; // Plan modelinin alan adı veya özel 'features' anahtarı
  icon: React.ElementType; 
  check?: string; // Sadece prop='features' ise kullanılacak kontrol string'i
}

export default async function FiyatlandirmaPage() {
  let plansFromDb: Plan[] = []; // Tip Plan[] olarak düzeltildi

  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[FiyatlandirmaPage] Docker build detected, returning empty plans array.");
    // plansFromDb boş kalacak
  } else {
    try {
      plansFromDb = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: [
          { priceMonthly: { sort: 'asc', nulls: 'last' } },
          { name: 'asc' }
        ],
      });
    } catch (error) {
      console.error("Error fetching plans for FiyatlandirmaPage:", error);
      // Hata durumunda plansFromDb boş kalacak
    }
  }

  // Planları client-side'da zenginleştirmek veya sıralamak için:
  // Örnek: `isPopular` gibi bir alan modelde yoksa burada atanabilir.
  const plans = plansFromDb.map((p, index) => ({
    ...p,
    // Örnek: İkinci planı popüler işaretle (veya DB'den gelen bir alana göre yap)
    isPopular: p.name.toLowerCase().includes("profesyonel") || (plansFromDb.length > 1 && index === 1 && !plansFromDb.some(plan => plan.name.toLowerCase().includes("profesyonel"))), 
    // features alanı Json olduğundan, burada parse edip string[] haline getirebiliriz ya da renderPlanFeatures içinde halledebiliriz.
    // Prisma şemasında features: Json? olduğu için string[] veya daha karmaşık bir yapı olabilir.
    // Şimdilik string[] veya null/undefined olduğunu varsayalım.
    parsedFeatures: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? [p.features] : []),
  }));

  // Karşılaştırma tablosu için tüm benzersiz özellikleri topla (Tip güvenliği ile)
  const allPossibleFeatures: ComparisonFeature[] = [
    { name: "Ürün Sayısı", prop: 'maxProducts', icon: Package }, 
    { name: "Aylık Sipariş", prop: 'maxMonthlyOrders', icon: ShoppingCart },
    ...Array.from(new Set(plans.flatMap(p => p.parsedFeatures as string[])))
      .map(featureStr => {
          const displayInfo = featureDisplayMap[featureStr] || { text: featureStr, icon: CheckCircle };
          // 'prop' olarak 'features' ve 'check' olarak featureStr'ı ekliyoruz
          return { name: displayInfo.text, prop: 'features' as 'features', check: featureStr, icon: displayInfo.icon }; 
      })
  ];

  const faqItems = [
    { q: "Hangi ödeme yöntemlerini kabul ediyorsunuz?", a: "Kredi kartı, banka kartı ve EFT/Havale ile ödeme kabul ediyoruz. Tüm online ödemeleriniz güvenli altyapımız üzerinden işlenmektedir." },
    { q: "Aboneliğimi istediğim zaman iptal edebilir miyim?", a: "Evet, tüm planlarımız taahhütsüzdür. Aboneliğinizi dilediğiniz zaman kullanıcı panelinizden kolayca iptal edebilirsiniz. İptal ettiğinizde, mevcut fatura döneminizin sonuna kadar hizmetimizden yararlanmaya devam edersiniz." },
    { q: "Yıllık ödemelerde indirim var mı?", a: "Evet, yıllık ödeme seçeneğini tercih ederek aylık fiyatlara göre %20'ye varan indirimlerden faydalanabilirsiniz. Yıllık planlar bütçe dostu bir seçenektir." },
    { q: "Planlar arasında geçiş yapabilir miyim?", a: "Kesinlikle! İhtiyaçlarınız değiştikçe daha üst bir plana geçebilir veya mevcut planınızdan daha düşük bir plana dönebilirsiniz. Değişiklikler bir sonraki fatura döneminizde geçerli olur." },
    { q: "Ücretsiz deneme sürümü sunuyor musunuz?", a: "Evet, tüm yeni kullanıcılarımıza 14 günlük ücretsiz deneme sürümü sunuyoruz. Bu süre boyunca platformumuzun tüm özelliklerini test edebilir, kredi kartı bilgisi girmeden TrendEntegre'yi deneyimleyebilirsiniz." },
    { q: "Kurulum ve entegrasyon ne kadar sürer?", a: "TrendEntegre'yi Trendyol mağazanıza bağlamak sadece birkaç dakikanızı alır. Kullanıcı dostu arayüzümüz ve adım adım yönlendirmelerimiz sayesinde teknik bilgiye ihtiyaç duymadan kurulumu tamamlayabilirsiniz." }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-muted/40 via-background to-muted/50 dark:from-muted/30 dark:via-background dark:to-muted/40">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="inline-block rounded-lg bg-primary/10 dark:bg-primary/20 px-5 py-2.5 text-base font-semibold text-primary dark:text-primary tracking-wider uppercase shadow-sm">
                Şeffaf Fiyatlandırma
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground leading-tight">
                İşletmeniz İçin Mükemmel Planı Bulun
              </h1>
              <p className="max-w-3xl mx-auto text-muted-foreground md:text-xl leading-relaxed">
                Trendyol operasyonlarınızı otomatikleştirmek ve satışlarınızı artırmak için tasarlanmış esnek ve uygun fiyatlı abonelik seçeneklerimizle tanışın. Gizli ücret yok, karmaşık sözleşmeler yok; sadece büyümenize odaklanın.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Plans Section */}
        <section id="pricing-plans" className="w-full py-16 md:py-20 lg:py-28">
          <div className="container mx-auto px-4 md:px-6">
            {plans.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                {plans.map((plan) => {
                  const planRenderedFeatures = renderPlanFeatures(plan.parsedFeatures, plan as Plan); 
                  return (
                    <Card 
                      key={plan.id} 
                      className={cn(
                        "flex flex-col rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl",
                        plan.isPopular ? "border-2 border-primary ring-4 ring-primary/20 scale-105" : "border border-border/20"
                      )}
                    >
                      <CardHeader className={cn("pb-6 text-center", plan.isPopular ? "bg-primary/5 pt-8" : "pt-6")}>
                        {plan.isPopular && (
                          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-foreground shadow-md">
                            <Star className="mr-2 h-4 w-4" /> EN POPÜLER
                          </div>
                        )}
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">{plan.name}</h2>
                      {plan.description && (
                          <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">{plan.description}</p>
                      )}
                </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between px-6 pb-6">
                        <div className="mt-2 mb-8">
                        {plan.priceMonthly !== null ? (
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-4xl font-extrabold tracking-tight text-foreground">{formatCurrency(plan.priceMonthly, plan.currency)}</span>
                              <span className="text-lg font-medium text-muted-foreground">/ay</span>
                            </div>
                        ) : plan.priceYearly !== null ? (
                            <div className="flex items-baseline justify-center gap-1">
                               <span className="text-4xl font-extrabold tracking-tight text-foreground">{formatCurrency(plan.priceYearly, plan.currency)}</span>
                              <span className="text-lg font-medium text-muted-foreground">/yıl</span>
                            </div>
                          ) : (
                            <div className="text-center">
                                <span className="text-2xl font-semibold text-muted-foreground">Size Özel</span>
                                <p className="text-xs text-muted-foreground">Detaylar için iletişime geçin</p>
                            </div>
                          )}
                          {plan.priceMonthly !== null && plan.priceYearly !== null && plan.priceYearly < (plan.priceMonthly * 12) && (
                            <p className="mt-2 text-center text-xs text-green-600 dark:text-green-500 font-semibold">
                              Yıllık ödemede ~%{Math.round((1 - (plan.priceYearly / (plan.priceMonthly * 12))) * 100)} tasarruf edin!
                              ({formatCurrency(plan.priceYearly, plan.currency)}/yıl)
                        </p>
                      )}
                        </div>
                        
                        <ul className="space-y-3 text-sm mb-8">
                          {planRenderedFeatures.length > 0 ? (
                            planRenderedFeatures.map((feature, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <feature.icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", feature.included ? "text-green-500" : "text-red-500")} />
                                <span className={cn(feature.included ? "text-foreground/90" : "text-muted-foreground line-through")}>{feature.text}</span>
                    </li>
                          ))
                        ) : (
                            <li className="flex items-center gap-2 text-muted-foreground italic">
                              <Info className="h-4 w-4 flex-shrink-0" />
                              <span>Bu plan için özellik detayı bulunmamaktadır.</span>
                            </li>
                        )}
                  </ul>
                        {/* Abonelik Butonu - planId ve planName prop'larını aldığından emin olalım */} 
                        <StartSubscriptionButton 
                           planId={plan.id} 
                           planName={plan.name} 
                         />
                </CardContent>
              </Card>
                  );
                })}
                  </div>
            ) : (
              <div className="text-center py-16">
                <Zap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Uygun Plan Bulunamadı</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Aradığınız kriterlere uygun bir fiyatlandırma planı şu anda mevcut değil. Lütfen daha sonra tekrar kontrol edin veya özel bir çözüm için bizimle iletişime geçin.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/iletisim">İletişime Geçin</Link>
                </Button>
            </div>
            )}
          </div>
        </section>

        {/* Feature Comparison Table Section (Yeni) */}
        <section id="feature-comparison" className="w-full py-16 md:py-20 lg:py-28 bg-muted/20 dark:bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-secondary/10 dark:bg-secondary/20 px-5 py-2.5 text-base font-semibold text-secondary-foreground dark:text-secondary-foreground tracking-wider uppercase shadow-sm">
                DETAYLI KARŞILAŞTIRMA
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                Planlarımızı Karşılaştırın
              </h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                İhtiyaçlarınıza en uygun olanı seçmek için planlarımızın sunduğu tüm özellikleri ve limitleri detaylıca inceleyin.
              </p>
            </div>
            {plans.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border/30 shadow-md bg-card">
              <table className="w-full min-w-[800px] divide-y divide-border/30 text-sm">
                <thead className="bg-muted/50 dark:bg-muted/30">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left font-semibold text-foreground">Özellikler</th>
                    {plans.map(plan => (
                      <th key={plan.id} scope="col" className="px-6 py-4 text-center font-semibold text-foreground w-1/4">
                        {plan.name}
                        {plan.isPopular && <div className="mt-1 text-xs text-primary font-medium">(En Popüler)</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 bg-background">
                  {allPossibleFeatures.map((featureItem, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground/90 whitespace-nowrap flex items-center gap-2">
                        <featureItem.icon className="h-4 w-4 text-muted-foreground" />
                        {featureItem.name}
                      </td>
                      {plans.map(plan => {
                        let cellContent: React.ReactNode = <XCircle className="mx-auto h-5 w-5 text-red-500/70" />;
                        if (featureItem.prop === 'features') {
                          // check alanı undefined olmayacak şekilde ComparisonFeature tanımı yapıldı
                          if (featureItem.check && Array.isArray(plan.parsedFeatures) && plan.parsedFeatures.includes(featureItem.check)) {
                            cellContent = <CheckCircle className="mx-auto h-5 w-5 text-green-500" />;
                          }
                        } else {
                          const value = plan[featureItem.prop as keyof Plan]; 
                          if (value !== null && value !== undefined) {
                            cellContent = typeof value === 'boolean' ? 
                              (value ? <CheckCircle className="mx-auto h-5 w-5 text-green-500" /> : <XCircle className="mx-auto h-5 w-5 text-red-500/70" />) 
                              : <span className="block text-center font-medium">{value === 0 ? "Limitsiz" : value.toString()}</span>;
                          }
                        }
                        return (
                          <td key={`${plan.id}-${featureItem.name}`} className="px-6 py-4 text-center text-muted-foreground">
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 dark:bg-muted/30">
                    <tr>
                        <th scope="row" className="px-6 py-4 text-left font-semibold text-foreground">Hemen Başlayın</th>
                        {plans.map(plan => (
                            <td key={`${plan.id}-footer`} className="px-6 py-4 text-center">
                                <StartSubscriptionButton 
                                  planId={plan.id} 
                                  planName={plan.name} 
                                />
                            </td>
                        ))}
                    </tr>
                </tfoot>
              </table>
            </div>
            ) : null}
          </div>
        </section>

        {/* SSS Section */}
        <section id="sss" className="w-full py-16 md:py-20 lg:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-5 text-center mb-12 lg:mb-16">
              <div className="inline-block rounded-lg bg-primary/10 dark:bg-primary/20 px-5 py-2.5 text-base font-semibold text-primary dark:text-primary tracking-wider uppercase shadow-sm">
                MERAK ETTİKLERİNİZ
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                Sıkça Sorulan Sorular
              </h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg leading-relaxed">
                Fiyatlandırma, abonelik ve hizmetlerimiz hakkında en çok merak edilen soruların cevaplarını burada bulabilirsiniz.
              </p>
            </div>
            <div className="max-w-3xl mx-auto grid gap-4 md:grid-cols-2 md:gap-6">
              {faqItems.map((faq, index) => (
                <details key={index} className="group bg-card p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-border/20">
                  <summary className="flex justify-between items-center font-semibold text-foreground cursor-pointer list-none">
                    <span className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" /> 
                        {faq.q}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="text-muted-foreground mt-3 pl-7 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Özel İhtiyaçlar / Kurumsal Çözümler CTA */}
        <section id="custom-solutions" className="w-full py-16 md:py-24 lg:py-32 bg-muted/30 dark:bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="bg-card p-8 md:p-12 lg:p-16 rounded-xl shadow-xl border border-border/20 text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-12">
              <div className="lg:max-w-xl">
                <div className="inline-flex items-center rounded-lg bg-accent/10 dark:bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent-foreground dark:text-accent-foreground shadow-sm mb-4">
                  <Zap className="mr-2 h-5 w-5" /> İŞLETMENİZE ÖZEL
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                  Farklı İhtiyaçlarınız İçin Esnek Çözümler
                </h2>
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                  Standart planlarımız işletmenizin mevcut gereksinimlerini karşılamıyorsa veya daha büyük ölçekli, özel bir entegrasyon çözümüne ihtiyacınız varsa, sizinle birlikte çalışarak size özel bir teklif oluşturabiliriz. Kurumsal özellikler, özel SLA'lar ve daha fazlası için bize ulaşın.
                </p>
              </div>
              <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
                <Button size="lg" asChild className={cn(buttonVariants({ variant: "default", size: "lg" }), "px-10 py-6 text-base shadow-lg hover:shadow-primary/40 transition-all duration-300 group")}>
                  <Link href="/iletisim">
                    Kurumsal Teklif Alın <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
} 