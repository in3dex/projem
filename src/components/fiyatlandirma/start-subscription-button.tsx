"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StartSubscriptionButtonProps {
  planId: string;
  planName: string;
  className?: string;
}

export function StartSubscriptionButton({ planId, planName, className }: StartSubscriptionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // Ödeme sayfasına yönlendir
    router.push(`/odeme?plan=${planId}`);
  };

  return (
    <Button 
      onClick={handleClick} 
      disabled={loading} 
      className={cn("w-full", className)}
    >
      {loading ? "Yönlendiriliyor..." : "Paketi Seç"}
    </Button>
  );
} 