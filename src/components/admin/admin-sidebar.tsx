"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Package2, 
  Home, 
  Users, 
  Settings, 
  ShoppingCart, 
  CreditCard, // Abonelikler için
  List, // Planlar için
  ChevronsLeft, // İkon eklendi
  ChevronsRight, // İkon eklendi
  Mail, // E-posta Şablonları için
  Bell, // Bildirim Ayarları için
  FileText, // Faturalar için ikon
  Send, // Yeni ikon eklendi
  LifeBuoy, // Yeni ikon
} from "lucide-react"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const menuItems = [
  { href: "/admin", label: "Genel Bakış", icon: Home },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/plans", label: "Planlar", icon: List }, // Yeni: Planlar linki
  { href: "/admin/subscriptions", label: "Abonelikler", icon: CreditCard }, // Yeni: Abonelikler linki
  { href: "/admin/faturalar", label: "Faturalar", icon: FileText }, // Yeni: Faturalar linki eklendi
  { href: "/admin/notifications", label: "Bildirimler", icon: Bell },
  { href: "/admin/destek", label: "Destek Talepleri", icon: LifeBuoy },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function AdminSidebar({ isCollapsed, toggleSidebar }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-300 ease-in-out",
        isCollapsed ? "w-14" : "w-60" // Duruma göre genişlik
      )}
    >
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6 text-primary" />
          {!isCollapsed && <span className="">Projem Admin Panel</span>}
          <span className="sr-only">Projem Admin</span>
        </Link>
        {/* İsteğe bağlı: Daraltılmışken gösterilecek ikon butonu */} 
        {/* <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Toggle notifications</span>
        </Button> */} 
      </div>
      <div className="flex-1 overflow-auto py-2"> {/* Ana menü alanı için flex-1 ve padding */} 
        <nav className={cn("grid items-start", isCollapsed ? "px-2" : "px-4")}> 
          {menuItems.map((item) => (
            <TooltipProvider key={item.href} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg py-2 text-muted-foreground transition-all hover:text-primary",
                      isCollapsed ? "justify-center px-2" : "px-3", // Hizalama ve padding
                      pathname.startsWith(item.href) && (item.href === '/admin' ? pathname === '/admin' : true) && "bg-muted text-primary" // Aktif stil (alt sayfaları da kapsa)
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" sideOffset={5}>{item.label}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </nav>
      </div>

      {/* Alt Kısım: Ayarlar ve Genişlet/Daralt */} 
      <div className="mt-auto border-t p-2"> {/* Padding eklendi */} 
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/admin/settings" // Ana ayarlar sayfasına link
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 text-muted-foreground transition-all hover:text-primary",
                  isCollapsed ? "justify-center px-2" : "px-3",
                  // Aktif stilini sadece /admin/settings veya alt yolları için yapalım
                  (pathname === '/admin/settings' || pathname.startsWith('/admin/settings/')) && "bg-muted text-primary" 
                )}
              >
                <Settings className="h-4 w-4" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Ayarlar</span> // Label'ı "Ayarlar" olarak değiştirelim
                )}
                <span className="sr-only">Ayarlar</span>
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={5}>Ayarlar</TooltipContent> // Tooltip güncellendi
            )}
          </Tooltip>
        </TooltipProvider>
        
        {/* E-posta Şablonları ve SMTP Ayarları linkleri kaldırıldı */}
        
        {/* Genişlet/Daralt Butonu */} 
        <TooltipProvider delayDuration={0}>
           <Tooltip>
             <TooltipTrigger asChild>
               <Button
                 variant="ghost"
                 className={cn(
                   "mt-2 flex w-full items-center gap-3 rounded-lg py-2 text-muted-foreground transition-all hover:text-primary",
                   isCollapsed ? "justify-center px-2" : "justify-start px-3"
                 )}
                 onClick={toggleSidebar} 
               >
                 {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                 {!isCollapsed && (
                    <span className="text-sm font-medium">
                      {isCollapsed ? "Genişlet" : "Daralt"}
                    </span>
                 )}
                 <span className="sr-only">{isCollapsed ? "Genişlet" : "Daralt"}</span>
               </Button>
             </TooltipTrigger>
             {isCollapsed && (
               <TooltipContent side="right" sideOffset={5}>{isCollapsed ? "Genişlet" : "Daralt"}</TooltipContent>
             )}
           </Tooltip>
         </TooltipProvider>
      </div>
    </aside>
  );
} 