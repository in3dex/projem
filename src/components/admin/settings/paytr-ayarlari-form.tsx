"use client";

import { useState, useTransition, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updatePaytrAyarlari } from '@/actions/odeme-ayarlari.actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InfoIcon, CopyIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { getBaseUrl } from '@/lib/utils';

const PaytrAyarlariFormSchema = z.object({
  paytrAktif: z.boolean(),
  paytrMerchantId: z.string().optional().nullable(),
  paytrMerchantKey: z.string().optional().nullable(),
  paytrMerchantSalt: z.string().optional().nullable(),
  paytrTestMode: z.enum(["0", "1"]),
}).refine(data => {
    if (data.paytrAktif && (!data.paytrMerchantId || !data.paytrMerchantKey || !data.paytrMerchantSalt)) {
        return false;
    }
    return true;
}, {
    message: "PayTR aktif ise Mağaza No, Anahtar ve Gizli Anahtar alanları zorunludur.",
});

type PaytrAyarlariFormValues = z.infer<typeof PaytrAyarlariFormSchema>;

interface PaytrAyarlariFormProps {
  mevcutAyarlar: {
      paytrAktif: boolean;
      paytrMerchantId: string | null;
      paytrMerchantKey: string | null;
      paytrMerchantSalt: string | null;
      paytrTestMode?: string | null;
  };
}

export function PaytrAyarlariForm({ mevcutAyarlar }: PaytrAyarlariFormProps) {
  const [isPending, startTransition] = useTransition();
  const [lastSubmittedValues, setLastSubmittedValues] = useState<PaytrAyarlariFormValues | null>(null);
  const [copied, setCopied] = useState(false);
  
  const callbackUrl = `${getBaseUrl()}/api/payment/paytr/callback`;

  // Test modu logu
  useEffect(() => {
    console.log('PayTR Ayarlar Formu - Mevcut Test Modu:', mevcutAyarlar.paytrTestMode);
  }, [mevcutAyarlar.paytrTestMode]);

  const form = useForm<PaytrAyarlariFormValues>({
    resolver: zodResolver(PaytrAyarlariFormSchema),
    defaultValues: {
      paytrAktif: mevcutAyarlar.paytrAktif,
      paytrMerchantId: mevcutAyarlar.paytrMerchantId || '',
      paytrMerchantKey: mevcutAyarlar.paytrMerchantKey || '',
      paytrMerchantSalt: mevcutAyarlar.paytrMerchantSalt || '',
      paytrTestMode: mevcutAyarlar.paytrTestMode || "0",
    },
  });

  // Form değerlerini izleme
  const currentValues = form.watch();
  const testMode = form.watch('paytrTestMode');
  
  useEffect(() => {
    console.log('PayTR Form Değerleri Değişti:', { 
      testMode, 
      formValues: currentValues 
    });
  }, [testMode, currentValues]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(callbackUrl)
      .then(() => {
        setCopied(true);
        toast.success("URL panoya kopyalandı");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("URL kopyalanırken hata oluştu");
      });
  };

  const onSubmit = (data: PaytrAyarlariFormValues) => {
    console.log('Form gönderiliyor, değerler:', data);
    setLastSubmittedValues(data);

    const dataToSend = {
        ...data,
        paytrMerchantId: data.paytrMerchantId || null,
        paytrMerchantKey: data.paytrMerchantKey || null,
        paytrMerchantSalt: data.paytrMerchantSalt || null,
    };

    startTransition(async () => {
      try {
        const result = await updatePaytrAyarlari(dataToSend);
        if (result.success) {
          toast.success("PayTR ayarları başarıyla güncellendi.");
          form.reset(data);
        } else {
          toast.error(`Hata: ${result.message || 'Ayarlar güncellenemedi.'}`);
          if(result.errors) {
             form.setError("root", { type: "manual", message: result.message });
          }
        }
      } catch (error) {
        toast.error("Bir sunucu hatası oluştu.");
        console.error("PayTR ayarları güncellenirken hata:", error);
      }
    });
  };

  return (
    <Form {...form}>
      {form.formState.errors.root && (
          <Alert variant="destructive" className="mb-4">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
      )}
      
      <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
        <AlertCircleIcon className="h-5 w-5" />
        <AlertTitle className="font-semibold">PayTR Callback URL'sini Tanımlayın</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-2">
            PayTR panelinde aşağıdaki URL'yi <strong>Bildirim URL</strong> olarak tanımlamalısınız:
          </p>
          <div className="flex items-center justify-between p-2 bg-white border rounded">
            <code className="text-sm font-mono">{callbackUrl}</code>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              className="flex items-center gap-1"
            >
              {copied ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Kopyalandı</span>
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  <span>Kopyala</span>
                </>
              )}
            </Button>
          </div>
          <p className="mt-2">
            <strong>Önemli:</strong> Bu URL tanımlanmadan PayTR ödemeleri işlenemeyecektir. URL'yi
            tanımlamak için PayTR Kontrol Panelinizde <strong>Ayarlar &gt; API ve Güvenlik</strong> bölümünü kullanın.
          </p>
        </AlertDescription>
      </Alert>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="paytrAktif"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">PayTR Entegrasyonu</FormLabel>
                  <FormDescription>
                    PayTR iFrame API ile kredi kartı ödemelerini etkinleştirin veya devre dışı bırakın.
                    API Anahtarlarınızı (.env) dosyasına girdiğinizden emin olun.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending}
                    aria-readonly
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paytrMerchantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PayTR Mağaza No (Merchant ID)</FormLabel>
                <FormControl>
                  <Input placeholder="PayTR tarafından verilen Mağaza No" {...field} value={field.value ?? ''} disabled={isPending} />
                </FormControl>
                <FormDescription>
                  PayTR panelinizdeki Mağaza No.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paytrMerchantKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PayTR Mağaza Anahtarı (Merchant Key)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="PayTR tarafından verilen Mağaza Anahtarı" {...field} value={field.value ?? ''} disabled={isPending} />
                </FormControl>
                <FormDescription>
                   PayTR panelinizdeki Mağaza Anahtarı.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paytrMerchantSalt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PayTR Mağaza Gizli Anahtar (Merchant Salt)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="PayTR tarafından verilen Mağaza Gizli Anahtarı" {...field} value={field.value ?? ''} disabled={isPending} />
                </FormControl>
                 <FormDescription>
                   PayTR panelinizdeki Mağaza Gizli Anahtarı.
                </FormDescription>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="paytrTestMode"
            render={({ field }) => (
              <FormItem className="space-y-3 border rounded-lg p-4">
                <FormLabel className="flex items-center gap-2 text-lg">
                  Test Modu 
                  <span className="text-muted-foreground text-sm">
                    <InfoIcon className="inline-block h-4 w-4 ml-1" /> 
                    Test modunda gerçek ödeme alınmaz, sadece test kartları kullanılabilir
                  </span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="0" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Canlı Mod - Gerçek ödemeler alınır
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="1" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Test Modu - Sadece test kartları çalışır
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  <strong>Seçilen mod: {field.value === "1" ? "Test Modu (1)" : "Canlı Mod (0)"}</strong><br />
                  Canlı moda geçmeden önce testi tamamladığınızdan emin olun. Test kartları için PayTR dokümantasyonuna bakın.
                </FormDescription>
                {field.value === "1" && (
                  <Alert className="mt-2 border-blue-200 bg-blue-50 text-blue-800">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      Test modunda iken, ödeme sonrası otomatik yönlendirme çalışmayabilir. 
                      Ödeme başarılı sayfasında manuel yönlendirme butonu görünecektir.
                    </AlertDescription>
                  </Alert>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending || !form.formState.isDirty} className="w-full">
            {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
          
          {lastSubmittedValues && (
            <Alert className="mt-4">
              <AlertDescription>
                Son gönderilen ayarlar: Test Modu = {lastSubmittedValues.paytrTestMode === "1" ? "Test Modu (1)" : "Canlı Mod (0)"}
              </AlertDescription>
            </Alert>
          )}
      </form>
    </Form>
  );
} 