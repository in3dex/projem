"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EmailTemplate } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions"; // Aksiyonlar için ayrı bileşen

export const columns: ColumnDef<EmailTemplate>[] = [
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Şablon Türü" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("type")}</div>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Açıklama" />
    ),
    cell: ({ row }) => <div className="text-sm text-muted-foreground truncate max-w-xs">{row.getValue("description") || '-'}</div>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Konu" />
    ),
    cell: ({ row }) => <div className="truncate max-w-xs">{row.getValue("subject")}</div>,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Durum" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Aktif" : "Pasif"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />, // Satır aksiyonları
  },
]; 