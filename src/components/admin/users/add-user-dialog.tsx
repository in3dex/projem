"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react"; // İkon ekleyelim
import { UserForm } from "./user-form"; // Formu import et
// import { toast } from 'sonner'; // toast form içinden çağrılacak

export function AddUserDialog() {
  const [open, setOpen] = useState(false);

  // Form başarıyla gönderildiğinde dialogu kapatmak için
  const handleSuccess = () => {
    setOpen(false);
    // İsteğe bağlı: Başarı mesajı göster (sonner ile)
    // toast.success("Kullanıcı başarıyla eklendi!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Yeni Kullanıcı Ekle
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
          <DialogDescription>
            Yeni kullanıcının bilgilerini girin. Gerekli alanlar işaretlenmiştir.
          </DialogDescription>
        </DialogHeader>
        {/* Formu buraya ekle */}
        <UserForm onSuccess={handleSuccess} /> 
        {/* <p className="text-center text-muted-foreground py-8">
          Kullanıcı formu buraya eklenecek...
        </p> */}
        {/* DialogFooter form bileşeni içine taşındı */}
      </DialogContent>
    </Dialog>
  );
} 