'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TicketPriority } from '@prisma/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { NewTicketFormData } from '@/types/support-ticket-types';

const formSchema = z.object({
  subject: z.string().min(5, { message: 'Konu en az 5 karakter olmalıdır.' }).max(200, { message: 'Konu en fazla 200 karakter olabilir.' }),
  initialMessage: z.string().min(10, { message: 'Mesaj en az 10 karakter olmalıdır.' }).max(5000, { message: 'Mesaj en fazla 5000 karakter olabilir.' }),
  priority: z.nativeEnum(TicketPriority, { errorMap: () => ({ message: 'Lütfen bir öncelik seçin.' }) }).default(TicketPriority.MEDIUM),
});

interface TicketFormProps {
  onSubmit: (data: NewTicketFormData) => Promise<void>; // onSubmit asenkron olabilir
  isSubmitting: boolean;
}

export function TicketForm({ onSubmit, isSubmitting }: TicketFormProps) {

  const form = useForm<NewTicketFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      initialMessage: '',
      priority: TicketPriority.MEDIUM,
    },
  });

  const handleSubmit = async (values: NewTicketFormData) => {
    await onSubmit(values);
    // Formun burada sıfırlanması gerekmiyor, dialog kapanınca sıfırlanabilir.
    // form.reset(); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 px-1">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konu</FormLabel>
              <FormControl>
                <Input placeholder="Talebinizin konusunu girin..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Öncelik</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Öncelik seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={TicketPriority.LOW}>Düşük</SelectItem>
                  <SelectItem value={TicketPriority.MEDIUM}>Orta</SelectItem>
                  <SelectItem value={TicketPriority.HIGH}>Yüksek</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mesajınız</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Talebinizin detaylarını yazın..."
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
             <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />} 
                Talep Oluştur
            </Button>
        </div>

      </form>
    </Form>
  );
} 