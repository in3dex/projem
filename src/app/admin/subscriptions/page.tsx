import { PrismaClient } from "@prisma/client";
import { SubscriptionsTable } from "@/components/admin/subscriptions/subscriptions-table";
import { columns, SubscriptionWithDetails } from "@/components/admin/subscriptions/columns";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  // Kullanıcı aboneliklerini ilişkili kullanıcı ve plan bilgileriyle çekelim
  const subscriptionsRaw = await prisma.subscription.findMany({
    include: {
      user: { // İlişkili kullanıcı bilgisi
        select: { id: true, name: true, email: true }
      },
      plan: { // İlişkili plan bilgisi
        select: { id: true, name: true }
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Veriyi `columns` dosyasındaki tiple eşleşecek hale getir (tip güvenliği için)
  const subscriptions: SubscriptionWithDetails[] = subscriptionsRaw as SubscriptionWithDetails[];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Kullanıcı Abonelikleri Yönetimi</h2>
      <p className="text-sm text-muted-foreground">
        Tüm kullanıcı aboneliklerini ve durumlarını görüntüleyin ve yönetin.
      </p>
      {/* Tablo bileşenini kullan */}
      <SubscriptionsTable columns={columns} data={subscriptions} />
       {/* <div className="p-4 border rounded-md bg-muted text-muted-foreground">
         Abonelikler Tablosu Burada Gösterilecek (SubscriptionsTable)
         <pre className="mt-2 text-xs">{JSON.stringify(subscriptions, null, 2)}</pre> 
      </div> */}
    </div>
  );
} 