import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { db as prisma } from "@/lib/db"; // Prisma client import
import { SubscriptionStatus, InvoiceStatus } from "@prisma/client";
import {
  Users,
  CreditCard,
  FileWarning,
  Activity,
  DollarSign,
  BarChart,
} from "lucide-react";
import { MonthlyRevenueChart } from "@/components/admin/charts/monthly-revenue-chart"; // Grafik bileşenini import edelim

async function getDashboardStats() {
  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[getDashboardStats] Docker build detected, returning default stats for AdminDashboard.");
    return {
      activeSubscribers: 0,
      pendingPaymentSubscriptions: 0,
      unpaidInvoices: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      monthlyChartData: [],
    };
  }

  const activeSubscribers = await prisma.subscription.count({
    where: { status: SubscriptionStatus.ACTIVE },
  });

  const pendingPaymentSubscriptions = await prisma.subscription.count({
    where: { status: SubscriptionStatus.PENDING_PAYMENT },
  });

  const unpaidInvoices = await prisma.invoice.count({
    where: {
      status: {
        in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
      },
    },
  });

  // Bu ayın başlangıcı ve bitişi
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Bu yılın başlangıcı
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const monthlyRevenueData = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: InvoiceStatus.PAID,
      paidAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const yearlyRevenueData = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: InvoiceStatus.PAID,
      paidAt: {
        gte: startOfYear,
        lte: now, // Yılın başından bugüne kadar
      },
    },
  });

  // Aylık gelir grafiği için veri (son 12 ay)
  // Raw SQL sorgusu yerine Prisma ORM fonksiyonlarını kullanıyoruz
  const oneYearAgo = new Date();
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.PAID,
      paidAt: {
        gte: oneYearAgo
      }
    },
    select: {
      paidAt: true,
      amount: true
    }
  });

  // Ay bazında gelir verilerini gruplayarak hesaplıyoruz
  const monthlyRevenues = new Map<string, number>();
  
  paidInvoices.forEach(invoice => {
    if (invoice.paidAt) {
      const yearMonth = `${invoice.paidAt.getFullYear()}-${String(invoice.paidAt.getMonth() + 1).padStart(2, '0')}`;
      const currentTotal = monthlyRevenues.get(yearMonth) || 0;
      monthlyRevenues.set(yearMonth, currentTotal + invoice.amount);
    }
  });

  // Map'ten alınan verileri sıralı array'e dönüştürüyoruz
  const monthlyChartData = Array.from(monthlyRevenues.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // MM/YYYY formatına dönüştürüyoruz
  const formattedChartData = monthlyChartData.map(item => {
    const [year, month] = item.month.split('-');
    return { month: `${month}/${year}`, revenue: item.revenue };
  });

  return {
    activeSubscribers,
    pendingPaymentSubscriptions,
    unpaidInvoices,
    monthlyRevenue: monthlyRevenueData._sum.amount ?? 0,
    yearlyRevenue: yearlyRevenueData._sum.amount ?? 0,
    monthlyChartData: formattedChartData,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* İstatistik Kartları */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Aboneler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
            {/* <p className="text-xs text-muted-foreground">+2 yeni abone (dün)</p> */} 
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ödeme Bekleyenler</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPaymentSubscriptions}</div>
            {/* <p className="text-xs text-muted-foreground">EFT onayı bekleniyor</p> */} 
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ödenmemiş Faturalar</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaidInvoices}</div>
            {/* <p className="text-xs text-muted-foreground">Bekleyen ve gecikmiş</p> */} 
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ayki Kazanç</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)} ₺</div>
            {/* <p className="text-xs text-muted-foreground">Geçen aya göre +15%</p> */} 
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Yılki Kazanç</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.yearlyRevenue.toFixed(2)} ₺</div>
            {/* <p className="text-xs text-muted-foreground">Geçen yıla göre +5%</p> */} 
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Aylık Gelir Grafiği */} 
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Aylık Gelir (Son 12 Ay)</CardTitle>
             <CardDescription>Ödenen faturalara göre aylık kazanç dağılımı.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {stats.monthlyChartData.length > 0 ? (
                <MonthlyRevenueChart data={stats.monthlyChartData} />
            ) : (
                <div className="flex h-[350px] w-full items-center justify-center">
                    <p className="text-muted-foreground">Grafik için yeterli veri yok.</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Son Aktiviteler veya Diğer Kartlar */} 
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
            <CardDescription>Paneldeki son önemli olaylar.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Buraya son abonelikler, faturalar vb. listelenebilir */}
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Yakında burada son aktiviteler listelenecek...</p>
                 {/* Örnek Liste Öğesi 
                 <div className="flex items-center">
                     <Users className="h-4 w-4 mr-2 text-green-500" />
                     <p className="text-sm">Yeni kullanıcı kaydoldu: user@example.com</p>
                     <p className="ml-auto text-xs text-muted-foreground">1 saat önce</p>
                 </div>
                 <div className="flex items-center">
                     <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                     <p className="text-sm">Yeni abonelik başladı: Pro Plan</p>
                     <p className="ml-auto text-xs text-muted-foreground">3 saat önce</p>
                 </div>
                 */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 