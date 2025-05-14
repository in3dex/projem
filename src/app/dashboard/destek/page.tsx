'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TicketList } from '@/components/dashboard/destek/ticket-list';
import { NewTicketDialog } from '@/components/dashboard/destek/new-ticket-dialog';
import type { SupportTicketWithLastMessage } from '@/types/support-ticket-types'; // Bu tipi oluşturacağız
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Varsayılan bir spinner
import { PaginationControls } from '@/components/ui/pagination-controls'; // Varsayılan pagination

export default function DestekPage() {
  const [tickets, setTickets] = useState<SupportTicketWithLastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const limit = 10; // Sayfa başına gösterilecek talep sayısı

  const fetchTickets = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/support-tickets?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Destek talepleri yüklenemedi.');
      }
      const data = await response.json();
      setTickets(data.tickets);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalTickets(data.totalTickets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [limit]); // limit değişmediği sürece callback aynı kalır

  useEffect(() => {
    fetchTickets(currentPage);
  }, [fetchTickets, currentPage]);

  const handleTicketCreated = () => {
    setIsModalOpen(false);
    toast.success('Destek talebiniz başarıyla oluşturuldu.');
    fetchTickets(1); // İlk sayfaya dön ve listeyi yenile
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold">Destek Merkezi</CardTitle>
            <CardDescription>Destek taleplerinizi buradan yönetebilir veya yeni talep oluşturabilirsiniz.</CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Destek Talebi
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {!isLoading && error && (
            <div className="text-center text-red-600 py-8">
              <p>Hata: {error}</p>
              <Button onClick={() => fetchTickets(currentPage)} variant="outline" className="mt-4">
                Tekrar Dene
              </Button>
            </div>
          )}
          {!isLoading && !error && tickets.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Henüz destek talebiniz bulunmuyor.</p>
            </div>
          )}
          {!isLoading && !error && tickets.length > 0 && (
            <>
                <TicketList tickets={tickets} />
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalElements={totalTickets}
                    pageSize={limit}
                />
            </>
          )}
        </CardContent>
      </Card>

      <NewTicketDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
} 