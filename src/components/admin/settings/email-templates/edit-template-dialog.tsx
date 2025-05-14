"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { EmailTemplate } from "@prisma/client";
import { EditTemplateForm } from "./edit-template-form";

interface EditTemplateDialogProps {
  template: EmailTemplate;
}

export function EditTemplateDialog({ template }: EditTemplateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
          <span className="sr-only">Düzenle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl"> {/* Daha geniş dialog */}
        <DialogHeader>
          <DialogTitle>E-posta Şablonunu Düzenle: {template.type}</DialogTitle>
          <DialogDescription>
            Şablonun konusunu, içeriğini ve durumunu güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <EditTemplateForm template={template} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
} 