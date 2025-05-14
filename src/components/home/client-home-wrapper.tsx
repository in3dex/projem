"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

// Ana sayfa için client-side wrapper
export default function ClientHomeWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
      <Footer />
      <Toaster />
    </div>
  );
} 