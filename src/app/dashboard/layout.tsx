"use client";

import { usePathname } from "next/navigation";
// Toaster RootLayout'ta olduğundan kaldırıldı
// import { Toaster } from "@/components/ui/sonner";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Package2 } from "lucide-react";
// Metadata Client Component'te kullanılmaz, kaldırıldı
// import type { Metadata } from "next";
// headers Server Component'e özel, kaldırıldı
// import { headers } from 'next/headers';
import { CustomerQuestionsWidget } from "@/components/dashboard/customer-questions-widget";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // headers kullanımı kaldırıldı, usePathname kullanılıyor
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        {/* Aside içeriği güncellendi */}
        <div className="flex h-14 items-center border-b px-6">
          <a href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            <span>Projem</span>
          </a>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <DashboardNav pathname={pathname} />
        </nav>
      </aside>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        <DashboardHeader pathname={pathname} />
        
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
        <CustomerQuestionsWidget />
      </div>
      {/* Toaster buradan kaldırıldı */}
      {/* <Toaster /> */}
    </div>
  );
} 