"use client";

import React, { Suspense } from 'react';
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Script from 'next/script';

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2Icon, CreditCardIcon, CheckCircleIcon, BanknoteIcon, CopyIcon } from "lucide-react";
import OdemeSecenekleri from '@/components/public/odeme-secenekleri';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import OdemeClient from './odeme-client';

// Tip tanımları
interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  features: string[];
  maxProducts: number | null;
  maxOrders: number | null;
  maxUsers: number | null;
}

// API'den dönen veri tipi (OdemeSecenekleri bileşenindeki ile uyumlu)
interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string;
    hesapNumarasi: string;
    iban: string;
    hesapSahibi: string;
}

interface OdemeYontemi {
    type: 'eft' | 'stripe' | 'paytr';
    label: string;
    accounts?: BankaHesabi[];
}

// Ödeme seçenekleri yüklenirken gösterilecek iskelet yükleyici
function OdemeSecenekleriSkeleton() {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
                 <Skeleton className="h-8 w-1/3" /> 
             </h2>
            <div className="border rounded-md">
                 <Skeleton className="h-14 w-full rounded-t-md rounded-b-none" /> 
                 {/* Accordion içeriği için daha detaylı skeleton eklenebilir */}
            </div>
             {/* Başka bir ödeme yöntemi skeleton'ı eklenebilir */}
             {/* <div className="border rounded-md">
                 <Skeleton className="h-14 w-full rounded-t-md rounded-b-none" /> 
            </div> */}
        </div>
    );
}

// Yükleniyor göstergesi için basit bir bileşen
function LoadingFallback() {
    return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <p>Ödeme sayfası yükleniyor...</p> 
      </div>
    );
  }

export default function OdemePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OdemeClient />
    </Suspense>
  );
} 