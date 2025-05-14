'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateAutomationSettings } from "@/actions/admin/automation-settings-actions";
import { type AutomationSettings } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Zod şeması (action'daki ile uyumlu hale getirildi)
const settingsSchema = z.object({
  // Zamanlama Ayarları
  invoiceGenerationDaysBeforeEnd: z.coerce.number().int().min(0).max(30, "En fazla 30 gün önce olabilir"),
  invoiceDueDays: z.coerce.number().int().min(1, "Vade en az 1 gün olmalı").max(30, "Vade en fazla 30 gün olabilir"),
  overdueMarkDays: z.coerce.number().int().min(1, "En az 1 gün sonra").max(30, "En fazla 30 gün sonra"),
  cancelSubscriptionAfterOverdueDays: z.coerce.number().int().min(1, "En az 1 gün sonra").max(90, "En fazla 90 gün sonra"),
  // E-posta Ayarları
  sendSubscriptionEndingSoonEmail: z.boolean().default(true),
  daysBeforeEndingToSendEmail: z.coerce.number().int().min(1, "En az 1 gün önce").max(30, "En fazla 30 gün önce"),
  sendPaymentOverdueEmail: z.boolean().default(true),
  sendSubscriptionCancelledEmail: z.boolean().default(true),
  // Senkronizasyon Ayarları
  syncEnabled: z.boolean().default(false),
  syncIntervalHours: z.coerce.number().int().min(1, "En az 1 saat olmalı").max(168, "En fazla 7 gün (168 saat) olabilir"),
  syncOrders: z.boolean().default(true),
  syncProducts: z.boolean().default(true),
  syncClaims: z.boolean().default(true),
  syncCustomerQuestions: z.boolean().default(true),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface AutomationSettingsFormProps {
  currentSettings: AutomationSettings | null; // Ayarlar null olabilir (ilk çalıştırmada)
}

export function AutomationSettingsForm({ currentSettings }: AutomationSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("fatura");
  const [isSyncing, setIsSyncing] = useState(false);

  // Varsayılan değerler şemadaki defaultlarla ve mevcut ayarlarla birleştirildi
  const defaultValues: Partial<SettingsFormValues> = {
    invoiceGenerationDaysBeforeEnd: currentSettings?.invoiceGenerationDaysBeforeEnd ?? 7,
    invoiceDueDays: currentSettings?.invoiceDueDays ?? 7,
    overdueMarkDays: currentSettings?.overdueMarkDays ?? 3,
    cancelSubscriptionAfterOverdueDays: currentSettings?.cancelSubscriptionAfterOverdueDays ?? 30,
    sendSubscriptionEndingSoonEmail: currentSettings?.sendSubscriptionEndingSoonEmail ?? true,
    daysBeforeEndingToSendEmail: currentSettings?.daysBeforeEndingToSendEmail ?? 7,
    sendPaymentOverdueEmail: currentSettings?.sendPaymentOverdueEmail ?? true,
    sendSubscriptionCancelledEmail: currentSettings?.sendSubscriptionCancelledEmail ?? true,
    syncEnabled: currentSettings?.syncEnabled ?? false,
    syncIntervalHours: currentSettings?.syncIntervalHours ?? 24,
    syncOrders: currentSettings?.syncOrders ?? true,
    syncProducts: currentSettings?.syncProducts ?? true,
    syncClaims: currentSettings?.syncClaims ?? true,
    syncCustomerQuestions: currentSettings?.syncCustomerQuestions ?? true,
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateAutomationSettings(data);
      if (result.success) {
        toast.success("Otomasyon ayarları kaydedildi.");
      } else {
        toast.error(result.error || "Ayarlar kaydedilirken bir hata oluştu.");
      }
    } catch (error) {
      toast.error("Bir sunucu hatası oluştu.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function triggerManualSync() {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Senkronizasyon başlatıldı! ${result.message || ''}`);
      } else {
        toast.error(`Senkronizasyon başlatılamadı: ${result.error || 'Bilinmeyen bir hata oluştu'}`);
      }
    } catch (error) {
      toast.error('Senkronizasyon isteği gönderilirken bir hata oluştu.');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="fatura" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="fatura">Fatura ve Abonelik</TabsTrigger>
            <TabsTrigger value="eposta">E-posta Bildirimleri</TabsTrigger>
            <TabsTrigger value="senkronizasyon">Veri Senkronizasyonu</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fatura" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Otomasyon Zamanlamaları</CardTitle>
            <CardDescription>
              Fatura oluşturma ve abonelik iptali gibi otomatik işlemlerin zamanlamasını ayarlayın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceGenerationDaysBeforeEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura Oluşturma (Bitişten Önce)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Yeni faturanın, abonelik bitiş tarihinden kaç gün önce otomatik oluşturulacağı.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceDueDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura Vade Süresi</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Oluşturulan faturanın son ödeme tarihinin kaç gün sonrası olacağı.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="overdueMarkDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gecikmiş Fatura İşareti</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Faturanın son ödeme tarihinden kaç gün sonra "Gecikmiş" olarak işaretleneceği.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="cancelSubscriptionAfterOverdueDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abonelik İptali (Gecikmeden Sonra)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Fatura "Gecikmiş" olarak işaretlendikten kaç gün sonra ilişkili aboneliğin otomatik iptal edileceği.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="eposta" className="space-y-4 mt-4">
        <Card>
           <CardHeader>
            <CardTitle>Otomatik E-posta Bildirimleri</CardTitle>
            <CardDescription>
              Belirli durumlarda kullanıcılara otomatik olarak gönderilecek e-postaları yapılandırın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="sendSubscriptionEndingSoonEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
Abonelik Bitiş Uyarısı Gönder
                    </FormLabel>
                    <FormDescription>
                      Abonelik süresi bitmeden önce kullanıcıya hatırlatma e-postası gönderilsin mi?
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="daysBeforeEndingToSendEmail"
              render={({ field }) => (
                <FormItem className={!form.watch("sendSubscriptionEndingSoonEmail") ? "opacity-50 pointer-events-none" : ""}>
                  <FormLabel>Bitiş Uyarısı Gönderme Günü</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={!form.watch("sendSubscriptionEndingSoonEmail")} />
                  </FormControl>
                  <FormDescription>
                    Abonelik bitiş tarihinden kaç gün önce uyarı e-postası gönderilecek?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Separator />
             <FormField
              control={form.control}
              name="sendPaymentOverdueEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
Ödeme Gecikme Uyarısı Gönder
                    </FormLabel>
                    <FormDescription>
                      Fatura "Gecikmiş" olarak işaretlendiğinde kullanıcıya e-posta gönderilsin mi?
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="sendSubscriptionCancelledEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
Abonelik İptal Bildirimi Gönder
                    </FormLabel>
                    <FormDescription>
                      Abonelik, ödeme yapılmadığı için otomatik iptal edildiğinde kullanıcıya e-posta gönderilsin mi?
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="senkronizasyon" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>API Veri Senkronizasyonu</CardTitle>
                <CardDescription>
                  Aktif abonelerin API bilgileri ile otomatik senkronizasyon ayarlarını yapılandırın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <div>
                    <h4 className="font-medium">Son Senkronizasyon</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentSettings?.lastSyncTime 
                        ? format(new Date(currentSettings.lastSyncTime), 'dd MMMM yyyy HH:mm', { locale: tr })
                        : "Henüz senkronizasyon yapılmadı"
                      }
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={triggerManualSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Şimdi Senkronize Et
                  </Button>
                </div>
                
                <FormField
                  control={form.control}
                  name="syncEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Otomatik Senkronizasyon
                        </FormLabel>
                        <FormDescription>
                          Aktif abonelerin API bilgileri varsa belirli aralıklarla otomatik senkronizasyon yapılsın mı?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="syncIntervalHours"
                  render={({ field }) => (
                    <FormItem className={!form.watch("syncEnabled") ? "opacity-50 pointer-events-none" : ""}>
                      <FormLabel>Senkronizasyon Sıklığı (Saat)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!form.watch("syncEnabled")} />
                      </FormControl>
                      <FormDescription>
                        Otomatik senkronizasyon hangi sıklıkta yapılsın? (Saat olarak, örn: 24 = günde bir)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-2" />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Senkronize Edilecek Veriler</h4>
                  
                  <FormField
                    control={form.control}
                    name="syncOrders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("syncEnabled")}
                          />
                        </FormControl>
                        <div className="space-y-0 leading-none">
                          <FormLabel className="text-sm">
                            Siparişleri Senkronize Et
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="syncProducts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("syncEnabled")}
                          />
                        </FormControl>
                        <div className="space-y-0 leading-none">
                          <FormLabel className="text-sm">
                            Ürünleri Senkronize Et
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="syncClaims"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("syncEnabled")}
                          />
                        </FormControl>
                        <div className="space-y-0 leading-none">
                          <FormLabel className="text-sm">
                            İade Taleplerini Senkronize Et
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="syncCustomerQuestions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("syncEnabled")}
                          />
                        </FormControl>
                        <div className="space-y-0 leading-none">
                          <FormLabel className="text-sm">
                            Müşteri Sorularını Senkronize Et
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          Ayarları Kaydet
        </Button>
      </form>
    </Form>
  );
} 