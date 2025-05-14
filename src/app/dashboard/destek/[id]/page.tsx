'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TicketDetailView } from '@/components/dashboard/destek/ticket-detail-view';
import type { SupportTicketWithDetails } from '@/types/support-ticket-types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DestekDetayPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportTicketWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/support-tickets/${ticketId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Destek talebi bulunamadı veya erişim yetkiniz yok.');
        }
        throw new Error('Destek talebi detayları yüklenemedi.');
      }
      const data: SupportTicketWithDetails = await response.json();
      setTicket(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(errorMessage);
      setTicket(null); // Hata durumunda ticket'ı temizle
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  // Yeni mesaj eklendiğinde veya durum değiştiğinde tetiklenir
  const handleTicketUpdate = () => {
    fetchTicketDetails(); // Verileri yeniden çekerek arayüzü güncelle
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4">
          <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/destek">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Taleplere Geri Dön
              </Link>
          </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {!isLoading && error && (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-red-600">Hata</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
                <Button onClick={fetchTicketDetails} variant="outline" className="mt-4">
                    Tekrar Dene
                </Button>
            </CardContent>
        </Card>
      )}
      {!isLoading && !error && ticket && (
          <TicketDetailView ticket={ticket} onTicketUpdate={handleTicketUpdate} />
      )}
      {/* Eğer ticket null ve hata yoksa (ilk yükleme sonrası bulunamadıysa) */}
      {!isLoading && !error && !ticket && (
          <Card className="mt-4">
            <CardHeader>
                <CardTitle>Talep Bulunamadı</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Aradığınız destek talebi bulunamadı veya bu talebi görme yetkiniz yok.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
} 