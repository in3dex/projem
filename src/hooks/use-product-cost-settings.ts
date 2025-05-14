import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select import
// import type { ProductCostSettingData, ProductSettingPayload } from '@/types/cost-settings'; // Prisma tipleri kullanılana kadar kaldırıldı

// --- START: Placeholder Data Types (Replace with actual Prisma types) --- 
// Bu tipler Prisma şeması ile eşleşmeli veya oradan import edilmeli
interface Product {
    id: string;
    title?: string | null; // Nullable olabilir
    barcode?: string | null; // Nullable olabilir
    // Diğer ürün alanları...
}

// Exporting the type for use in other components
export interface ProductCostSettingData {
    id: string;
    productId: string;
    product?: Product; // İlişkisel veri (opsiyonel)
    productName?: string; // Formatlanmış isim (hook içinde eklendi)
    commissionRate?: number | null;
    shippingCost?: number | null;
    additionalCost?: number | null;
    taxRate?: number | null; // Backend'de var
}

type ProductSettingPayload = Omit<ProductCostSettingData, 'id' | 'productName' | 'product'>;
// --- END: Placeholder Data Types ---

// Helper function to parse optional numeric input values for the API payload
const parseNumericPayloadValue = (value: string | number | null): number | null => {
    if (value === null || value === '') {
        return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
};

// Input types for forms/state (matching the fields available in forms)
export type ProductSettingInput = {
    productId: string;
    commissionRate: number | string | null;
    shippingCost: number | string | null;
    additionalCost: number | string | null;
}

// Edit state type includes the original setting ID if needed, but API uses productId
export type EditProductSettingState = (ProductSettingInput & { originalId: string }) | null;

// Debounce fonksiyonu (basit implementasyon)
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
        });
}

export function useProductCostSettings() {
    const [productSettings, setProductSettings] = useState<ProductCostSettingData[]>([]);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
    const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);

    // Kaldırıldı: Tüm ürünler listesi ve yükleme durumu
    // const [allProducts, setAllProducts] = useState<Product[]>([]);
    // const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(true);

    // Yeni state'ler: Combobox için
    const [productSearchQuery, setProductSearchQuery] = useState<string>("");
    const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
    const [isLoadingProductSearch, setIsLoadingProductSearch] = useState(false);
    const [isComboboxOpen, setIsComboboxOpen] = useState(false); // Combobox açık mı?

    const [newProductSetting, setNewProductSetting] = useState<ProductSettingInput>({
        productId: '',
        commissionRate: '',
        shippingCost: '',
        additionalCost: '',
    });
    const [editProductSetting, setEditProductSetting] = useState<EditProductSettingState>(null);

    // API İsteği Fonksiyonu (Debounce için ayrıldı)
    const fetchProductSearch = async (query: string): Promise<Product[]> => {
        if (!query || query.trim().length < 2) { // En az 2 karakter girilince ara
            return [];
        }
        setIsLoadingProductSearch(true);
        try {
            const encodedQuery = encodeURIComponent(query.trim());
            // listingStatus=all kaldırıldı, sadece satıştakiler aranabilir (isteğe bağlı)
            // size=10: Combobox için makul bir sonuç sayısı
            const response = await fetch(`/api/urunler?query=${encodedQuery}&size=10`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.content || [];
        } catch (error: any) {
            console.error("Error searching products:", error);
            toast.error(`Ürün arama hatası: ${error.message}`);
            return [];
        } finally {
            setIsLoadingProductSearch(false);
        }
    };

    // Debounce edilmiş arama fonksiyonu
    const debouncedSearchRef = useRef(debounce(fetchProductSearch, 500)); // 500ms bekle

    // Arama input'u değiştikçe
    const handleProductSearchChange = (query: string) => {
        setProductSearchQuery(query);
        // Seçimi temizle (yeni arama yapılıyor)
        setNewProductSetting(prev => ({ ...prev, productId: '' }));
        if (query.trim().length >= 2) {
             setIsComboboxOpen(true); // Sonuçlar gelince popover'ı aç
             debouncedSearchRef.current(query)
                 .then(results => {
                     setProductSearchResults(results);
                 })
                 .catch(() => {
                     setProductSearchResults([]); // Hata durumunda temizle
                 });
        } else {
             setIsComboboxOpen(false); // Yeterli karakter yoksa kapat
            setProductSearchResults([]); // Sonuçları temizle
        }
    };

    // Combobox'tan ürün seçildiğinde
    const handleProductSelect = (productId: string) => {
        const selectedProduct = productSearchResults.find(p => p.id === productId);
        if (selectedProduct) {
            // Seçilen ürün ID'sini state'e ve input'a yansıt
            setNewProductSetting(prev => ({ ...prev, productId: productId }));
            // Arama sorgusunu seçilen ürünün adıyla doldur (isteğe bağlı)
            setProductSearchQuery(selectedProduct.title ?? selectedProduct.barcode ?? productId);
        }
        setProductSearchResults([]); // Listeyi temizle
        setIsComboboxOpen(false); // Popover'ı kapat
    };

    const fetchProductSettings = useCallback(async () => {
        setIsLoadingProduct(true);
        try {
            const response = await fetch('/api/settings/cost/product'); // GET all
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            // API'den gelen veri tipini any olarak varsayalım (idealde Prisma tipi olmalı)
            const data: any[] = await response.json();
            // Gelen veriye productName eklemek için
            const formattedData: ProductCostSettingData[] = data.map(setting => ({
                ...setting,
                productName: setting.product?.title || setting.productId,
            }));
            setProductSettings(formattedData);
        } catch (error: any) {
            console.error("Error fetching product settings:", error);
            toast.error(`Ürün ayarları getirilemedi: ${error.message}`);
            setProductSettings([]);
        } finally {
            setIsLoadingProduct(false);
        }
    }, []);

    useEffect(() => {
        fetchProductSettings();
    }, [fetchProductSettings]);

    const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => {
        const { name, value } = e.target;
        if (type === 'new') {
            setNewProductSetting(prev => ({ ...prev, [name]: value }));
            // Eğer manuel ID giriliyorsa, arama sorgusunu temizle (isteğe bağlı)
            if (name === 'productId') {
                 setProductSearchQuery(value); // Manuel girilen ID arama kutusunda da görünsün
                 setIsComboboxOpen(false); // Manuel girince popover'ı kapat
                 setProductSearchResults([]);
             }
        } else {
            setEditProductSetting(prev => prev ? { ...prev, [name]: value } : null);
        }
    };

    const handleAddProductSetting = async () => {
        if (!newProductSetting.productId) {
            toast.warning("Lütfen bir ürün seçin veya ID girin.");
            return;
        }
        setIsSavingProduct(true);
        toast.info("Ürün ayarı ekleniyor...");
        try {
            const payload: Omit<ProductSettingPayload, 'productId'> = { 
                commissionRate: parseNumericPayloadValue(newProductSetting.commissionRate),
                shippingCost: parseNumericPayloadValue(newProductSetting.shippingCost),
                additionalCost: parseNumericPayloadValue(newProductSetting.additionalCost),
            };

            const response = await fetch(`/api/settings/cost/product/${newProductSetting.productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Ürün ayarı eklenemedi.');
            }
            toast.success(result.message || "Ürün ayarı başarıyla eklendi/güncellendi.");
            setIsAddProductDialogOpen(false);
            setNewProductSetting({ productId: '', commissionRate: '', shippingCost: '', additionalCost: '' });
            setProductSearchQuery(""); // Arama kutusunu temizle
            fetchProductSettings();
        } catch (error: any) {
            console.error("Error adding/updating product setting:", error);
            toast.error(`Hata: ${error.message}`);
        } finally {
            setIsSavingProduct(false);
        }
    };

     const handleUpdateProductSetting = async () => {
        if (!editProductSetting || !editProductSetting.productId) return;
        setIsSavingProduct(true);
        toast.info("Ürün ayarı güncelleniyor...");
        try {
            const payload: Omit<ProductSettingPayload, 'productId'> = { 
                commissionRate: parseNumericPayloadValue(editProductSetting.commissionRate),
                shippingCost: parseNumericPayloadValue(editProductSetting.shippingCost),
                additionalCost: parseNumericPayloadValue(editProductSetting.additionalCost),
            };

            const response = await fetch(`/api/settings/cost/product/${editProductSetting.productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Ürün ayarı güncellenemedi.');
            }
            toast.success(result.message || "Ürün ayarı başarıyla güncellendi.");
            setIsEditProductDialogOpen(false);
            setEditProductSetting(null);
            fetchProductSettings();
        } catch (error: any) {
            console.error("Error updating product setting:", error);
            toast.error(`Hata: ${error.message}`);
        } finally {
            setIsSavingProduct(false);
        }
    };

    const openAddProductDialog = () => {
        setIsAddProductDialogOpen(true);
        // Dialog açılırken state'leri sıfırla
        setNewProductSetting({ productId: '', commissionRate: '', shippingCost: '', additionalCost: '' });
        setProductSearchQuery("");
        setProductSearchResults([]);
        setIsComboboxOpen(false);
    }
    const closeAddProductDialog = () => setIsAddProductDialogOpen(false);

    const openEditProductDialog = (setting: ProductCostSettingData) => {
        setEditProductSetting({
            originalId: setting.id,
            productId: setting.productId,
            commissionRate: setting.commissionRate === null ? '' : String(setting.commissionRate),
            shippingCost: setting.shippingCost === null ? '' : String(setting.shippingCost),
            additionalCost: setting.additionalCost === null ? '' : String(setting.additionalCost),
        });
        setIsEditProductDialogOpen(true);
    };
    const closeEditProductDialog = () => {
        setIsEditProductDialogOpen(false);
        setEditProductSetting(null);
    }

    return {
        productSettings,
        isLoadingProduct,
        isSavingProduct,
        isAddProductDialogOpen,
        isEditProductDialogOpen,
        newProductSetting,
        editProductSetting,
        fetchProductSettings,
        handleAddProductSetting,
        handleUpdateProductSetting,
        openAddProductDialog,
        closeAddProductDialog,
        openEditProductDialog,
        closeEditProductDialog,
        handleProductInputChange,
        // Combobox için yeni eklenenler
        productSearchQuery,
        productSearchResults,
        isLoadingProductSearch,
        isComboboxOpen,
        setIsComboboxOpen, // Dışarıdan kapatmak için
        handleProductSearchChange,
        handleProductSelect,
    };
} 