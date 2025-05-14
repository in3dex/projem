"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package2, PanelLeft, Search, UserCircle, Settings, LogOut, Home, Users, ShoppingCart, User, Menu, LayoutDashboard } from "lucide-react"; // İkonlar eklendi
import { cn } from "@/lib/utils"; // cn import edildi
import { ModeToggle } from "@/components/mode-toggle"; // ModeToggle import edildi
import { useSession, signOut } from "next-auth/react"; // useSession ve signOut import edildi
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Avatar eklendi
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminHeader() {
  const pathname = usePathname();
  const { data: session } = useSession(); // Session verisini al

  // Kenar çubuğu linkleri (Mobil için)
  const menuItems = [
    { href: "/admin", label: "Genel Bakış", icon: Home },
    { href: "/admin/users", label: "Kullanıcılar", icon: Users },
    { href: "/admin/products", label: "Ürünler", icon: ShoppingCart },
    { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
    { href: "/admin/settings", label: "Ayarlar", icon: Settings },
  ];

  // Sayfa başlığını dinamik olarak ayarla (basit örnek)
  const getCurrentPageTitle = (pathname: string) => {
    const item = menuItems.find((item) => item.href === pathname);
    if (pathname === "/admin") return "Genel Bakış";
    return item ? item.label : "Admin Paneli";
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/giris" }); // Çıkış yaptıktan sonra admin giriş sayfasına yönlendir
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Mobil Kenar Çubuğu Tetiği */}
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/admin"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Admin Paneli</span>
            </Link>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                  pathname === item.href && "text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Sayfa Başlığı (Opsiyonel Breadcrumb ile değiştirilebilir) */}
      <div className="hidden sm:block">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin">Kontrol Paneli</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Sağ Taraftaki Öğeler */}
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Arama Çubuğu (Gelecekte eklenebilir)
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Ara..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        /> */}
      </div>

      {/* Kullanıcı Paneli Linki */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" aria-label="Kullanıcı Paneline Git">
                <LayoutDashboard className="h-5 w-5" /> 
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kullanıcı Paneli</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ModeToggle /> {/* Tema Değiştirici */} 
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar>
              <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? "Kullanıcı"} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0).toUpperCase() ?? <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{session?.user?.name ?? "Hesabım"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Çıkış Yap</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
} 