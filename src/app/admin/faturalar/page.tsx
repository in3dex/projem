import { PrismaClient } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table"; // Genel DataTable
import { columns, InvoiceData } from "@/components/admin/invoices/columns"; // Admin fatura sütunları
import { InvoiceStatus } from "@prisma/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// Admin fatura sayfası için veri çekme
async function getInvoices() {
  const invoices = await prisma.invoice.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      subscription: { select: { id: true, plan: { select: { name: true } } } }
    },
    orderBy: {
      issueDate: 'desc',
    },
  });
  return invoices as any; // Tip uyumluluğu için (ilişkili verilerle)
}

export default async function AdminInvoicesPage() {
  const invoices = await getInvoices();

  // Durum filtreleme dropdown'ı için toolbar içeriği
  const ToolbarContent = ({ table }: { table: any }) => (
     <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Duruma Göre Filtrele <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Durum Seç</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.values(InvoiceStatus).map((status) => {
                const currentFilterValue = table.getColumn("status")?.getFilterValue() as string[] | undefined || [];
                const isSelected = currentFilterValue.includes(status);
                return (
                <DropdownMenuCheckboxItem
                    key={status}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                    const current = table.getColumn("status")?.getFilterValue() as string[] | undefined || [];
                    let newValue: string[] = [];
                    if (checked) {
                        newValue = [...current, status];
                    } else {
                        newValue = current.filter(v => v !== status);
                    }
                    table.getColumn("status")?.setFilterValue(newValue.length > 0 ? newValue : undefined);
                    }}
                >
                    {status} {/* TODO: Türkçeleştirilebilir */}
                </DropdownMenuCheckboxItem>
                )
            })}
            <DropdownMenuSeparator />
             <DropdownMenuItem onSelect={() => table.getColumn("status")?.setFilterValue(undefined)}>
                Filtreyi Temizle
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Faturalar Yönetimi</h2>
      <p className="text-sm text-muted-foreground">
        Tüm kullanıcı faturalarını görüntüleyin ve ödemeleri yönetin.
      </p>
      <DataTable 
          columns={columns} 
          data={invoices} 
          filterColumnId="status" // Email yerine status ile filtrele
          filterPlaceholder="Duruma göre filtrele..." // Placeholder'ı da güncelleyelim
        //   toolbarContent={<ToolbarContent table={/* table instance needs to be passed */} />} // DataTable'a toolbar prop'u eklemek lazım
       /> 
    </div>
  );
} 