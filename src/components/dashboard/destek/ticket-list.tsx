'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SupportTicketWithLastMessage } from '@/types/support-ticket-types';
import { TicketStatus, TicketPriority } from '@prisma/client';

interface TicketListProps {
  tickets: SupportTicketWithLastMessage[];
  isAdminView?: boolean; // Admin paneli için ek bilgileri göstermek için (opsiyonel)
}

// Durum ve öncelik için renk/metin eşleştirmeleri
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

export function TicketList({ tickets, isAdminView = false }: TicketListProps) {

  const getRelativeTime = (date: Date | string) => {
    try {
        const past = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) return `${diffInSeconds} sn önce`;
        if (diffInMinutes < 60) return `${diffInMinutes} dk önce`;
        if (diffInHours < 24) return `${diffInHours} sa önce`;
        if (diffInDays === 1) return 'Dün';
        if (diffInDays < 7) return `${diffInDays} gün önce`;
        return format(past, 'dd MMM yyyy', { locale: tr });
    } catch {
        return '-';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {isAdminView && <TableHead>Kullanıcı</TableHead>}
            <TableHead className="min-w-[250px]">Konu</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Öncelik</TableHead>
            <TableHead className="min-w-[150px]">Son Güncelleme</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              {isAdminView && (
                  <TableCell>
                      <div className="font-medium">{ticket.user.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{ticket.user.email}</div>
                  </TableCell>
              )}
              <TableCell className="font-medium">
                <Link href={`${isAdminView ? '/admin' : '/dashboard'}/destek/${ticket.id}`} className="hover:underline">
                  {ticket.subject}
                </Link>
                {ticket.messages && ticket.messages.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MessageSquare size={12} />
                    <span className="truncate max-w-[200px]">{ticket.messages[0].content}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[ticket.status]?.variant || 'secondary'}>
                  {statusVariant[ticket.status]?.text || ticket.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={priorityVariant[ticket.priority]?.variant || 'secondary'}>
                  {priorityVariant[ticket.priority]?.text || ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>{getRelativeTime(ticket.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${isAdminView ? '/admin' : '/dashboard'}/destek/${ticket.id}`}>
                    Görüntüle
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 