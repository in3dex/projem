"use client"; // Bileşenin client tarafında çalışacağını belirtir

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Menu, Package2, Search, User, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger, 
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "./dashboard-nav"; // Sidebar içeriğini mobil için kullanacağız
import { Badge } from "@/components/ui/badge"; // Badge bileşenini ekle
import { ScrollArea } from "@/components/ui/scroll-area"; // Kaydırma alanı için
import { toast } from 'sonner';
import { Notification } from '@prisma/client'; // Notification tipini import et
import { useRouter } from 'next/navigation'; // Yönlendirme için
import { signOut } from "next-auth/react"; // signOut fonksiyonunu import et

// Bildirimler için örnek veri tipi (API'den dönen tipe göre güncelleyin)
// import { Notification } from '@/types/notification';

export function DashboardHeader({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const [countRes, notificationsRes] = await Promise.all([
        fetch('/api/notifications?count=true'),
        fetch('/api/notifications?limit=5&unread=true') // Son 5 okunmamış
      ]);

      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(data.count || 0);
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data || []);
      }
      // Hata durumları ayrıca ele alınabilir
    } catch (error) {
      console.error("Bildirimler alınırken hata:", error);
      // toast.error("Bildirimler alınamadı.");
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    setLoadingNotifications(true);
    fetchNotifications();
    // Belirli aralıklarla bildirimleri kontrol etmek için interval eklenebilir
    // const intervalId = setInterval(fetchNotifications, 60000); // Her 60 saniyede bir
    // return () => clearInterval(intervalId); // Cleanup interval
  }, []);

  const handleDropdownOpenChange = async (open: boolean) => {
    setIsDropdownOpen(open);
    if (open && notifications.length > 0) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      
      if (unreadIds.length > 0) {
        try {
          const response = await fetch('/api/notifications/mark-read', {
             method: 'PATCH', 
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ ids: unreadIds })
            });
            
          if (response.ok) {
            const result = await response.json();
            setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
            setNotifications(prev => 
              prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: true } : n)
            ); 
            console.log(`${result.count} bildirim dropdown açıldığında okundu işaretlendi.`);
          } else {
             const errorResult = await response.json().catch(() => ({}));
             console.error("Dropdown açıldığında okundu işaretleme hatası:", errorResult.message || response.statusText);
          }
        } catch (error) {
            console.error("Dropdown açıldığında okundu işaretleme API isteği hatası:", error);
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
        const response = await fetch('/api/notifications/mark-read', { method: 'POST' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Bildirimler okundu olarak işaretlenemedi.');
        }
        toast.success(result.message || 'Tüm bildirimler okundu.');
        setUnreadCount(0); // Sayacı sıfırla
        setNotifications([]); // Listeyi temizle (veya tekrar fetch edilebilir)
        setIsDropdownOpen(false); // Dropdown'ı kapat
    } catch (error) {
        console.error("Tümünü okundu işaretleme hatası:", error);
        toast.error(error instanceof Error ? error.message : 'Bir hata oluştu.');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Bildirimi okundu olarak işaretle (isteğe bağlı, arka planda yapılabilir)
    // fetch(`/api/notifications/mark-one-read/${notification.id}`, { method: 'POST' });
    
    // İlgili sayfaya yönlendir
    if (notification.relatedUrl) {
      router.push(notification.relatedUrl);
    }
    setIsDropdownOpen(false); // Dropdown'ı kapat
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Navigasyonu Aç/Kapat</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Ana Sayfa</span>
            </Link>
            {/* Mobil sidebar için DashboardNav'ı kullanalım */}
            <DashboardNav pathname={pathname} />
          </nav>
        </SheetContent>
      </Sheet>
      
      {/* Orta Alan (Opsiyonel: Arama vb. eklenebilir) */}
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* 
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Ara..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
        /> 
        */}
      </div>

      {/* Sağ Alan: Bildirimler, Tema ve Kullanıcı Menüsü */}
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        
        {/* Bildirimler Dropdown */} 
        <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                 <Badge 
                   variant="destructive" 
                   className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                 >
                  {unreadCount > 9 ? '9+' : unreadCount}
                 </Badge>
              )}
              <span className="sr-only">Bildirimleri aç</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Bildirimler</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={handleMarkAllRead}>
                  <Check className="h-3 w-3 mr-1"/>
                  Tümünü Okundu İşaretle
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <ScrollArea className="h-[300px]">
                {loadingNotifications ? (
                  <DropdownMenuItem disabled>Yükleniyor...</DropdownMenuItem>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="cursor-pointer flex flex-col items-start whitespace-normal" // İçeriğin sığması için
                      onClick={() => handleNotificationClick(notification)}
                    >
                       <p className="text-sm font-medium mb-1">{notification.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p> 
                       <p className="text-xs text-muted-foreground">{notification.message}</p>
                       {/* Zaman bilgisi eklenebilir: date-fns formatDistanceToNow */}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Okunmamış bildirim yok.</DropdownMenuItem>
                )}
             </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/bildirimler" className="flex justify-center">Tüm Bildirimleri Gör</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        
        {/* Kullanıcı Menüsü Dropdown */} 
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
              <span className="sr-only">Kullanıcı menüsünü aç</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
               <Link href="/dashboard/ayarlar">Ayarlar</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Destek</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="cursor-pointer">
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 