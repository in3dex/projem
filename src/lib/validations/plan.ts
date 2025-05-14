import * as z from "zod";

// Helper function to preprocess numeric input to string (Artık kullanılmıyor)
// const preprocessNumberToString = (val: unknown): string => String(val ?? '');

// Helper function to validate if a string can be parsed as a float (Artık kullanılmıyor)
// const isStringFloat = (val: string): boolean => !isNaN(parseFloat(val)) || val === '';

// Helper function to validate if a string can be parsed as an integer (Artık kullanılmıyor)
// const isStringInt = (val: string): boolean => !isNaN(parseInt(val, 10)) || val === '';

export const planSchema = z.object({
  name: z.string().min(3, { message: "Plan adı en az 3 karakter olmalıdır." }),
  description: z.string().optional(),
  // Fiyatları doğrudan number olarak bekle (form tarafı handle ediyor)
  priceMonthly: z.number({ invalid_type_error: "Aylık fiyat geçerli bir sayı olmalıdır." }).nullable().optional(),
  priceYearly: z.number({ invalid_type_error: "Yıllık fiyat geçerli bir sayı olmalıdır." }).nullable().optional(),
  // currency alanı kaldırıldı
  // Özellikleri string olarak al, action içinde parse edilecek
  features: z.string().optional(),
  // Limitleri doğrudan number olarak bekle (form tarafı handle ediyor)
  maxProducts: z.number({ invalid_type_error: "Ürün limiti geçerli bir tam sayı olmalıdır." }).int({ message: "Ürün limiti tam sayı olmalıdır." }).positive({ message: "Ürün limiti pozitif olmalıdır." }).nullable().optional(),
  maxOrders: z.number({ invalid_type_error: "Sipariş limiti geçerli bir tam sayı olmalıdır." }).int({ message: "Sipariş limiti tam sayı olmalıdır." }).positive({ message: "Sipariş limiti pozitif olmalıdır." }).nullable().optional(),
  // maxUsers alanı kaldırıldı
  isActive: z.boolean().default(true),
  // Stripe ID'leri opsiyonel
  stripePriceIdMonthly: z.string().optional().nullable(),
  stripePriceIdYearly: z.string().optional().nullable(),
});

export type PlanFormData = z.infer<typeof planSchema>; 