"use client";

import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, Settings, Barcode, MessageSquareIcon, PackageOpen, Home, Users, LineChart, Undo2, Bell, Percent, CreditCard, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function DashboardNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      title: "Ana Sayfa",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Ürünler",
      href: "/dashboard/urunler",
      icon: Package,
    },
    {
      title: "Siparişler",
      href: "/dashboard/siparisler",
      icon: ShoppingCart,
    },
    {
      title: "İade Yönetimi",
      href: "/dashboard/iadeler",
      icon: Undo2,
    },
    {
      title: "Müşteri Soruları",
      href: "/dashboard/musteri-sorulari",
      icon: MessageSquareIcon,
    },
    {
      title: "Karlılık Analizi",
      href: "/dashboard/karlilik-analizi",
      icon: Percent,
    },
    {
      title: "Destek Merkezi",
      href: "/dashboard/destek",
      icon: LifeBuoy,
    },
    {
      title: "Ayarlar",
      href: "/dashboard/ayarlar",
      icon: Settings,
    },
  ];

  return (
    <nav className="grid items-start gap-2 px-2">
      {navItems.map((item, index) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "transparent"
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
} 