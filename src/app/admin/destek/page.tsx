'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { TicketList } from '@/components/dashboard/destek/ticket-list';
import type { SupportTicketWithLastMessage } from '@/types/support-ticket-types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { TicketStatus, TicketPriority, User } from '@prisma/client';
import { useDebounce } from '@/hooks/use-debounce'; // Varsayılan debounce hook'u
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

// Durum/Öncelik variantları (ticket-list'ten alındı)
const statusVariant: { [key in TicketStatus]: { variant: "default" | "secondary" | "destructive" | "outline", text: string } } = {
    [TicketStatus.OPEN]: { variant: 'default', text: 'Açık' },
    [TicketStatus.IN_PROGRESS]: { variant: 'secondary', text: 'İşlemde' },
    [TicketStatus.CLOSED]: { variant: 'outline', text: 'Kapalı' },
    [TicketStatus.PENDING_USER]: { variant: 'destructive', text: 'Yanıt Bekliyor' },
  };
  
const priorityVariant: { [key in TicketPriority]: { variant: "default" | "secondary" | "destructive", text: string } } = {
    [TicketPriority.LOW]: { variant: 'secondary', text: 'Düşük' },
    [TicketPriority.MEDIUM]: { variant: 'default', text: 'Orta' },
    [TicketPriority.HIGH]: { variant: 'destructive', text: 'Yüksek' },
  };

export default function AdminDestekPage() {
  const [tickets, setTickets] = useState<SupportTicketWithLastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Pick<User, 'id' | 'name' | 'email'>[]>([]); // Kullanıcı listesi state'i

  // Filtreleme State'leri
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all'); // Yeni: Kullanıcı filtresi
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const limit = 15; // Admin daha fazla görebilir

  const fetchTickets = useCallback(async (page = 1, search = debouncedSearchTerm, status = statusFilter, priority = priorityFilter, userId = userFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (status !== 'all') params.set('status', status);
      if (priority !== 'all') params.set('priority', priority);
      if (userId !== 'all') params.set('userId', userId); // userId parametresi eklendi
      if (search) params.set('search', search);

      const response = await fetch(`/api/support-tickets?${params.toString()}`);
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
  }, [limit, debouncedSearchTerm, statusFilter, priorityFilter, userFilter]); // userFilter bağımlılık olarak eklendi

  // Kullanıcıları çekmek için useEffect
  useEffect(() => {
      const fetchUsers = async () => {
          try {
              const response = await fetch('/api/users?role=USER&minimal=true');
              if (!response.ok) {
                  throw new Error('Kullanıcılar yüklenemedi.');
              }
              const data = await response.json();
              setUsers(data);
          } catch (err) {
              console.error("Kullanıcıları çekerken hata:", err);
              // Hata durumunda filtre çalışmaz ama sayfa çalışmaya devam eder
          }
      };
      fetchUsers();
  }, []); // Sadece component mount edildiğinde çalışır

  useEffect(() => {
    fetchTickets(1); // Filtre veya arama değiştiğinde ilk sayfadan başla
  }, [debouncedSearchTerm, statusFilter, priorityFilter, userFilter, fetchTickets]); // userFilter eklendi

  useEffect(() => {
    // Sayfa değiştiğinde veriyi çek
    fetchTickets(currentPage, debouncedSearchTerm, statusFilter, priorityFilter, userFilter);
  }, [currentPage, fetchTickets]); // currentPage değiştiğinde çalışsın


  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const clearFilters = () => {
      setStatusFilter('all');
      setPriorityFilter('all');
      setUserFilter('all'); // Kullanıcı filtresini de temizle
      setSearchTerm('');
      setCurrentPage(1); // Filtreler temizlenince ilk sayfaya dön
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Destek Talepleri Yönetimi (Admin)</CardTitle>
          <CardDescription>Tüm kullanıcıların destek taleplerini buradan görüntüleyin ve yönetin.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtreleme Alanı */}
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Input
              placeholder="Konu, mesaj veya kullanıcıda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Duruma Göre Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(TicketStatus).map(([key, value]) => (
                     <SelectItem key={key} value={value}>{statusVariant[value as TicketStatus]?.text || value}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Önceliğe Göre Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                 {Object.entries(TicketPriority).map(([key, value]) => (
                     <SelectItem key={key} value={value}>{priorityVariant[value as TicketPriority]?.text || value}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter} disabled={users.length === 0}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Kullanıcıya Göre Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                {users.map((user) => (
                     <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} disabled={statusFilter === 'all' && priorityFilter === 'all' && userFilter === 'all' && !searchTerm}>
                <X className="mr-2 h-4 w-4"/> Filtreleri Temizle
            </Button>
          </div>

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
              <p>Gösterilecek destek talebi bulunamadı.</p>
            </div>
          )}
          {!isLoading && !error && tickets.length > 0 && (
            <>
                <TicketList tickets={tickets} isAdminView={true} />
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
    </div>
  );
} 