"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { Siparis } from "@/lib/types/siparis";
import { toast } from "sonner";

interface FaturaYuklemeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  siparis: Siparis | null;
}

export function FaturaYuklemeModal({ isOpen, onOpenChange, siparis }: FaturaYuklemeModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (event.target.files[0].type === "application/pdf") {
        setSelectedFile(event.target.files[0]);
        setUploadError(null);
      } else {
        setSelectedFile(null);
        setUploadError("Lütfen sadece PDF formatında bir dosya seçin.");
        toast.error("Geçersiz dosya formatı. Lütfen PDF seçin.");
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleInvoiceUpload = async () => {
    if (!selectedFile || !siparis) return;

    setIsUploadingInvoice(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("invoiceFile", selectedFile);
    formData.append("orderId", siparis.id); 
    formData.append("orderNumber", siparis.orderNumber);

    try {
      const response = await fetch("/api/orders/upload-invoice", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fatura yüklenemedi.");
      }

      toast.success(`Sipariş #${siparis.orderNumber} için fatura başarıyla yüklendi.`);
      setSelectedFile(null); // Dosya seçimini sıfırla
      onOpenChange(false); // Modalı kapat
      // Ana sayfadaki veriyi yenilemek için bir callback çağrılabilir
      // örn: props.onInvoiceUploaded?.(siparis.id);

    } catch (error: any) {
      console.error("Fatura yükleme hatası:", error);
      const errorMessage = error.message || "Bilinmeyen bir hata oluştu.";
      setUploadError(errorMessage);
      toast.error(`Fatura Yüklenemedi: ${errorMessage}`);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Modal kapatıldığında state'leri sıfırla
  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
        setSelectedFile(null);
        setUploadError(null);
        // setIsUploadingInvoice(false); // Zaten finally içinde yapılıyor
    }
    onOpenChange(open);
  }

  if (!siparis) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fatura Yükle</DialogTitle>
          <DialogDescription>
            Sipariş #{siparis.orderNumber} için faturayı yükleyin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invoice-file" className="text-right">
              Fatura Dosyası
            </Label>
            <Input 
              id="invoice-file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={isUploadingInvoice}
            />
          </div>
          {uploadError && <p className="text-sm text-red-500 col-span-4 text-center">{uploadError}</p>}
          {selectedFile && <p className="text-sm text-muted-foreground col-span-4">Seçilen dosya: {selectedFile.name}</p>}
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleInvoiceUpload} 
            disabled={!selectedFile || isUploadingInvoice}
          >
            {isUploadingInvoice ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : null}
            Yükle
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isUploadingInvoice}>
              İptal
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 