'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import type { NewMessageFormData } from '@/types/support-ticket-types';
import { Send } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  content: z.string().min(1, { message: 'Mesaj boş olamaz.' }).max(5000, { message: 'Mesaj en fazla 5000 karakter olabilir.' }),
});

interface AddMessageFormProps {
  ticketId: string;
  onMessageSent: () => void; // Mesaj gönderildikten sonra üst bileşeni bilgilendirir
  disabled?: boolean; // Talep kapalıysa formu disable etmek için
}

export function AddMessageForm({ ticketId, onMessageSent, disabled = false }: AddMessageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // Dosya inputuna erişim için
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const form = useForm<NewMessageFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  // Form submit edildiğinde FormData oluştur ve gönder
  const processSubmit = async (values: NewMessageFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', values.content);
      if (selectedFiles) {
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append('attachments', selectedFiles[i]);
        }
      }

      const response = await fetch(`/api/support-tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Mesaj gönderilemedi.');
      }

      form.reset(); // Formu temizle
      setSelectedFiles(null); // Seçili dosyaları temizle
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Dosya inputunu temizle
      }
      onMessageSent(); // Üst bileşeni bilgilendir
      toast.success("Mesajınız gönderildi.");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      toast.error(`Hata: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="mt-4 space-y-2">
        <div className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Textarea
                    placeholder={disabled ? "Bu talep kapatılmıştır." : "Yanıtınızı yazın..."}
                    rows={3}
                    {...field}
                    disabled={isSubmitting || disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting || disabled} size="icon" className="h-auto aspect-square mt-px">
            {isSubmitting ? <LoadingSpinner size="sm" /> : <Send size={20} />}
            <span className="sr-only">Gönder</span>
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-grow">
            <Label htmlFor="attachments" className="sr-only">Dosya Ekle</Label>
            <Input
              id="attachments"
              type="file"
              multiple
              ref={fileInputRef}
              className="text-xs h-9"
              onChange={(e) => setSelectedFiles(e.target.files)}
              disabled={isSubmitting || disabled}
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFiles.length} dosya seçildi.
              </p>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
} 