'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, XCircle, ArrowRight, Minus, TrendingUp, Info, HelpCircle, Send, Loader2, Zap } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import type { Product as PrismaProduct, Brand, Category, GeneralCostSetting } from '@prisma/client';
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

// Karlılık kütüphanesinden tipleri alalım
import type { BreakdownResult as PriceBreakdown, PriceCalculationResult } from '@/lib/profitability';

// Props için tipler
type ProductWithRelations = PrismaProduct & {
    brand: Brand | null;
    category: Category | null;
};

interface ProfitabilityDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductWithRelations | null;
    generalCostSetting: GeneralCostSetting | null;
    onProductUpdate: () => void;
}

// Helper: Tooltip ile detay item render etme
const BreakdownDetailItemWithTooltip = ({ label, value, currency = true, highlight = false, tooltipContent }: { 
    label: string, 
    value: number | string | boolean | undefined | null, 
    currency?: boolean, 
    highlight?: boolean, 
    tooltipContent?: React.ReactNode 
}) => {
    let displayValue: string;
    if (typeof value === 'boolean') {
        displayValue = value ? 'Evet' : 'Hayır';
    } else if (typeof value === 'number') {
        if (isNaN(value)) { displayValue = 'Hata'; }
        else { displayValue = currency ? formatCurrency(value) : value.toString(); }
    } else {
        displayValue = value ?? '-';
    }
    
    const content = (
        <div className="flex justify-between items-center text-sm py-1.5">
            <span className={cn("text-muted-foreground", highlight && "font-semibold text-foreground")}>{label}:</span>
            <span className={cn("font-semibold", highlight && "text-primary")}>{displayValue}</span>
        </div>
    );

    if (!tooltipContent) {
        return content;
    }

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                     <div className="flex justify-between items-center text-sm py-1.5 cursor-help">
                         <span className={cn("text-muted-foreground flex items-center gap-1", highlight && "font-semibold text-foreground")}>
                             {label}
                            <HelpCircle className="h-3 w-3 text-muted-foreground/70"/>
                        </span>
                         <span className={cn("font-semibold", highlight && "text-primary")}>{displayValue}</span>
                     </div>
                </TooltipTrigger>
                <TooltipContent side="left" align="center" className="max-w-xs text-xs">
                     {tooltipContent}
                 </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export function ProfitabilityDetailsModal({
    isOpen,
    onClose,
    product,
    generalCostSetting,
    onProductUpdate
}: ProfitabilityDetailsModalProps) {

    const [currentBreakdown, setCurrentBreakdown] = useState<PriceBreakdown | null>(null);
    const [recommendedData, setRecommendedData] = useState<PriceCalculationResult | null>(null);
    const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
    const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isApplyingPrice, setIsApplyingPrice] = useState(false);

    const fetchData = useCallback(async () => {
        if (!isOpen || !product || !generalCostSetting) return;

        setIsLoadingCurrent(true);
        setIsLoadingRecommended(true);
        setError(null);
        setCurrentBreakdown(null);
        setRecommendedData(null);

        try {
            // 1. Mevcut Fiyat Analizini Çek
            const currentPrice = product.salePrice;
            const breakdownPromise = fetch(`/api/products/${product.id}/calculate-breakdown?price=${currentPrice}`)
                .then(async res => {
                    if (!res.ok) {
                         const errData = await res.json();
                         throw new Error(`Mevcut fiyat analizi alınamadı: ${errData.error || res.statusText}`);
                    }
                    return res.json() as Promise<PriceBreakdown>;
                });

            // 2. Önerilen Fiyatı ve Analizini Çek (Varsayılan ayarlarla)
            const recommendPayload = {
                profitRate: generalCostSetting.defaultProfitRate ?? 0,
                calculationMethod: generalCostSetting.defaultProfitCalculationMethod ?? 'MARGIN',
            };
            const recommendPromise = fetch(`/api/products/${product.id}/recommend-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recommendPayload)
            }).then(async res => {
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(`Önerilen fiyat alınamadı: ${errData.error || res.statusText}`);
                }
                return res.json() as Promise<PriceCalculationResult>;
            });

            // İstekleri paralel çalıştır
            const [breakdownResult, recommendResult] = await Promise.allSettled([breakdownPromise, recommendPromise]);

            // Sonuçları işle
            if (breakdownResult.status === 'fulfilled') {
                console.log("Mevcut Fiyat Analizi Sonucu:", breakdownResult.value);
                setCurrentBreakdown(breakdownResult.value);
            } else {
                console.error("Mevcut fiyat analizi hatası:", breakdownResult.reason);
                setError(breakdownResult.reason?.message || 'Mevcut fiyat analizi yüklenemedi.');
                // Hata olsa bile devam et, belki diğeri başarılı olmuştur
            }

            if (recommendResult.status === 'fulfilled') {
                console.log("Önerilen Fiyat Analizi Sonucu:", recommendResult.value);
                setRecommendedData(recommendResult.value);
            } else {
                console.error("Önerilen fiyat hatası:", recommendResult.reason);
                // Eğer ilk hata yoksa, bu hatayı göster
                if (!error) {
                     setError(recommendResult.reason?.message || 'Önerilen fiyat yüklenemedi.');
                }
            }

        } catch (err: any) {
            // Promise.allSettled sonrası buraya düşmemeli ama genel hata yakalama
            console.error("Detay modalı veri çekme hatası:", err);
            setError(err.message || "Veriler yüklenirken bilinmeyen bir hata oluştu.");
        } finally {
            setIsLoadingCurrent(false);
            setIsLoadingRecommended(false);
        }

    }, [isOpen, product, generalCostSetting]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isLoading = isLoadingCurrent || isLoadingRecommended;

    // Fiyat Uygulama Fonksiyonu (ProductProfitabilityCard'dan uyarlandı)
    const handleApplyRecommendedPrice = useCallback(async () => {
        const priceToApply = recommendedData?.recommendedPrice;

        if (!product || priceToApply === null || priceToApply === undefined || priceToApply <= 0) {
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
            onClose(); // Modalı kapat
        } catch (error: any) {
            console.error("Tavsiye fiyatı uygulama hatası:", error);
            toast.error(`Fiyat uygulanamadı: ${error.message}`);
        } finally {
            setIsApplyingPrice(false);
        }
    }, [product, recommendedData, onProductUpdate, onClose]);

    // Hesaplanan değerleri al
    const currentPrice = product?.salePrice;
    const currentNetProfit = currentBreakdown?.netProfitAmount;
    const currentMargin = currentBreakdown?.profitMargin;

    const recommendedPrice = recommendedData?.recommendedPrice;
    const recommendedNetProfit = recommendedData?.breakdown?.netProfitAmount;
    const recommendedMargin = recommendedData?.breakdown?.profitMargin;

    const canApplyPrice = recommendedPrice !== null && recommendedPrice !== undefined && recommendedPrice > 0;

    // --- Render Fonksiyonları ---
    const renderBreakdownSection = (title: string, breakdown: PriceBreakdown | PriceCalculationResult['breakdown'] | null, price: number | null, isRecommended = false) => (
        <div className="space-y-1 rounded-lg border p-4 bg-card shadow-sm">
            <h4 className={cn(
                "font-semibold text-lg text-center mb-3 pb-2 border-b", 
                isRecommended ? "text-blue-600" : "text-gray-700"
            )}>
                {title}
            </h4>
            {isLoading ? (
                 <div className="space-y-2.5 p-2">
                     {[...Array(8)].map((_, i) => <Skeleton key={i} className={`h-5 w-${Math.floor(Math.random() * 3 + 2)}/5 mx-auto`} />)} 
                 </div>
            ) : breakdown && price !== null ? (
                <div className="space-y-1">
                    {/* Temel Fiyat ve Kar */}
                    <BreakdownDetailItemWithTooltip 
                        label="Satış Fiyatı (KDV Dahil)" 
                        value={price} 
                        highlight={true} 
                        tooltipContent="Ürünün müşteriye sunulan KDV dahil nihai satış fiyatı."
                    />
                     <BreakdownDetailItemWithTooltip 
                        label="Net Kâr" 
                        value={breakdown.netProfitAmount} 
                        highlight={true} 
                        tooltipContent="Tüm maliyetler, komisyonlar ve vergiler düşüldükten sonra kalan net kâr tutarı."
                    />
                    {breakdown.profitMargin !== undefined && (
                         <BreakdownDetailItemWithTooltip 
                            label="Kâr Marjı" 
                            value={`${breakdown.profitMargin.toFixed(2)}%`} 
                            currency={false}
                            highlight={true}
                            tooltipContent="Net kârın KDV hariç satış fiyatına oranı. (Net Kâr / (Satış Fiyatı / (1 + KDV Oranı)))"
                        />
                    )}
                    <Separator className="my-3"/>

                    {/* Maliyetler */}
                    <p className="text-xs font-medium text-muted-foreground pt-1">Maliyet Detayları:</p>
                    <BreakdownDetailItemWithTooltip label="Birim Maliyet (Alış)" value={breakdown.costPrice} tooltipContent="Ürünün KDV hariç tedarik maliyeti."/>
                    <BreakdownDetailItemWithTooltip label="Kargo Maliyeti" value={breakdown.shippingCostExclVat} tooltipContent={`Trendyol'un veya kendi kargo firmanızın KDV hariç kargo ücreti (${breakdown.isBaremApplied ? 'Barem uygulandı' : 'Barem uygulanmadı'}).`}/>
                    <BreakdownDetailItemWithTooltip label="Ek Masraf" value={breakdown.additionalCost} tooltipContent="Paketleme, etiketleme gibi KDV hariç diğer operasyonel masraflar."/>
                     <Separator className="my-3"/>
                    
                    {/* Kesintiler */}
                     <p className="text-xs font-medium text-muted-foreground pt-1">Kesinti Detayları:</p>
                     <BreakdownDetailItemWithTooltip label="Trendyol Komisyonu" value={breakdown.commissionAmount} tooltipContent="Trendyol'un satış fiyatı üzerinden aldığı KDV hariç komisyon tutarı."/>
                     <BreakdownDetailItemWithTooltip label="Pazaryeri Stopaj/Vergi" value={breakdown.taxAmount} tooltipContent="Yasal düzenlemelere göre satış fiyatı üzerinden alınan ek vergiler (varsa)."/>
                     <Separator className="my-3"/>
                     
                    {/* KDV Detayları */}
                    <Separator className="my-2" />
                    <h5 className="text-base font-medium pt-1 text-muted-foreground">KDV Detayları</h5>
                     <BreakdownDetailItemWithTooltip 
                        label="Satış KDV" 
                        value={breakdown.salesKDV} 
                        tooltipContent="Satış fiyatı üzerinden hesaplanan ve devlete ödenecek KDV tutarı."
                    />
                     <BreakdownDetailItemWithTooltip 
                        label="Komisyon KDV" 
                        value={breakdown.commissionKDV} 
                        tooltipContent="Trendyol komisyonu üzerinden hesaplanan ve mahsup edilebilecek KDV."
                    />
                     <BreakdownDetailItemWithTooltip 
                        label="Kargo KDV" 
                        value={breakdown.shippingKDV} 
                        tooltipContent="Kargo maliyeti üzerinden hesaplanan ve mahsup edilebilecek KDV."
                    />
                     <BreakdownDetailItemWithTooltip 
                        label="Mahsup Edilecek KDV" 
                        value={breakdown.costKDV_Deductible} 
                        tooltipContent="Birim maliyet, kargo ve komisyon gibi giderlerin KDV'lerinin indirilebilecek kısmı."
                    />
                     <BreakdownDetailItemWithTooltip 
                        label="Net Ödenecek KDV" 
                        value={breakdown.netKDVPayable} 
                        tooltipContent="Satış KDV'sinden mahsup edilebilecek KDV'ler (Maliyet, Kargo, Komisyon) düşüldükten sonra devlete ödenecek net KDV tutarı."
                    />
                    
                    {/* Diğer Detaylar */}
                    <Separator className="my-2" />
                    <h5 className="text-base font-medium pt-1 text-muted-foreground">Diğer Detaylar</h5>
                     <BreakdownDetailItemWithTooltip label="KDV Oranı" value={`${breakdown.salesKDV_Rate}%`} currency={false} tooltipContent="Satış fiyatı üzerinden hesaplanan ve müşteriden tahsil edilen KDV oranı."/>
                     <BreakdownDetailItemWithTooltip label="KDV Hariç Satış Fiyatı" value={`${formatCurrency(breakdown.salesExclVat)}`} currency={false} tooltipContent="KDV hariç satış fiyatı."/>
                     <BreakdownDetailItemWithTooltip label="KDV Dahil Satış Fiyatı" value={`${formatCurrency(breakdown.salesInclVat)}`} currency={false} tooltipContent="KDV dahil satış fiyatı."/>
                     <Separator className="my-3"/>
                     
                    {/* Hesaplama Yöntemi (Sadece önerilen için) */}
                    {isRecommended && 'calculationMethodUsed' in breakdown && (
                         <>
                         <Separator className="my-3"/>
                         <p className="text-xs font-medium text-muted-foreground pt-1">Öneri Detayları:</p>
                         <BreakdownDetailItemWithTooltip label="Hesaplama Yöntemi" value={breakdown.calculationMethodUsed} currency={false} tooltipContent="Tavsiye fiyatı hesaplanırken kullanılan yöntem (Marj veya Markup)."/>
                         </>
                    )}
                     {isRecommended && 'profitRateUsed' in breakdown && (
                         <BreakdownDetailItemWithTooltip label="Hedef Oran" value={`${breakdown.profitRateUsed}%`} currency={false} tooltipContent="Tavsiye fiyatı hesaplanırken hedeflenen kâr oranı."/>
                    )}
                 </div>
            ) : (
                 <p className="text-sm text-center text-muted-foreground py-4">Veri yüklenemedi veya hesaplanamadı.</p>
            )}
        </div>
    );

    // --- Karşılaştırma Açıklaması --- 
    let comparisonSummary: React.ReactNode = null;
    if (!isLoading && currentNetProfit !== undefined && recommendedNetProfit !== undefined && currentPrice !== undefined && recommendedPrice !== undefined) {
        const profitDiff = recommendedNetProfit - currentNetProfit;
        const profitDiffPercent = currentNetProfit !== 0 ? (profitDiff / Math.abs(currentNetProfit)) * 100 : (profitDiff > 0 ? Infinity : (profitDiff < 0 ? -Infinity : 0));
        const priceDiff = recommendedPrice - currentPrice;

        if (profitDiff > 0) {
            comparisonSummary = (
                <p className="text-sm text-green-700">
                     <CheckCircle className="inline-block h-4 w-4 mr-1 mb-0.5"/> 
                    Tavsiye fiyatı (<strong className="font-semibold">{formatCurrency(recommendedPrice)}</strong>) uygulandığında, net kârınız <strong className="font-semibold">{formatCurrency(profitDiff)}</strong> artarak <strong className="font-semibold">{formatCurrency(recommendedNetProfit)}</strong> olacak.
                    {isFinite(profitDiffPercent) && ` (Yaklaşık %${profitDiffPercent.toFixed(1)} artış)`}
                 </p>
            );
        } else if (profitDiff < 0) {
             comparisonSummary = (
                 <p className="text-sm text-orange-600">
                    <AlertCircle className="inline-block h-4 w-4 mr-1 mb-0.5"/> 
                    Tavsiye fiyatı (<strong className="font-semibold">{formatCurrency(recommendedPrice)}</strong>) uygulandığında, net kârınız <strong className="font-semibold">{formatCurrency(Math.abs(profitDiff))}</strong> azalarak <strong className="font-semibold">{formatCurrency(recommendedNetProfit)}</strong> olacak.
                    {isFinite(profitDiffPercent) && ` (Yaklaşık %${Math.abs(profitDiffPercent).toFixed(1)} azalış)`}. Mevcut fiyat daha kârlı görünüyor.
                 </p>
            );
        } else {
            comparisonSummary = (
                <p className="text-sm text-muted-foreground">
                     <Minus className="inline-block h-4 w-4 mr-1 mb-0.5"/> 
                     Tavsiye fiyatı ile mevcut fiyat arasında net kâr açısından bir fark görünmüyor.
                 </p>
            );
        }
         // Mevcut durumda zarar varsa ek uyarı
         if (currentNetProfit < 0) {
             comparisonSummary = <>{comparisonSummary}<p className="text-xs text-red-600 mt-1"> <XCircle className="inline-block h-3 w-3 mr-1"/> Mevcut fiyatta (<strong className="font-semibold">{formatCurrency(currentPrice)}</strong>) <strong className="font-semibold">{formatCurrency(Math.abs(currentNetProfit))}</strong> zarar ediyorsunuz.</p></>;
         }
    }

    // --- Ana Render --- 
     return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-[75vw] flex flex-col max-h-[90vh]">
                <DialogHeader className="pr-6">
                    <DialogTitle className="text-xl">Karlılık Detayları ve Karşılaştırma</DialogTitle>
                    {product && (
                        <DialogDescription>
                            {product.title} ({product.barcode})
                        </DialogDescription>
                    )}
                </DialogHeader>

                 {error && (
                     <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 dark:bg-red-900/30 p-3 rounded-md mx-6 mt-2">
                         <AlertCircle className="h-5 w-5 flex-shrink-0"/>
                         <p>{error}</p>
                     </div>
                 )}
                
                <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderBreakdownSection("Mevcut Fiyat Analizi", currentBreakdown, currentPrice)}
                        {renderBreakdownSection("Önerilen Fiyat Analizi", recommendedData?.breakdown ?? null, recommendedPrice, true)}
                    </div>

                    {!isLoading && comparisonSummary && ( 
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold text-lg text-center mb-3">Karşılaştırma Özeti</h4>
                             <div className="bg-muted p-4 rounded-md">
                                {comparisonSummary}
                             </div>
                        </div>
                    )}
                </div>
                
                <DialogFooter className="px-6 py-4 border-t bg-background sm:justify-between">
                     <DialogClose asChild>
                        <Button type="button" variant="outline">
                             Kapat
                        </Button>
                     </DialogClose>
                     {canApplyPrice && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="default" disabled={isApplyingPrice || isLoading}> 
                                     {isApplyingPrice ? (
                                         <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                                     ) : (
                                         <Send className="h-4 w-4 mr-2" /> 
                                     )}
                                     Tavsiye Fiyatı ({formatCurrency(recommendedPrice!)}) Uygula
                                 </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tavsiye Fiyatını Uygula?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu işlem, ürünün ({product?.barcode}) Trendyol'daki satış ve liste fiyatını <strong className='text-primary'>{formatCurrency(recommendedPrice!)}</strong> olarak güncelleyecektir. Emin misiniz?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isApplyingPrice}>İptal</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleApplyRecommendedPrice}
                                        disabled={isApplyingPrice}
                                        className={cn(isApplyingPrice && "opacity-50 cursor-not-allowed")}
                                    >
                                         {isApplyingPrice && <Loader2 className="h-4 w-4 animate-spin mr-2" />} 
                                         Evet, Uygula
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     )}
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 