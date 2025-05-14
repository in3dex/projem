"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { Download, Search, X, RefreshCw, Package, CheckCircle, XCircle, Archive, TrendingUp, BatteryWarning, FileQuestion, Trophy, Loader2, Filter, Tags, Building, ChevronsUpDown, Edit, Info } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { ProductEditForm } from '@/components/dashboard/product-edit-form';
import { CostInputCell } from '@/components/dashboard/cost-input-cell';

// Yeni modüler bileşenleri import et
import { ProductHeader } from '@/components/dashboard/urunler/product-header';
import { ProductFilters } from '@/components/dashboard/urunler/product-filters';
import { ProductStatsCards } from '@/components/dashboard/urunler/product-stats-cards';
import { ProductTabs } from '@/components/dashboard/urunler/product-tabs';
import { ProductTable } from '@/components/dashboard/urunler/product-table';
import { ProductPagination } from '@/components/dashboard/urunler/product-pagination';
import dynamic from 'next/dynamic';

const TopSellingModal = dynamic(() => 
  import('@/components/dashboard/urunler/top-selling-modal')
    .then((mod) => mod.TopSellingModal),
  { ssr: false, loading: () => <p>Yükleniyor...</p> } 
);

const EditProductModal = dynamic(() => 
  import('@/components/dashboard/urunler/edit-product-modal')
    .then((mod) => mod.EditProductModal),
  { ssr: false, loading: () => <p>Yükleniyor...</p> } 
);

// Product arayüzü güncellendi (ProductVariant'tan gelen alanları içeriyor)
interface Product {
  id: string;               // Bizim ID
  userId: string;
  trendyolId: string;       // Trendyol listing ID
  productMainId: string;    // Trendyol ana ürün ID (referans)
  trendyolContentId?: number;
  barcode: string;          // @unique
  stockCode: string | null;
  platformListingId?: string;
  productCode?: number;
  brandId: string;
  brand: { id: string; name: string }; // Marka objesi eklendi
  categoryId: string;
  category: { id: string; name: string }; // Kategori objesi eklendi
  title: string;
  description: string | null;
  listPrice: number;
  salePrice: number;
  costPrice: number | null;   // Maliyet
  quantity: number;
  vatRate: number;
  dimensionalWeight?: number;
  stockUnitType?: string | null;
  productUrl?: string | null;
  hasHtmlContent?: boolean | null;
  approved: boolean;
  archived: boolean;
  locked: boolean;
  onSale: boolean;
  rejected: boolean;
  blacklisted: boolean;
  hasActiveCampaign?: boolean | null;
  images: any; // JSON tipi, any veya daha spesifik bir tip olabilir
  attributes: any; // JSON tipi, any veya { attributeName: string, attributeValue: string }[] gibi
  rejectReasonDetails?: any; // JSON tipi
  trendyolCreateDateTime?: string | null; // API'den string olarak gelebilir
  trendyolLastUpdateDate?: string | null; // API'den string olarak gelebilir
  createdAt: string; // DateTime string
  updatedAt: string; // DateTime string
}

interface ApiResponse {
  content: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ProductStats {
  totalVariants: number;
  onSaleVariants: number;
  notApprovedVariants: number;
  outOfStockVariants: number;
  potentialRevenue: number;
  lowStockVariants: number;
  noSkuVariants: number;
  tabCounts: {
    onSale: number;
    approved: number;
    notApproved: number;
    archived: number;
    rejected: number;
    blacklisted: number;
    all: number;
  };
}

interface TopSellingProduct {
  variant: {
    id: string;
    barcode: string;
    stockCode: string | null;
    images: any; 
    product: {
      title: string;
    };
  } | null; 
  barcode: string;
  totalQuantitySold: number;
  productDetail?: any; // Linter hatası için eklendi
}

const getPageNumbers = (currentPage: number, totalPages: number, pageNeighbours: number = 1) => {
  const totalNumbers = (pageNeighbours * 2) + 3; 
  const totalBlocks = totalNumbers + 2; 

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const startPage = Math.max(1, currentPage - pageNeighbours);
  const endPage = Math.min(totalPages, currentPage + pageNeighbours);
  let pages: (number | string)[] = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);

  const hasLeftSpill = startPage > 1;
  const hasRightSpill = endPage < totalPages;
  const spillOffset = totalNumbers - (pages.length + 1);

  switch (true) {
    case !hasLeftSpill && hasRightSpill:
      {
        const extraPages = Array.from({ length: spillOffset }, (_, i) => endPage + i + 1);
        pages = [...pages, ...extraPages, '...R', totalPages];
        break;
      }
    case hasLeftSpill && !hasRightSpill:
      {
        const extraPages = Array.from({ length: spillOffset }, (_, i) => startPage - i - 1).reverse();
        pages = [1, '...L', ...extraPages, ...pages];
        break;
      }
    case hasLeftSpill && hasRightSpill:
    default:
      {
        pages = [1, '...L', ...pages, '...R', totalPages];
        break;
      }
  }
  if (pages[0] !== 1 && pages[1] !== '...L') {
    pages.unshift(1);
  }
  if (pages[pages.length - 1] !== totalPages && pages[pages.length - 2] !== '...R') {
    pages.push(totalPages);
  }
  return pages;
};

export default function UrunlerPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [isTopSellingModalOpen, setIsTopSellingModalOpen] = useState(false);
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);
  const [isTopSellingLoading, setIsTopSellingLoading] = useState(false);

  // Yeni Filtre State'leri
  const [selectedBrandId, setSelectedBrandId] = useState<string | 'all'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [availableBrands, setAvailableBrands] = useState<ComboboxOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<ComboboxOption[]>([]);
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(false);

  // Edit Modal için State'ler (barcode yerine id kullanılacak)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null); // editingBarcode yerine

  // Maliyet Güncelleme State'i (maliyet güncelleme ayrı bir mekanizma ise kalabilir)
  const [updatingCostBarcode, setUpdatingCostBarcode] = useState<string | null>(null);

  // Filtre seçeneklerini getiren fonksiyon
  const fetchFilterOptions = useCallback(async () => {
    setIsFilterOptionsLoading(true);
    try {
      const response = await fetch('/api/urunler/filter-options');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Filtre seçenekleri alınamadı.');
      }
      const data = await response.json();
      // Gelen veriyi Combobox formatına map et
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
      toast.error(error.message || "Marka/Kategori filtre seçenekleri alınamadı.");
      console.error("Filtre seçenekleri hatası:", error);
      setAvailableBrands([]); 
      setAvailableCategories([]);
    } finally {
      setIsFilterOptionsLoading(false);
    }
  }, []);

  // Sayfa yüklendiğinde filtre seçeneklerini çek
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Veri getirme fonksiyonunu dışarı alalım ki butonla da çağırabilelim
  const fetchDataCallback = useCallback(async () => {
    setIsLoading(true);
    setStats(null);
    try {
      const productParams = new URLSearchParams();
      productParams.set('page', currentPage.toString());
      productParams.set('size', pageSize.toString());
      if (searchTerm) productParams.set('query', searchTerm);
      if (listingStatusFilter && listingStatusFilter !== 'all') {
        productParams.set('listingStatus', listingStatusFilter);
      }
      if (selectedBrandId && selectedBrandId !== 'all') {
        productParams.set('brandId', selectedBrandId);
      }
      if (selectedCategoryId && selectedCategoryId !== 'all') {
        productParams.set('categoryId', selectedCategoryId);
      }

      const [productsResponse, statsResponse] = await Promise.all([
        fetch(`/api/urunler?${productParams.toString()}`),
        fetch('/api/urunler/stats')
      ]);

      if (!productsResponse.ok) {
        const errorData = await productsResponse.json();
        throw new Error(`Ürünler alınamadı: ${errorData.error || errorData.details}`);
      }
      const productData: ApiResponse = await productsResponse.json();

      // === DEBUG LOGGING START ===
      if (productData.content && productData.content.length > 0) {
          console.log("[fetchDataCallback] Bu sayfadaki ürünler:", productData.content.map(p => ({ 
              id: p.id,
              barcode: p.barcode,
              title: p.title,
              costPrice: p.costPrice,
              quantity: p.quantity,
              approved: p.approved,
              onSale: p.onSale
              }))
          );
      } else {
          console.log("[fetchDataCallback] API'den bu sayfa için ürün verisi gelmedi.");
      }
      // === DEBUG LOGGING END ===

      setProducts(productData.content || []);
      setCurrentPage(productData.page || 1);
      setPageSize(productData.size || 10);
      setTotalPages(productData.totalPages || 1);
      setTotalElements(productData.totalElements || 0);

      if (!statsResponse.ok) {
        console.error("İstatistikler alınamadı:", await statsResponse.text());
      } else {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

    } catch (error: any) {
      console.error("Veri getirme hatası:", error);
      toast.error(error.message || "Veriler getirilemedi.");
      setProducts([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, listingStatusFilter, selectedBrandId, selectedCategoryId]);

  useEffect(() => {
    fetchDataCallback(); // fetchDataCallback'i çağır
  }, [fetchDataCallback]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    toast.info("Trendyol ile ürünler senkronize ediliyor... Bu işlem ürün sayınıza göre zaman alabilir.");
    try {
      const response = await fetch('/api/urunler/sync', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Bilinmeyen bir hata.");
      }
      const details = data.details;
      
      let successMessage = `Senkronizasyon Tamamlandı! ${details.variantsUpserted} varyant işlendi.`;
      const description = `Marka: ${details.brandsCreated} yeni, Kategori: ${details.categoriesCreated} yeni, Ürün: ${details.productsUpserted} oluşturuldu/güncellendi. Hata: ${details.errors.length}`;
      
      if (details.failedPages && details.failedPages.length > 0) {
        toast.warning(
            `Bazı sayfalar çekilemedi (${details.failedPages.length} sayfa).`, 
            { description: `Hatalı sayfa numaraları: ${details.failedPages.map((p: number) => p + 1).join(', ')}` }
        );
        successMessage = `Senkronizasyon Kısmen Tamamlandı! ${details.variantsUpserted} varyant işlendi.`;
      }

      toast.success(successMessage, { description: description });
      
      fetchDataCallback();
    } catch (error: any) {
      console.error("Ürün senkronizasyon hatası:", error);
      toast.error(`Senkronizasyon başarısız: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Yeni: Ürün Verilerini Temizleme Fonksiyonu
  const handleClearProducts = async () => {
    if (!window.confirm('Tüm ürün ve varyant verilerini veritabanından kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }
    
    setIsLoading(true); // Genel yükleme durumunu kullanabiliriz
    toast.info("Ürün verileri temizleniyor...");
    try {
      const response = await fetch('/api/urunler/clear', { method: 'DELETE' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || "Bilinmeyen bir hata.");
      }

      toast.success(
        `Temizleme Tamamlandı! ${data.deletedProducts} ürün, ${data.deletedVariants} varyant silindi.`,
        { description: "Şimdi senkronizasyon işlemini başlatabilirsiniz." }
      );
      // Veriler silindiği için sayfayı boşalt ve yeniden veri çekme (isteğe bağlı, zaten boş olacak)
      setProducts([]);
      setTotalElements(0);
      setTotalPages(1);
      setCurrentPage(1);
      setStats(null); // İstatistikleri de sıfırla
      // fetchDataCallback(); // Veya direkt boş liste sonrası yenileme

    } catch (error: any) {
      console.error("Ürün temizleme hatası:", error);
      toast.error(`Veri temizlenemedi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openTopSellingModal = async () => {
    setIsTopSellingModalOpen(true);
    setIsTopSellingLoading(true);
    try {
      const response = await fetch('/api/urunler/top-selling');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "En çok satan ürünler alınamadı.");
      }
      const data: TopSellingProduct[] = await response.json();
      setTopSellingProducts(data);
    } catch (error: any) {
      console.error("En çok satan ürünler alınırken hata:", error);
      toast.error(`En çok satan ürünler alınamadı: ${error.message}`);
      setTopSellingProducts([]);
    } finally {
      setIsTopSellingLoading(false);
    }
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const handleTabChange = (value: string) => {
    setListingStatusFilter(value);
    setCurrentPage(1);
  };

  // Filtreleri temizleme fonksiyonu
  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchTerm('');
    setSelectedBrandId('all');
    setSelectedCategoryId('all');
    setCurrentPage(1);
  };

  // Edit modalını açan fonksiyon (artık productId alıyor)
  const handleOpenEditModal = (productId: string) => {
    setEditingProductId(productId); // productId'yi state'e ata
    setIsEditModalOpen(true);
  };

  // Edit modalını kapatan fonksiyon
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProductId(null);
  };

  // Edit başarılı olduğunda çağrılacak fonksiyon
  const handleEditSuccess = () => {
    handleCloseEditModal();
    fetchDataCallback(); // Veriyi yenile
  };

  // Maliyet Güncelleme Fonksiyonu (Eğer bu ayrı kalacaksa dokunmuyoruz)
  const handleCostChange = async (barcode: string, newCostString: string) => {
    // --- YENİ: Virgülü noktaya çevir --- 
    const costStringForParsing = newCostString.replace(',', '.');
    // --- ESKİ: const newCost = parseFloat(newCostString); --- 
    const newCost = parseFloat(costStringForParsing); 

    if (isNaN(newCost) || newCost < 0) {
      toast.error("Geçersiz maliyet değeri. Lütfen sayısal bir değer girin (örn: 123.45).");
          return;
      }

    setUpdatingCostBarcode(barcode);
    try {
      const response = await fetch('/api/products/update-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, costPrice: newCost }),
      });

          if (!response.ok) {
        // Hata mesajını daha iyi işle
        let errorDetail = 'Bilinmeyen sunucu hatası.';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorData.message || JSON.stringify(errorData.details) || errorDetail;
        } catch (jsonError) {
          // JSON parse edilemezse, text olarak almayı dene
          try {
             errorDetail = await response.text();
              } catch (textError) {
             errorDetail = `Sunucu hatası (${response.status} ${response.statusText})`;
          }
        }
        // "Geçersiz veri" backend'den geliyorsa onu göster
        throw new Error(errorDetail === 'Geçersiz veri' ? errorDetail : `Maliyet güncellenemedi: ${errorDetail}`);
      }

      // State'i güncelle (optimistic update)
          setProducts(prevProducts =>
        prevProducts.map(p =>
          p.barcode === barcode ? { ...p, costPrice: newCost } : p
        )
      );
      toast.success(`Barkod ${barcode} için maliyet güncellendi.`);

      } catch (error: any) {
      toast.error(error.message || `Barkod ${barcode} maliyeti güncellenirken hata oluştu.`);
          console.error("Maliyet güncelleme hatası:", error);
      } finally {
      setUpdatingCostBarcode(null);
      }
  };

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <ProductHeader 
        isLoading={isLoading}
        isSyncing={isSyncing}
        onRefresh={fetchDataCallback}
        onSync={handleSyncProducts}
        onClear={handleClearProducts}
        onOpenTopSelling={openTopSellingModal}
      />

      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBrandId={selectedBrandId}
        onBrandChange={(value) => {
              setSelectedBrandId(value ?? 'all');
              setCurrentPage(1);
            }}
        availableBrands={availableBrands}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={(value) => {
              setSelectedCategoryId(value ?? 'all');
              setCurrentPage(1);
            }}
        availableCategories={availableCategories}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
        isFilterOptionsLoading={isFilterOptionsLoading}
      />

      <ProductStatsCards 
        stats={stats}
        isLoading={isLoading}
        onOpenTopSelling={openTopSellingModal}
      />
      
      <ProductTabs 
        currentTab={listingStatusFilter}
        onTabChange={handleTabChange}
        tabCounts={stats?.tabCounts ?? null}
        isLoading={isLoading}
      />

      <ProductTable 
        products={products}
        isLoading={isLoading}
        updatingCostBarcode={updatingCostBarcode}
        onEditClick={handleOpenEditModal}
        handleCostChange={handleCostChange}
      />

      <ProductPagination 
         currentPage={currentPage}
         totalPages={totalPages}
         onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Modallar */}
      <TopSellingModal 
        isOpen={isTopSellingModalOpen}
        onOpenChange={setIsTopSellingModalOpen}
        isLoading={isTopSellingLoading}
        topSellingProducts={topSellingProducts}
      />

      {/* EditProductModal'a editingProductId'yi geçirelim */}
      {isEditModalOpen && editingProductId && (
          <EditProductModal 
              productId={editingProductId}
              isOpen={isEditModalOpen}
              onOpenChange={handleCloseEditModal}
              onSuccess={handleEditSuccess}
          />
      )}
    </div>
    </TooltipProvider>
  );
} 