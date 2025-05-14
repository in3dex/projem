"use client";

import { useState, useEffect } from 'react';
import { BankaHesabi } from '@prisma/client';
import { useFormState } from 'react-dom';
import { deleteBankaHesabi } from "@/actions/odeme-ayarlari.actions";
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankaHesapFormu } from "./banka-hesap-formu"; // Az önce oluşturduğumuz form
import { Pencil, Trash2, PlusCircle } from 'lucide-react';

interface BankaHesaplariListesiProps {
  hesaplar: BankaHesabi[];
}

// Silme işlemi için ayrı bir buton (useFormState'i doğru kullanmak için)
function DeleteButton({ hesapId }: { hesapId: string }) {
  const [state, formAction] = useFormState(deleteBankaHesabi, { success: false, message: '' });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message || "Silme işlemi başarısız.");
      }
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={hesapId} />
      <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Sil
      </AlertDialogAction>
    </form>
  );
}

export function BankaHesaplariListesi({ hesaplar }: BankaHesaplariListesiProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editHesap, setEditHesap] = useState<BankaHesabi | null>(null); // Düzenlenecek hesap

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Hesap Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Yeni Banka Hesabı Ekle</DialogTitle>
              <DialogDescription>
                Müşterilerin ödeme yapabileceği yeni bir banka hesabı tanımlayın.
              </DialogDescription>
            </DialogHeader>
            <BankaHesapFormu onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {hesaplar.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Henüz banka hesabı eklenmemiş.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banka Adı</TableHead>
                <TableHead>Hesap Sahibi</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hesaplar.map((hesap) => (
                <TableRow key={hesap.id}>
                  <TableCell className="font-medium">{hesap.bankaAdi}</TableCell>
                  <TableCell>{hesap.hesapSahibi}</TableCell>
                  <TableCell>{hesap.iban}</TableCell>
                  <TableCell>
                    <Badge variant={hesap.isActive ? "default" : "outline"}>
                      {hesap.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Düzenleme Dialog'u */}
                    <Dialog open={!!editHesap && editHesap.id === hesap.id} onOpenChange={(open) => !open && setEditHesap(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditHesap(hesap)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Düzenle</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Banka Hesabını Düzenle</DialogTitle>
                          <DialogDescription>
                            {hesap.bankaAdi} - {hesap.iban}
                          </DialogDescription>
                        </DialogHeader>
                        <BankaHesapFormu 
                          hesap={editHesap} 
                          onSuccess={() => setEditHesap(null)} 
                        />
                      </DialogContent>
                    </Dialog>

                    {/* Silme Onay Dialog'u */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Sil</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu banka hesabını silmek istediğinizden emin misiniz?
                            Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <DeleteButton hesapId={hesap.id} />
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 