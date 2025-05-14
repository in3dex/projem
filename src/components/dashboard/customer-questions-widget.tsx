'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, X, Loader2, RefreshCw, Send, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomerQuestion } from '@prisma/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// API yanıtı için tip (sadece soru listesi ve pagination kısmı)
interface QuestionsApiResponse {
  data: CustomerQuestion[]
  pagination: {
    totalCount: number;
    // Diğer pagination alanları olabilir ama şimdilik sadece totalCount lazım
  }
}

// BigInt'leri string'e çevrilmiş tip
type SerializableCustomerQuestion = Omit<CustomerQuestion, 'trendyolQuestionId' | 'trendyolAnswerId'> & {
  trendyolQuestionId: string;
  trendyolAnswerId: string | null; // Answer ID null olabilir
};

export function CustomerQuestionsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState<SerializableCustomerQuestion[]>([]);
  const [unansweredCount, setUnansweredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yeni state'ler: Seçili soru ve cevap metni
  const [selectedQuestion, setSelectedQuestion] = useState<SerializableCustomerQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  const fetchWaitingQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
     // Seçili soru yoksa listeyi temizle (yenileme butonu için)
     if (!selectedQuestion) {
        setQuestions([]);
        setUnansweredCount(0);
     }

    try {
      const response = await fetch('/api/customer-questions?status=WAITING_FOR_ANSWER&size=20'); 
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sorular alınamadı.');

      const apiResponse = result as QuestionsApiResponse;
      const safeQuestions: SerializableCustomerQuestion[] = (apiResponse.data || []).map(q => ({
          ...q,
          trendyolQuestionId: String(q.trendyolQuestionId ?? ''),
          trendyolAnswerId: q.trendyolAnswerId ? String(q.trendyolAnswerId) : null
      }));

      // Sadece liste modundaysa state'i güncelle (arka planda yenileme için)
      if (!selectedQuestion) {
         setQuestions(safeQuestions);
      }
      setUnansweredCount(apiResponse.pagination?.totalCount || 0);

    } catch (err: any) {
       console.error("Widget veri çekme hatası:", err);
       // Hata mesajını kullanıcı dostu hale getir
       if (!selectedQuestion) {
          setError("Sorular yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.");
       }
       setUnansweredCount(0);
       if (!selectedQuestion) setQuestions([]);
    } finally {
       setIsLoading(false);
    }
  }, [selectedQuestion]); 

  useEffect(() => {
    if (isOpen) {
      if (!selectedQuestion) {
         fetchWaitingQuestions();
      }
    } else {
       setSelectedQuestion(null);
       setAnswerText('');
    }
    // İlk açılışta ve periyodik veri çekme eklenebilir
  }, [isOpen, fetchWaitingQuestions, selectedQuestion]);

  const formatRelativeDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
    } catch (e) {
        console.error("Date format error:", e);
        return '-';
    }
  };

  const handleSelectQuestion = (question: SerializableCustomerQuestion) => {
     setSelectedQuestion(question);
     setAnswerText(''); 
     setIsAnswering(false);
  };

  const handleBackToList = () => {
     setSelectedQuestion(null);
     setAnswerText('');
     // Geri dönünce listeyi yenilemek için fetch'i çağır
     fetchWaitingQuestions(); 
  };

  // TODO: handleAnswerSubmit fonksiyonunu implemente et
   const handleAnswerSubmit = async () => {
      if (!selectedQuestion || !answerText.trim() || isAnswering) return;

      setIsAnswering(true);
      toast.info("Cevap gönderiliyor...");

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
            // API'den gelen hatayı göster
            throw new Error(result.error || `Cevap gönderilemedi (${response.status})`);
         }

         toast.success('Cevap başarıyla gönderildi!');
         // Başarılı gönderim sonrası:
         handleBackToList(); // Listeye dön ve listeyi yenile

      } catch (err: any) {
         console.error("Cevap gönderme hatası:", err);
         toast.error(err.message || 'Cevap gönderilirken bir hata oluştu.');
         // Hata durumunda cevaplama modunda kalabilir veya listeye dönebilir (isteğe bağlı)
      } finally {
         setIsAnswering(false);
      }
   };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
          >
            <MessageSquare className="h-6 w-6" />
            {unansweredCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
              >
                {unansweredCount > 9 ? '9+' : unansweredCount}
              </Badge>
            )}
            <span className="sr-only">Müşteri Soruları</span>
          </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-80 md:w-96 h-[500px] p-0 flex flex-col mb-2 mr-1 bg-background shadow-2xl border" 
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between p-3 border-b">
           {selectedQuestion ? (
                <Button variant="ghost" size="sm" onClick={handleBackToList} className="mr-1">
                   <ArrowLeft className="h-4 w-4"/>
                   <span className="sr-only">Geri</span>
                </Button>
            ) : (
                 <Button variant="ghost" size="sm" onClick={fetchWaitingQuestions} disabled={isLoading} className="mr-1">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                    <span className="sr-only">Yenile</span>
                 </Button>
            )}
           <h3 className="font-medium truncate flex-1 text-center">
              {selectedQuestion ? 'Soruyu Cevapla' : 'Cevap Bekleyen Sorular'}
           </h3>
           <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4"/>
              <span className="sr-only">Kapat</span>
           </Button>
        </div>
        <ScrollArea className="flex-1">
           <div className="p-3 space-y-3">
              {isLoading && !selectedQuestion && (
                 <div className="space-y-3">
                   {Array.from({ length: 4 }).map((_, index) => (
                     <div key={index} className="border p-2 rounded-md space-y-2">
                       <Skeleton className="h-4 w-3/4" />
                       <Skeleton className="h-4 w-full" />
                       <Skeleton className="h-3 w-1/2" />
                     </div>
                   ))}
                 </div>
              )}
              {!isLoading && error && !selectedQuestion && ( 
                 // Hata mesajını ve Tekrar Dene butonunu ekle
                 <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button 
                       variant="outline" 
                       size="sm"
                       onClick={fetchWaitingQuestions} // Tekrar deneme fonksiyonunu çağır
                       disabled={isLoading} // Yüklenirken butonu devre dışı bırak
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4"/>}
                      Tekrar Dene
                    </Button>
                 </div>
              )}
              {!isLoading && !error && questions.length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-4">
                    Cevap bekleyen soru bulunamadı.
                 </p>
              )}
              {!selectedQuestion && !isLoading && !error && questions.length > 0 && (
                 questions.map((q) => (
                    <div key={q.id} className="border p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectQuestion(q)}>
                       <p className="text-xs font-medium truncate mb-1" title={q.productName}>{q.productName}</p>
                       <p className="text-sm truncate mb-1" title={q.questionText}>{q.questionText}</p>
                       <p className="text-xs text-muted-foreground">
                          {q.showUserName ? q.customerName : 'Gizli Kullanıcı'} - {formatRelativeDate(q.askedDate)}
                       </p>
                    </div>
                 ))
              )}
              {selectedQuestion && (
                 <div className="space-y-4">
                    {/* Ürün Bilgisi */}
                    <div className="flex items-start gap-3">
                       {selectedQuestion.productImageUrl ? (
                          <Image src={selectedQuestion.productImageUrl} alt={selectedQuestion.productName} width={40} height={40} className="rounded object-cover border"/>
                       ) : (
                          <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
                       )}
                       <div>
                          <p className="text-sm font-medium leading-tight">{selectedQuestion.productName}</p>
                          {selectedQuestion.webUrl && <Link href={selectedQuestion.webUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ürünü Görüntüle</Link>}
                       </div>
                    </div>
                    {/* Soru */}
                    <div className='space-y-1'>
                       <p className="text-xs text-muted-foreground">{selectedQuestion.showUserName ? selectedQuestion.customerName : 'Gizli Kullanıcı'} - {formatRelativeDate(selectedQuestion.askedDate)} sordu:</p>
                       <p className="text-sm border bg-muted/30 p-2 rounded-md whitespace-pre-wrap">{selectedQuestion.questionText}</p>
                    </div>
                    {/* Cevap Alanı */}
                    <div className="space-y-1">
                       <label htmlFor="widget-answer" className="text-sm font-medium">Cevabınız:</label>
                       <Textarea
                           id="widget-answer"
                           placeholder="Cevabınızı buraya yazın..."
                           value={answerText}
                           onChange={(e) => setAnswerText(e.target.value)}
                           rows={4}
                           maxLength={2000}
                           className="resize-none text-sm"
                       />
                       <p className="text-xs text-muted-foreground text-right">{answerText.length} / 2000</p>
                   </div>
                   {/* Gönder Butonu */}
                   <Button onClick={handleAnswerSubmit} disabled={isAnswering || answerText.length < 10 || answerText.length > 2000} className="w-full">
                     {isAnswering ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Send className="mr-2 h-4 w-4" />)}
                     {isAnswering ? 'Gönderiliyor...' : 'Cevabı Gönder'}
                   </Button>
                 </div>
              )}
           </div>
        </ScrollArea>
         <div className="p-2 border-t text-center">
            {!selectedQuestion && (
                <Button variant="link" size="sm" className="text-xs" asChild>
                    <Link href="/dashboard/musteri-sorulari">Tüm Soruları Gör</Link>
                </Button>
            )}
         </div>
      </PopoverContent>
    </Popover>
  );
} 