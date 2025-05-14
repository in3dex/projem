'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose // Dialog'u programatik olarak kapatmak için
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { TicketForm } from './ticket-form';
import type { NewTicketFormData } from '@/types/support-ticket-types';

interface NewTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export function NewTicketDialog({ isOpen, onClose, onTicketCreated }: NewTicketDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: NewTicketFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Talep oluşturulamadı.');
      }

      // Başarılı olursa dışarıdaki fonksiyona haber ver
      onTicketCreated();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(`Hata: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* onOpenChange ile dışarı tıklayınca kapanmayı sağlar */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Yeni Destek Talebi Oluştur</DialogTitle>
          <DialogDescription>
            Sorununuzu veya talebinizi detaylı bir şekilde açıklayın.
          </DialogDescription>
        </DialogHeader>
        {
          error && (
              <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>
          )
        }
        <TicketForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        {/* Footer'ı kaldırabiliriz, form kendi submit butonunu içeriyor */}
        {/*
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Kapat
            </Button>
          </DialogClose>
        </DialogFooter>
        */}
      </DialogContent>
    </Dialog>
  );
} 