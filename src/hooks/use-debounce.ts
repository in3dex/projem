import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Delay süresi sonunda state'i güncelle
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup fonksiyonu: Eğer value veya delay değişirse (veya unmount olursa)
    // önceki timeout'u temizle
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Sadece value veya delay değiştiğinde effect'i tekrar çalıştır

  return debouncedValue;
} 