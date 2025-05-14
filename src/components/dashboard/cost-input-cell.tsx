'use client';

import { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';

interface CostInputCellProps {
  variantId: string;
  initialCostPrice: number | null;
  onSave: (variantId: string, newValue: string) => Promise<void>; // onBlur'da çağrılacak async fonksiyon
  isUpdating: boolean; // Yükleme durumu
}

export function CostInputCell({ 
  variantId, 
  initialCostPrice, 
  onSave, 
  isUpdating 
}: CostInputCellProps) {
  // Input'un o anki değerini tutmak için local state
  const [inputValue, setInputValue] = useState<string>(
    initialCostPrice != null ? initialCostPrice.toString().replace('.', ',') : ''
  );

  // initialCostPrice prop'u dışarıdan (fetchDataCallback sonrası) değiştiğinde
  // local state'i güncellemek için useEffect
  useEffect(() => {
    setInputValue(initialCostPrice != null ? initialCostPrice.toString().replace('.', ',') : '');
  }, [initialCostPrice]); // Sadece initialCostPrice değiştiğinde çalışır

  // Input değeri değiştiğinde local state'i güncelle
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  // Input'tan focus çıkınca (onBlur) kaydetme işlemini tetikle
  const handleBlur = async (event: FocusEvent<HTMLInputElement>) => {
    const currentValue = initialCostPrice != null ? initialCostPrice.toString().replace('.', ',') : '';
    // Değer gerçekten değişmişse kaydetmeyi dene
    if (event.target.value !== currentValue) {
      await onSave(variantId, event.target.value);
    } 
    // Eğer API hatası olursa ve state geri alınmazsa, 
    // input değeri API'den gelen son değere useEffect ile geri dönecektir.
  };

  return (
    <div className="relative flex items-center justify-end">
      <Input
        type="text"
        inputMode="decimal"
        pattern="[0-9]+([,\.][0-9]+)?"
        step="0.01"
        placeholder="0,00"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-24 text-right pr-6"
        disabled={isUpdating}
      />
      {isUpdating && (
        <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
} 