'use client'; // Sekme durumu ve navigasyon için client bileşeni gerekli

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter, usePathname } from 'next/navigation';
import { ListTree, BarChart3 } from 'lucide-react'; // İkonlar

export default function KarlilikAnaliziLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Mevcut yola göre aktif sekmeyi belirle
  // /dashboard/karlilik-analizi veya /dashboard/karlilik-analizi/urun-listesi -> 'urun-listesi'
  // /dashboard/karlilik-analizi/analizler -> 'analizler'
  const activeTab = pathname.includes('/analizler') ? 'analizler' : 'urun-listesi';

  const handleTabChange = (value: string) => {
    if (value === 'urun-listesi') {
      router.push('/dashboard/karlilik-analizi'); // Ana yol ürün listesini gösterecek
    } else {
      router.push(`/dashboard/karlilik-analizi/${value}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Karlılık Analizi</h2>
        {/* İleride buraya genel ayarlar veya filtreler eklenebilir */}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="urun-listesi">
             <ListTree className="mr-2 h-4 w-4" />
             Ürün Listesi
          </TabsTrigger>
          <TabsTrigger value="analizler">
            <BarChart3 className="mr-2 h-4 w-4" />
            Detaylı Analizler
          </TabsTrigger>
          {/* İleride başka sekmeler eklenebilir */}
        </TabsList>

        {/* Sekme içeriği children olarak render edilecek */}
        {/* Next.js layout'ları alt route'ları otomatik olarak burada render eder */}
        {/* Bu yüzden TabsContent kullanmamıza gerek kalmıyor, direkt children yeterli */}
         <div className="pt-4">{children}</div>
      </Tabs>
    </div>
  );
} 