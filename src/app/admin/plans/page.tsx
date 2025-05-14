import { PrismaClient } from "@prisma/client";
import { PlansTable } from "@/components/admin/plans/plans-table";
import { columns } from "@/components/admin/plans/plans-columns";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: {
      // Fiyata veya oluşturulma tarihine göre sıralayabiliriz
      priceMonthly: 'asc',
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Abonelik Planları Yönetimi</h2>
      <p className="text-sm text-muted-foreground">
        Mevcut abonelik planlarını görüntüleyin, düzenleyin veya yeni planlar oluşturun.
      </p>
       {/* Planlar Tablosu */}
       <PlansTable columns={columns} data={plans} />
    </div>
  );
} 