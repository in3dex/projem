import React from 'react';
import StatisticsOverview from '@/components/dashboard/analizler/statistics-overview';
import ChartsSection from '@/components/dashboard/analizler/charts-section';
import ActionItems from '@/components/dashboard/analizler/action-items';
// import { cookies } from 'next/headers'; // Artık doğrudan cookie'ye gerek yok
// API yanıt tiplerini doğrudan server-actions'dan alacağız
// import { StatsDataResponse } from '@/app/api/profitability-analysis/statistics/route'; 
// import { ActionItemProduct } from '@/app/api/profitability-analysis/action-items/route'; 
// import { SalesTrendDataPoint, CostDistributionDataPoint } from '@/types/analysis'; 

// Yeni sunucu fonksiyonlarını import et
import { 
    getProfitabilityStats, 
    getActionItems, 
    getSalesTrend, 
    getCostDistribution, 
    StatsDataResponse, // Tipleri buradan al
    ActionItemProduct, // Tipleri buradan al
    SalesTrendDataPoint, // Tipleri buradan al
    CostDistributionDataPoint // Tipleri buradan al
} from '@/lib/server-actions/profitability-analysis';

// Oturum bilgisi almak için (Doğru Auth.js v5 importu)
import { auth } from "@/lib/auth/auth"; 
// import { getServerSession } from "next-auth/next"; // << SİLİNDİ (Hatalı v4 importu)
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // << SİLİNDİ (Hatalı v4 importu)


export default async function AnalizlerPage() {
    // Sunucu tarafında oturumu ve kullanıcı ID'sini al (Doğru Auth.js v5 kullanımı)
    const session = await auth(); 
    // const session = await getServerSession(authOptions); // << SİLİNDİ (Hatalı v4 kullanımı)
    const userId = session?.user?.id;

    if (!userId) {
        // Kullanıcı girişi yapılmamışsa veya ID alınamıyorsa hata durumu yönetimi
        // Belki bir mesaj gösterebilir veya giriş sayfasına yönlendirebiliriz.
        return <div>Yetkilendirme hatası: Kullanıcı ID bulunamadı.</div>;
    }

    // Verileri paralel olarak çek (userId ile)
    const [statsData, actionItems, salesTrendData, costDistributionData] = await Promise.all([
        getProfitabilityStats(userId),
        getActionItems(userId),
        getSalesTrend(userId), 
        getCostDistribution(userId) 
    ]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Genel Bakış</h3>
      <StatisticsOverview statsData={statsData} /> 

      <h3 className="text-xl font-semibold">Grafikler</h3>
      <ChartsSection salesTrendData={salesTrendData} costDistributionData={costDistributionData} />

      <h3 className="text-xl font-semibold">Aksiyon Gereken Ürünler</h3>
      <ActionItems actionItems={actionItems} />
    </div>
  );
} 