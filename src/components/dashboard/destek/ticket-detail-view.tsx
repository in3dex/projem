'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react'; // Oturum bilgisini almak için
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { TicketMessage } from './ticket-message';
import { AddMessageForm } from './add-message-form';
import type { SupportTicketWithDetails } from '@/types/support-ticket-types';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TicketDetailViewProps {
  ticket: SupportTicketWithDetails;
  onTicketUpdate: () => void; // Mesaj gönderildiğinde veya durum değiştiğinde üst bileşeni tetikle
}

// Durum ve öncelik için metin eşleştirmeleri (TicketList'ten kopyalandı)
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

export function TicketDetailView({ ticket, onTicketUpdate }: TicketDetailViewProps) {
  const { data: session } = useSession(); // Oturum verisini al
  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Son mesajı görünür kılmak için

  // Mesajlar yüklendiğinde veya yeni mesaj geldiğinde en alta scroll et
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!isAdmin) return;
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/support-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Durum güncellenemedi.');
      }
      toast.success(`Talep durumu "${statusVariant[newStatus]?.text || newStatus}" olarak güncellendi.`);
      onTicketUpdate(); // Üst bileşeni tetikle
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
        toast.error(`Hata: ${errorMessage}`);
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!isAdmin) return;
    setIsUpdatingStatus(true); // Aynı state'i kullanabiliriz
    try {
        const response = await fetch(`/api/support-tickets/${ticket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newPriority }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Öncelik güncellenemedi.');
        }
        toast.success(`Talep önceliği "${priorityVariant[newPriority]?.text || newPriority}" olarak güncellendi.`);
        onTicketUpdate(); // Üst bileşeni tetikle
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
          toast.error(`Hata: ${errorMessage}`);
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  if (!currentUserId) {
    // Oturum bilgisi henüz yüklenmediyse veya yoksa bir yükleme durumu gösterilebilir
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="text-xl font-semibold mb-1">{ticket.subject}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                    Talep #{ticket.id.substring(0, 8)} ・ Oluşturulma: {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                    {isAdmin && ` ・ Kullanıcı: ${ticket.user.name || ticket.user.email}`}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={priorityVariant[ticket.priority]?.variant || 'secondary'} className="text-xs">
                    Öncelik: {priorityVariant[ticket.priority]?.text || ticket.priority}
                </Badge>
                <Badge variant={statusVariant[ticket.status]?.variant || 'secondary'} className="text-xs">
                    Durum: {statusVariant[ticket.status]?.text || ticket.status}
                </Badge>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mesaj Listesi */}
        <div className="h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
          {ticket.messages.map((message) => (
            <TicketMessage key={message.id} message={message} currentUserId={currentUserId} />
          ))}
          <div ref={messagesEndRef} /> {/* Scroll için referans noktası */}
        </div>

        {/* Yeni Mesaj Formu */}
        <AddMessageForm 
            ticketId={ticket.id} 
            onMessageSent={onTicketUpdate} 
            disabled={ticket.status === TicketStatus.CLOSED && !isAdmin} // Admin kapalı talebe yazabilsin
        />
      </CardContent>
      {isAdmin && (
          <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-4 items-center justify-end">
            <div className="flex items-center gap-2">
                <Label htmlFor="priority-select" className="text-sm whitespace-nowrap">Öncelik:</Label>
                <Select 
                    value={ticket.priority}
                    onValueChange={handlePriorityChange}
                    disabled={isUpdatingStatus}
                >
                    <SelectTrigger id="priority-select" className="h-9 w-[120px]">
                        <SelectValue placeholder="Öncelik" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={TicketPriority.LOW}>Düşük</SelectItem>
                    <SelectItem value={TicketPriority.MEDIUM}>Orta</SelectItem>
                    <SelectItem value={TicketPriority.HIGH}>Yüksek</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="status-select" className="text-sm whitespace-nowrap">Durum:</Label>
                <Select 
                    value={ticket.status} 
                    onValueChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                >
                    <SelectTrigger id="status-select" className="h-9 w-[150px]">
                        <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TicketStatus.OPEN}>Açık</SelectItem>
                        <SelectItem value={TicketStatus.IN_PROGRESS}>İşlemde</SelectItem>
                        <SelectItem value={TicketStatus.PENDING_USER}>Yanıt Bekliyor</SelectItem>
                        <SelectItem value={TicketStatus.CLOSED}>Kapalı</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isUpdatingStatus && <LoadingSpinner size="sm"/>}
          </CardFooter>
      )}
    </Card>
  );
} 