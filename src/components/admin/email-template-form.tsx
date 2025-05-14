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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateEmailTemplate } from "@/actions/admin/email-template-actions";
import { EmailTemplate, EmailTemplateType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// Zod şeması (action dosyasındaki ile aynı olmalı ama client'ta da kullanacağız)
const templateFormSchema = z.object({
  id: z.string(), // ID form içinde gönderilecek
  subject: z.string().min(3, "Konu en az 3 karakter olmalı"),
  description: z.string().optional(),
  htmlBody: z.string().min(10, "İçerik en az 10 karakter olmalı"),
  isActive: z.boolean(),
  // type alanı sadece gösterim için, formda değiştirilmeyecek varsayımı
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface EmailTemplateFormProps {
  template: EmailTemplate;
}

export function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      // Action'ı çağır
      const result = await updateEmailTemplate(data);
      if (result.success) {
        toast.success(`Şablon (${template.type}) güncellendi.`);
      } else {
        toast.error(result.error || "Şablon güncellenirken bir hata oluştu.");
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Şablon: {template.type}</span>
          <Badge variant={template.isActive ? "default" : "outline"}>
            {template.isActive ? "Aktif" : "Pasif"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* ID gizli alan olarak eklenebilir veya gönderilen dataya eklenir */}
             {/* <input type="hidden" {...form.register("id")} /> */}
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konu</FormLabel>
                  <FormControl>
                    <Input placeholder="E-posta konusu..." {...field} />
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
                  <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Şablonun amacı..." {...field} />
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
                  <FormLabel>HTML İçerik</FormLabel>
                  <FormControl>
                    {/* Daha gelişmiş bir editör (örn: TipTap, TinyMCE) entegre edilebilir */}
                    <Textarea placeholder="E-postanın HTML içeriği..." {...field} rows={10} />
                  </FormControl>
                  <FormDescription>
                    Değişkenler için {'`{variableName}`'} formatını kullanın (örn: {'`{userName}`'})
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
                     Bu e-posta şablonu gönderim için aktif mi?
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Kaydet
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 