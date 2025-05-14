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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner";
import { updateSubscriptionAdmin } from "@/actions/admin/subscription-actions";
import { SubscriptionStatus } from "@prisma/client";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { SubscriptionWithDetails } from "@/components/admin/subscriptions/columns"; // Tip tanımını import et
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Zod şeması (action dosyasındaki şema ile uyumlu)
const updateSubscriptionSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  currentPeriodEnd: z.date().optional().nullable(),
});

type UpdateSubscriptionFormValues = z.infer<typeof updateSubscriptionSchema>;

interface SubscriptionEditFormProps {
  subscription: SubscriptionWithDetails; // Düzenlenecek abonelik verisi
  onSuccess?: () => void; // İşlem başarılı olunca çağrılacak fonksiyon (örn: dialog'u kapatmak için)
}

export function SubscriptionEditForm({ subscription, onSuccess }: SubscriptionEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateSubscriptionFormValues>({
    resolver: zodResolver(updateSubscriptionSchema),
    defaultValues: {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
    },
  });

  async function onSubmit(data: UpdateSubscriptionFormValues) {
    setIsSubmitting(true);
    try {
      // Bitiş tarihi seçilmediyse null gönder, seçildiyse Date objesi gönder
      const updateData = {
        ...data,
        currentPeriodEnd: data.currentPeriodEnd instanceof Date ? data.currentPeriodEnd : null
      };

      const result = await updateSubscriptionAdmin(subscription.id, updateData);
      if (result.success) {
        toast.success("Abonelik başarıyla güncellendi.");
        onSuccess?.(); // Başarılıysa onSuccess fonksiyonunu çağır
      } else {
        toast.error(result.message || "Abonelik güncellenirken bir hata oluştu.");
      }
    } catch (error) {
      toast.error("Bir sunucu hatası oluştu.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Durum Alanı */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durum</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Abonelik durumu seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(SubscriptionStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {/* Durumları Türkçeleştirebiliriz */}
                      {status === SubscriptionStatus.ACTIVE ? 'Aktif' :
                       status === SubscriptionStatus.PENDING_PAYMENT ? 'Ödeme Bekliyor' :
                       status === SubscriptionStatus.CANCELED ? 'İptal Edildi' :
                       status === SubscriptionStatus.INACTIVE ? 'Pasif' :
                       status === SubscriptionStatus.PAST_DUE ? 'Ödeme Gecikti' :
                       status === SubscriptionStatus.TRIALING ? 'Deneme' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bitiş Tarihi Alanı */}
        <FormField
          control={form.control}
          name="currentPeriodEnd"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Bitiş Tarihi</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: tr })
                      ) : (
                        <span>Tarih seçin</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ?? undefined} // Calendar null kabul etmiyor, undefined verelim
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date("1900-01-01") // Geçmiş tarihleri engellemek gerekebilir
                    }
                    initialFocus
                  />
                   {/* Tarihi Temizle Butonu */}
                   <div className="p-2 border-t">
                       <Button
                           variant="ghost"
                           size="sm"
                           className="w-full justify-start"
                           onClick={() => field.onChange(null)} // Değeri null yap
                       >
                           Tarihi Temizle
                       </Button>
                   </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Aboneliğin biteceği tarih. Boş bırakılırsa belirsizdir.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          Güncelle
        </Button>
      </form>
    </Form>
  );
} 