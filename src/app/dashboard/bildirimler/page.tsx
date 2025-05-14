"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Bell, ShoppingCart, AlertCircle, Mail, Package, MessageSquare, Info, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Notification, NotificationType } from '@prisma/client';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Bildirim Tipi için İkon
const getNotificationIcon = (type?: NotificationType | string | null): React.ElementType => {
  switch (type) {
    case 'ORDER_CREATED':
      return ShoppingCart;
    case 'ORDER_STATUS_UPDATE':
      return Package;
    case 'ORDER_CANCELLED':
      return AlertCircle;
    case 'ORDER_RETURNED':
      return RotateCcw;
    case 'NEW_QUESTION':
      return MessageSquare;
    case 'QUESTION_ANSWERED':
      return Mail;
    case 'API_CONNECTION_ERROR':
      return AlertCircle;
    case 'GENERAL':
      return Info;
    // Diğer tipler için eklemeler yapılabilir
    default:
      return Bell; // Varsayılan ikon
  }
};

// Bildirim tipinin Türkçe karşılığını getiren yardımcı fonksiyon
const getNotificationTypeLabel = (type?: NotificationType | string | null): string => {
  const typeMap: Record<string, string> = {
    'ORDER_CREATED': 'Sipariş Oluşturuldu',
    'ORDER_STATUS_UPDATE': 'Sipariş Durumu Güncellendi',
    'ORDER_CANCELLED': 'Sipariş İptal Edildi',
    'ORDER_RETURNED': 'Sipariş İade Edildi',
    'NEW_QUESTION': 'Yeni Soru',
    'QUESTION_ANSWERED': 'Sorunuz Yanıtlandı',
    'API_CONNECTION_ERROR': 'Bağlantı Hatası',
    'GENERAL': 'Genel Bildirim'
  };

  return type && type in typeMap ? typeMap[type] : 'Bildirim';
};

export default function BildirimlerPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Bildirimler alınamadı');
      }
      const data = await response.json();
      setNotifications(data || []);
    } catch (error) {
      console.error("Bildirimler alınırken hata:", error);
      toast.error(error instanceof Error ? error.message : 'Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, []);

  const handleToggleRead = async (notificationId: string, currentStatus: boolean) => {
    setMarkingRead(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !currentStatus }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Bildirim durumu güncellenemedi.');
      }
      toast.success(`Bildirim ${!currentStatus ? 'okundu' : 'okunmadı'} olarak işaretlendi.`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: !currentStatus } : n)
      );
    } catch (error) {
      console.error("Bildirim durumu güncelleme hatası:", error);
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      const response = await fetch('/api/notifications/mark-read', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Bildirimler okundu olarak işaretlenemedi.');
      }
      toast.success(result.message || 'Tüm okunmamış bildirimler okundu.');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Tümünü okundu işaretleme hatası:", error);
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setMarkingRead(false);
    }
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bildirimler</h1>
          <p className="text-muted-foreground mt-1">
            Sistem bildirimleri ve güncellemeleriniz
          </p>
        </div>
        <Button
          onClick={handleMarkAllRead}
          disabled={loading || !!markingRead || unreadCount === 0}
          className="shrink-0"
        >
          {markingRead === true && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Check className="mr-2 h-4 w-4" />
          Tümünü Okundu İşaretle
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
        <div className="flex items-center justify-between mb-4 px-6">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              Tümü
              <Badge variant="secondary" className="ml-2 px-1 min-w-5 h-5 text-xs">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              Okunmamış
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 min-w-5 h-5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="px-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Bildirim Geçmişi</CardTitle>
              <CardDescription>
                {activeTab === 'all' ? 'Tüm bildirimlerin listesi' : 'Okunmamış bildirimlerin listesi'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length > 0 ? (
                <ScrollArea className="h-[60vh]">
                  <ul className="space-y-4 pr-4">
                    {filteredNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const isProcessing = markingRead === notification.id;
                      return (
                        <li key={notification.id} className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                          notification.isRead ? "bg-muted/30 border-muted hover:bg-muted/50" : "bg-card hover:bg-muted/20 border-primary/20",
                          isProcessing && "opacity-60 pointer-events-none"
                        )}>
                          <div className={cn(
                            "mt-1 p-2 rounded-full shrink-0",
                            notification.isRead ? "bg-muted" : "bg-primary/10"
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              notification.isRead ? "text-muted-foreground" : "text-primary"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 items-center mb-1">
                              <h4 className={cn(
                                "text-sm",
                                notification.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                              )}>
                                {getNotificationTypeLabel(notification.type)}
                              </h4>
                              <Badge variant={notification.isRead ? "outline" : "secondary"} className="text-xs">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: false, locale: tr })} önce
                              </Badge>
                            </div>
                            <p className={cn(
                              "text-sm mb-1 break-words",
                              notification.isRead ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {notification.relatedUrl ? (
                                <Link href={notification.relatedUrl} className="hover:underline underline-offset-4 transition-colors">
                                  {notification.message}
                                </Link>
                              ) : (
                                notification.message
                              )}
                            </p>
                          </div>
                          <Button
                            variant={notification.isRead ? "outline" : "secondary"}
                            size="sm"
                            className={cn(
                              "h-8 w-8 shrink-0 p-0",
                              notification.isRead ? "text-muted-foreground hover:text-foreground" : "text-primary hover:text-primary"
                            )}
                            onClick={() => handleToggleRead(notification.id, notification.isRead)}
                            disabled={isProcessing}
                            aria-label={notification.isRead ? "Okunmadı yap" : "Okundu yap"}
                          >
                            {isProcessing ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <Check className="h-4 w-4" />
                            }
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 flex flex-col items-center gap-2">
                  <Bell className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {activeTab === 'all' ? 'Henüz hiç bildiriminiz bulunmuyor.' : 'Tüm bildirimleriniz okundu!'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
} 