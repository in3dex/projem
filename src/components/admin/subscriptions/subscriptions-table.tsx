'use client'

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox" // Gerekirse satır seçimi için
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { SubscriptionStatus } from "@prisma/client" // Status enumunu import et

// Props tipi
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function SubscriptionsTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) // Sütun gizleme/gösterme
  const [rowSelection, setRowSelection] = React.useState({}) // Satır seçimi

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Status filtreleme için seçenekler
  const statusOptions = Object.values(SubscriptionStatus).map(status => ({
     value: status,
     label: status // Veya translateStatus fonksiyonunu kullanabiliriz
  }));

  return (
    <div className="w-full">
      {/* Filtreleme ve Sütun Görünürlüğü */}
      <div className="flex items-center py-4 gap-2">
        {/* Email Filtresi -> Durum Filtresi olarak değiştirildi */}
        <Input
          placeholder="Duruma göre filtrele..." // Placeholder güncellendi
          value={(table.getColumn("status")?.getFilterValue() as string) ?? ""} // ID 'status' olarak değiştirildi
          onChange={(event) =>
            table.getColumn("status")?.setFilterValue(event.target.value) // ID 'status' olarak değiştirildi
          }
          className="max-w-sm"
        />
        {/* Durum Filtresi (Dropdown) - Bu zaten status'e göre çalışıyor, dokunmuyoruz */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Duruma Göre Filtrele <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Durum Seç</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => {
                const currentFilterValue = table.getColumn("status")?.getFilterValue() as string[] | undefined || [];
                const isSelected = currentFilterValue.includes(option.value);
                return (
                <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                    const current = table.getColumn("status")?.getFilterValue() as string[] | undefined || [];
                    let newValue: string[] = [];
                    if (checked) {
                        newValue = [...current, option.value];
                    } else {
                        newValue = current.filter(v => v !== option.value);
                    }
                    table.getColumn("status")?.setFilterValue(newValue.length > 0 ? newValue : undefined);
                    }}
                >
                    {option.label} 
                </DropdownMenuCheckboxItem>
                )
            })}
            <DropdownMenuSeparator />
             <DropdownMenuItem onSelect={() => table.getColumn("status")?.setFilterValue(undefined)}>
                Filtreyi Temizle
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Sütun Görünürlüğü */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Sütunlar <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id} 
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Tablo */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Sayfalama */}
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* Satır Seçim Bilgisi */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} / {" "}
          {table.getFilteredRowModel().rows.length} satır seçildi.
        </div>
        {/* Sayfa Kontrolleri */}
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  )
} 