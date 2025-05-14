"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

// Kargo firmaları ve logoları (Logo yollarını public klasörünüze göre ayarlayın)
const CARGO_PROVIDERS = [
  { code: "YKMP", name: "Yurtiçi Kargo", logo: "/logos/cargo/ykmp.png" },
  { code: "ARASMP", name: "Aras Kargo", logo: "/logos/cargo/arasmp.png" },
  { code: "SURATMP", name: "Sürat Kargo", logo: "/logos/cargo/suratmp.png" },
  { code: "HOROZMP", name: "Horoz Lojistik", logo: "/logos/cargo/horozmp.png" },
  { code: "MNGMP", name: "MNG Kargo", logo: "/logos/cargo/mngmp.png" },
  { code: "PTTMP", name: "PTT Kargo", logo: "/logos/cargo/pttmp.png" },
  { code: "CEVAMP", name: "Ceva Lojistik", logo: "/logos/cargo/cevamp.png" },
  { code: "TEXMP", name: "Trendyol Express", logo: "/logos/cargo/texmp.png" },
  { code: "KOLAYGELSINMP", name: "Kolay Gelsin", logo: "/logos/cargo/kolaygelsinmp.png" },
];

interface KargoDegistirModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trendyolPackageId: number;
  onCargoProviderUpdated: () => void;
}

export function KargoDegistirModal({ 
  isOpen, 
  setIsOpen, 
  trendyolPackageId,
  onCargoProviderUpdated
}: KargoDegistirModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateCargo = async () => {
    if (!selectedProvider) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/orders/paket/${trendyolPackageId}/kargo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargoProvider: selectedProvider })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Kargo firması değiştirilemedi.');
      }
      toast.success(result.message || 'Kargo firması başarıyla güncellendi!');
      onCargoProviderUpdated(); // Callback'i çağır (modalı kapatır ve listeyi yeniler)
    } catch (error: any) {
      toast.error(`Kargo firması güncellenemedi: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kargo Firması Seç</DialogTitle>
          <DialogDescription>
            Paket ID: {trendyolPackageId}. Lütfen yeni kargo firmasını seçin.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {CARGO_PROVIDERS.map((provider) => (
            <button
              key={provider.code}
              className={cn(
                "border rounded-lg p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                "hover:border-primary hover:bg-primary/5",
                selectedProvider === provider.code ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/10" : "border-border"
              )}
              onClick={() => setSelectedProvider(provider.code)}
              disabled={isUpdating}
            >
              <div className="relative h-12 w-24 mb-2"> 
                <Image 
                  src={provider.logo} 
                  alt={`${provider.name} Logosu`} 
                  layout="fill" 
                  objectFit="contain" 
                  onError={(e) => (e.currentTarget.style.display = 'none')} // Logo yüklenemezse gizle
                />
              </div>
              <span className="text-sm font-medium text-center">{provider.name}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isUpdating}>İptal</Button>
          </DialogClose>
          <Button 
            onClick={handleUpdateCargo} 
            disabled={!selectedProvider || isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Değiştiriliyor...
              </>
            ) : (
              'Değiştir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 