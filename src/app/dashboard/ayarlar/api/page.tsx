'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Skeleton } from "@/components/ui/skeleton"; 
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { SubscriptionAlert } from "@/components/shared/subscription-alert";

// Trendyol API şeması
const apiFormSchema = z.object({
  sellerID: z.string().min(1, { message: "Satıcı ID gereklidir" }),
  apiKey: z.string().min(1, { message: "API Key gereklidir" }),
  apiSecret: z.string().min(1, { message: "API Secret gereklidir" }).optional(), // Kayıtlı secret varsa optional
});

type ApiFormValues = z.infer<typeof apiFormSchema>;

interface ApiSettings {
  id?: string;
  sellerID: string;
  apiKey: string;
  // apiSecret frontend'e gelmez
  hasApiSecret?: boolean;
  trendyolWebhookId?: string;
}

const API_SECRET_PLACEHOLDER = "********";

// Bu sayfa için yükleme iskeleti
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
       <Skeleton className="h-10 w-1/3" />
        <Card>
         <CardHeader>
           <Skeleton className="h-6 w-1/4" />
           <Skeleton className="h-4 w-1/2 mt-1" />
         </CardHeader>
          <CardContent className="space-y-6">
               <Skeleton className="h-9 w-full" />
               <Skeleton className="h-9 w-full" />
               <Skeleton className="h-9 w-full" />
          </CardContent>
           <CardFooter className="flex justify-between">
              <Skeleton className="h-9 w-[150px]" />
              <Skeleton className="h-9 w-[180px]" />
          </CardFooter>
      </Card>
      <Card>
        <CardHeader>
             <Skeleton className="h-6 w-1/3" />
             <Skeleton className="h-4 w-3/4 mt-1" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
     </div>
  );
}

export default function ApiAyarlariPage() {
  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingApi, setSavingApi] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [isConnectionActive, setIsConnectionActive] = useState(false);
  
  // --- YENİ: Abonelik State'leri ---
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  // --- Bitiş: Abonelik State'leri ---

  const apiForm = useForm<ApiFormValues>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      sellerID: "",
      apiKey: "",
      apiSecret: ""
    },
    mode: "onChange"
  });

  // --- YENİ: Abonelik Kontrolü useEffect --- 
  useEffect(() => {
    const checkSubscription = async () => {
      setIsLoadingSubscription(true);
      try {
        const res = await fetch('/api/user/subscription-status');
        if (!res.ok) {
          throw new Error('Abonelik durumu alınamadı');
        }
        const data = await res.json();
        setIsSubscriptionActive(data.isActive);
      } catch (error) {
        console.error("Abonelik kontrol hatası:", error);
        toast.error(error instanceof Error ? error.message : 'Abonelik durumu kontrol edilemedi.');
        setIsSubscriptionActive(false); // Hata durumunda erişimi engelle
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    checkSubscription();
  }, []);
  // --- Bitiş: Abonelik Kontrolü useEffect ---

  // Mevcut useEffect (API ayarlarını çekme) - Abonelik kontrolü tamamlandıktan sonra çalışmalı
  useEffect(() => {
    if (isLoadingSubscription || isSubscriptionActive === false) return; // Abonelik yükleniyorsa veya aktif değilse ayarları çekme
    
    setLoading(true);
    const fetchApiSettings = async () => {
      try {
        const apiRes = await fetch('/api/settings/trendyol');

        if (apiRes.ok) {
          const data: (ApiSettings & { trendyolWebhookId?: string }) | null = await apiRes.json();
          if (data) { 
            setApiSettings(data);
            setIsConnectionActive(!!data.trendyolWebhookId);
            apiForm.reset({
              sellerID: data.sellerID || "",
              apiKey: data.apiKey || "",
              apiSecret: data.hasApiSecret ? API_SECRET_PLACEHOLDER : ""
            });
            if (data.hasApiSecret) {
              apiFormSchema.extend({ apiSecret: z.string().optional() });
            } else {
              apiFormSchema.extend({ apiSecret: z.string().min(1, { message: "API Secret gereklidir" }) });
            }
          } else {
            setApiSettings(null);
            setIsConnectionActive(false);
            apiForm.reset({
              sellerID: "",
              apiKey: "",
              apiSecret: ""
            });
            apiFormSchema.extend({ apiSecret: z.string().min(1, { message: "API Secret gereklidir" }) });
          }
        } else {
          const errorData = await apiRes.json().catch(() => ({}));
          console.error('API ayarları alınamadı:', apiRes.status, errorData);
          toast.error(errorData.error || `API ayarları alınamadı (${apiRes.status})`);
          setIsConnectionActive(false);
        }

      } catch (error) {
        console.error('API ayarları yükleme hatası:', error);
        toast.error(error instanceof Error ? error.message : 'API ayarları yüklenirken bir hata oluştu');
        setApiSettings(null);
        setIsConnectionActive(false);
        apiForm.reset({
          sellerID: "",
          apiKey: "",
          apiSecret: ""
        });
        apiFormSchema.extend({ apiSecret: z.string().min(1, { message: "API Secret gereklidir" }) });
      } finally {
          setLoading(false);
      }
    };
    fetchApiSettings();
  // isLoadingSubscription ve isSubscriptionActive bağımlılıklarına ekle
  }, [isLoadingSubscription, isSubscriptionActive]); 

  const onApiSubmit = async (data: ApiFormValues) => {
    setSavingApi(true);
    try {
      const payload: Partial<ApiFormValues> = { 
          sellerID: data.sellerID,
          apiKey: data.apiKey
      }; 
      if (data.apiSecret && data.apiSecret !== API_SECRET_PLACEHOLDER) {
        payload.apiSecret = data.apiSecret;
      } else {
          delete payload.apiSecret;
      }
      
      console.log("API Ayarları Kaydediliyor (Payload):");
      console.dir(payload);

      const response = await fetch('/api/settings/trendyol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json(); 
      if (!response.ok) {
        throw new Error(result.error || `API ayarları kaydedilemedi (${response.status})`);
      }

      const newSettings = result.settings as (ApiSettings & { trendyolWebhookId?: string }) | null;

      if (newSettings) {
         setApiSettings(newSettings);
         setIsConnectionActive(!!newSettings.trendyolWebhookId);
         apiForm.reset({
             sellerID: newSettings.sellerID || "",
             apiKey: newSettings.apiKey || "",
             apiSecret: newSettings.hasApiSecret ? API_SECRET_PLACEHOLDER : ""
         });
          apiFormSchema.extend({ apiSecret: z.string().optional() });
          toast.success(result.message || 'Trendyol bağlantısı başarıyla kuruldu! Gerçek zamanlı güncellemeler etkinleştirildi.');
      } else {
          // Hata durumunda formu sıfırlama? Ya da eski değerlere dön?
          // Şimdilik mevcut girilen değerler kalsın.
      }

    } catch (error) {
      console.error('API Ayarları kaydetme hatası:', error);
      toast.error(error instanceof Error ? error.message : 'API ayarları kaydedilirken bir hata oluştu');
    } finally {
      setSavingApi(false);
    }
  };

   const testApiConnection = async () => {
    try {
      setTestingApi(true);
      toast.info('Trendyol API bağlantısı test ediliyor...');
      
      const response = await fetch('/api/settings/trendyol/test');
      const data = await response.json();
      
      if (data.success) {
        toast.success('API bağlantı testi başarılı');
      } else {
        toast.error(`API bağlantı hatası: ${data.error}`);
      }
    } catch (error) {
      console.error('API test hatası:', error);
      toast.error('API test edilirken bir hata oluştu');
    } finally {
      setTestingApi(false);
    }
  };

  // --- YENİ: Abonelik Yükleme Durumu --- 
  if (isLoadingSubscription) {
    return <LoadingSkeleton />;
  }
  // --- Bitiş: Abonelik Yükleme Durumu ---

  // --- YENİ: Abonelik Aktif Değil Durumu --- 
  if (isSubscriptionActive === false) {
    return <SubscriptionAlert />;
  }
  // --- Bitiş: Abonelik Aktif Değil Durumu ---

  // Mevcut API ayarları yükleme durumu (Skeleton gösterimi)
  if (loading) { 
     // Bu iskelet gösterimi artık sadece API ayarları yüklenirken gösterilecek
     return (
       <div className="space-y-8">
          <Skeleton className="h-10 w-1/3" />
           <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
             <CardContent className="space-y-6">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
             </CardContent>
              <CardFooter className="flex justify-between">
                 <Skeleton className="h-9 w-[150px]" />
                 <Skeleton className="h-9 w-[180px]" />
             </CardFooter>
         </Card>
         <Card>
           <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-3/4 mt-1" />
             </CardHeader>
             <CardContent>
                 <Skeleton className="h-6 w-full" />
             </CardContent>
           </Card>
        </div>
     );
  }

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Trendyol API Ayarları</h1>

        {!loading && (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md font-medium">Bağlantı Durumu</CardTitle>
                    {isConnectionActive 
                        ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                        : <XCircle className="h-5 w-5 text-red-500" />
                    }
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {isConnectionActive 
                            ? "Trendyol mağazanızla bağlantı aktif. Sipariş güncellemeleri gerçek zamanlı olarak alınacaktır."
                            : "Trendyol mağazanızla bağlantı henüz kurulmadı veya etkin değil. Lütfen API bilgilerinizi kaydedin."
                        }
                    </p>
                </CardContent>
            </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>API Entegrasyonu</CardTitle>
            <CardDescription>Trendyol mağazanızla entegrasyon için API bilgilerinizi girin.</CardDescription>
          </CardHeader>
          <Form {...apiForm}>
            <form onSubmit={apiForm.handleSubmit(onApiSubmit)} className="space-y-6">
              <CardContent className="space-y-4">
                <FormField
                    control={apiForm.control}
                    name="sellerID"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Satıcı ID (Seller ID)</FormLabel>
                        <FormControl>
                          <Input placeholder="Trendyol tarafından sağlanan Satıcı ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={apiForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Trendyol tarafından sağlanan API Key" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={apiForm.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <div className="flex items-center relative">
                            <Input 
                              type={showApiSecret ? "text" : "password"}
                              placeholder={apiSettings?.hasApiSecret ? API_SECRET_PLACEHOLDER : "Yeni API Secret girin"}
                              {...field} 
                              onFocus={(e) => {
                                 if (field.value === API_SECRET_PLACEHOLDER) {
                                     field.onChange("");
                                 }
                              }}
                              onBlur={(e) => {
                                  if (e.target.value === "" && apiSettings?.hasApiSecret) {
                                      field.onChange(API_SECRET_PLACEHOLDER);
                                  }
                              }}
                              className="pr-10" // Göz ikonu için yer aç
                            />
                            <Button 
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 h-7 w-7 px-0" 
                              onClick={() => setShowApiSecret(!showApiSecret)}
                              tabIndex={-1} // Forma dahil olmasın
                            >
                              {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">{showApiSecret ? 'Gizle' : 'Göster'}</span>
                            </Button>
                           </div>
                        </FormControl>
                         <FormDescription>
                           Mevcut bir API Secret varsa, değiştirmek istemiyorsanız bu alanı boş bırakabilirsiniz.
                         </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
              <CardFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={testApiConnection} 
                    disabled={savingApi || testingApi || !apiSettings?.apiKey}
                  >
                    {testingApi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Bağlantıyı Test Et
                  </Button>
                  <Button type="submit" disabled={savingApi || testingApi}>
                    {savingApi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

    </div>
  );
} 