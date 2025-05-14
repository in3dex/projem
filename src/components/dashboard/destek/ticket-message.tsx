import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SupportMessageWithUser } from "@/types/support-ticket-types";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ShieldCheck, User, Paperclip } from 'lucide-react'; // Admin için ikon

interface TicketMessageProps {
  message: SupportMessageWithUser;
  currentUserId: string; // Mesajın kullanıcıya mı ait olduğunu anlamak için
}

export function TicketMessage({ message, currentUserId }: TicketMessageProps) {
  const isCurrentUserMessage = message.userId === currentUserId;
  const isAdminMessage = message.user.role === 'ADMIN';

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
          return format(past, 'dd MMM yyyy, HH:mm', { locale: tr });
      } catch {
          return '-';
      }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4",
        isCurrentUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={message.user.image || undefined} alt={message.user.name || 'Kullanıcı'} />
          <AvatarFallback>
             {isAdminMessage ? <ShieldCheck size={16} /> : <User size={16} /> }
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[75%]", isCurrentUserMessage ? "text-right" : "text-left")}>
          <Card
            className={cn(
              "p-3 rounded-lg",
              isCurrentUserMessage
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {/* Ekleri Göster */}
            {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-opacity-20">
                    <p className="text-xs font-medium mb-1">Ekler:</p>
                    <ul className="space-y-1">
                        {(message.attachments as { name: string; url: string }[]).map((att, index) => (
                            <li key={index} className="text-xs">
                                <a 
                                    href={att.url}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:underline flex items-center gap-1"
                                >
                                    <Paperclip size={12}/> {att.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </Card>
          <div className={cn("text-xs text-muted-foreground mt-1", isCurrentUserMessage ? "mr-1" : "ml-1")}>
            {isAdminMessage && !isCurrentUserMessage && (
              <span className="font-medium">{message.user.name || 'Destek Ekibi'}・</span>
            )}
             {getRelativeTime(message.createdAt)}
          </div>
      </div>
      {isCurrentUserMessage && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={message.user.image || undefined} alt={message.user.name || 'Siz'} />
          <AvatarFallback>
            <User size={16} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
} 