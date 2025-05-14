'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Calculator, Settings, Info, Loader2, Send, Check, Trash2, Zap } from 'lucide-react';
import { ProductProfitabilityCard } from '@/components/dashboard/karlilik-analizi/product-profitability-card';
import { Pagination } from "@/components/ui/pagination";
import { ProductPagination } from '@/components/dashboard/urunler/product-pagination';
import { ProductTabs } from '@/components/dashboard/urunler/product-tabs';
import { ProductFilters } from '@/components/dashboard/urunler/product-filters';
import { ComboboxOption } from '@/components/ui/combobox';
// Prisma Product tipini import edelim (API yanıtına en yakın tip)
import type { Product as PrismaProduct, Brand, Category, GeneralCostSetting } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from 'next/dynamic';
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
import { cn } from "@/lib/utils";
import { SubscriptionAlert } from "@/components/shared/subscription-alert";

const ProfitabilityDetailsModal = dynamic(() => 
  import('@/components/dashboard/karlilik-analizi/profitability-details-modal')
    .then((mod) => mod.ProfitabilityDetailsModal),
  { ssr: false, loading: () => <p>Detaylar Yükleniyor...</p> } 
);

// API yanıtındaki product tipi (ilişkiler dahil)
type ProductWithRelations = PrismaProduct & {
  brand: Brand | null;
  category: Category | null;
};

// API yanıtının genel yapısı
interface ApiResponse {
  content: ProductWithRelations[]; // Artık ProductWithRelations dizisi
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Yeni: Sekme Sayıları Tipi
interface TabCounts {
    onSale: number;
    approved: number;
    notApproved: number;
    archived: number;
    rejected: number;
    blacklisted: number;
    all: number;
}

interface StatsResponse {
  tabCounts: TabCounts;
}

// Toplu öneri sonucu için tip
interface BulkRecommendation {
    productId: string;
    recommendedPrice: number | null;
    error?: string;
}

// Bu sayfa için yükleme iskeleti
function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-10 w-1/3 mb-6" /> 
      <Skeleton className="h-10 w-full" /> {/* Filtreler için */} 
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Birkaç kart iskeleti */} 
        <Skeleton className="h-48 w-full" /> 
        <Skeleton className="h-48 w-full" /> 
        <Skeleton className="h-48 w-full" /> 
        <Skeleton className="h-48 w-full" /> 
      </div>
      <Skeleton className="h-10 w-full mt-4" /> {/* Sayfalama için */} 
    </div>
  );
}

export default function ProfitabilityAnalysisPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sayfalama State'leri
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);

  // Yeni: Filtre State'leri
  const [listingStatusFilter, setListingStatusFilter] = useState('all'); // Başlangıçta tümünü göster
  const [tabCounts, setTabCounts] = useState<TabCounts | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | 'all'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [availableBrands, setAvailableBrands] = useState<ComboboxOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<ComboboxOption[]>([]);
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(false);
  const [generalCostSetting, setGeneralCostSetting] = useState<GeneralCostSetting | null>(null);
  const [showOnlyWithCost, setShowOnlyWithCost] = useState(false); // Yeni state: Maliyeti olanları filtrele

  // Yeni State'ler
  const [bulkRecommendations, setBulkRecommendations] = useState<Record<string, number | null>>({});
  const [isBulkCalculating, setIsBulkCalculating] = useState(false);
  const [bulkCalcMethod, setBulkCalcMethod] = useState<'MARGIN' | 'MARKUP'>('MARGIN');
  const [bulkProfitRate, setBulkProfitRate] = useState<string>('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductWithRelations | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isApplyingBulkPrice, setIsApplyingBulkPrice] = useState(false);
  const [isApplyingAllPrices, setIsApplyingAllPrices] = useState(false); // Yeni state: Tümünü uygulama yüklenme durumu

  // --- YENİ: Abonelik State'leri ---
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  // --- Bitiş: Abonelik State'leri ---

  // Filtre seçeneklerini getiren fonksiyon (API endpoint'ini düzelt)
  const fetchFilterOptions = useCallback(async () => {
    setIsFilterOptionsLoading(true);
    try {
      // Doğru API endpoint'i /api/urunler/filter-options olmalı?
      // Eğer karlılık için ayrı seçenekler yoksa, urunler'deki endpoint kullanılabilir.
      // Şimdilik urunler endpoint'ini kullanalım.
      const response = await fetch('/api/urunler/filter-options'); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Filtre seçenekleri alınamadı.');
      }
      const data = await response.json();
      setAvailableBrands(
        (data.brands || []).map((brand: { id: string; name: string }) => ({ 
          value: brand.id,
          label: brand.name 
        }))
      );
      setAvailableCategories(
        (data.categories || []).map((cat: { id: string; name: string }) => ({ 
          value: cat.id,
          label: cat.name
        }))
      );
    } catch (error: any) {
      toast.error(error.message || 'Marka/Kategori filtre seçenekleri alınamadı.');
      console.error('Filtre seçenekleri hatası:', error);
      setAvailableBrands([]); 
      setAvailableCategories([]);
    } finally {
      setIsFilterOptionsLoading(false);
    }
  }, []);

  // --- YENİ: Abonelik Kontrolü useEffect --- 
  useEffect(() => {
    const checkSubscription = async () => {
      setIsLoadingSubscription(true);
      try {
        const res = await fetch('/api/user/subscription-status');
        if (!res.ok) {
          throw new Error('Abonelik durumu alınamadı');
        }
        const data = await res.json();
        setIsSubscriptionActive(data.isActive);
      } catch (error) {
        console.error("Abonelik kontrol hatası:", error);
        toast.error(error instanceof Error ? error.message : 'Abonelik durumu kontrol edilemedi.');
        setIsSubscriptionActive(false); // Hata durumunda erişimi engelle
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    checkSubscription();
  }, []);
  // --- Bitiş: Abonelik Kontrolü useEffect ---

  // Filtre seçeneklerini getiren fonksiyon (fetchFilterOptions)
  // Bu fonksiyonun çağrısını da abonelik kontrolüne bağlayalım
  useEffect(() => {
    if (isLoadingSubscription || isSubscriptionActive === false) return;
    fetchFilterOptions();
  }, [isLoadingSubscription, isSubscriptionActive, fetchFilterOptions]);

  // Veri çekme fonksiyonu (tüm filtreleri dahil et)
  const fetchData = useCallback(async (resetSelection = true) => {
    if (resetSelection) {
        setSelectedProductIds(new Set());
        setBulkRecommendations({}); // Veri yenilenince eski önerileri temizle
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const productParams = new URLSearchParams();
      productParams.set('page', currentPage.toString());
      productParams.set('size', pageSize.toString());
      if (searchTerm) productParams.set('query', searchTerm); // Arama terimini ekle
      if (listingStatusFilter && listingStatusFilter !== 'all') {
        productParams.set('listingStatus', listingStatusFilter);
      }
      if (selectedBrandId && selectedBrandId !== 'all') {
        productParams.set('brandId', selectedBrandId); // Marka filtresini ekle
      }
      if (selectedCategoryId && selectedCategoryId !== 'all') {
        productParams.set('categoryId', selectedCategoryId); // Kategori filtresini ekle
      }
      // Yeni: Maliyeti tanımlı filtresini ekle
      if (showOnlyWithCost) {
        productParams.set('hasCost', 'true');
      }

      // İstatistikler için de filtreleri gönder
      const statsParams = new URLSearchParams();
      if (searchTerm) statsParams.set('query', searchTerm);
      if (selectedBrandId && selectedBrandId !== 'all') statsParams.set('brandId', selectedBrandId);
      if (selectedCategoryId && selectedCategoryId !== 'all') statsParams.set('categoryId', selectedCategoryId);

      // API isteklerini paralel yap
      const [productsRes, statsRes] = await Promise.all([
        fetch(`/api/profitability-analysis/products?${productParams.toString()}`),
        fetch(`/api/profitability-analysis/stats?${statsParams.toString()}`),
      ]);

      // Ürün verisini işle
      if (!productsRes.ok) {
        const errorData = await productsRes.json();
        throw new Error(errorData.error || errorData.details || 'Ürün verileri getirilemedi.');
      }
      const productData: ApiResponse = await productsRes.json();
      
      setProducts(productData.content || []); 
      setCurrentPage(productData.page || 1);
      setPageSize(productData.size || 20);
      setTotalPages(productData.totalPages || 1);
      setTotalElements(productData.totalElements || 0);

      // Sekme sayılarını işle
      if (!statsRes.ok) {
          const errorData = await statsRes.json(); // statsRes burada okunuyor (1. kez)
          console.error("Sekme sayıları alınamadı:", errorData);
          setTabCounts(null);
      } else {
          // ÖNEMLİ: statsRes.json() tekrar çağrılmamalı. Klonlayarak okuyabiliriz.
          const statsResClone = statsRes.clone(); // Yanıtı klonla
          try {
              const statsData: StatsResponse = await statsResClone.json(); // Klon üzerinden oku
              setTabCounts(statsData.tabCounts);
          } catch (jsonError) {
              console.error("İstatistik JSON parse hatası:", jsonError);
              setTabCounts(null);
              // Belki de text olarak loglamak daha iyi olurdu?
              // console.error("İstatistik yanıtı (text):", await statsRes.text()); 
          }
      }

      // Genel maliyet ayarlarını getir (AYRI BİR İSTEK OLARAK)
      try {
          const settingsResponse = await fetch('/api/settings/cost/general'); // Ayarları ayrı çekelim
          if (!settingsResponse.ok) {
              console.warn("Genel maliyet ayarları alınamadı:", await settingsResponse.text());
              setGeneralCostSetting(null);
          } else {
              const settingsData = await settingsResponse.json();
              setGeneralCostSetting(settingsData || null); // Gelen veri doğrudan settings objesi olmalı
          }
      } catch (settingsError) {
          console.error("Genel maliyet ayarları alınırken hata:", settingsError);
          setGeneralCostSetting(null);
          toast.error("Genel maliyet ayarları yüklenemedi.");
      }

    } catch (err: any) {
      console.error("Karlılık verisi getirme hatası:", err);
      setError(err.message || "Veriler yüklenirken bir hata oluştu.");
      toast.error(`Veri yüklenemedi: ${err.message}`);
      setProducts([]); // variants -> products
      setTabCounts(null);
      setGeneralCostSetting(null); // Hata durumunda ayarları sıfırla
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, listingStatusFilter, searchTerm, selectedBrandId, selectedCategoryId, showOnlyWithCost]);

  // Veri çekme fonksiyonu (fetchData)
  // Bu fonksiyonun çağrısını da abonelik kontrolüne bağlayalım
  useEffect(() => {
    if (isLoadingSubscription || isSubscriptionActive === false) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [currentPage, pageSize, listingStatusFilter, searchTerm, selectedBrandId, selectedCategoryId, showOnlyWithCost, isLoadingSubscription, isSubscriptionActive]);

  // Arama için Debounce efekti
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchQuery);
      setCurrentPage(1); // Arama yapınca 1. sayfaya dön
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Popover açıldığında varsayılan hesaplama ayarlarını çek/ayarla
  useEffect(() => {
      if (generalCostSetting) {
         const defaultMethod = generalCostSetting.defaultProfitCalculationMethod;
         setBulkCalcMethod(defaultMethod === 'MARKUP' ? 'MARKUP' : 'MARGIN'); 
         setBulkProfitRate(generalCostSetting.defaultProfitRate?.toString() ?? '');
      }
  }, [generalCostSetting]);

  // Toplu Fiyat Önerisi Hesaplama Fonksiyonu
  const handleBulkCalculate = useCallback(async () => {
    if (!bulkProfitRate || isNaN(parseFloat(bulkProfitRate))) {
        toast.error("Lütfen geçerli bir kâr oranı girin.");
        return;
    }
    setIsBulkCalculating(true);
    setBulkRecommendations({}); // Önceki sonuçları temizle
    toast.info("Toplu fiyat önerileri hesaplanıyor...");

    try {
        const payload = {
            query: searchTerm,
            listingStatus: listingStatusFilter,
            brandId: selectedBrandId,
            categoryId: selectedCategoryId,
            profitRate: parseFloat(bulkProfitRate),
            calculationMethod: bulkCalcMethod,
        };

        const response = await fetch('/api/profitability-analysis/bulk-recommend-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.details || 'Toplu hesaplama sırasında bir hata oluştu.');
        }

        if (!result.recommendations) {
             throw new Error("API'den geçerli öneri verisi alınamadı.");
        }
        
        const recommendationsMap: Record<string, number | null> = {};
        let successCount = 0;
        let errorCount = 0;
        (result.recommendations as BulkRecommendation[]).forEach(rec => {
            recommendationsMap[rec.productId] = rec.recommendedPrice;
            if (rec.recommendedPrice !== null) {
                successCount++;
            } else {
                 errorCount++; // Hata veya hesaplanamayanlar
            }
        });

        setBulkRecommendations(recommendationsMap);
        toast.success(`${successCount} ürün için fiyat önerisi hesaplandı. ${errorCount > 0 ? `${errorCount} ürün için hesaplanamadı.` : ''}`);

    } catch (err: any) {
        console.error("Toplu fiyat önerisi hatası:", err);
        toast.error(`Hesaplama başarısız: ${err.message}`);
    } finally {
        setIsBulkCalculating(false);
    }
  }, [searchTerm, listingStatusFilter, selectedBrandId, selectedCategoryId, bulkProfitRate, bulkCalcMethod]);

  // Detay Modalını Açma Fonksiyonu
  const handleOpenDetailsModal = (product: ProductWithRelations) => {
      setSelectedProductForModal(product);
      setIsDetailsModalOpen(true);
  };

  // Sekme değiştirme fonksiyonu
  const handleTabChange = (value: string) => {
    setListingStatusFilter(value);
    setCurrentPage(1); // Sekme değişince 1. sayfaya dön
  };

  // Filtreleri temizleme fonksiyonu
  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchTerm('');
    setSelectedBrandId('all');
    setSelectedCategoryId('all');
    setShowOnlyWithCost(false); // Filtreleri temizlerken bunu da sıfırla
    // listingStatusFilter'ı 'all' yapmaya gerek yok, onu sekmeler yönetiyor
    setCurrentPage(1);
  };

  // Seçim Değişikliği İşleyicisi
  const handleSelectionChange = useCallback((productId: string, isSelected: boolean) => {
    setSelectedProductIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isSelected) {
        newSelectedIds.add(productId);
      } else {
        newSelectedIds.delete(productId);
      }
      return newSelectedIds;
    });
  }, []);

  // Toplu Tavsiye Fiyatı Uygulama Fonksiyonu (Seçililer için)
  const handleApplyBulkRecommendedPrice = useCallback(async () => {
    if (selectedProductIds.size === 0) {
      toast.info("Lütfen önce en az bir ürün seçin.");
      return;
    }

    setIsApplyingBulkPrice(true);
    const productIdsArray = Array.from(selectedProductIds);

    try {
      const response = await fetch(`/api/products/apply-recommended-price-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: productIdsArray }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 207 Multi-Status durumunu da başarı/kısmi başarı olarak ele alabiliriz ama şimdilik sadece mesajı gösterelim
        const errorMessage = result.error || (result.details ? JSON.stringify(result.details) : `Toplu fiyat uygulanamadı (${response.status})`);
        throw new Error(errorMessage);
      }
      
      // Başarılı veya kısmi başarılı yanıt (200 veya 207)
      if (result.message) {
          if (result.dbUpdateErrorCount && result.dbUpdateErrorCount > 0) {
              toast.warning(result.message); // Kısmi başarı veya veritabanı hatası varsa uyarı göster
          } else {
              toast.success(result.message); // Tam başarı mesajı
          }
      } else {
           toast.success("Toplu fiyat uygulama isteği başarıyla gönderildi.");
      }
      
      fetchData(true); // Veriyi yenile ama seçimi sıfırlama (belki kullanıcı aynı seçimle başka işlem yapar?)
      // Veya işlem sonrası seçimi temizlemek daha doğru olabilir: fetchData(true); setSelectedProductIds(new Set());

    } catch (error: any) {
      console.error("Toplu tavsiye fiyatı uygulama hatası:", error);
      toast.error(`Toplu fiyat uygulanamadı: ${error.message}`);
    } finally {
      setIsApplyingBulkPrice(false);
    }
  }, [selectedProductIds, fetchData]);

  // Yeni: Tüm Tavsiye Fiyatlarını Uygulama Fonksiyonu
  const handleApplyAllRecommendedPrices = useCallback(async () => {
      setIsApplyingAllPrices(true);
      toast.info("Tüm uygun ürünler için tavsiye fiyatlar uygulanıyor...");
      try {
        const response = await fetch(`/api/products/apply-all-recommended-prices`, {
          method: 'POST',
          // headers: { 'Content-Type': 'application/json' }, // Body göndermiyoruz, header'a gerek yok
        });
  
        const result = await response.json(); // Her zaman JSON yanıtı bekliyoruz
  
        if (!response.ok) {
          // API 4xx, 5xx gibi bir hata döndürdüyse
          throw new Error(result.error || result.message || `Tüm fiyatlar uygulanamadı (${response.status})`);
        }
        
        // API 200 OK döndü, şimdi result içeriğine göre mesaj verelim
        if (result.noProducts) {
            toast.info('Güncellenecek uygun ürün bulunamadı.');
        } else if (result.alreadyUpToDate) {
            toast.info(`Tüm uygun ürünlerin (${result.totalChecked}) fiyatları zaten güncel.`);
        } else {
            // Normal işlem sonucu
            if (result.successCount > 0 && result.errorCount > 0) {
                toast.warning(`${result.successCount} ürün güncellendi, ${result.errorCount} üründe hata oluştu.`, {
                    description: result.errors && result.errors.length > 0 ? "Hatalı ürünler için konsolu kontrol edin." : "",
                });
                if (result.errors) console.error('Tüm Önerileri Uygula - Hata Detayları:', result.errors);
            } else if (result.successCount > 0) {
                toast.success(`${result.successCount} ürünün fiyatı başarıyla güncellendi.`);
            } else if (result.errorCount > 0) {
                toast.error(`${result.errorCount} ürün güncellenirken hata oluştu.`, {
                    description: result.errors && result.errors.length > 0 ? "Hatalı ürünler için konsolu kontrol edin." : "",
                });
                if (result.errors) console.error('Tüm Önerileri Uygula - Hata Detayları:', result.errors);
            } else {
                 // successCount = 0, errorCount = 0 ama noProducts veya alreadyUpToDate değilse
                 // Bu durum API'nin boş bir başarı mesajı döndürdüğü anlamına gelebilir.
                 toast.info(result.message || "İşlem tamamlandı, ancak güncellenen veya hatalı ürün sayısı belirtilmedi.");
            }
        }
        
        fetchData(true); // Veriyi yenile ve seçimi sıfırla
  
      } catch (error: any) {
        console.error("Tüm tavsiye fiyatlarını uygulama API çağrısı başarısız:", error);
        toast.error(`Tüm fiyatlar uygulanamadı: ${error.message}`);
      } finally {
        setIsApplyingAllPrices(false);
      }
  }, [fetchData]);

  // Yeni: Tümünü Seç/Seçimi Kaldır İşleyicisi
  const handleSelectAllToggle = useCallback(() => {
      const allProductIdsOnPage = products.map(p => p.id);
      const allSelected = allProductIdsOnPage.length > 0 && allProductIdsOnPage.every(id => selectedProductIds.has(id));

      if (allSelected) {
          // Hepsi seçiliyse, seçimi kaldır
          setSelectedProductIds(new Set());
      } else {
          // Hepsi seçili değilse, hepsini seç
          setSelectedProductIds(new Set(allProductIdsOnPage));
      }
  }, [products, selectedProductIds]);

  // Mevcut sayfadaki tüm ürünlerin seçili olup olmadığını kontrol et
  const areAllProductsOnPageSelected = products.length > 0 && products.every(p => selectedProductIds.has(p.id));

  // Yükleme İskeleti Gösterimi
  if (isLoadingSubscription || (isSubscriptionActive === null)) {
      // Abonelik durumu veya genel maliyet ayarları yüklenirken farklı bir iskelet gösterilebilir
      return (
          <div className="p-4 md:p-6 space-y-4">
              <Skeleton className="h-10 w-2/5 mb-6" />
              <Skeleton className="h-12 w-full" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
              </div>
          </div>
      );
  }

  // Abonelik Yoksa Uyarı Göster
  if (!isSubscriptionActive) {
    return (
        <div className="p-4 md:p-6">
            <SubscriptionAlert />
        </div>
     );
  }

  // Genel maliyet ayarları yoksa uyarı
  if (!generalCostSetting && !isLoading) {
      return (
          <div className="p-4 md:p-6">
              <Card className="border-yellow-500 bg-yellow-50">
                  <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                          <AlertTriangle className="h-6 w-6 text-yellow-700" />
                          <div className="flex-grow">
                              <h3 className="font-semibold text-yellow-800">Genel Gider Ayarları Eksik</h3>
                              <p className="text-sm text-yellow-700">
                                  Karlılık hesaplaması için lütfen önce 
                                  <a href="/dashboard/ayarlar#genel-giderler" className="font-medium underline hover:text-yellow-800 mx-1">Ayarlar</a> 
                                  sayfasından genel gider ayarlarınızı tanımlayın.
                              </p>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
      );
  }

  // Ana içerik
  return (
    <div className="p-4 md:p-6 space-y-6">
        {/* Başlık ve Toplu İşlem Butonları (Mobil Uyumlu) */} 
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Calculator className="h-6 w-6" /> Karlılık Analizi
            </h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Toplu Hesaplama Popover */} 
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" disabled={isLoading || isBulkCalculating} className="w-full sm:w-auto">
                            <Zap className="mr-2 h-4 w-4" /> Toplu Fiyat Öner
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Toplu Fiyat Önerisi Hesapla</h4>
                                <p className="text-sm text-muted-foreground">
                                    Mevcut filtredeki tüm ürünler için hedef kâr oranına göre satış fiyatı önerisi hesaplayın.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Hesaplama Yöntemi</Label>
                                <RadioGroup defaultValue={bulkCalcMethod} onValueChange={(v) => setBulkCalcMethod(v as 'MARGIN' | 'MARKUP')} className="flex">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="MARGIN" id="r-margin" />
                                        <Label htmlFor="r-margin">Kâr Marjı</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="MARKUP" id="r-markup" />
                                        <Label htmlFor="r-markup">Markup</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="profit-rate">Hedef Kâr Oranı (%)</Label>
                                <Input 
                                    id="profit-rate" 
                                    type="number" 
                                    placeholder="Örn: 25" 
                                    value={bulkProfitRate}
                                    onChange={(e) => setBulkProfitRate(e.target.value)} 
                                />
                            </div>
                             <Button onClick={handleBulkCalculate} disabled={isBulkCalculating || !bulkProfitRate}>
                                {isBulkCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4" />} 
                                {isBulkCalculating ? 'Hesaplanıyor...' : 'Hesapla'}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Seçili/Tümünü Uygula Butonları */} 
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="default" disabled={isLoading || isApplyingBulkPrice || selectedProductIds.size === 0} className="w-full sm:w-auto">
                           {isApplyingBulkPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                           Seçili ({selectedProductIds.size}) Ürüne Uygula
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Seçili Ürünlerin Fiyatını Güncelle?</AlertDialogTitle>
                        <AlertDialogDescription>
                             Seçili {selectedProductIds.size} ürün için hesaplanan tavsiye edilen satış fiyatları Trendyol'a gönderilecek.
                             Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApplyBulkRecommendedPrice} disabled={isApplyingBulkPrice}>
                            {isApplyingBulkPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Onayla ve Uygula
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* YENİ: Tüm Önerileri Uygula Butonu */} 
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="outline" // Ya da default, secondary vs.
                            disabled={isLoading || isApplyingAllPrices || isBulkCalculating /* || eligibleForBulkUpdateCount === 0 */} 
                            className="w-full sm:w-auto"
                        >
                           {isApplyingAllPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                           Tüm Önerileri Uygula {/* (X) sayısını göstermek için ek bir state ve API gerekebilir */}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Tüm Uygun Fiyatları Güncelle?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sistemdeki maliyeti tanımlı ve tavsiye fiyatı hesaplanmış tüm ürünlerin fiyatları Trendyol'da güncellenecektir.
                            Bu işlem geri alınamaz ve ürün sayısına göre zaman alabilir. Devam etmek istiyor musunuz?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApplyAllRecommendedPrices} disabled={isApplyingAllPrices}>
                            {isApplyingAllPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Evet, Tümünü Güncelle
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                 {/* Yeni: Seçimi Temizle */} 
                 {selectedProductIds.size > 0 && (
                     <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds(new Set())} className="flex items-center gap-1 w-full sm:w-auto justify-center">
                        <Trash2 className="h-4"/> Seçimi Temizle
                     </Button>
                 )}
            </div>
        </div>

        {/* Filtreler ve Sekmeler */} 
        <ProductFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedBrandId={selectedBrandId}
            onBrandChange={setSelectedBrandId}
            availableBrands={availableBrands}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            availableCategories={availableCategories}
            onClearFilters={handleClearFilters}
            isLoading={isLoading || isFilterOptionsLoading}
            isFilterOptionsLoading={isFilterOptionsLoading}
            showCostFilter={true} // Maliyet filtresini göster
            costFilterValue={showOnlyWithCost}
            onCostFilterChange={setShowOnlyWithCost}
        />
        <ProductTabs
            currentTab={listingStatusFilter}
            onTabChange={handleTabChange}
            tabCounts={tabCounts}
            isLoading={isLoading}
        />

        {/* Hata Durumu */} 
        {error && !isLoading && (
             <Card className="border-destructive bg-destructive/10">
                 <CardContent className="pt-6">
                     <div className="flex items-center gap-3">
                         <AlertTriangle className="h-6 w-6 text-destructive" />
                         <div className="flex-grow">
                             <h3 className="font-semibold text-destructive">Hata</h3>
                             <p className="text-sm text-destructive">{error}</p>
                             <Button variant="secondary" size="sm" className="mt-4" onClick={() => fetchData(true)}>Tekrar Dene</Button>
                         </div>
                     </div>
                 </CardContent>
             </Card>
        )}

        {/* Ürün Kartları Listesi (Mobil Uyumlu Grid) */} 
        {isLoading && products.length === 0 ? (
            // İlk yüklemede veya filtre değişince iskelet göster
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(pageSize)].map((_, index) => (
                    <Skeleton key={index} className="h-48 w-full" /> 
                ))}
            </div>
        ) : !isLoading && products.length === 0 ? (
             <Card>
                 <CardContent className="pt-10 pb-10 text-center">
                     <p className="text-muted-foreground">Filtre kriterlerine uygun ürün bulunamadı.</p>
                 </CardContent>
             </Card>
         ) : (
             <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                 {products.map((product) => (
                    <ProductProfitabilityCard
                        key={product.id}
                        product={product}
                        generalCostSetting={generalCostSetting}
                        recommendedPrice={bulkRecommendations[product.id]}
                        onDetailsClick={() => handleOpenDetailsModal(product)}
                        isSelected={selectedProductIds.has(product.id)}
                        onSelectionChange={handleSelectionChange}
                        onProductUpdate={fetchData}
                    />
                ))}
             </div>
         )}

        {/* Sayfalama */} 
        {!isLoading && totalPages > 1 && (
            <ProductPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
            />
        )}

        {/* Detay Modalı */} 
        {selectedProductForModal && (
             <ProfitabilityDetailsModal
                product={selectedProductForModal}
                generalCostSetting={generalCostSetting}
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                onProductUpdate={fetchData}
             />
        )}
    </div>
  );
} 