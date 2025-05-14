'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralCostSettings } from "@/components/dashboard/ayarlar/maliyet/general-cost-settings";
import { BulkCostUpdate } from "@/components/dashboard/ayarlar/maliyet/bulk-cost-update";
import { SubscriptionAlert } from "@/components/shared/subscription-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-10 w-full max-w-xs" /> 
      <Skeleton className="h-64 w-full" /> 
    </div>
  )
}

export default function CostSettingsPage() {
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      setIsLoadingSubscription(true);
      try {
        const res = await fetch('/api/user/subscription-status');
        if (!res.ok) {
          throw new Error('Abonelik durumu alınamadı');
        }
        const data = await res.json();
        setIsSubscriptionActive(data.isActive);
      } catch (error) {
        console.error("Abonelik kontrol hatası:", error);
        toast.error(error instanceof Error ? error.message : 'Abonelik durumu kontrol edilemedi.');
        setIsSubscriptionActive(false);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    checkSubscription();
  }, []);

  if (isLoadingSubscription) {
    return <LoadingSkeleton />;
  }

  if (isSubscriptionActive === false) {
    return <SubscriptionAlert />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Maliyet Ayarları</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="bulk">Toplu Maliyet Güncelleme</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <GeneralCostSettings />
        </TabsContent>
        <TabsContent value="bulk" className="mt-6">
          <BulkCostUpdate />
        </TabsContent>
      </Tabs>
    </div>
  );
} 