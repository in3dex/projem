"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Plan } from "@prisma/client";
import { planSchema, PlanFormData } from "@/lib/validations/plan";
import { createPlan, updatePlan } from "@/actions/admin/plan-actions"; // Server actions
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface PlanFormProps {
  plan?: Plan | null; // Düzenleme için mevcut plan verisi
  onSuccess?: () => void; // İşlem başarılı olunca çağrılacak fonksiyon (örn: dialog kapatma)
}

export function PlanForm({ plan, onSuccess }: PlanFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isEditing = !!plan; // Düzenleme modunda mıyız?

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      // Fiyat ve limitleri number veya null olarak al, string'e çevirme
      priceMonthly: plan?.priceMonthly ?? null,
      priceYearly: plan?.priceYearly ?? null,
      // currency kaldırıldı
      // features'ı string'e çevir (her eleman yeni satırda)
      features: Array.isArray(plan?.features) ? plan.features.join('\n') : "", 
      maxProducts: plan?.maxProducts ?? null,
      maxOrders: plan?.maxMonthlyOrders ?? null, // Prisma alan adı ile eşleştirildi
      // maxUsers kaldırıldı
      isActive: plan?.isActive ?? true,
      stripePriceIdMonthly: plan?.stripePriceIdMonthly ?? "",
      stripePriceIdYearly: plan?.stripePriceIdYearly ?? "",
    },
  });

  async function onSubmit(data: PlanFormData) {
    setIsLoading(true);
    try {
      let result;
      if (isEditing && plan) {
        result = await updatePlan(plan.id, data);
      } else {
        result = await createPlan(data);
      }

      if (result.success) {
        toast.success(result.message);
        form.reset(); // Formu sıfırla
        onSuccess?.(); // Başarılı callback'ini çağır
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Plan formu gönderme hatası:", error);
      toast.error("Bir şeyler ters gitti. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Temel Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Temel Plan" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Aktif Plan</FormLabel>
                  <FormDescription className="text-xs">
                    Bu planı müşterilere göster
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama (Opsiyonel)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Bu planın kısa bir açıklaması..."
                  className="resize-none"
                  {...field}
                   value={field.value ?? ""} // Kontrollü bileşen için null değil boş string
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Fiyatlandırma */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <FormField
             control={form.control}
             name="priceMonthly"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Aylık Fiyat</FormLabel>
                 <FormControl>
                   {/* value prop'unu number kabul eden input için ayarla */}
                   <Input type="number" step="0.01" placeholder="49.99" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isLoading} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="priceYearly"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Yıllık Fiyat</FormLabel>
                 <FormControl>
                   {/* value prop'unu number kabul eden input için ayarla */}
                   <Input type="number" step="0.01" placeholder="499.99" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isLoading} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
         </div>

         {/* Limitler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
             control={form.control}
             name="maxProducts"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Maks. Ürün Limiti</FormLabel>
                 <FormControl>
                  {/* value prop'unu number kabul eden input için ayarla */}
                   <Input type="number" placeholder="100" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isLoading} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
            <FormField
             control={form.control}
             name="maxOrders"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Maks. Sipariş (Aylık)</FormLabel>
                 <FormControl>
                  {/* value prop'unu number kabul eden input için ayarla */}
                   <Input type="number" placeholder="1000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isLoading} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
        </div>

         {/* Özellikler */}
         <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Özellikler (Her özellik yeni satırda)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Sipariş Yönetimi&#10;Karlılık Analizi&#10;Barkod Oluşturma"
                  rows={4}
                  {...field}
                   value={field.value ?? ""}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                 Planın içerdiği temel özellikleri listeleyin.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Stripe ID Alanları (Opsiyonel) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
              control={form.control}
              name="stripePriceIdMonthly"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stripe Aylık ID (Ops.)</FormLabel>
                  <FormControl>
                    <Input placeholder="price_..." {...field} value={field.value ?? ""} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stripePriceIdYearly"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stripe Yıllık ID (Ops.)</FormLabel>
                  <FormControl>
                    <Input placeholder="price_..." {...field} value={field.value ?? ""} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isEditing ? "Planı Güncelle" : "Plan Oluştur"}
        </Button>
      </form>
    </Form>
  );
} 