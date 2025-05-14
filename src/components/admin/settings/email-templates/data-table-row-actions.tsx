"use client";

import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditTemplateDialog } from "./edit-template-dialog"; // Dialogu import et
import { EmailTemplate } from "@prisma/client"; // Tipi import et

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  const template = row.original as EmailTemplate; // Tipi belirtelim

  return (
    <div className="flex justify-end">
      {/* Düzenleme Dialogu */}
      <EditTemplateDialog template={template} />
      {/* <Button 
         variant="ghost" 
         size="icon" 
         onClick={() => alert(`Düzenle: ${template.type}`)} // Şimdilik alert
       >
         <Edit className="h-4 w-4" />
         <span className="sr-only">Düzenle</span>
       </Button> */}
    </div>
  );
} 