import type { SupportTicket, SupportMessage, User, TicketStatus, TicketPriority } from '@prisma/client';

// API'den gelen liste verisi için (son mesaj dahil)
export type SupportTicketWithLastMessage = SupportTicket & {
    user: Pick<User, 'id' | 'name' | 'email'>; // Liste için temel kullanıcı bilgisi
    messages: Pick<SupportMessage, 'content' | 'createdAt' | 'isAdminMessage'>[]; // Sadece son mesajın içeriği, tarihi ve kimden geldiği
};

// API'den gelen detay verisi için (tüm mesajlar ve kullanıcı detayları dahil)
export type SupportMessageWithUser = SupportMessage & {
    user: Pick<User, 'id' | 'name' | 'email' | 'image' | 'role'>;
};

export type SupportTicketWithDetails = SupportTicket & {
    user: Pick<User, 'id' | 'name' | 'email' | 'image'>;
    messages: SupportMessageWithUser[];
};

// Yeni talep formu için tip
export interface NewTicketFormData {
    subject: string;
    initialMessage: string;
    priority: TicketPriority;
}

// Yeni mesaj formu için tip
export interface NewMessageFormData {
    content: string;
} 