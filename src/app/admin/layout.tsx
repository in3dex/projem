"use client"; // State kullanacağımız için client component

import { useState, useEffect } from 'react'; // useEffect ekledik
import { cn } from "@/lib/utils"; // cn fonksiyonunu import et
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Varsayılan olarak geniş (false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <AdminAuthGuard>
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AdminSidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      {/* Ana içerik alanı: Sidebar durumuna göre sol padding'i ayarla */}
      <div 
        className={cn(
          "flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 ease-in-out", // Geçiş efekti eklendi
          isSidebarCollapsed ? "sm:pl-14" : "sm:pl-60" // Duruma göre padding
        )}
      > 
        <AdminHeader />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
        {/* İsteğe bağlı olarak bir alt bilgi (footer) eklenebilir */}
        {/* <footer className="mt-auto border-t bg-background p-4 text-center text-sm text-muted-foreground sm:px-6">
          © 2024 Admin Paneli
        </footer> */}
      </div>
    </div>
    </AdminAuthGuard>
  );
} 