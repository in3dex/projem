import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { PlanDialog } from "./plan-dialog"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function PlansToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Plan Adı Filtresi */}
        <Input
          placeholder="Plan adını filtrele..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""} 
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        
        {/* TODO: Duruma (Aktif/Pasif) göre filtre eklenebilir (DataTableFacetedFilter ile) */}

        {/* Filtreleri Temizle Butonu */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Temizle
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
         {/* Yeni Plan Oluştur Dialog Tetikleyicisi */}
         <PlanDialog />
         
         {/* Kolon Görünürlük Ayarları */}
         <DataTableViewOptions table={table} />
      </div>
    </div>
  )
} 