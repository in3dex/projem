import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options" // Kolon gizleme (varsa)
import { AddUserDialog } from "./add-user-dialog"

// Opsiyonel: Faceted filtreler için bileşenler
// import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter"
// import { roles, statuses } from "./data" // Filtre seçenekleri (oluşturulacaksa)

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* E-posta veya İsim Filtresi */}
        <Input
          placeholder="Kullanıcıları filtrele (isim/e-posta)..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""} // E-posta veya isim ile filtreleyelim
          onChange={(event) =>
            // Hem e-posta hem isim kolonunda filtreleme yapabiliriz
            // Şimdilik sadece e-posta üzerinden yapalım
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        
        {/* Örnek Faceted Filtreler (Gelecekte eklenebilir) */}
        {/* {table.getColumn("role") && (
          <DataTableFacetedFilter
            column={table.getColumn("role")}
            title="Rol"
            options={roles} // [{ label: "Admin", value: "ADMIN" }, ...]
          />
        )} */}
        {/* {table.getColumn("isActive") && (
          <DataTableFacetedFilter
            column={table.getColumn("isActive")}
            title="Durum"
            options={statuses} // [{ label: "Aktif", value: "true" }, ...]
          />
        )} */}

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
      {/* Yeni Kullanıcı Ekle Butonu ve Kolon Görünürlük Ayarları */}
      <div className="flex items-center space-x-2">
        <AddUserDialog />
       <DataTableViewOptions table={table} />
      </div>
    </div>
  )
} 