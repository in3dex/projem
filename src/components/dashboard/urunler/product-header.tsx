'use client';

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trophy, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductHeaderProps {
  isLoading: boolean;
  isSyncing: boolean;
  onRefresh: () => void;
  onSync: () => void;
  onClear: () => void;
  onOpenTopSelling: () => void;
}

export function ProductHeader({
  isLoading,
  isSyncing,
  onRefresh,
  onSync,
  onClear,
  onOpenTopSelling,
}: ProductHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <h1 className="text-3xl font-bold tracking-tight">Ürünler</h1>
      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Yenile
        </Button>
        <Button onClick={onSync} disabled={isSyncing || isLoading} className="w-full sm:w-auto">
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Trendyol ile Senkronize Et
        </Button>
        <Button variant="outline" onClick={onOpenTopSelling} disabled={isLoading} className="w-full sm:w-auto">
          <Trophy className="mr-2 h-4 w-4" />
          Çok Satanlar
        </Button>
        <Button variant="destructive" onClick={onClear} disabled={isLoading || isSyncing} className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" />
          Verileri Temizle
        </Button>
      </div>
    </div>
  );
} 