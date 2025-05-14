import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SubscriptionStatus, Plan as PrismaPlan, BillingInterval } from '@prisma/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BanknoteIcon, CheckCircleIcon, ClockIcon, InfoIcon, XCircleIcon, ArrowRightIcon, Check } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import { StartSubscriptionButton } from "@/components/fiyatlandirma/start-subscription-button";
import { Button } from "@/components/ui/button";

// Durum Badge'i için variant belirleme fonksiyonu (columns.tsx'ten kopyalandı/uyarlandı)
const getStatusVariantAndClass = (status: SubscriptionStatus | null | undefined): { variant: "default" | "secondary" | "destructive" | "outline", className?: string, icon: React.ElementType } => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return { variant: 'default', icon: CheckCircleIcon };
    case SubscriptionStatus.PENDING_PAYMENT:
      return { variant: 'outline', className: 'border-yellow-500 text-yellow-600 dark:border-yellow-700 dark:text-yellow-500', icon: ClockIcon }; 
    case SubscriptionStatus.CANCELED:
      return { variant: 'destructive', icon: XCircleIcon };
    case SubscriptionStatus.INACTIVE:
    case SubscriptionStatus.PAST_DUE:
      return { variant: 'secondary', icon: InfoIcon }; 
    // case SubscriptionStatus.TRIALING: // Şimdilik trial yok
    //   return { variant: 'outline', icon: CheckCircleIcon };
    default:
      return { variant: 'secondary', icon: InfoIcon }; // Veya abonelik yok durumu
  }
};

// Durumları Türkçeleştirme (columns.tsx'ten kopyalandı/uyarlandı)
const translateStatus = (status: SubscriptionStatus | null | undefined): string => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return 'Aktif'
    case SubscriptionStatus.PENDING_PAYMENT: return 'Ödeme Bekliyor'
    case SubscriptionStatus.CANCELED: return 'İptal Edildi'
    case SubscriptionStatus.INACTIVE: return 'Pasif'
    case SubscriptionStatus.PAST_DUE: return 'Ödeme Gecikti'
    // case SubscriptionStatus.TRIALING: return 'Deneme'
    default: return 'Bilinmiyor'
  }
};

type PlanFeature = string | any;

// Plan tipini genişletelim (Prisma'dan gelen tipe ek olarak)
interface PlanWithPricing extends PrismaPlan {
  effectivePrice: number;
  billingInterval: BillingInterval;
}

export default async function AbonelikBilgileriPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/giris?callbackUrl=/dashboard/ayarlar/abonelik");
    }

    const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
            plan: true,
        }
    });

    // Mevcut abonelikten bağımsız olarak TÜM aktif planları çek ve sırala
    // orderBy hatası düzeltildi: Dizi içinde objeler kullanılacak
    const allActivePlans = await prisma.plan.findMany({
            where: { isActive: true },
        orderBy: [
            { priceMonthly: 'asc' }, // Önce aylık fiyata göre sırala
            { priceYearly: 'asc' }   // Sonra yıllık fiyata göre
        ],
        });

    // Ödeme bekleyen durumlar için banka bilgilerini de alalım
    let bankaHesaplari: any[] = [];
    if (subscription?.status === SubscriptionStatus.PENDING_PAYMENT) {
         const odemeAyarlari = await prisma.odemeAyarlari.findFirst();
         if (odemeAyarlari?.eftAktif) {
             bankaHesaplari = await prisma.bankaHesabi.findMany({
                 where: { isActive: true },
                 select: { bankaAdi: true, iban: true, hesapSahibi: true }
             });
         }
    }

    // Yükseltilebilecek planları belirle
    let upgradeablePlans: PrismaPlan[] = [];
    if (subscription && subscription.plan) {
        const currentPlan = subscription.plan;
        const currentPrice = subscription.billingInterval === BillingInterval.MONTH
            ? currentPlan.priceMonthly
            : currentPlan.priceYearly;

        upgradeablePlans = allActivePlans.filter(plan => {
            // Kendisi olamaz
            if (plan.id === currentPlan.id) return false;

            // TODO: Daha detaylı yükseltme mantığı eklenebilir (örn. sadece daha pahalılar)
            // Şimdilik mevcut plan dışındaki tüm aktif planları yükseltme seçeneği olarak sunalım.
            return true;
        });
    }

    const { variant, className, icon: StatusIcon } = getStatusVariantAndClass(subscription?.status);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Abonelik Bilgileri</h2>

      {!subscription ? (
        // Mevcut abonelik yoksa planları listele
        <div className="space-y-4">
            <p className="text-muted-foreground">Şu anda aktif bir aboneliğiniz bulunmamaktadır. Aşağıdaki planlardan birini seçerek başlayabilirsiniz.</p>
             {allActivePlans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allActivePlans.map((plan, index) => (
                  <Card key={plan.id} className={`flex flex-col ${index === 1 ? 'border-primary shadow-lg' : ''}`}>
                    <CardHeader className={index === 1 ? 'bg-primary/5 rounded-t-lg' : ''}>
                      {index === 1 && (
                        <div className="bg-primary text-primary-foreground w-fit px-3 py-1 text-xs rounded-full mx-auto mb-3 font-semibold">
                            En Popüler
                        </div>
                      )}
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
            </CardHeader>
                    <CardContent className="grid gap-4 flex-1 pt-6">
                      <div className="flex items-baseline gap-1">
                        {plan.priceMonthly !== null ? (
                          <>
                            <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly, plan.currency)}</span>
                            <span className="text-muted-foreground">/ay</span>
                          </>
                        ) : plan.priceYearly !== null ? (
                          <>
                            <span className="text-3xl font-bold">{formatCurrency(plan.priceYearly, plan.currency)}</span>
                            <span className="text-muted-foreground">/yıl</span>
                          </>
                        ) : (
                          <span className="text-2xl font-semibold text-muted-foreground">Özel Fiyat</span>
                        )}
                      </div>
                      {plan.priceMonthly !== null && plan.priceYearly !== null && (
                        <p className="text-xs text-muted-foreground">
                          Veya yıllık {formatCurrency(plan.priceYearly, plan.currency)} ödeyerek tasarruf edin.
                        </p>
                      )}
                      
                      <ul className="grid gap-2 text-sm mt-4">
                        {plan.features && Array.isArray(plan.features) && (plan.features as any[]).length > 0 ? (
                          (plan.features as any[]).map((feature: PlanFeature, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{typeof feature === 'string' ? feature : 'Özellik'}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-muted-foreground italic">Özellik belirtilmemiş.</li>
                        )}
                        {/* Limitler */} 
                        {plan.maxProducts !== null && <li className="flex items-start gap-2 pt-2 border-t mt-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxProducts} Ürün Limiti</span></li>}
                        {plan.maxOrders !== null && <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxOrders} Aylık Sipariş Limiti</span></li>}
                        {plan.maxUsers !== null && <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxUsers} Kullanıcı Limiti</span></li>}
                      </ul>
            </CardContent>
                    <CardFooter>
                      <StartSubscriptionButton planId={plan.id} planName={plan.name} />
                    </CardFooter>
        </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Şu anda seçilebilecek aktif plan bulunmamaktadır.</p>
              </div>
            )}
        </div>
      ) : (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Aktif Planınız</CardTitle>
                        <CardDescription>Mevcut abonelik detaylarınız aşağıdadır.</CardDescription>
                    </div>
                    <Badge variant={variant} className={className}>
                        <StatusIcon className="mr-1 h-4 w-4" />
                        {translateStatus(subscription.status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border rounded-md">
                    <div className="font-medium">Plan Adı:</div>
                    <div>{subscription.plan.name}</div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border rounded-md">
                    <div className="font-medium">Durum:</div>
                    <div>{translateStatus(subscription.status)}</div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border rounded-md">
                    <div className="font-medium">Fatura Periyodu:</div>
                    <div className="capitalize">{subscription.billingInterval === 'MONTH' ? 'Aylık' : 'Yıllık'}</div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border rounded-md">
                    <div className="font-medium">Bir Sonraki Fatura Tarihi:</div>
                    <div>{format(new Date(subscription.currentPeriodEnd), 'PP', { locale: tr })}</div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border rounded-md">
                    <div className="font-medium">Ödeme Yöntemi:</div>
                    <div className="uppercase">{subscription.paymentMethod || '-'}</div>
                </div>

                {/* Ödeme Bekleniyor durumu için ek bilgiler */}            
                {subscription.status === SubscriptionStatus.PENDING_PAYMENT && (
                     <Alert variant="warning" className={className}>
                       <ClockIcon className="h-4 w-4" />
                       <AlertTitle>Ödeme Bekleniyor</AlertTitle>
                       <AlertDescription>
                         Abonelik talebiniz alınmıştır. Lütfen aşağıda belirtilen tutarı banka hesaplarımızdan birine gönderin. Ödemeniz onaylandıktan sonra aboneliğiniz aktifleşecektir.
                         <div className="mt-3 font-medium">Ödenecek Tutar: {formatCurrency(subscription.plan.priceMonthly || 0)}</div>
                          {bankaHesaplari.length > 0 && (
                            <div className="mt-2 text-xs">
                                <p className="font-medium mb-1">Banka Hesapları:</p>
                                <ul className="list-disc pl-5">
                                    {bankaHesaplari.map(acc => (
                                        <li key={acc.iban}>{acc.bankaAdi} - {acc.hesapSahibi} - IBAN: {acc.iban}</li>
                                    ))}
                                </ul>
                                <p className="mt-1">Açıklama: Kullanıcı ID ({session?.user?.id.substring(0,8)}...) veya Email</p>
                            </div>
                          )}
                       </AlertDescription>
                     </Alert>
                )}

            </CardContent>
             {/* İptal Etme vb. aksiyonlar buraya eklenebilir */}
             {/* <CardFooter>
                 {subscription.status === SubscriptionStatus.ACTIVE && (
                    <Button variant="destructive" size="sm">Aboneliği İptal Et</Button>
                 )}
             </CardFooter> */}
        </Card>
      )}

      {/* YENİ BÖLÜM: Plan Yükseltme Seçenekleri */}
      {upgradeablePlans.length > 0 && (
          <div className="space-y-4 pt-6">
              <h3 className="text-xl font-semibold">Planınızı Yükseltin</h3>
              <p className="text-muted-foreground">Mevcut aboneliğinizi aşağıdaki planlardan birine yükseltebilirsiniz.</p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {upgradeablePlans.map((plan) => (
                      <Card key={plan.id} className="flex flex-col">
                          <CardHeader>
                              <CardTitle>{plan.name}</CardTitle>
                              {plan.description && (
                                  <CardDescription>{plan.description}</CardDescription>
                              )}
                          </CardHeader>
                          <CardContent className="grid gap-4 flex-1 pt-6">
                               <div className="flex items-baseline gap-1">
                                  {plan.priceMonthly !== null ? (
                                      <>
                                          <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly, plan.currency)}</span>
                                          <span className="text-muted-foreground">/ay</span>
                                      </>
                                  ) : plan.priceYearly !== null ? (
                                      <>
                                          <span className="text-3xl font-bold">{formatCurrency(plan.priceYearly, plan.currency)}</span>
                                          <span className="text-muted-foreground">/yıl</span>
                                      </>
                                  ) : (
                                      <span className="text-2xl font-semibold text-muted-foreground">Özel Fiyat</span>
                                  )}
                              </div>
                              {plan.priceMonthly !== null && plan.priceYearly !== null && (
                                  <p className="text-xs text-muted-foreground">
                                      Aylık {formatCurrency(plan.priceMonthly, plan.currency)} veya Yıllık {formatCurrency(plan.priceYearly, plan.currency)}
                                  </p>
                              )}
                              <ul className="grid gap-2 text-sm mt-4">
                                  {plan.features && Array.isArray(plan.features) && (plan.features as any[]).length > 0 ? (
                                      (plan.features as any[]).map((feature: PlanFeature, i: number) => (
                                          <li key={i} className="flex items-start gap-2">
                                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span>{typeof feature === 'string' ? feature : 'Özellik'}</span>
                                          </li>
                                      ))
                                      ) : (
                                      <li className="text-muted-foreground italic">Özellik belirtilmemiş.</li>
                                      )}
                                      {/* Limitler */}
                                      {plan.maxProducts !== null && <li className="flex items-start gap-2 pt-2 border-t mt-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxProducts} Ürün Limiti</span></li>}
                                      {plan.maxOrders !== null && <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxOrders} Aylık Sipariş Limiti</span></li>}
                                      {plan.maxUsers !== null && <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{plan.maxUsers} Kullanıcı Limiti</span></li>}
                              </ul>
                          </CardContent>
                          <CardFooter>
                              {/* Yükseltme Butonu */}
                              <Button asChild className="w-full">
                                  <Link href={`/odeme?plan=${plan.id}&type=upgrade`}>
                                      Bu Plana Yükselt <ArrowRightIcon className="ml-2 h-4 w-4" />
                                  </Link>
                              </Button>
                          </CardFooter>
                      </Card>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
} 