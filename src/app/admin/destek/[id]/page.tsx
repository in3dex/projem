'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useRouter ekledik
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TicketDetailView } from '@/components/dashboard/destek/ticket-detail-view';
import type { SupportTicketWithDetails } from '@/types/support-ticket-types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSession } from 'next-auth/react'; // Admin kontrolü için session

export default function AdminDestekDetayPage() {
  const params = useParams();
  const router = useRouter(); // Yönlendirme için
  const { data: session, status: sessionStatus } = useSession(); // Session ve yükleme durumu
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportTicketWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Yetki kontrolü
  useEffect(() => {
    if (sessionStatus === 'loading') return; // Oturum yüklenirken bekle
    if (!session || session.user?.role !== 'ADMIN') {
      toast.error("Bu sayfaya erişim yetkiniz yok.");
      router.push('/dashboard'); // Yetkisizse dashboard'a yönlendir
    }
  }, [session, sessionStatus, router]);

  const fetchTicketDetails = useCallback(async () => {
    // Yetki kontrolü geçmeden veya ticketId yoksa istek atma
    if (sessionStatus !== 'authenticated' || session?.user?.role !== 'ADMIN' || !ticketId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/support-tickets/${ticketId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Destek talebi bulunamadı.'); // Admin her talebi görebilmeli, 404 sadece bulunamadı demek
        }
        throw new Error('Destek talebi detayları yüklenemedi.');
      }
      const data: SupportTicketWithDetails = await response.json();
      setTicket(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(errorMessage);
      setTicket(null); 
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, session, sessionStatus]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handleTicketUpdate = () => {
    fetchTicketDetails(); 
  }

  // Session yüklenirken veya yetki kontrolü yapılırken
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && session?.user?.role !== 'ADMIN')) {
      return (
          <div className="p-4 md:p-6 lg:p-8 flex justify-center items-center h-[calc(100vh-200px)]">
              <LoadingSpinner size="lg" />
          </div>
      );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4">
          <Button asChild variant="outline" size="sm">
              <Link href="/admin/destek"> 
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tüm Taleplere Geri Dön
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
          // TicketDetailView zaten admin kontrollerini içeriyor
          <TicketDetailView ticket={ticket} onTicketUpdate={handleTicketUpdate} />
      )}
      {!isLoading && !error && !ticket && (
          <Card className="mt-4">
            <CardHeader>
                <CardTitle>Talep Bulunamadı</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Aradığınız destek talebi bulunamadı.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
} 