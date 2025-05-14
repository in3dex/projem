"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, BarChart3, Settings, Package, ShoppingCart, Menu, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderAuthButtons } from "@/components/header-auth-buttons";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const moduller = [
  {
    title: "Sipariş Yönetimi",
    href: "#siparis",
    description: "Trendyol siparişlerini görüntüleyin ve yönetin",
    icon: ShoppingCart,
  },
  {
    title: "Ürün Yönetimi",
    href: "#urun",
    description: "Ürün bilgilerini ve stok seviyelerini senkronize edin",
    icon: Package,
  },
  {
    title: "Finansal Raporlar",
    href: "#rapor",
    description: "Satış ve ödeme raporlarını görüntüleyin",
    icon: BarChart3,
  },
  {
    title: "API Ayarları",
    href: "#ayarlar",
    description: "Trendyol API bağlantı ayarlarını yapılandırın",
    icon: Settings,
  },
];

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon?: React.ElementType }
>(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "flex select-none space-x-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <div className="space-y-1">
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menü</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Trendyol Entegrasyon</SheetTitle>
              <SheetDescription>
                Trendyol entegrasyon modüllerimiz
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Link href="/" className="flex items-center space-x-3 px-2 py-3 transition-colors hover:bg-muted">
                <span className="text-sm font-medium">Anasayfa</span>
              </Link>
              <Link href="/ozellikler" className="flex items-center space-x-3 px-2 py-3 transition-colors hover:bg-muted">
                <span className="text-sm font-medium">Özellikler</span>
              </Link>
              <Link href="/fiyatlandirma" className="flex items-center space-x-3 px-2 py-3 transition-colors hover:bg-muted">
                <span className="text-sm font-medium">Fiyatlandırma</span>
              </Link>
              <Link href="/iletisim" className="flex items-center space-x-3 px-2 py-3 transition-colors hover:bg-muted">
                <span className="text-sm font-medium">İletişim</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold">TrendEntegre</span>
        </Link>
        <NavigationMenu className="hidden md:flex ml-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" className={navigationMenuTriggerStyle()}>
                Anasayfa
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/ozellikler" className={navigationMenuTriggerStyle()}>
                Özellikler
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/fiyatlandirma" className={navigationMenuTriggerStyle()}>
                Fiyatlandırma
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/iletisim" className={navigationMenuTriggerStyle()}>
                İletişim
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center space-x-2">
          <HeaderAuthButtons />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 