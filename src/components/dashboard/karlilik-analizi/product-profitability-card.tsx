'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, TrendingUp, Calculator, Loader2, AlertCircle, Info, Tag, Send, Edit, PackageX } from 'lucide-react';
// Prisma tiplerini doğrudan import edemeyebiliriz, bu yüzden benzer bir yapı tanımlıyoruz
// Veya daha iyisi: Bu tipi paylaşılabilir bir yere (örn: @/types) taşıyıp import etmek
import type { Product as PrismaProduct, Brand, Category, GeneralCostSetting } from '@prisma/client';
// Shadcn UI bileşenleri
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EditCostModal } from './edit-cost-modal';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type ProductWithRelations = PrismaProduct & {
    brand: Brand | null;
    category: Category | null;
};

// GeneralCostSetting tipi (Gerekli alanlar)
interface GeneralCostSettingData {
  defaultProfitCalculationMethod: "MARGIN" | "MARKUP" | null;
  defaultProfitRate: number | null;
}

// API yanıtı için tip (Genişletilmiş)
interface PriceRecommendationResponse {
    recommendedPrice: number;
    breakdown: {
        costPrice: number;
        shippingCostExclVat: number;
        shippingKDV: number;
        additionalCost: number;
        commissionAmount: number;
        commissionKDV: number;
        taxAmount: number;
        netProfitAmount: number; // targetProfitAmount yerine
        salesKDV: number;
        costKDV_Deductible: number;
        netKDVPayable: number;
        isBaremApplied: boolean;
        recommendedPrice: number;
        // Yeni eklenen alanlar
        calculationMethodUsed: "MARGIN" | "MARKUP";
        profitRateUsed: number;
        recommendedPriceExclVat: number;
    };
}

interface ProductProfitabilityCardProps {
    product: ProductWithRelations;
    generalCostSetting: GeneralCostSetting | null;
    recommendedPrice?: number | null;
    currentBulkRecommendation?: number | null;
    onDetailsClick: () => void;
    onProductUpdate: () => void;
    isSelected: boolean;
    onSelectionChange: (productId: string, isSelected: boolean) => void;
}

export function ProductProfitabilityCard({
     product, 
     generalCostSetting, 
     recommendedPrice,
     currentBulkRecommendation,
     onDetailsClick,
     onProductUpdate, 
     isSelected, 
     onSelectionChange 
}: ProductProfitabilityCardProps) {

    // State Yönetimi
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    // Yeni state'ler
    const [calculationMethod, setCalculationMethod] = useState<"MARGIN" | "MARKUP">("MARGIN");
    const [profitRateInput, setProfitRateInput] = useState<string>('');
    const [isLoadingDefaults, setIsLoadingDefaults] = useState(false); // Varsayılanları yükleme state'i
    
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);
    const [priceRecommendationResult, setPriceRecommendationResult] = useState<PriceRecommendationResponse | null>(null);
    const [priceError, setPriceError] = useState<string | null>(null);
    const [isApplyingPrice, setIsApplyingPrice] = useState(false); // Yeni state: Fiyat uygulama yüklenme durumu
    const [isCostModalOpen, setIsCostModalOpen] = useState(false); // Maliyet modalı için state

    // Popover açıldığında varsayılan ayarları API'den çek
    useEffect(() => {
        if (isPopoverOpen) {
            // Önceki sonuçları temizle
            setPriceRecommendationResult(null);
            setPriceError(null);
            setProfitRateInput(''); // Input'u temizle
            setCalculationMethod("MARGIN"); // Varsayılana dön
            
            const fetchInitialData = async () => {
                try {
                    // Fetch general cost settings first
                    const response = await fetch('/api/settings/cost/general'); // Yol güncellendi
                    if (!response.ok) {
                        throw new Error('Genel maliyet ayarları alınamadı');
                    }
                    const data: GeneralCostSettingData = await response.json();
                    setCalculationMethod(data.defaultProfitCalculationMethod ?? "MARGIN");
                    setProfitRateInput(data.defaultProfitRate?.toString() ?? '');
                } catch (error) {
                    console.error("Varsayılan ayarları getirme hatası:", error);
                } finally {
                    setIsLoadingDefaults(false);
                }
            };
            fetchInitialData();
        }
    }, [isPopoverOpen]);

    // Fiyat Hesaplama Fonksiyonu (Güncellendi)
    const handleCalculatePrice = useCallback(async () => {
        setIsLoadingPrice(true);
        setPriceError(null);
        setPriceRecommendationResult(null);

        const rate = parseFloat(profitRateInput);
        if (isNaN(rate) || rate < 0) {
            setPriceError('Geçerli bir pozitif oran girin.');
            setIsLoadingPrice(false);
            return;
        }

        try {
            const payload = {
                profitRate: rate, // Yüzde değeri gönder
                calculationMethod: calculationMethod,
            };

            const response = await fetch(`/api/products/${product.id}/recommend-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                 // API'den gelen hata mesajını veya detayını kullan
                 const errorMessage = result.error || (result.details ? JSON.stringify(result.details) : `Fiyat önerisi alınamadı (${response.status})`);
                 throw new Error(errorMessage);
            }

            setPriceRecommendationResult(result as PriceRecommendationResponse);

        } catch (err: any) {
            console.error("Fiyat önerisi hesaplama hatası:", err);
            const displayError = err.message || 'Hesaplama sırasında bir hata oluştu.';
            setPriceError(displayError);
            // toast.error(displayError); // Hata mesajı altta gösterildiği için toast gereksiz olabilir
        } finally {
            setIsLoadingPrice(false);
        }
    }, [product.id, profitRateInput, calculationMethod]);

    // Görsel URL'sini güvenli bir şekilde al
    const getImageUrl = (): string => {
        try {
            const images = product.images;
            if (Array.isArray(images) && images.length > 0) {
                const firstImage = images[0];
                if (firstImage && typeof firstImage === 'object' && 'url' in firstImage && typeof firstImage.url === 'string') {
                    return firstImage.url;
                }
            }
            else if (images && typeof images === 'object' && !Array.isArray(images) && 'url' in images && typeof (images as any).url === 'string') {
                 return (images as { url: string }).url;
             }
        } catch (e) { console.error("Image URL parse error:", e); }
        return '/placeholder.png';
    };
    const imageUrl = getImageUrl();

    // Ürün özelliklerini formatla
    const getAttributeString = (): string => {
        try {
            const attributes = product.attributes;
            if (Array.isArray(attributes)) {
                const formattedAttributes = attributes
                    .filter(attr => 
                        attr !== null &&
                        typeof attr === 'object' &&
                        typeof (attr as any)?.attributeName === 'string' &&
                        (attr as any)?.attributeValue !== undefined 
                    )
                    .map(attr => {
                        const name = (attr as any).attributeName as string;
                        const value = (attr as any).attributeValue;
                        return `${name}: ${value !== null ? String(value) : '-'}`;
                    });

                if (formattedAttributes.length > 0) {
                    return formattedAttributes.join(' / ');
                }
            }
        } catch (e) {
            console.error("Attribute parse error:", e);
        }
        return 'Detay yok';
    };
    const attributeString = getAttributeString();

    // Fiyatları Formatlama
    const formattedSalePrice = formatCurrency ? formatCurrency(product.salePrice) : `${product.salePrice.toFixed(2)} TL`;
    const formattedCostPrice = product.costPrice !== null
                                ? (formatCurrency ? formatCurrency(product.costPrice) : `${product.costPrice.toFixed(2)} TL`)
                                : null;
    
    // Yaklaşık Mevcut Kâr Marjı Hesaplama
    let currentProfitMargin: number | null = null;
    if (product.costPrice !== null && product.salePrice > 0) {
        // Basit marj: (Satış - Maliyet) / Satış
        // Daha doğru hesaplama için genel ayarlar kullanılabilir ama modalda yapılacak.
        const profit = product.salePrice - product.costPrice;
        currentProfitMargin = (profit / product.salePrice) * 100;
    }
    const formattedCurrentProfitMargin = currentProfitMargin !== null ? `${currentProfitMargin.toFixed(1)}%` : '?';

    // Gösterilecek Tavsiye Fiyatını Belirle
    const displayRecommendedPrice = 
        currentBulkRecommendation !== undefined && currentBulkRecommendation !== null 
            ? currentBulkRecommendation
            // Önce popover'daki anlık hesaplama, sonra toplu hesaplama, sonra veritabanı
            : (priceRecommendationResult?.recommendedPrice ?? currentBulkRecommendation ?? product.recommendedSalePrice ?? null);

    const formattedRecommendedPrice = displayRecommendedPrice !== null 
                                        ? formatCurrency(displayRecommendedPrice) 
                                        : null;

    // Stok Durumu
    // Hem null hem '0' hem '0.0' gibi değerler kontrol ediliyor
    const hasStock = product.quantity != null && 
                    parseFloat(String(product.quantity)) > 0;
    // Stok seviyesi için: yoksa veya null ise 0 kabul et
    const stockLevel = product.quantity ?? 0;

    // Karlılık Durumu
    let profitabilityStatus: 'positive' | 'negative' | 'neutral' = 'neutral';
    let profitChangeText = '-';
    if (displayRecommendedPrice !== null && product.costPrice !== null) {
        const currentProfit = product.salePrice - product.costPrice; // Basit kâr (detay modalda)
        // Önerilen fiyat için basit karı tahmin edelim (şimdilik komisyonsuz vb.)
        const recommendedSimpleProfit = displayRecommendedPrice - product.costPrice;
        if (recommendedSimpleProfit > currentProfit) {
            profitabilityStatus = 'positive';
            const increase = recommendedSimpleProfit - currentProfit;
            profitChangeText = `≈ ${formatCurrency(increase)} artış`;
        } else if (recommendedSimpleProfit < currentProfit) {
            profitabilityStatus = 'negative';
            const decrease = currentProfit - recommendedSimpleProfit;
            profitChangeText = `≈ ${formatCurrency(decrease)} azalış`;
        }
    }

    const handleCostModalOpen = () => {
        setIsCostModalOpen(true);
    };

    const handleCostModalClose = () => {
        setIsCostModalOpen(false);
    };

    // Fiyat Uygulama Fonksiyonu (AlertDialog içinden çağrılacak)
    const handleApplyRecommendedPrice = useCallback(async () => {
        const priceToApply = displayRecommendedPrice;
        if (priceToApply === null || priceToApply === undefined || priceToApply <= 0) {
            toast.error("Uygulanacak geçerli bir tavsiye fiyatı bulunamadı.");
            return;
        }
        setIsApplyingPrice(true);
        try {
            const response = await fetch(`/api/products/${product.id}/apply-recommended-price`, {
                method: 'POST',
            });
            const result = await response.json();
            if (!response.ok) {
                 const errorMessage = result.error || (result.details ? JSON.stringify(result.details) : `Fiyat uygulanamadı (${response.status})`);
                 throw new Error(errorMessage);
            }
            toast.success(result.message || `Tavsiye edilen fiyat başarıyla uygulandı.`);
            onProductUpdate(); // Veriyi yenile
        } catch (error: any) {
            console.error("Tavsiye fiyatı uygulama hatası:", error);
            toast.error(`Fiyat uygulanamadı: ${error.message}`);
        } finally {
            setIsApplyingPrice(false);
        }
    }, [product.id, displayRecommendedPrice, onProductUpdate]);

    const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
        onSelectionChange(product.id, !!checked);
    };

    return (
        <>
            <Card className={cn("relative overflow-hidden h-full flex flex-col", isSelected && "ring-2 ring-primary ring-offset-2")}>
                {/* Seçim Checkbox */} 
                <div className="absolute top-2 right-2 z-10">
                    <Checkbox 
                        id={`select-${product.id}`}
                        checked={isSelected}
                        onCheckedChange={handleCheckboxChange}
                        aria-label="Ürünü seç"
                        className="bg-background/80 hover:bg-background border-border"
                    />
                </div>

                <CardContent className="p-0 flex-grow flex flex-col">
                    <div className="relative">
                    <Image
                        src={imageUrl}
                        alt={product.title}
                            width={300}
                            height={300}
                            className="object-cover w-full aspect-square"
                            priority={false} // Genellikle ilk yüklenenler dışındakiler için false
                            unoptimized={imageUrl.startsWith('/placeholder.png')} // Placeholder ise optimizasyonu kapat
                    />
                        {/* Etiketler: Stok, Maliyet, Öneri */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
                            {!hasStock && (
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5 flex items-center gap-1">
                                                <PackageX className="h-3 w-3" />
                                                Stok Yok
                    </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            <p>Stok miktarı 0 veya tanımsız.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                    {formattedCostPrice && (
                                 <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            Maliyet: {formattedCostPrice}
                        </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            <p>Ürünün birim maliyeti (KDV Hariç).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="absolute top-1 right-10 mr-1 flex flex-col gap-1 items-end"> {/* Checkbox'ı engellememek için sağdan boşluk */}
                           {formattedRecommendedPrice && (
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-background/80">
                                                Öneri: {formattedRecommendedPrice}
                         </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                            <p>Hesaplanan veya kaydedilmiş önerilen satış fiyatı (KDV Dahil).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                    <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">{product.brand?.name ?? 'Marka Yok'}{product.category ? ` / ${product.category.name}` : ''}</p>
                            <h3 className="font-semibold text-sm leading-tight mt-1 mb-1 truncate" title={product.title}>
                        {product.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate" title={attributeString}>
                        {attributeString}
                            </p>
                            <p className="text-xs text-muted-foreground truncate" title={product.barcode}>
                                {product.barcode}
                            </p>
                        </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                        <div className="font-medium text-muted-foreground">Satış Fiyatı:</div>
                        <div className="text-right font-semibold">{formattedSalePrice}</div>
                        
                        <div className="font-medium text-muted-foreground flex items-center">
                             Birim Maliyet:
                             <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                                // size="icon-xs" // Geçersiz boyut, className ile ayarla
                                                className="ml-1 h-5 w-5 p-0 text-muted-foreground hover:text-primary" 
                                            onClick={handleCostModalOpen}
                                        >
                                            <Edit className="h-3 w-3"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p className="text-xs">Birim maliyeti düzenle</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                         <div className="text-right font-semibold">
                             {formattedCostPrice ?? 
                                <span className="text-red-600 text-xs cursor-pointer" onClick={handleCostModalOpen}>Tanımlanmadı</span>}
                        </div>
                        
                        <div className="font-medium text-muted-foreground">Yaklaşık Marj:</div>
                        <div className="text-right font-semibold">{formattedCurrentProfitMargin}</div>
                            
                            <div className="font-medium text-muted-foreground">Stok Durumu:</div>
                            <div className="text-right font-semibold">
                                {hasStock ? stockLevel : <span className="text-red-600">Stok Yok</span>}
                            </div>
                        
                        <div className="font-medium text-muted-foreground">Tavsiye Fiyat:</div>
                         <div className={cn(
                            "text-right font-bold",
                            profitabilityStatus === 'positive' && 'text-green-600',
                            profitabilityStatus === 'negative' && 'text-red-600',
                            profitabilityStatus === 'neutral' && 'text-muted-foreground'
                        )}>
                             {formattedRecommendedPrice}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-3 border-t bg-muted/50 flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={onDetailsClick} className="text-xs">
                         <Calculator className="mr-1.5 h-3.5 w-3.5" />
                         Detaylı Analiz
                     </Button>
                    
                    {/* Fiyat Uygulama Butonu (AlertDialog ile) */} 
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button 
                                size="sm" 
                                className="text-xs gap-1.5" 
                                disabled={!displayRecommendedPrice || displayRecommendedPrice <= 0 || isApplyingPrice} 
                                variant={profitabilityStatus === 'positive' ? "default" : "secondary"}
                            > 
                                 {isApplyingPrice 
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                                    : profitabilityStatus === 'positive' 
                                        ? <TrendingUp className="h-3.5 w-3.5" /> 
                                        : <Send className="h-3.5 w-3.5" />
                                }
                                Fiyatı Uygula
                             </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                                 <AlertDialogTitle>Fiyat Güncelleme Onayı</AlertDialogTitle>
                                 <AlertDialogDescription>
                                     '{product.title}' ürününün satış fiyatı Trendyol'da 
                                    <strong className="mx-1">{formattedRecommendedPrice}</strong> 
                                    olarak güncellenecektir. Bu işlem geri alınamaz. Emin misiniz?
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel disabled={isApplyingPrice}>İptal</AlertDialogCancel>
                                 <AlertDialogAction 
                                     onClick={async (e) => { 
                                         e.preventDefault(); // Otomatik kapanmayı engelle
                                         await handleApplyRecommendedPrice(); // Doğrudan fonksiyonu çağır
                                     }}
                                    disabled={isApplyingPrice}
                                    className={cn(isApplyingPrice && "opacity-50 cursor-not-allowed")} // Yüklenirken stil ekle
                                >
                                     {isApplyingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                    Onayla ve Uygula
                                 </AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
            
            {/* Maliyet Düzenleme Modalı */} 
            <EditCostModal 
                isOpen={isCostModalOpen}
                onClose={handleCostModalClose}
                product={product} // Tam product objesini geçelim, modal içinden gerekli alanları alır
                onCostUpdate={() => {
                    // Maliyet güncellendiğinde ana sayfadaki veriyi yenile
                    onProductUpdate();
                }}
            />
        </>
    );
} 