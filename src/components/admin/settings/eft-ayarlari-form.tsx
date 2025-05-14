"use client";

import React, { useOptimistic, startTransition, useRef } from 'react';
// import { useActionState } from 'react'; // useActionState, React 19 ile react paketi içinde
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateEftDurumu } from "@/actions/odeme-ayarlari.actions";
import { toast } from 'sonner';

interface EftAyarlariFormProps {
  mevcutDurum: boolean;
}

// Action'ın state tipi
interface ActionState {
  success: boolean;
  message: string;
}

export function EftAyarlariForm({ mevcutDurum }: EftAyarlariFormProps) {
  const switchRef = useRef<HTMLButtonElement>(null);

  // useActionState hook'u - Doğru tiplerle
  const [state, submitAction, isPending] = React.useActionState<ActionState, FormData>(
    updateEftDurumu, 
    { 
      success: false, // Başlangıç state'i
      message: '' 
    }
  );

  // useOptimistic state
  const [optimisticDurum, setOptimisticDurum] = useOptimistic(
    mevcutDurum,
    (currentState, optimisticValue: boolean) => optimisticValue
  );

  React.useEffect(() => {
    // Hata durumunda optimistic state'i geri al (elle tetiklemeye gerek yok,
    // useActionState state değiştiğinde bileşen yeniden render olur ve optimistic state
    // gerçek mevcutDurum'a geri döner. Ancak, action başarısız olursa 
    // kullanıcıya bildirim vermek önemlidir.)
    if (!state.success && state.message) {
        toast.error(state.message);
        // İsteğe bağlı olarak switch'i eski haline getirmek için 
        // setOptimisticDurum(mevcutDurum) çağrılabilir, ancak genellikle
        // yeniden render yeterli olur. Hatanın gösterilmesi daha kritik.
      }
    // Başarı durumunda zaten toast gösteriliyor
    if (state.success && state.message) {
      toast.success(state.message);
    }
  }, [state]); // state'e bağımlı

  const handleSwitchChange = (yeniDurum: boolean) => {
    const formData = new FormData();
    formData.append('eftAktif', String(yeniDurum));

    // Hem optimistic update hem de action çağrısını transition içine al
    startTransition(() => {
      setOptimisticDurum(yeniDurum);
      submitAction(formData); // Action'ı formData ile tetikle
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        ref={switchRef} 
        id="eft-aktif"
        checked={optimisticDurum}
        onCheckedChange={handleSwitchChange}
        disabled={isPending} 
        aria-label="Banka Havalesi / EFT durumunu değiştir"
      />
      <Label htmlFor="eft-aktif" className="cursor-pointer">
        {optimisticDurum ? "Aktif" : "Pasif"}
      </Label>
       {isPending && <span className="text-xs text-muted-foreground ml-2">Güncelleniyor...</span>}
       {/* state.message && !state.success && !isPending && (
         <span className="text-xs text-destructive ml-2">{state.message}</span>
       ) */}
       {/* Hata mesajını toast ile gösterdiğimiz için burası yorumlandı */}
    </div>
  );
} 