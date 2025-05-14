"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export function HeaderAuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2 h-9">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <Button size="sm" className="gap-1" asChild>
        <Link href="/dashboard">
          <LayoutDashboard className="h-4 w-4" />
          <span>Panele Git</span>
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/giris">Giriş Yap</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/kayit">Kayıt Ol</Link>
      </Button>
    </>
  );
} 