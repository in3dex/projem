import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe yerelleştirme

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency.
 * @param value The number to format.
 * @param currency The currency code (e.g., 'TRY', 'USD'). Defaults to 'TRY'.
 * @param locale The locale to use (e.g., 'tr-TR', 'en-US'). Defaults to 'tr-TR'.
 * @param compact Whether to use compact notation (e.g., '1,5K ₺' instead of '1.500,00 ₺'). Defaults to false.
 * @returns The formatted currency string.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'TRY',
  locale: string = 'tr-TR',
  compact: boolean = false // Yeni parametre eklendi
): string {
  if (value == null || isNaN(value)) {
    return '-'; // Veya boş string, veya istediğiniz bir fallback değeri
  }

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2, // Genellikle 2 kullanılır
    maximumFractionDigits: 2,
  };

  // Eğer compact true ise, notation seçeneğini ekle
  if (compact) {
    options.notation = 'compact';
    options.maximumFractionDigits = 1; // Kompakt gösterimde genellikle tek basamak yeterli
    options.minimumFractionDigits = 0; // Kompakt gösterimde virgülden sonra gösterme
  }

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    console.error("Currency formatting error:", error);
    // Hata durumunda basit bir formatlama yapabiliriz
    return `${value.toFixed(2)} ${currency}`;
  }
}

/**
 * Formats a date string into a relative time string (e.g., "3 gün önce").
 * @param dateString The date string to format (ISO 8601 format expected).
 * @returns The formatted relative time string in Turkish.
 */
export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) {
    return '-';
  }
  try {
    const date = new Date(dateString);
    // 'includeSeconds: true' daha hassas zaman farkı sağlar, isteğe bağlı
    return formatDistanceToNowStrict(date, { addSuffix: true, locale: tr });
  } catch (error) {
    console.error("Error formatting time ago:", error);
    return 'Geçersiz tarih';
  }
}

// Başka yardımcı fonksiyonlar buraya eklenebilir...

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Tarayıcı tarafında göreceli yol döndür
    return "";
  }
  // Sunucu tarafı için VERCEL_URL, NEXT_PUBLIC_APP_URL veya localhost kullan
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Geliştirme ortamı için localhost varsay
  return `http://localhost:${process.env.PORT || 3000}`;
}
