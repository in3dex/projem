"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; // Aktif/Pasif için
import { EmailTemplate } from "@prisma/client";
import { updateEmailTemplate } from "@/actions/admin/email-template-actions"; // Server action
import { toast } from "sonner";
import { useState } from "react";
import { DialogFooter } from "@/components/ui/dialog";

// Zod şeması
const templateFormSchema = z.object({
  id: z.string(), // ID'yi de gönderelim
  subject: z.string().min(3, { message: "Konu en az 3 karakter olmalıdır." }),
  description: z.string().optional(),
  htmlBody: z.string().min(10, { message: "İçerik en az 10 karakter olmalıdır." }),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface EditTemplateFormProps {
  template: EmailTemplate;
  onSuccess?: () => void; // Başarılı işlem sonrası callback
}

export function EditTemplateForm({ template, onSuccess }: EditTemplateFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      id: template.id,
      subject: template.subject || "",
      description: template.description || "",
      htmlBody: template.htmlBody || "",
      isActive: template.isActive,
    },
  });

  async function onSubmit(data: TemplateFormValues) {
    setIsLoading(true);
    try {
      const result = await updateEmailTemplate(data);
      if (result.success) {
        toast.success("Şablon başarıyla güncellendi!");
        onSuccess?.(); // Dialogu kapat
      } else {
        toast.error(result.error || "Bir hata oluştu.");
      }
    } catch (error) {
      console.error("Şablon güncelleme hatası:", error);
      toast.error("Sunucu hatası oluştu. Lütfen tekrar deneyin.");
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konu *</FormLabel>
              <FormControl>
                <Input placeholder="E-posta Konusu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama (Admin Panel)</FormLabel>
              <FormControl>
                <Input placeholder="Bu şablonun amacı..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="htmlBody"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta İçeriği (HTML) *</FormLabel>
              <FormControl>
                 <Textarea
                    placeholder="E-posta içeriğini buraya girin... Değişkenler: {{variableName}}"
                    className="min-h-[250px]" // Yüksekliği artıralım
                    {...field}
                  />
              </FormControl>
              <FormDescription>
                HTML kodları kullanabilirsiniz. Değişkenler için çift süslü parantez kullanın (örn: {'{{userName}}'}, {'{{orderNumber}}'}).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Aktif</FormLabel>
                <FormDescription>
                  Bu şablon kullanılsın mı?
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
} 