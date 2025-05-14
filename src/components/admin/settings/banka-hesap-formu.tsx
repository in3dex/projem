"use client";

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { BankaHesabi } from '@prisma/client'; // Prisma tipini import et
import { addBankaHesabi, updateBankaHesabi } from "@/actions/odeme-ayarlari.actions";
import { toast } from 'sonner';

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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

// Action'dan gelen Zod şemasını burada da kullanabiliriz veya ayrı tanımlayabiliriz.
// Şimdilik action'daki şemayı baz alalım.
const formSchema = z.object({
  bankaAdi: z.string().min(1, "Banka adı gereklidir."),
  subeKodu: z.string().optional().nullable(),
  hesapNumarasi: z.string().optional().nullable(),
  iban: z.string().min(20, "Geçerli bir IBAN girin.").max(34, "Geçerli bir IBAN girin.").refine((iban) => /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(iban.toUpperCase()), "Geçersiz IBAN formatı."),
  hesapSahibi: z.string().min(1, "Hesap sahibi adı gereklidir."),
  isActive: z.boolean().default(true),
});

type BankaHesabiFormValues = z.infer<typeof formSchema>;

interface BankaHesapFormuProps {
  hesap?: BankaHesabi | null; // Düzenleme için mevcut hesap bilgisi
  onSuccess?: () => void; // Başarılı işlem sonrası çağrılacak fonksiyon (örn: Dialog kapatma)
}

export function BankaHesapFormu({ hesap, onSuccess }: BankaHesapFormuProps) {
  const isEditMode = !!hesap;
  const action = isEditMode ? updateBankaHesabi : addBankaHesabi;
  const [state, formAction] = useFormState(action, { success: false, message: '', errors: {} });

  const form = useForm<BankaHesabiFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankaAdi: hesap?.bankaAdi || "",
      subeKodu: hesap?.subeKodu || "",
      hesapNumarasi: hesap?.hesapNumarasi || "",
      iban: hesap?.iban || "",
      hesapSahibi: hesap?.hesapSahibi || "",
      isActive: hesap?.isActive ?? true,
    },
  });

  // Form gönderildiğinde RHF state'ini action'a uygun FormData'ya çevir
  const onSubmit = (values: BankaHesabiFormValues) => {
    const submissionData: any = { ...values }; // Doğrudan values kullan
    if (isEditMode && hesap?.id) {
      submissionData.id = hesap.id; // ID'yi nesneye ekle
    }
    
    formAction(submissionData); // Doğrudan nesneyi gönder
  };

  // Server action'dan dönen hataları veya başarı mesajını işle
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        form.reset(); // Formu sıfırla
        onSuccess?.(); // Başarı callback'ini çağır
      } else {
        toast.error(state.message || "Bir hata oluştu.");
        // Alan bazlı hataları forma set et (eğer action'dan dönüyorsa)
        // state'in tipini kontrol ederek errors'a eriş
        if (state && typeof state === 'object' && 'errors' in state && state.errors && typeof state.errors === 'object') {
          const errors = state.errors as Record<string, string[]>; // Tip ataması yap
          Object.entries(errors).forEach(([key, value]) => {
            if (value && Array.isArray(value) && value.length > 0) { // value'nun dizi olduğunu kontrol et
              form.setError(key as keyof BankaHesabiFormValues, { message: value[0] });
            }
          });
        }
      }
    }
  }, [state, onSuccess, form]);

  // useFormStatus hook'unu formun içine koyamayız, ayrı bir bileşen gerekir.
  // Submit butonu için kendi isLoading state'ini kullanabiliriz.
  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ID'yi gizli input olarak eklemeye gerek yok, onSubmit'te ekliyoruz */}
        <FormField
          control={form.control}
          name="bankaAdi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banka Adı</FormLabel>
              <FormControl>
                <Input placeholder="Garanti BBVA" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hesapSahibi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hesap Sahibi</FormLabel>
              <FormControl>
                <Input placeholder="Ad Soyad" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN</FormLabel>
              <FormControl>
                <Input placeholder="TRXXXXXXXXXXXXXXXXXXXXXXXXXX" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subeKodu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şube Kodu (Opsiyonel)</FormLabel>
                <FormControl>
                  <Input placeholder="1234" {...field} value={field.value ?? ''} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hesapNumarasi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hesap No (Opsiyonel)</FormLabel>
                <FormControl>
                  <Input placeholder="12345678" {...field} value={field.value ?? ''} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Hesap Aktif mi?</FormLabel>
                <FormDescription>
                  Pasif hesaplar müşterilere gösterilmez.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Hesabı Güncelle" : "Yeni Hesap Ekle"}
        </Button>
      </form>
    </Form>
  );
} 