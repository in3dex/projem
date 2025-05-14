import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
// import type { CategoryCommissionData, CategoryCommissionPayload } from '@/types/cost-settings'; // Prisma tipleri kullanılana kadar kaldırıldı

// --- START: Placeholder Data Types (Replace with actual Prisma types) ---
// Bu tipler Prisma şeması ile eşleşmeli veya oradan import edilmeli
interface Category {
    id: string;
    name?: string | null; // Nullable olabilir
    // Diğer kategori alanları...
}

// Exporting the type for use in other components
export interface CategoryCommissionData {
    id: string;
    categoryId: string;
    category?: Category; // İlişkisel veri (opsiyonel)
    categoryName?: string; // Formatlanmış isim (hook içinde eklendi)
    commissionRate: number; // Kategori komisyonu zorunlu
}

type CategoryCommissionPayload = Omit<CategoryCommissionData, 'id' | 'categoryName' | 'category'>;
// --- END: Placeholder Data Types ---

// Helper function to parse required numeric input values for the API payload
const parseRequiredNumericPayloadValue = (value: string | number): number => {
    if (value === null || value === '') {
        return NaN; // Handlers should validate NaN
    }
    const num = Number(value);
    return isNaN(num) ? NaN : num;
};

// Input type for form/state
export type CategoryCommissionInput = {
    categoryId: string; // Manuel giriş veya Select'ten sonra set edilir
    commissionRate: number | string; // Allow string during input
}

// Edit state type includes the original setting ID if needed, but API uses categoryId
export type EditCategoryCommissionState = (CategoryCommissionInput & { originalId: string }) | null;

export function useCategoryCommissions() {
    const [categoryCommissions, setCategoryCommissions] = useState<CategoryCommissionData[]>([]);
    const [isLoadingCategory, setIsLoadingCategory] = useState(true);
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
    const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);

    // Tüm kategoriler listesi ve yükleme durumu (Doğru API ile)
    const [allCategories, setAllCategories] = useState<Category[]>([]); // Artık Category tipini kullanıyoruz
    const [isLoadingAllCategories, setIsLoadingAllCategories] = useState(true);

    const [newCategoryCommission, setNewCategoryCommission] = useState<CategoryCommissionInput>({
        categoryId: '',
        commissionRate: '',
    });
    const [editCategoryCommission, setEditCategoryCommission] = useState<EditCategoryCommissionState>(null);

    const fetchCategoryCommissions = useCallback(async () => {
        setIsLoadingCategory(true);
        try {
            const response = await fetch('/api/settings/cost/category'); // GET all
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            // API'den gelen veri tipini any olarak varsayalım (idealde Prisma tipi olmalı)
            const data: any[] = await response.json();
             // Gelen veriye categoryName eklemek için
             const formattedData: CategoryCommissionData[] = data.map(commission => ({
                ...commission,
                categoryName: commission.category?.name || commission.categoryId,
            }));
            setCategoryCommissions(formattedData);
        } catch (error: any) {
            console.error("Error fetching category commissions:", error);
            toast.error(`Kategori komisyonları getirilemedi: ${error.message}`);
            setCategoryCommissions([]);
        } finally {
            setIsLoadingCategory(false);
        }
    }, []);

    // Tüm kategorileri çekmek için useEffect (Doğru API ile)
    useEffect(() => {
        const fetchAllCategories = async () => {
            setIsLoadingAllCategories(true);
            try {
                // /api/urunler/filter-options endpoint'ini kullan
                const response = await fetch('/api/urunler/filter-options');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                // API { categories: {id: string, name: string}[] } şeklinde döndürür
                const data = await response.json();
                const categories: Category[] = (data.categories || []).map((cat: { id: string; name: string }) => ({
                    id: cat.id, // 'id' olarak alıyoruz
                    name: cat.name // 'name' olarak alıyoruz
                }));
                setAllCategories(categories);
            } catch (error: any) {
                console.error("Error fetching all categories:", error);
                toast.error(`Tüm kategoriler getirilemedi: ${error.message}`);
                setAllCategories([]); // Hata durumunda boş liste
            } finally {
                setIsLoadingAllCategories(false);
            }
        };

        fetchAllCategories();
    }, []); // Sadece mount edildiğinde çalışır

    useEffect(() => {
        fetchCategoryCommissions();
    }, [fetchCategoryCommissions]);

    const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => {
        const { name, value } = e.target;
        if (type === 'new') {
            setNewCategoryCommission(prev => ({ ...prev, [name]: value }));
        } else {
            setEditCategoryCommission(prev => prev ? { ...prev, [name]: value } : null);
        }
    };

    // Select/Combobox'tan kategori seçildiğinde (Yeniden eklendi)
    const handleCategorySelect = (categoryId: string) => {
        setNewCategoryCommission(prev => ({ ...prev, categoryId: categoryId }));
    };

    const handleAddCategoryCommission = async () => {
        if (!newCategoryCommission.categoryId) {
            toast.warning("Lütfen bir Kategori seçin veya ID girin.");
            return;
        }
        const commissionRateNum = parseRequiredNumericPayloadValue(newCategoryCommission.commissionRate);
        if (isNaN(commissionRateNum)) {
            toast.warning("Lütfen geçerli bir Komisyon Oranı girin.");
            return;
        }
        if (commissionRateNum < 0) {
             toast.warning("Komisyon oranı negatif olamaz.");
             return;
        }

        setIsSavingCategory(true);
        toast.info("Kategori komisyonu ekleniyor...");
        try {
            const payload: Omit<CategoryCommissionPayload, 'categoryId'> = { 
                commissionRate: commissionRateNum,
            };
            const response = await fetch(`/api/settings/cost/category/${newCategoryCommission.categoryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Kategori komisyonu eklenemedi.');
            }
            toast.success(result.message || "Kategori komisyonu başarıyla eklendi/güncellendi.");
            setIsAddCategoryDialogOpen(false);
            setNewCategoryCommission({ categoryId: '', commissionRate: '' });
            fetchCategoryCommissions();
        } catch (error: any) {
            console.error("Error adding/updating category commission:", error);
            toast.error(`Hata: ${error.message}`);
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleUpdateCategoryCommission = async () => {
        if (!editCategoryCommission || !editCategoryCommission.categoryId) return;

        const commissionRateNum = parseRequiredNumericPayloadValue(editCategoryCommission.commissionRate);
         if (isNaN(commissionRateNum)) {
            toast.warning("Lütfen geçerli bir Komisyon Oranı girin.");
            return;
        }
        if (commissionRateNum < 0) {
            toast.warning("Komisyon oranı negatif olamaz.");
            return;
        }

        setIsSavingCategory(true);
        toast.info("Kategori komisyonu güncelleniyor...");
        try {
            const payload: Omit<CategoryCommissionPayload, 'categoryId'> = { 
                commissionRate: commissionRateNum,
            };
            const response = await fetch(`/api/settings/cost/category/${editCategoryCommission.categoryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Kategori komisyonu güncellenemedi.');
            }
            toast.success(result.message || "Kategori komisyonu başarıyla güncellendi.");
            setIsEditCategoryDialogOpen(false);
            setEditCategoryCommission(null);
            fetchCategoryCommissions();
        } catch (error: any) {
            console.error("Error updating category commission:", error);
            toast.error(`Hata: ${error.message}`);
        } finally {
            setIsSavingCategory(false);
        }
    };

    const openAddCategoryDialog = () => setIsAddCategoryDialogOpen(true);
    const closeAddCategoryDialog = () => setIsAddCategoryDialogOpen(false);

    const openEditCategoryDialog = (commission: CategoryCommissionData) => {
        setEditCategoryCommission({
            originalId: commission.id,
            categoryId: commission.categoryId,
            commissionRate: String(commission.commissionRate),
        });
        setIsEditCategoryDialogOpen(true);
    };
    const closeEditCategoryDialog = () => {
        setIsEditCategoryDialogOpen(false);
        setEditCategoryCommission(null);
    }

    return {
        categoryCommissions,
        isLoadingCategory,
        isSavingCategory,
        isAddCategoryDialogOpen,
        isEditCategoryDialogOpen,
        newCategoryCommission,
        editCategoryCommission,
        fetchCategoryCommissions,
        handleAddCategoryCommission,
        handleUpdateCategoryCommission,
        openAddCategoryDialog,
        closeAddCategoryDialog,
        openEditCategoryDialog,
        closeEditCategoryDialog,
        handleCategoryInputChange,
        // Yeniden eklenenler (doğru API ile)
        allCategories,
        isLoadingAllCategories,
        handleCategorySelect,
    };
} 