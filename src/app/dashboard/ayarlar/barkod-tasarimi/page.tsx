'use client';

import { useState, useEffect, useTransition, ChangeEvent, useCallback } from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, UploadCloud, XCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// Varsayılan değerler
const defaultBarcodeSettings = {
  includeOrderNumber: true,
  includeCustomerName: true,
  includeCustomerAddress: true,
  includeProductList: false,
  includeShippingProvider: true,
  includeBarcodeText: true,
  includeLogo: false,
  barcodeType: 'CODE128',
};

// Zod şeması
const barcodeSettingsSchema = z.object({
  includeOrderNumber: z.boolean(),
  includeCustomerName: z.boolean(),
  includeCustomerAddress: z.boolean(),
  includeProductList: z.boolean(),
  includeShippingProvider: z.boolean(),
  includeBarcodeText: z.boolean(),
  includeLogo: z.boolean(),
  barcodeType: z.string().min(1, { message: "Barkod tipi seçilmelidir." }),
});

type BarcodeSettingsFormData = z.infer<typeof barcodeSettingsSchema>;

// Veritabanından gelen tam tip (şimdilik any)
interface BarcodeSetting extends BarcodeSettingsFormData {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Kullanıcı bilgisi tipi (şimdilik any)
interface UserData {
  logoUrl: string | null;
}

// -------- Önizleme Bileşeni --------
interface LabelPreviewProps {
  settings: BarcodeSettingsFormData;
  logoUrl: string | null;
  barcodeImageUrl: string | null;
  isLoadingBarcode: boolean;
}

function LabelPreview({ settings, logoUrl, barcodeImageUrl, isLoadingBarcode }: LabelPreviewProps) {
  // Placeholder veriler
  const placeholder = {
    orderNumber: "PREVIEW123",
    customerName: "Ahmet Yılmaz",
    customerAddress: "Örnek Mah. Test Cad. No: 5 Daire: 10, İstanbul",
    shippingProvider: "XYZ Kargo",
    barcodeText: "PREVIEW1234567890",
    items: [
      { productName: 'Ürün A', quantity: 1, merchantSku: 'SKU001' },
      { productName: 'Ürün B', quantity: 2, merchantSku: 'SKU002' },
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="mr-2 h-5 w-5" />
          Etiket Önizlemesi
        </CardTitle>
        <CardDescription>Ayarlarınız etikette bu şekilde görünecek.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border border-dashed p-4 bg-white text-black text-xs font-sans relative aspect-[210/297] overflow-hidden">
          {/* Simüle edilmiş label-container içeriği */}
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 min-h-[30px]">
              <div className="w-[75px] h-[30px]"> {/* Logo Alanı */}
                {settings.includeLogo && logoUrl && (
                  <Image src={logoUrl} alt="Logo" width={75} height={30} className="object-contain max-h-[30px]" />
                )}
              </div>
              {settings.includeShippingProvider && (
                <div className="text-right text-[8pt] text-gray-600">
                  Kargo Firması:<br /><strong>{placeholder.shippingProvider}</strong>
                </div>
              )}
            </div>

            {/* Alıcı Bilgileri */}
            <div className="border border-dashed border-gray-300 p-1 mb-2 text-[8pt]">
              <div className="font-bold mb-1 border-b border-gray-300 pb-0.5">Alıcı Bilgileri</div>
              <div className="grid grid-cols-[50px_1fr] gap-x-1">
                {settings.includeOrderNumber && (<><span className="font-medium">Sipariş No:</span><span>{placeholder.orderNumber}</span></>)}
                {settings.includeCustomerName && (<><span className="font-medium">Ad Soyad:</span><span>{placeholder.customerName}</span></>)}
              </div>
              {settings.includeCustomerAddress && (
                <div className="mt-1">
                  <span className="font-medium">Adres:</span><br />
                  <span className="leading-tight">{placeholder.customerAddress}</span>
                </div>
              )}
            </div>

            {/* Ürünler */}
            {settings.includeProductList && (
              <div className="border border-dashed border-gray-300 p-1 mb-2 text-[7pt]">
                <div className="font-bold mb-1 border-b border-gray-300 pb-0.5">Ürünler ({placeholder.items.length})</div>
                <ul className="list-none p-0 m-0">
                  {placeholder.items.map((item, index) => (
                    <li key={index} className="border-b border-dotted border-gray-300 py-0.5 last:border-b-0">
                      {item.productName} ({item.quantity}) 
                      {item.merchantSku && <span className="text-gray-500 text-[6pt] ml-1">SKU: {item.merchantSku}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Barkod Alanı (Alta Yaslı) */}
            <div className="mt-auto pt-2 text-center border-t border-gray-300">
               {!settings.includeLogo && <div className="text-[8pt] font-bold mb-1">Kargo Barkodu</div>}
               <div className="flex justify-center items-center h-[60px]"> {/* Yükseklik sabitlendi */} 
                 {isLoadingBarcode ? (
                   <Skeleton className="h-[50px] w-[80%]" />
                 ) : barcodeImageUrl ? (
                   <Image src={barcodeImageUrl} alt="Barkod" width={180} height={50} className="object-contain max-h-[50px]" />
                 ) : (
                   <p className="text-destructive text-xs">Barkod yüklenemedi.</p>
                 )}
               </div>
               {settings.includeBarcodeText && barcodeImageUrl && !isLoadingBarcode && (
                 <div className="text-[9pt] font-bold mt-0.5 tracking-wider">{placeholder.barcodeText}</div>
               )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
// -------- Önizleme Bileşeni Sonu --------


export default function BarkodTasarimiPage() {
  const [settings, setSettings] = useState<BarcodeSetting | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null); // logoUrl için
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // Logo önizlemesi
  const [previewBarcodeUrl, setPreviewBarcodeUrl] = useState<string | null>(null); // Barkod önizlemesi
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const { 
    handleSubmit, 
    control, 
    reset, 
    formState: { isDirty, errors },
    watch // Formdaki değişiklikleri izlemek için
  } = useForm<BarcodeSettingsFormData>({
    resolver: zodResolver(barcodeSettingsSchema),
    defaultValues: defaultBarcodeSettings 
  });

  // Formdaki değerleri izle
  const watchedSettings = watch();

  // Ayarları ve kullanıcı datasını yükle (İlk yükleme)
  useEffect(() => {
    let isMounted = true; // Component unmount olursa state güncellemesini engelle
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Kullanıcı verisini gerçek endpoint'ten çek
        // const sessionResponse = await fetch('/api/auth/session'); // Varsayımsal endpoint kaldırıldı
        const userResponse = await fetch('/api/user/me'); // GERÇEK ENDPOINT'İ BURAYA YAZIN
        let fetchedUserData: UserData = { logoUrl: null };

        if (userResponse.ok) {
          const userDataResponse = await userResponse.json();
          // Dönen verinin yapısına göre logoUrl'i alın
          // Örneğin: userDataResponse.logoUrl, userDataResponse.user.logoUrl vb.
          fetchedUserData = { logoUrl: userDataResponse?.logoUrl || null }; 
        } else {
          // Hata durumunu logla veya kullanıcıya bildir
          console.error("Kullanıcı bilgileri alınamadı. Status:", userResponse.status);
          toast.error("Kullanıcı bilgileri yüklenemedi.");
          // Hata durumunda logoUrl null kalır
        }
        
        if (isMounted) {
            setUserData(fetchedUserData);
            setPreviewUrl(fetchedUserData.logoUrl);
        }

        // Barkod ayarlarını çek (Bu kısım aynı kalır)
        const settingsResponse = await fetch('/api/settings/barcode');
        if (!settingsResponse.ok) {
          let errorMsg = 'Barkod ayarları yüklenemedi.';
          try { const errorData = await settingsResponse.json(); errorMsg = errorData.error || errorMsg; } catch {}
          throw new Error(errorMsg);
        }
        const fetchedSettings: BarcodeSetting | null = await settingsResponse.json();
        
        if (isMounted) {
            if (fetchedSettings) {
              setSettings(fetchedSettings);
              reset(fetchedSettings); 
            } else {
              setSettings(null);
              reset(defaultBarcodeSettings);
            }
        }

      } catch (error: any) {
        console.error("Veri yükleme hatası:", error);
        if (isMounted) {
            toast.error(`Veri yüklenirken hata: ${error.message}`);
            reset(defaultBarcodeSettings);
        }
      } finally {
        if (isMounted) {
        setIsLoading(false);
        }
      }
    };
    fetchData();

    // Cleanup fonksiyonu
    return () => {
        isMounted = false;
    };
  }, [reset]);

  // Barkod Önizlemesini Güncelle (Debounce ile)
  const fetchPreviewBarcode = useCallback(async (type: string, includeText: boolean) => {
    setIsLoadingBarcode(true);
    try {
      const params = new URLSearchParams({
        text: 'PREVIEW1234567890', // Sabit önizleme metni
        type: type,
        includetext: String(includeText),
      });
      const response = await fetch(`/api/barcode/generate?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Barkod resmi oluşturulamadı.');
      }
      setPreviewBarcodeUrl(result.barcodeImage);
    } catch (error: any) {
      console.error("Barkod önizleme hatası:", error);
      setPreviewBarcodeUrl(null); // Hata durumunda resmi temizle
      // toast.error(`Barkod önizleme hatası: ${error.message}`); // Çok fazla toast olabilir
    } finally {
      setIsLoadingBarcode(false);
    }
  }, []);

  // İzlenen değerler değiştiğinde barkod önizlemesini güncelle
  useEffect(() => {
    const { barcodeType, includeBarcodeText } = watchedSettings;
    if (barcodeType) { // Tip seçildiyse
      if (debounceTimeout) clearTimeout(debounceTimeout);
      const newTimeout = setTimeout(() => {
        fetchPreviewBarcode(barcodeType, includeBarcodeText);
      }, 500); // 500ms bekle
      setDebounceTimeout(newTimeout);
    }
    // Cleanup function
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [watchedSettings.barcodeType, watchedSettings.includeBarcodeText, fetchPreviewBarcode]);


  // Dosya seçimi
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setPreviewUrl(reader.result as string); }
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(userData?.logoUrl || null);
    }
  };

  // Logo Yükleme
  const handleLogoUpload = () => {
    if (!selectedFile) {
      toast.warning("Lütfen önce bir logo dosyası seçin.");
      return;
    }
    startUploadTransition(async () => {
      const formData = new FormData();
      formData.append('logo', selectedFile);
      try {
        const response = await fetch('/api/settings/logo', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Logo yüklenemedi.');
        }
        setUserData({ logoUrl: result.logoUrl });
        setPreviewUrl(result.logoUrl);
        setSelectedFile(null);
        toast.success('Logo başarıyla yüklendi!');
      } catch (error: any) {
        toast.error(`Logo yüklenirken hata: ${error.message}`);
      }
    });
  };

  // Logo Silme
  const handleLogoDelete = () => {
    toast.info('Logo silme özelliği henüz aktif değil.');
  };

  // Ayarları kaydet
  const onSubmit = (data: BarcodeSettingsFormData) => {
    startSaveTransition(async () => {
      try {
        const response = await fetch('/api/settings/barcode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Ayarlar kaydedilemedi.');
        }
        setSettings(result.settings);
        reset(result.settings);
        toast.success('Barkod ayarları başarıyla kaydedildi!');
      } catch (error: any) {
        toast.error(`Ayarlar kaydedilirken hata: ${error.message}`);
      }
    });
  };

  // Barkod Tipleri
  const barcodeTypes = [
    { value: 'CODE128', label: 'Code 128 (Varsayılan)' },
    { value: 'CODE39', label: 'Code 39' },
    { value: 'EAN13', label: 'EAN-13' },
    { value: 'UPCA', label: 'UPC-A' },
    { value: 'ITF14', label: 'ITF-14' },
    { value: 'QRCODE', label: 'QR Kod' },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Barkod Etiketi Tasarımı</h1>

      {/* Grid yapısı: Ayarlar | Logo & Önizleme */} 
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Sol Sütun: Ayarlar Formu */} 
        <div className="lg:col-span-2 space-y-6">
      <Card>
        <CardHeader>
              <CardTitle>Etiket İçeriği ve Tipi</CardTitle>
          <CardDescription>
                Kargo etiketinde hangi bilgilerin görüneceğini ve barkod tipini seçin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
                  {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-3/4" />)}
              <Skeleton className="h-10 w-24 mt-4" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* İçerik Ayarları (Switch'ler) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Controller name="includeOrderNumber" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s1" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s1" className="cursor-pointer">Sipariş Numarası</Label></div>)} />
                    <Controller name="includeCustomerName" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s2" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s2" className="cursor-pointer">Müşteri Ad Soyad</Label></div>)} />
                    <Controller name="includeCustomerAddress" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s3" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s3" className="cursor-pointer">Müşteri Adresi</Label></div>)} />
                    <Controller name="includeShippingProvider" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s4" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s4" className="cursor-pointer">Kargo Firması Adı</Label></div>)} />
                    <Controller name="includeBarcodeText" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s5" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s5" className="cursor-pointer">Barkod Altında No</Label></div>)} />
                    <Controller name="includeProductList" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s6" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="s6" className="cursor-pointer">Ürün Listesi</Label></div>)} />
                    <Controller name="includeLogo" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Switch id="s7" disabled={!userData?.logoUrl} checked={field.value && !!userData?.logoUrl} onCheckedChange={field.onChange} /><Label htmlFor="s7" className={cn("cursor-pointer", !userData?.logoUrl && 'text-muted-foreground')}>Logoyu Göster {(!userData?.logoUrl ? '(Logo Yüklenmeli)' : '')}</Label></div>)} />
                  </div>

                  {/* Barkod Tipi (Select) */}
              <Controller
                    name="barcodeType"
                control={control}
                render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="barcodeType">Barkod Tipi</Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="barcodeType">
                            <SelectValue placeholder="Barkod Tipi Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {barcodeTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.barcodeType && <p className="text-sm text-destructive">{errors.barcodeType.message}</p>}
                  </div>
                )}
              />
              
                  {/* Kaydet Butonu */} 
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={!isDirty || isSaving}>
                  {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />} 
                      {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Sağ Sütun: Logo ve Önizleme */} 
        <div className="lg:col-span-1 space-y-6">
          {/* Logo Yönetimi Kartı */}
          <Card>
            <CardHeader>
              <CardTitle>Etiket Logosu</CardTitle>
              <CardDescription>
                Etiketin üst kısmında görünecek logoyu yükleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                 <div className="space-y-4">
                   <Skeleton className="h-24 w-full" />
                   <Skeleton className="h-10 w-full" />
                 </div>
              ) : (
                <>
                  {/* Logo Önizleme ve Yükleme */}
                  <div className="border rounded-md p-4 flex items-center justify-center min-h-[100px] bg-muted/30">
                    {previewUrl ? (
                       <div className="relative group">
                         <Image src={previewUrl} alt="Logo Önizleme" width={150} height={75} className="object-contain max-h-[75px]" />
                         <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleLogoDelete} title="Logoyu Sil (Yakında)">
                           <XCircle className="h-4 w-4" />
                         </Button>
                       </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Logo yüklenmemiş.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Yeni Logo Yükle (Max 2MB)</Label>
                    <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleFileChange} disabled={isUploading} />
                  </div>
                  <Button onClick={handleLogoUpload} disabled={!selectedFile || isUploading} className="w-full">
                    {isUploading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />} 
                    {isUploading ? 'Yükleniyor...' : <><UploadCloud className="mr-2 h-4 w-4" /> Seçilen Logoyu Yükle</>}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Etiket Önizleme Kartı */} 
          <LabelPreview 
            settings={watchedSettings} 
            logoUrl={previewUrl}
            barcodeImageUrl={previewBarcodeUrl} 
            isLoadingBarcode={isLoadingBarcode}
          />

        </div>

      </div>
    </>
  );
} 