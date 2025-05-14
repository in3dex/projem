"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Script from 'next/script';

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Loader2Icon, CreditCardIcon, CheckCircleIcon, BanknoteIcon, CopyIcon, UserCircle2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Tip tanımlamaları
interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  features: string[];
  maxProducts: number | null;
  maxOrders: number | null;
  maxUsers: number | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
}

interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string;
    hesapNumarasi: string;
    iban: string;
    hesapSahibi: string;
}

interface OdemeYontemi {
    type: 'eft' | 'stripe' | 'paytr';
    label: string;
    accounts?: BankaHesabi[];
}

interface PendingSubscription {
  id: string;
  amount: number;
  currency: string;
  planId: string;
}

// Profil Güncelleme Modalı için State
interface ProfileDetails {
  phone: string;
  address: string;
}

export default function OdemeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession({
    required: true,
    onUnauthenticated() {
      const callbackUrl = encodeURIComponent(`/odeme?${searchParams.toString()}`);
      router.push(`/giris?callbackUrl=${callbackUrl}`);
    },
  });

  // State tanımlamaları
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [odemeYontemleri, setOdemeYontemleri] = useState<OdemeYontemi[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isEftConfirmationDialogOpen, setIsEftConfirmationDialogOpen] = useState(false);
  const [eftPaymentDetails, setEftPaymentDetails] = useState<{ accounts: BankaHesabi[], amount: number, currency: string, userId: string, merchantOid: string } | null>(null);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [showPaytrIframe, setShowPaytrIframe] = useState<boolean>(false);
  const [pendingSubscription, setPendingSubscription] = useState<PendingSubscription | null>(null);
  
  // Profil güncelleme modalı için state'ler
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>({ phone: '', address: '' });
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);

  const planId = searchParams.get("plan");
  
  // Temel veri yükleme
  useEffect(() => {
    if (status !== "authenticated" || !planId) {
      if (status === "authenticated" && !planId) {
        toast.error("Plan ID bulunamadı, fiyatlandırma sayfasına yönlendiriliyorsunuz.");
        router.push("/fiyatlandirma");
      }
      return; 
    }

    const loadInitialPageData = async () => {
      setPageLoading(true);
      let planApiResponse: Response | null = null;
      try {
        const [planResponse, odemeYontemleriResponse] = await Promise.all([
          fetch(`/api/plans/${planId}`),
          fetch('/api/payment/methods')
        ]);
        planApiResponse = planResponse;

        if (!planResponse.ok) {
          toast.error("Plan bilgileri alınamadı. Lütfen geçerli bir plan seçin.");
          router.push("/fiyatlandirma"); 
          throw new Error("Plan bilgileri alınamadı");
        }
        if (!odemeYontemleriResponse.ok) throw new Error("Ödeme yöntemleri alınamadı");
        
        const [planData, odemeYontemleriData] = await Promise.all([
          planResponse.json(),
          odemeYontemleriResponse.json()
        ]);

        setPlan(planData.plan);
        setOdemeYontemleri(odemeYontemleriData.odemeYontemleri || []);

        // Mevcut bir pending abonelik var mı kontrol et
            const pendingSubResponse = await fetch(`/api/subscriptions/check-pending?planId=${planData.plan.id}`);
            if (pendingSubResponse.ok) {
              const pendingSubData = await pendingSubResponse.json();
          if (pendingSubData.hasPending) {
            console.log("Mevcut bekleyen abonelik bulundu:", pendingSubData.subscription);
            setPendingSubscription(pendingSubData.subscription);
          } else {
            // Bekleyen abonelik yoksa yeni abonelik talebi oluştur
            console.log("Bekleyen abonelik bulunamadı, yeni oluşturuluyor...");
            try {
              const createPendingResponse = await fetch("/api/subscriptions/create-pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: planData.plan.id }),
                cache: 'no-store'
              });
              
              const createPendingData = await createPendingResponse.json();
              
              if (!createPendingResponse.ok) {
                console.error("Abonelik talebi oluşturma hatası:", createPendingData.error);
                toast.error(createPendingData.error || "Abonelik talebi oluşturulamadı.");
              } else {
                console.log("Yeni bekleyen abonelik oluşturuldu:", createPendingData.subscription);
                setPendingSubscription(createPendingData.subscription);
                toast.success("Ödeme ve abonelik bilgileri hazırlandı.");
              }
            } catch (error) {
              console.error("Abonelik talebi oluşturulurken hata:", error);
              toast.error("Abonelik talebi oluşturulurken bir sorun oluştu.");
            }
          }
        }
      } catch (error) {
        console.error("Sayfa yükleme hatası:", error);
        if (planApiResponse && !planApiResponse.ok) { /* Zaten toast gösterildi */ } 
        else { toast.error("Sayfa yüklenirken bir hata oluştu."); }
      } finally {
        setPageLoading(false);
      }
    };

    loadInitialPageData();
  }, [status, planId, router]);

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfileDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileDetails.phone.trim() || !profileDetails.address.trim()) {
      toast.error("Lütfen hem telefon hem de adres alanını doldurun.");
      return;
    }
    setProfileUpdateLoading(true);
          try {
      const response = await fetch('/api/user/update-profile-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDetails),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Profil güncellenemedi');
      
      toast.success('Profil bilgileriniz güncellendi.');
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          phone: result.user.phone,
          address: result.user.address,
        }
      });
      setIsProfileModalOpen(false);
      await initiatePaytrPayment();
    } catch (error: any) {
      toast.error(error.message || 'Profil güncellenirken bir hata oluştu.');
          } finally {
      setProfileUpdateLoading(false);
          }
        };

  const initiatePaytrPayment = async () => {
    if (!plan || !session?.user?.id) {
      toast.error("Ödeme başlatılamadı: Plan veya kullanıcı bilgileri eksik.");
      setPaymentProcessing(false);
      return;
    }
    
    setPaymentProcessing(true);
    try {
      const paytrResponse = await fetch("/api/payment/paytr/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: pendingSubscription?.planId || plan.id,
          totalAmount: Math.round((pendingSubscription?.amount || plan.priceMonthly || 0) * 100),
          pendingSubscriptionId: pendingSubscription?.id,
        }),
        cache: 'no-store'
      });
      
      const paytrResult = await paytrResponse.json();
      
      if (!paytrResponse.ok) {
          throw new Error(paytrResult.error || "PayTR token alınamadı."); 
      }

      if (paytrResult.status === 'failed' || !paytrResult.token) {
        throw new Error(paytrResult.details || paytrResult.reason || "PayTR token alınamadı (status failed).");
      }
      
      setPaytrToken(paytrResult.token);
      setShowPaytrIframe(true);
    } catch (error: any) {
      toast.error(error.message || "PayTR ile ödeme başlatılırken bir hata oluştu.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentButtonClick = async () => {
    if (!plan || !session?.user?.id) {
      toast.error("Öncelikle bir plan seçmeli ve giriş yapmalısınız.");
      return;
    }
    if (!selectedPaymentMethod) {
      toast.warning("Lütfen bir ödeme yöntemi seçin.");
      return;
    }

    setShowPaytrIframe(false);
    setPaytrToken(null);

    if (selectedPaymentMethod === 'paytr') {
      setPaymentProcessing(true);
      try {
        const profileStatusResponse = await fetch('/api/user/profile-status');
        const profileStatusData = await profileStatusResponse.json();

        if (!profileStatusResponse.ok) {
          throw new Error(profileStatusData.error || 'Profil durumu kontrol edilemedi.');
          }

        if (!profileStatusData.hasProfileInfo) {
          setProfileDetails({ 
            phone: profileStatusData.phone || '',
            address: profileStatusData.address || ''
          });
          setIsProfileModalOpen(true);
          setPaymentProcessing(false);
        } else {
          await initiatePaytrPayment();
        }
      } catch (error: any) {
        toast.error(error.message || "Ödeme işlemi sırasında bir hata oluştu.");
        setPaymentProcessing(false);
      }
    } else if (selectedPaymentMethod === 'eft') {
      setPaymentProcessing(true);
      try {
        const response = await fetch("/api/subscriptions/create-pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planId: pendingSubscription?.planId || plan.id, 
            existingSubscriptionId: pendingSubscription?.id
          }),
          cache: 'no-store'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Abonelik talebi oluşturulamadı.");
        
        const merchantOidForResult = result.subscription?.id || `EFT-${Date.now()}`;
        const eftMethodDetails = odemeYontemleri.find(y => y.type === 'eft');
        if (eftMethodDetails?.accounts?.length) {
          setEftPaymentDetails({
            accounts: eftMethodDetails.accounts,
            amount: pendingSubscription?.amount || plan.priceMonthly || 0,
            currency: pendingSubscription?.currency || plan.currency || 'TRY',
            userId: session.user.id,
            merchantOid: merchantOidForResult,
          });
          setIsEftConfirmationDialogOpen(true);
        } else { 
          throw new Error("EFT ile ödeme şu anda mümkün değil.");
        }
      } catch (error: any) { 
        toast.error(error.message || "EFT işlemi sırasında bir hata oluştu.");
      } finally {
        setPaymentProcessing(false);
    }
    } else {
      toast.error("Geçersiz ödeme yöntemi seçildi.");
      setPaymentProcessing(false); 
    }
  };

  // Panoya kopyalama işlevi
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("IBAN panoya kopyalandı"), 
      () => toast.error("Kopyalama başarısız oldu")
    );
  };

  // Yükleniyor gösterici
  if (status === "loading" || pageLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
         <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Sayfa Yükleniyor...</p>
      </div>
    );
  }

  // Plan bulunamadı
  if (!plan) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-muted-foreground">Plan bilgisi yüklenemedi. Lütfen fiyatlandırma sayfasından tekrar deneyin.</p>
        <Button onClick={() => router.push("/fiyatlandirma")} className="mt-4">
          Fiyatlandırma Sayfasına Dön
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 py-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan Bilgileri */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Seçilen Plan: {plan.name}</CardTitle>
                <CardDescription>{plan.description || "Abonelik planı detayları"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold text-primary">
                    {formatCurrency(pendingSubscription?.amount || plan.priceMonthly || 0, pendingSubscription?.currency || plan.currency)}
                  </span>
                  <span className="text-muted-foreground">/ Ay</span>
                </div>
                <Separator />
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Ödeme Yöntemleri */}
          <div className="lg:col-span-2">
            {showPaytrIframe && paytrToken ? (
               <div className="w-full space-y-4">
                  <h2 className="text-2xl font-semibold">PayTR Güvenli Ödeme</h2>
                   <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Önemli Bilgilendirme</AlertTitle>
                    <AlertDescription>
                        Güvenli ödeme sayfasına yönlendiriliyorsunuz. İşlem tamamlanana kadar bu sayfadan ayrılmayın.
                    </AlertDescription>
                  </Alert>
                  <div className="w-full overflow-hidden rounded-lg border shadow-sm">
                  <iframe 
                    src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`} 
                    id="paytriframe" 
                    frameBorder="0" 
                    scrolling="no" 
                    style={{ 
                      width: '100%',
                      minHeight: '500px',
                      height: '100%',
                      display: 'block',
                      border: 'none',
                    }}
                  />
                  </div>
                <Button variant="outline" onClick={() => { setShowPaytrIframe(false); setPaytrToken(null); }} className="w-full mt-4">
                  Ödeme Yöntemlerine Geri Dön
                 </Button>
               </div>
           ) : (
            <div className="space-y-6">
                 <h2 className="text-2xl font-semibold">Ödeme Yöntemi Seçin</h2>
                  <RadioGroup 
                    value={selectedPaymentMethod ?? undefined}
                    onValueChange={setSelectedPaymentMethod}
                    className="space-y-4"
                  >
                    <Accordion type="single" collapsible className="w-full">
                    {odemeYontemleri.map((yontem) => (
                       <AccordionItem value={yontem.type} key={yontem.type} className="border rounded-md px-4 hover:bg-accent/50 transition-colors">
                           <div className="flex items-center gap-3 py-4">
                                      <RadioGroupItem value={yontem.type} id={yontem.type} />
                                      {yontem.type === 'eft' && <BanknoteIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />} 
                                      {yontem.type === 'paytr' && <CreditCardIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />} 
                                      {yontem.type === 'stripe' && <CreditCardIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />} 
                                      <Label htmlFor={yontem.type} className="cursor-pointer text-base font-medium">
                                         {yontem.label}
                                     </Label>
                                  </div>
                           <AccordionTrigger className="py-2 w-full text-left font-medium text-sm group">
                             Detaylar
                           </AccordionTrigger>
                           <AccordionContent className="pt-2 pb-4 px-2 text-muted-foreground text-sm">
                          {yontem.type === 'eft' && <p>Havale/EFT ile ödeme yapmak için işlem sonrası size hesap bilgileri gösterilecektir.</p>}
                          {yontem.type === 'paytr' && <p>Kredi Kartı / Banka Kartı ile PayTR güvencesiyle ödeme yapın.</p>}
                          {yontem.type === 'stripe' && <p>Kredi Kartı ile Stripe güvencesiyle ödeme yapın. (Yakında)</p>}
                           </AccordionContent>
                       </AccordionItem>
                    ))}
                    </Accordion>
                 </RadioGroup>
                 
                 <Button 
                   onClick={handlePaymentButtonClick} 
                   className="w-full text-lg py-6" 
                  disabled={paymentProcessing || !selectedPaymentMethod || (selectedPaymentMethod === 'stripe' && !plan?.stripePriceIdMonthly )}
                 >
                  {paymentProcessing ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : 
                   selectedPaymentMethod === 'eft' ? <BanknoteIcon className="mr-2 h-5 w-5" /> : 
                   <CreditCardIcon className="mr-2 h-5 w-5" />} 
                  {paymentProcessing ? "İşleniyor..." : "Ödemeyi Tamamla"}
                 </Button>
            </div>
           )}
          </div>
        </div>
      </main>
      <Footer />
      
      {/* EFT Bilgileri Dialog */}
      <Dialog open={isEftConfirmationDialogOpen} onOpenChange={setIsEftConfirmationDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>Havale/EFT Bilgileri</DialogTitle>
                <DialogDescription>
                    Lütfen aşağıdaki hesap bilgilerine <strong>{formatCurrency(eftPaymentDetails?.amount || 0, eftPaymentDetails?.currency || 'TRY')}</strong> tutarında ödemeyi yapın. 
                    Açıklama kısmına mutlaka referans numaranızı yazınız: <strong>{eftPaymentDetails?.merchantOid}</strong>
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                {eftPaymentDetails?.accounts?.map((acc) => (
                    <Card key={acc.id}>
                        <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between"><span>{acc.bankaAdi}</span></CardTitle>
                            <CardDescription>Hesap Sahibi: {acc.hesapSahibi}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                {acc.subeKodu && <p><strong>Şube Kodu:</strong> {acc.subeKodu}</p>}
                                <p><strong>Hesap Numarası:</strong> {acc.hesapNumarasi}</p>
                                <div className="flex items-center justify-between bg-muted p-2 rounded">
                                    <span className="font-mono">{acc.iban}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(acc.iban)}><CopyIcon className="h-4 w-4 mr-1" /> Kopyala</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                </div>
                <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Kapat</Button></DialogClose>
            <Button type="button" onClick={() => { 
              setIsEftConfirmationDialogOpen(false); 
              toast.success("Ödeme talebiniz alındı. EFT işleminiz kontrol edildikten sonra aboneliğiniz aktif edilecektir."); 
              router.push('/dashboard/faturalarim'); 
            }}>
                        Ödemeyi Yaptım / Bildir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      {/* Profil Bilgileri Güncelleme Modalı */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><UserCircle2Icon className="mr-2 h-5 w-5" />Eksik Profil Bilgileri</DialogTitle>
            <DialogDescription>
              PayTR ile ödeme yapabilmek için lütfen geçerli bir telefon numarası ve adres girin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfileDetails} className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefon Numarası</Label>
              <Input 
                id="phone" 
                name="phone"
                type="tel" 
                value={profileDetails.phone} 
                onChange={handleProfileInputChange} 
                placeholder="5XXXXXXXXX"
                required 
                minLength={10}
                maxLength={15}
              />
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Textarea 
                id="address" 
                name="address"
                value={profileDetails.address} 
                onChange={handleProfileInputChange} 
                placeholder="Tam adresinizi girin (En az 5 karakter)"
                required 
                rows={3}
                minLength={5}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProfileModalOpen(false)} disabled={profileUpdateLoading}>
                İptal
              </Button>
              <Button type="submit" disabled={profileUpdateLoading}>
                {profileUpdateLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />} 
                Kaydet ve Devam Et
              </Button>
            </DialogFooter>
          </form>
            </DialogContent>
        </Dialog>
        
        {paytrToken && showPaytrIframe && (
        <Script 
          src="https://www.paytr.com/js/iframeResizer.min.js" 
          strategy="afterInteractive"
                onLoad={() => { 
            // @ts-ignore - iFrameResize PayTR tarafından sağlanan global bir fonksiyon
            if(typeof window.iFrameResize === 'function') {
                    // @ts-ignore 
              window.iFrameResize({
                log: false,
                heightCalculationMethod: 'bodyOffset',
                autoResize: true,
                minHeight: 500,
              }, '#paytriframe');
              console.log('PayTR iframe resize işlemi tamamlandı');
            } else {
              console.error('iFrameResize fonksiyonu bulunamadı');
            }
                }}
            />
        )}
    </div>
  );
} 