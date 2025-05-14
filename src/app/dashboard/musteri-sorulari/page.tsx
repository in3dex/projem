'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CustomerQuestion } from '@prisma/client'; // Prisma tipini import et
import { RefreshCw, Search, MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe tarih formatı için
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// API yanıtı için tip (Pagination dahil)
interface QuestionsApiResponse {
  data: CustomerQuestion[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    pageSize: number
  }
}

// Soru Durumları (Türkçe karşılıkları ile)
const questionStatuses = {
  WAITING_FOR_ANSWER: 'Cevap Bekliyor',
  WAITING_FOR_APPROVE: 'Onay Bekliyor',
  ANSWERED: 'Cevaplandı',
  REPORTED: 'Raporlandı',
  REJECTED: 'Reddedildi',
  // İhtiyaç olursa diğer statüler eklenebilir
}

type QuestionStatusKey = keyof typeof questionStatuses

// Tümü seçeneği için bir tip birleşimi
type FilterStatus = QuestionStatusKey | 'all';

export default function MusteriSorulariPage() {
  const [questions, setQuestions] = useState<CustomerQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('WAITING_FOR_ANSWER'); // Tipi FilterStatus olarak güncelledik
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<CustomerQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Veri çekme fonksiyonu
  const fetchQuestions = useCallback(async (pageToFetch = currentPage, sync = false) => {
    setIsLoading(!sync); // Sadece normal yüklemede tam ekran loading göster
    if (sync) setIsSyncing(true);
    setError(null);

    const params = new URLSearchParams({
      page: pageToFetch.toString(),
      size: pageSize.toString(),
      ...(statusFilter !== 'all' && { status: statusFilter }), // 'all' değilse status parametresini ekle
      ...(searchTerm && { search: searchTerm }),
      ...(sync && { sync: 'true' }),
    });

    try {
      const response = await fetch(`/api/customer-questions?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Hatası: ${response.statusText}`);
      }
      const data: QuestionsApiResponse = await response.json();
      setQuestions(data.data);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
      setPageSize(data.pagination.pageSize);
      if (sync) {
        toast.success('Trendyol ile senkronizasyon tamamlandı.');
      }
    } catch (err: any) {
      console.error('Sorular çekilirken hata:', err);
      setError(err.message || 'Sorular yüklenirken bir hata oluştu.');
      toast.error(err.message || 'Sorular yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [currentPage, pageSize, statusFilter, searchTerm]);

  // İlk yükleme ve filtre/sayfa değişimi
  useEffect(() => {
    fetchQuestions(1); // Filtre değiştiğinde 1. sayfaya dön
  }, [statusFilter, searchTerm]); // fetchQuestions useCallback içinde olduğundan buraya eklemeye gerek yok

  // Sayfa değişimi için ayrı useEffect
  useEffect(() => {
    fetchQuestions(currentPage); // Sadece sayfa değiştiğinde çağır
  }, [currentPage]); // fetchQuestions useCallback içinde olduğundan buraya eklemeye gerek yok

  // Filtreleme işlemleri
  const handleStatusChange = (value: string) => {
    // Gelen value değerini doğrudan kullanabiliriz (Tabs onValueChange string döner)
    setStatusFilter(value as FilterStatus);
    setCurrentPage(1); // Filtre değişince 1. sayfaya git
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Arama yapılırken anlık istek atmak yerine bir debounce eklenebilir
    // Şimdilik her harfte filtreleme yapacak (useEffect tetiklenecek)
    setCurrentPage(1);
  };

  const handleSync = () => {
    // Düzeltme: Tüm durumlardaki soruları senkronize etmek için status parametresini göndermiyoruz
    // sync=true ile API'nin tüm soru durumlarını senkronize etmesini sağlıyoruz
    const params = new URLSearchParams({
      page: "1",
      size: pageSize.toString(),
      sync: 'true',
      ...(searchTerm && { search: searchTerm }),
      // status parametresi kaldırıldı - API tüm durumları senkronize edecek
    });
    
    setIsSyncing(true);
    setError(null);
    
    fetch(`/api/customer-questions?${params}`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || `API Hatası: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then((data: QuestionsApiResponse) => {
        // Yalnızca mevcut filtreli veriyi güncelliyoruz
        // Böylece kullanıcı hangi tab'daysa o tab güncellenecek
        fetchQuestions(1);
        toast.success('Trendyol ile tam senkronizasyon tamamlandı.');
      })
      .catch(err => {
        console.error('Senkronizasyon hatası:', err);
        setError(err.message || 'Senkronizasyon sırasında bir hata oluştu.');
        toast.error(err.message || 'Senkronizasyon sırasında bir hata oluştu.');
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  // Sayfalama
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Cevaplama Dialog İşlemleri
  const openAnswerDialog = (question: CustomerQuestion) => {
    setSelectedQuestion(question);
    setAnswerText(''); // Dialog açıldığında textarea'yı temizle
    setIsAnswering(false);
    setIsAnswerDialogOpen(true);
    setIsDetailsDialogOpen(false);
  };

  // Detay Dialog İşlemleri (Yeni)
  const openDetailsDialog = (question: CustomerQuestion) => {
    setSelectedQuestion(question);
    setIsDetailsDialogOpen(true);
    setIsAnswerDialogOpen(false); // Diğerini kapat
  };

  const handleAnswerSubmit = async () => {
    if (!selectedQuestion || !answerText.trim() || isAnswering) return;

    setIsAnswering(true);
    try {
      const response = await fetch(`/api/customer-questions/${selectedQuestion.id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answerText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Cevap gönderilirken hata oluştu: ${response.statusText}`);
      }

      toast.success('Soru başarıyla cevaplandı!');
      setIsAnswerDialogOpen(false);
      // Listeyi yenile veya sadece ilgili soruyu güncelle
      // Şimdilik basitçe listeyi yenileyelim (mevcut sayfayı tekrar çek)
      fetchQuestions(currentPage);

    } catch (err: any) {
      console.error('Cevap gönderilirken hata:', err);
      toast.error(err.message || 'Cevap gönderilirken bir hata oluştu.');
    } finally {
      setIsAnswering(false);
    }
  };

  // Yardımcı Fonksiyonlar
  const getStatusBadgeVariant = (status: QuestionStatusKey): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'WAITING_FOR_ANSWER': return "destructive";
      case 'WAITING_FOR_APPROVE': return "secondary";
      case 'ANSWERED': return "default";
      case 'REJECTED': return "outline";
      case 'REPORTED': return "outline";
      default: return "secondary";
    }
  };

  const formatRelativeDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
  };

  // --- JSX Başlangıcı ---
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Müşteri Soruları</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtreler ve Senkronizasyon (Mobil uyumlu) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Filtreler (Tabs) */}
          <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:w-auto">
              <TabsTrigger value="all" className="w-full md:w-auto">Tümü</TabsTrigger>
              {Object.entries(questionStatuses).map(([key, value]) => (
                <TabsTrigger key={key} value={key} className="w-full md:w-auto">
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Arama ve Senkronizasyon */} 
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sorularda veya ürünlerde ara..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8 w-full"
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleSync} disabled={isSyncing || isLoading} variant="outline" size="icon" title="Trendyol ile Senkronize Et">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Senkronize Et</span>
            </Button>
          </div>
        </div>

        {/* Hata Mesajı */} 
        {error && (
          <Alert variant="destructive" className="mb-6">
             <MessageSquare className="h-4 w-4" /> {/* İkon değişebilir */}
             <AlertTitle>Hata</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => fetchQuestions(1)}>Tekrar Dene</Button>
          </Alert>
        )}

        {/* Yükleniyor Durumu (İlk Yükleme) */} 
        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
             {/* Mobil Skeleton */} 
             <div className="w-full space-y-4 md:hidden">
                {[...Array(5)].map((_, index) => (
                    <Card key={`skeleton-card-${index}`} className="animate-pulse">
                       <CardContent className="p-4 space-y-3">
                           <div className="flex justify-between items-start">
                               <Skeleton className="h-5 w-3/4" />
                               <Skeleton className="h-5 w-1/4" />
                           </div>
                           <Skeleton className="h-4 w-1/2" />
                           <Skeleton className="h-4 w-full" />
                           <div className="flex justify-end">
                                <Skeleton className="h-8 w-20" />
                           </div>
                       </CardContent>
                    </Card>
                ))}
             </div>
             {/* Masaüstü Skeleton */} 
             <div className="w-full hidden md:block border rounded-md">
                <Table>
                   <TableHeader>
                      <TableRow>
                        <TableHead><Skeleton className="h-5 w-20"/></TableHead>
                        <TableHead><Skeleton className="h-5 w-full"/></TableHead>
                        <TableHead><Skeleton className="h-5 w-24"/></TableHead>
                        <TableHead><Skeleton className="h-5 w-20"/></TableHead>
                        <TableHead><Skeleton className="h-5 w-24"/></TableHead>
                        <TableHead><Skeleton className="h-5 w-16"/></TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                    {[...Array(pageSize)].map((_, index) => (
                        <TableRow key={`skeleton-row-${index}`}>
                          <TableCell><Skeleton className="h-10 w-10 rounded"/></TableCell>
                          <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                          <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                          <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                          <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                          <TableCell><Skeleton className="h-8 w-16"/></TableCell>
                        </TableRow>
                    ))}
                   </TableBody>
                </Table>
             </div>
             <p className="text-muted-foreground">Sorular yükleniyor...</p>
          </div>
        )}

        {/* Soru Listesi Alanı */} 
        {!isLoading && !error && (
          <>
             {/* Mobil Görünüm: Kartlar */} 
             <div className="md:hidden space-y-4">
               {questions.length === 0 ? (
                 <div className="text-center text-muted-foreground py-8">
                   Filtrelere uygun soru bulunamadı.
                 </div>
               ) : (
                 questions.map((q) => (
                   <Card key={q.id}>
                     <CardContent className="p-4 space-y-2">
                       <div className="flex items-start gap-3 mb-2">
                         {q.productImageUrl ? (
                           <Image
                             src={q.productImageUrl}
                             alt={q.productName}
                             width={48} // Mobil için biraz daha büyük
                             height={48}
                             className="rounded object-cover flex-shrink-0"
                             unoptimized
                           />
                         ) : (
                           <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                             <MessageSquare className="w-5 h-5 text-muted-foreground" />
                           </div>
                         )}
                         <div className="flex-grow">
                            <p className="text-sm font-medium line-clamp-2">{q.productName}</p>
                            <p className="text-xs text-muted-foreground">
                               {q.showUserName ? q.customerName : 'Gizli Kullanıcı'}
                            </p>
                         </div>
                       </div>
                       <p className="text-sm font-medium">Soru:</p>
                       <p className="text-sm bg-muted/50 p-2 rounded border">{q.questionText}</p>
                       {q.answer && (
                           <>
                              <p className="text-sm font-medium pt-1">Cevap:</p>
                              <p className="text-sm bg-primary/10 p-2 rounded border border-primary/20">{q.answer}</p>
                           </>
                       )}
                       <div className="flex justify-between items-center pt-2">
                           <Badge variant={getStatusBadgeVariant(q.status as QuestionStatusKey)}>
                               {questionStatuses[q.status as QuestionStatusKey] || q.status}
                           </Badge>
                           <span className="text-xs text-muted-foreground">{formatRelativeDate(q.askedDate)}</span>
                       </div>
                       <div className="flex justify-end pt-2">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => q.status === 'WAITING_FOR_ANSWER' ? openAnswerDialog(q) : openDetailsDialog(q)}
                           >
                              {q.status === 'WAITING_FOR_ANSWER' ? 'Cevapla' : 'Detay'}
                           </Button>
                       </div>
                     </CardContent>
                   </Card>
                 ))
               )}
             </div>

             {/* Masaüstü Görünüm: Tablo */} 
             <div className="hidden md:block border rounded-md">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[150px]">Ürün</TableHead>
                     <TableHead>Soru</TableHead>
                     <TableHead className="w-[150px]">Müşteri</TableHead>
                     <TableHead className="w-[130px]">Durum</TableHead>
                     <TableHead className="w-[150px]">Sorulma Tarihi</TableHead>
                     <TableHead className="w-[100px] text-center">İşlemler</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {questions.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center h-24">
                         Filtrelere uygun soru bulunamadı.
                       </TableCell>
                     </TableRow>
                   ) : (
                     questions.map((q) => (
                       <TableRow key={q.id}>
                         <TableCell>
                           <div className="flex items-center gap-3">
                             {q.productImageUrl ? (
                               <Image
                                 src={q.productImageUrl}
                                 alt={q.productName}
                                 width={40}
                                 height={40}
                                 className="rounded object-cover"
                                 unoptimized
                               />
                             ) : (
                               <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                 <MessageSquare className="w-5 h-5 text-muted-foreground" />
                               </div>
                             )}
                             <span className="font-medium truncate w-24" title={q.productName}>{q.productName}</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           {/* Uzun sorular için Tooltip eklenebilir */} 
                           <p className="truncate max-w-xs lg:max-w-md" title={q.questionText}>{q.questionText}</p>
                           {q.answer && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs lg:max-w-md" title={q.answer}>Cevap: {q.answer}</p>}
                         </TableCell>
                         <TableCell>
                           {q.showUserName ? q.customerName : 'Gizli Kullanıcı'}
                         </TableCell>
                         <TableCell>
                           <Badge variant={getStatusBadgeVariant(q.status as QuestionStatusKey)}>
                             {questionStatuses[q.status as QuestionStatusKey] || q.status}
                           </Badge>
                         </TableCell>
                         <TableCell>{formatRelativeDate(q.askedDate)}</TableCell>
                         <TableCell className="text-center">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => q.status === 'WAITING_FOR_ANSWER' ? openAnswerDialog(q) : openDetailsDialog(q)}
                           >
                             {q.status === 'WAITING_FOR_ANSWER' ? 'Cevapla' : 'Detay'}
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
             </div>
          </>
        )}

        {/* Sayfalama (Mobil uyumlu) */} 
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-4 mt-6">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
               Toplam {totalCount} sorudan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} arası gösteriliyor.
            </span>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)} // İlk sayfaya git
                disabled={currentPage === 1}
              >
                İlk
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                Önceki
              </Button>
               <span className="text-sm px-2 py-1 border rounded-md whitespace-nowrap">
                   {currentPage} / {totalPages}
               </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Sonraki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)} // Son sayfaya git
                disabled={currentPage === totalPages}
              >
                Son
              </Button>
            </div>
          </div>
        )}

        {/* Cevaplama Dialog */} 
        <Dialog open={isAnswerDialogOpen} onOpenChange={setIsAnswerDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedQuestion && (
              <>
                <DialogHeader>
                  <DialogTitle>Soruyu Cevapla</DialogTitle>
                  <DialogDescription>
                    Müşterinin sorusuna cevap verin.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Ürün Bilgisi */} 
                  <div className="flex items-center gap-3 border p-3 rounded-md bg-muted/50">
                    {selectedQuestion.productImageUrl ? (
                      <Image
                        src={selectedQuestion.productImageUrl}
                        alt={selectedQuestion.productName}
                        width={50}
                        height={50}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedQuestion.productName}</p>
                      {/* Gerekirse Trendyol linki eklenebilir: selectedQuestion.webUrl */} 
                    </div>
                  </div>

                  {/* Soru Metni */} 
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Müşteri Sorusu:</p>
                    <p className="border p-3 rounded-md bg-muted/50 text-sm">{selectedQuestion.questionText}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedQuestion.showUserName ? selectedQuestion.customerName : 'Gizli Kullanıcı'}
                      {' - '}{formatRelativeDate(selectedQuestion.askedDate)}
                    </p>
                  </div>

                  {/* Cevap Alanı */} 
                  <div className="space-y-1">
                    <label htmlFor="answer" className="text-sm font-medium">Cevabınız:</label>
                    <Textarea
                      id="answer"
                      placeholder="Cevabınızı buraya yazın (min 10, max 2000 karakter)"
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{answerText.length} / 2000</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAnswerDialogOpen(false)}>İptal</Button>
                  <Button onClick={handleAnswerSubmit} disabled={isAnswering || answerText.length < 10 || answerText.length > 2000}>
                    {isAnswering ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {isAnswering ? 'Gönderiliyor...' : 'Cevabı Gönder'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Detay Dialog (Yeni) */} 
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
             {selectedQuestion && (
               <>
                  <DialogHeader>
                      <DialogTitle>Soru Detayları</DialogTitle>
                      <DialogDescription>
                          Müşteri sorusunun ve cevabının detayları.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                      {/* Ürün Bilgisi */} 
                      <div className="flex items-center gap-3 border p-3 rounded-md bg-muted/50">
                         {selectedQuestion.productImageUrl ? (
                              <Image
                                  src={selectedQuestion.productImageUrl}
                                  alt={selectedQuestion.productName}
                                  width={50}
                                  height={50}
                                  className="rounded object-cover"
                                  unoptimized
                              />
                         ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                              </div>
                         )}
                         <div>
                              <p className="font-medium">{selectedQuestion.productName}</p>
                              {/* Gerekirse Trendyol linki eklenebilir */} 
                         </div>
                      </div>

                       {/* Soru Metni */} 
                      <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Müşteri Sorusu:</p>
                          <p className="border p-3 rounded-md bg-muted/50 text-sm">{selectedQuestion.questionText}</p>
                          <p className="text-xs text-muted-foreground">
                              {selectedQuestion.showUserName ? selectedQuestion.customerName : 'Gizli Kullanıcı'}
                              {' - '}{formatRelativeDate(selectedQuestion.askedDate)}
                          </p>
                      </div>

                       {/* Cevap Metni */} 
                       {selectedQuestion.answer && (
                         <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Verilen Cevap:</p>
                            <p className="border p-3 rounded-md bg-primary/10 text-sm">{selectedQuestion.answer}</p>
                             <p className="text-xs text-muted-foreground">
                                Cevaplanma Tarihi: {formatRelativeDate(selectedQuestion.answeredDate)}
                             </p>
                         </div>
                       )}

                       {/* Durum */} 
                       <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Durum:</p>
                           <Badge variant={getStatusBadgeVariant(selectedQuestion.status as QuestionStatusKey)}>
                               {questionStatuses[selectedQuestion.status as QuestionStatusKey] || selectedQuestion.status}
                           </Badge>
                       </div>

                       {/* Diğer Detaylar (Örn: Trendyol Soru ID) */} 
                       <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Trendyol ID:</p>
                          <p className="text-xs text-muted-foreground">{selectedQuestion.trendyolId}</p>
                       </div>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Kapat</Button>
                      {selectedQuestion.status === 'WAITING_FOR_ANSWER' && (
                         <Button onClick={() => openAnswerDialog(selectedQuestion)}>Cevapla</Button>
                      )}
                  </DialogFooter>
               </>
             )}
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
} 