'use client'

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from '@/lib/utils';
import type { Product as PrismaProduct, Brand, Category } from '@prisma/client'; // Prisma tipini import et

// Gelen veri için tip (Marka ve Kategori dahil)
type ProductForForm = PrismaProduct & { brand: Brand; category: Category };

// Form Değerleri için Zod Şeması
const productEditSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir').max(200, 'Başlık 200 karakterden uzun olamaz'), // Trendyol limitlerine göre ayarlanabilir
  description: z.string().max(30000, 'Açıklama 30000 karakterden uzun olamaz').nullish(),
  stockCode: z.string().max(100, 'Stok kodu 100 karakterden uzun olamaz').nullish(),
  dimensionalWeight: z.coerce // coerce kullan
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .positive('Desi pozitif olmalı')
    .nullable()
    .optional(),
  vatRate: z.coerce // coerce kullan
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .int('Tam sayı olmalı')
    .min(0, 'KDV oranı negatif olamaz')
    .max(100, 'Geçersiz KDV oranı')
    .nullable()
    .optional(),
  quantity: z.coerce // coerce kullan
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .int('Stok tam sayı olmalı')
    .min(0, 'Stok negatif olamaz')
    .nullable()
    .optional(),
  salePrice: z.coerce // coerce kullan
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .positive('Satış fiyatı pozitif olmalı')
    .nullable()
    .optional(),
  listPrice: z.coerce // coerce kullan
    .number({ invalid_type_error: 'Geçerli bir sayı girin' })
    .positive('Liste fiyatı pozitif olmalı')
    .nullable()
    .optional(),
  // barcode: z.string(), // Kaldırıldı: Formda düzenlenmez, API productId kullanır
});

type ProductEditFormValues = z.infer<typeof productEditSchema>;

interface ProductEditFormProps {
  productId: string | null; // barcode yerine productId
  // isOpen, onClose gibi propslar artık üst bileşen (EditProductModal) tarafından yönetiliyor olabilir.
  // Eğer bu form doğrudan modal içinde değilse veya kendi state'i varsa korunmalı.
  // Mevcut kodda isOpen ve onClose doğrudan kullanılmıyor gibi, onCancel var.
  onSuccess: (type: 'info' | 'price' | 'delete') => void;
  onCancel: () => void;
}

export function ProductEditForm({ productId, onSuccess, onCancel }: ProductEditFormProps) {
  const [productData, setProductData] = useState<ProductForForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSubmitting = isSubmittingInfo || isSubmittingPrice || isDeleting;

  const form = useForm<ProductEditFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      title: '',
      description: null,
      stockCode: null,
      dimensionalWeight: null,
      vatRate: null,
      quantity: null,
      salePrice: null,
      listPrice: null,
      // barcode: productId ?? '', // Kaldırıldı
    },
  });

  useEffect(() => {
    // Sadece geçerli bir productId varsa ve component mount olduğunda veri çek
    // isOpen kontrolü kaldırıldı, bu formun görünürlüğü üst bileşene bağlı.
    if (productId) {
      setIsLoading(true);
      setProductData(null); // Önceki veriyi temizle
      form.reset(); // Formu sıfırla
      console.log(`[ProductEditForm] Fetching data for productId: ${productId}`);

      const fetchProductData = async () => {
        try {
          // API isteğini productId ile yap
          const response = await fetch(`/api/products/${productId}`);
          console.log(`[ProductEditForm] API Response Status: ${response.status}`);

          if (!response.ok) {
            let errorText = 'Bilinmeyen Hata';
            try {
              errorText = await response.text();
              console.error(`[ProductEditForm] API Error Response Text: ${errorText}`);
            } catch (e) {
              console.error("[ProductEditForm] Hata yanıt metni okunamadı", e);
            }
            throw new Error(`API Hatası ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log("[ProductEditForm] Gelen API Verisi:", JSON.stringify(data, null, 2));

          if (!data || typeof data !== 'object') {
             throw new Error("API'den geçersiz veri formatı alındı.");
          }
           if (!data.brand || !data.category) {
              console.warn("[ProductEditForm] API yanıtında Marka/Kategori bilgisi eksik olabilir.", data);
              // throw new Error("API yanıtında Marka/Kategori bilgisi eksik."); // Şimdilik hata vermeyelim
          }

          setProductData(data as ProductForForm);
          console.log("[ProductEditForm] Ürün data state'i ayarlandı.");

          // Formu gelen veriyle doldur
          form.reset({
            title: data.title || '',
            description: data.description,
            stockCode: data.stockCode,
            dimensionalWeight: data.dimensionalWeight !== null ? parseFloat(data.dimensionalWeight) : null,
            vatRate: data.vatRate !== null ? parseInt(data.vatRate) : null,
            quantity: data.quantity !== null ? parseInt(data.quantity) : null,
            salePrice: data.salePrice !== null ? parseFloat(data.salePrice) : null,
            listPrice: data.listPrice !== null ? parseFloat(data.listPrice) : null,
            // barcode alanı formdan kaldırıldığı için reset'te de kaldırıldı.
          });
          console.log("[ProductEditForm] Form resetlendi.");

        } catch (error: any) {
          console.error("[ProductEditForm] Ürün verisi çekme hatası:", error);
          toast.error(`Ürün bilgileri alınamadı: ${error.message}`);
          onCancel(); // Hata durumunda formu/modalı kapat
        } finally {
          setIsLoading(false);
          console.log("[ProductEditForm] setIsLoading(false) çağrıldı.");
        }
      };

      fetchProductData();
    } else {
        // productId yoksa veya değiştiğinde temizle
         setProductData(null);
         form.reset();
         setIsLoading(false);
         setIsSubmittingInfo(false);
         setIsSubmittingPrice(false);
         setIsDeleting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, form.reset, onCancel]); // form yerine form.reset eklendi, onCancel bağımlılıklarda

  // ProductUpdateItem ve PriceInventoryUpdateItem tiplerinin projenizde tanımlı olduğunu varsayıyoruz.
  // Eğer tanımlı değilse, burada tanımlanmaları gerekir.
  // Örneğin:
  // type ProductUpdateItem = Partial<Omit<PrismaProduct, 'id' | 'barcode' | 'createdAt' | 'updatedAt' | 'brandId' | 'categoryId'>>;
  // type PriceInventoryUpdateItem = { quantity?: number; salePrice?: number; listPrice?: number };

  // --- Gönderme Fonksiyonları ---
  const onSubmitInfo: SubmitHandler<ProductEditFormValues> = async (data) => {
    if (!productData || !productId) return; // productId kontrolü eklendi

    // Değişen alanları bulma (barcode hariç)
    const changedFields: Partial<PrismaProduct> = {}; // PrismaProduct tipini kullanabiliriz
    if (data.title !== productData.title) changedFields.title = data.title;
    if (data.description !== productData.description) changedFields.description = data.description ?? null;
    if (data.stockCode !== productData.stockCode) changedFields.stockCode = data.stockCode ?? null;
    if (data.dimensionalWeight !== productData.dimensionalWeight) changedFields.dimensionalWeight = data.dimensionalWeight ?? null;
    if (data.vatRate !== productData.vatRate) changedFields.vatRate = data.vatRate ?? null;
    // Diğer potansiyel bilgi alanları buraya eklenebilir (örn: brandId, categoryId eğer düzenlenebiliyorsa)

    if (Object.keys(changedFields).length === 0) {
      toast.info("Genel bilgilerde herhangi bir değişiklik yapılmadı.");
      return;
    }

    setIsSubmittingInfo(true);
    try {
      // Backend'e sadece değişen alanları gönder (PATCH metodu ile)
      const payload = changedFields; // updates objesi doğrudan payload
      console.log(`[onSubmitInfo] Sending PATCH to /api/products/${productId} with payload:`, payload);

      const response = await fetch(`/api/products/${productId}`, { // Endpoint productId ile
        method: 'PATCH', // Metod PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("[onSubmitInfo] Response:", result);

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Ürün bilgileri güncellenemedi');
      }

      toast.success(result.message || "Ürün bilgileri başarıyla güncellendi.");
      onSuccess('info'); // Başarı callback'i
      onCancel(); // Modalı kapat
    } catch (error: any) {
      console.error("Bilgi güncelleme hatası:", error);
      toast.error(`Bilgi güncelleme başarısız: ${error.message}`);
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  const onSubmitPriceInventory: SubmitHandler<ProductEditFormValues> = async (data) => {
     if (!productData || !productId) return; // productId kontrolü eklendi

     // Değişen fiyat/stok alanlarını bul
     const changedFields: Partial<PrismaProduct> = {};
     if (data.quantity !== productData.quantity) changedFields.quantity = data.quantity ?? null;
     if (data.salePrice !== productData.salePrice) changedFields.salePrice = data.salePrice ?? null;
     if (data.listPrice !== productData.listPrice) changedFields.listPrice = data.listPrice ?? null;

     if (Object.keys(changedFields).length === 0) {
       toast.info("Fiyat veya stok bilgilerinde değişiklik yapılmadı.");
       return;
     }

     setIsSubmittingPrice(true);
     try {
       // Backend'e sadece değişen alanları gönder (PATCH metodu ile)
       const payload = changedFields;
       console.log(`[onSubmitPriceInventory] Sending PATCH to /api/products/${productId} with payload:`, payload);

       const response = await fetch(`/api/products/${productId}`, { // Endpoint productId ile
         method: 'PATCH', // Metod PATCH
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
       });

       const result = await response.json();
       console.log("[onSubmitPriceInventory] Response:", result);

       if (!response.ok) {
         throw new Error(result.error || result.details || 'Fiyat/Stok bilgileri güncellenemedi');
       }

       toast.success(result.message || "Fiyat ve stok bilgileri başarıyla güncellendi.");
       onSuccess('price');
       onCancel();
     } catch (error: any) {
       console.error("Fiyat/Stok güncelleme hatası:", error);
       toast.error(`Fiyat/Stok güncelleme başarısız: ${error.message}`);
     } finally {
       setIsSubmittingPrice(false);
     }
   };

  const handleDeleteProduct = async () => {
      if (!productId) return; // productId kontrolü

      setIsDeleting(true);
      try {
          console.log(`[handleDeleteProduct] Sending DELETE request to /api/products/${productId}`);
          const response = await fetch(`/api/products/${productId}`, { // Endpoint productId ile
              method: 'DELETE',
          });

          const result = await response.json(); // JSON yanıtı bekleniyorsa
          console.log("[handleDeleteProduct] Response:", result);

          if (!response.ok) {
              throw new Error(result.error || result.details || 'Ürün silinemedi');
          }

          toast.success(result.message || "Ürün başarıyla silindi.");
          onSuccess('delete'); // Başarı callback'i
          onCancel(); // Modalı kapat
      } catch (error: any) {
          console.error("Ürün silme hatası:", error);
          toast.error(`Ürün silme başarısız: ${error.message}`);
      } finally {
          setIsDeleting(false);
      }
  };

  // --- JSX ---
  // Yükleme durumu gösterimi
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        {/* Diğer alanlar için de skeleton eklenebilir */}
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  // Veri yoksa veya yüklenemediyse (isLoading false ise ve productData null ise)
  if (!productData) {
    return (
        <div className="p-4 text-center text-muted-foreground">
            Ürün bilgileri yüklenemedi veya ürün bulunamadı (ID: {productId}).
        </div>
    );
  }

  // Formun geri kalanı (FormField'lar vb.) aynı kalabilir.
  // Sadece gönderme butonlarının onClick handler'ları doğru fonksiyonları çağırmalı.
  // Silme butonu için AlertDialog içinde handleDeleteProduct çağrılmalı.

  return (
    <Form {...form}>
      {/* Form alanları (FormField) burada */}
      {/* ... Title, Description, StockCode, etc. ... */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
           <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Ürün Başlığı</FormLabel>
                  <FormControl>
                    <Input placeholder="Ürün adı" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
           <FormField
              control={form.control}
              name="stockCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stok Kodu</FormLabel>
                  <FormControl>
                    <Input placeholder="Stok kodu" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ürün açıklaması..." {...field} value={field.value ?? ''} disabled={isSubmitting} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <FormField
            control={form.control}
            name="vatRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KDV Oranı (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Örn: 18"
                    {...field}
                    value={field.value ?? ''} // null ise boş string göster
                    onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} // null veya number ata
                    disabled={isSubmitting}
                    min="0"
                    max="100"
                    step="1"
                   />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dimensionalWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desi</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Örn: 1.5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value.replace(',', '.')))} // null veya float ata
                    disabled={isSubmitting}
                    min="0"
                    step="0.01"
                  />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
      </div>

       <hr className="my-6" />

        <h3 className="text-lg font-medium mb-4">Fiyat ve Stok Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField
              control={form.control}
              name="listPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liste Fiyatı (KDV Dahil)</FormLabel>
                  <FormControl>
                     <Input
                        type="number"
                        placeholder="Örn: 199.90"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value.replace(',', '.')))}
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                      />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Satış Fiyatı (KDV Dahil)</FormLabel>
                  <FormControl>
                     <Input
                        type="number"
                        placeholder="Örn: 149.90"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value.replace(',', '.')))}
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stok Adedi</FormLabel>
                 <FormControl>
                    <Input
                      type="number"
                      placeholder="Örn: 100"
                       {...field}
                      value={field.value ?? ''}
                       onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                       disabled={isSubmitting}
                       min="0"
                       step="1"
                     />
                 </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

       {/* Gönderme ve İptal Butonları */}
       {/* Ayrı butonlar yerine tek bir kaydet butonu ve iptal butonu olabilir.
           Ancak mevcut yapıda Bilgi ve Fiyat/Stok için ayrı submit handler'lar var.
           Bu yapıyı koruyalım. */}
      <DialogFooter className="mt-8 pt-4 border-t gap-2">
         {/* Silme Butonu */}
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mr-auto" disabled={isSubmitting || isLoading}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Ürünü Sil
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. "{productData.title}" adlı ürün kalıcı olarak silinecektir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Evet, Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         {/* İptal Butonu */}
         <DialogClose asChild>
           <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              İptal
           </Button>
         </DialogClose>

         {/* Fiyat/Stok Güncelleme Butonu */}
          <Button
            type="button" // form'u submit etmemeli, kendi handler'ı var
            onClick={form.handleSubmit(onSubmitPriceInventory)} // handleSubmit ile sarmalla
            disabled={isSubmitting}
            variant="secondary" // Veya uygun bir varyant
          >
              {isSubmittingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Fiyat/Stok Güncelle
          </Button>

        {/* Bilgi Güncelleme Butonu */}
        <Button
          type="button" // form'u submit etmemeli
          onClick={form.handleSubmit(onSubmitInfo)} // handleSubmit ile sarmalla
          disabled={isSubmitting}
        >
          {isSubmittingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Bilgileri Kaydet
        </Button>
      </DialogFooter>
    </Form>
  );
}

// Gerekli olabilecek tipler (Projede yoksa tanımlanmalı)
// interface ProductUpdateItem {
//   title?: string;
//   description?: string | null;
//   stockCode?: string | null;
//   dimensionalWeight?: number | null;
//   vatRate?: number | null;
//   // Diğer güncellenebilir alanlar
// }

// interface PriceInventoryUpdateItem {
//   quantity?: number | null;
//   salePrice?: number | null;
//   listPrice?: number | null;
// } 
