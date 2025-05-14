"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Role } from "@prisma/client" // Prisma'dan Role enumunu alalım
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header" // Sıralama için başlık bileşeni (varsa)
import { DataTableRowActions } from "./data-table-row-actions" // Satır aksiyonları bileşeni (oluşturulacak)
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Tabloya göndereceğimiz User verisinin tipini tanımlayalım (page.tsx'deki select ile eşleşmeli)
export type UserColumn = {
  id: string
  name: string | null
  email: string
  role: Role
  isActive: boolean
  image: string | null
  createdAt: Date
}

export const columns: ColumnDef<UserColumn>[] = [
  // Seçim Kutusu Kolonu
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Tümünü seç"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Satırı seç"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Kullanıcı Adı ve Avatar Kolonu
  {
    accessorKey: "name",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Kullanıcı" />
    ),
    cell: ({ row }) => {
      const user = row.original
      const fallback = user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()
      return (
        <div className="flex items-center space-x-3">
           <Avatar className="h-8 w-8">
             <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
             <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <span className="font-medium truncate" title={user.name ?? user.email}>
             {user.name ?? <span className="text-muted-foreground italic">İsimsiz</span>}
          </span>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },

  // E-posta Kolonu
  {
    accessorKey: "email",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="E-posta" />
    ),
    cell: ({ row }) => <div className="truncate" title={row.getValue("email")}>{row.getValue("email")}</div>,
    enableSorting: true,
    enableHiding: true,
  },

  // Rol Kolonu
  {
    accessorKey: "role",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Rol" />
    ),
    cell: ({ row }) => {
      const role = row.getValue("role") as Role
      const variant = role === Role.ADMIN ? "destructive" : "secondary"
      return (
        <Badge variant={variant} className="capitalize">
          {role.toLowerCase()}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id)) // Filtreleme için
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Durum Kolonu
  {
    accessorKey: "isActive",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Durum" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Aktif" : "Pasif"}
        </Badge>
      )
    },
     filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id))) // Filtreleme için (string'e çevir)
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Oluşturulma Tarihi Kolonu
  {
    accessorKey: "createdAt",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Kayıt Tarihi" />
    ),
    cell: ({ row }) => {
       const date = new Date(row.getValue("createdAt"))
       // Opsiyonel: date-fns gibi bir kütüphane ile formatlama
       const formattedDate = date.toLocaleDateString('tr-TR', { 
         year: 'numeric', month: 'short', day: 'numeric' 
       })
       return <div className="whitespace-nowrap">{formattedDate}</div>
    },
     enableSorting: true,
     enableHiding: true,
  },

  // Aksiyonlar Kolonu
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />, // Aksiyon bileşenini kullan
     enableSorting: false,
     enableHiding: false,
  },
] 