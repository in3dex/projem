'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { useProductCostSettings } from '@/hooks/use-product-cost-settings';
import { useCategoryCommissions } from '@/hooks/use-category-commissions';
import { ProductSettingsTable } from './product-settings/product-settings-table';
import { AddProductDialog } from './product-settings/add-product-dialog';
import { EditProductDialog } from './product-settings/edit-product-dialog';
import { CategoryCommissionsTable } from './category-commissions/category-commissions-table';
import { AddCategoryDialog } from './category-commissions/add-category-dialog';
import { EditCategoryDialog } from './category-commissions/edit-category-dialog';
import { Plus } from 'lucide-react';

// Tip for delete confirmation state
interface ItemToDelete {
    id: string; // setting ID (used for UI state like open dialog check)
    identifier: string; // productId or categoryId (used for API call)
    type: 'product' | 'category';
    name: string; // For display in confirmation message
}

export function CustomCostSettings() {
    const productSettingsHook = useProductCostSettings();
    const categoryCommissionsHook = useCategoryCommissions();

    const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openDeleteDialogId, setOpenDeleteDialogId] = useState<string | null>(null); // Store setting ID to control dialog

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        toast.info("Ayar siliniyor...");
        const { identifier, type } = itemToDelete;
        const url = `/api/settings/cost/${type}/${identifier}`; // Use identifier (productId/categoryId) for API call

        try {
            const response = await fetch(url, { method: 'DELETE' });

            if (!response.ok) {
                 // Try to parse error JSON, fallback to status text
                 let errorMessage = `HTTP error! status: ${response.statusText || response.status}`;
                 try {
                     const result = await response.json();
                     errorMessage = result.error || errorMessage;
                 } catch (e) {
                     // Ignore JSON parsing error if response body is empty or not JSON
                 }
                 throw new Error(errorMessage);
             }

             // Check for 204 No Content explicitly or rely on success message from API if available (current API returns 200 with message)
             let successMessage = "Ayar başarıyla silindi.";
             try {
                 const result = await response.json();
                 successMessage = result.message || successMessage;
             } catch(e) {
                 // If response is 204 or not JSON, stick to default message
             }

            toast.success(successMessage);
            setOpenDeleteDialogId(null); // Close dialog
            setItemToDelete(null);

            // Refresh the corresponding list
            if (type === 'product') productSettingsHook.fetchProductSettings();
            if (type === 'category') categoryCommissionsHook.fetchCategoryCommissions();
        } catch (error: any) {
            console.error(`Error deleting ${type} setting:`, error);
            toast.error(`Hata: ${error.message}`);
            setItemToDelete(null); // Clear item even on error
            setOpenDeleteDialogId(null); // Close dialog on error too
        } finally {
            setIsDeleting(false);
        }
    };

    const openDeleteConfirmation = (settingId: string, identifier: string, type: 'product' | 'category', name: string) => {
        setItemToDelete({ id: settingId, identifier, type, name });
        setOpenDeleteDialogId(settingId); // Use settingId to control which dialog is open
    };

    return (
        <div className="space-y-6">
            {/* Ürün Bazlı Ayarlar */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Ürün Bazlı Ayarlar</CardTitle>
                        <CardDescription>
                            Belirli ürünler için varsayılan maliyetleri geçersiz kılın.
                        </CardDescription>
                    </div>
                    <Button onClick={productSettingsHook.openAddProductDialog} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Ürün Ayarı
                    </Button>
                </CardHeader>
                <CardContent>
                    <ProductSettingsTable
                        productSettings={productSettingsHook.productSettings}
                        isLoading={productSettingsHook.isLoadingProduct}
                        isDeleting={isDeleting}
                        onEdit={productSettingsHook.openEditProductDialog}
                        onDelete={(settingId, productId, productName) => openDeleteConfirmation(settingId, productId, 'product', productName)}
                        openDeleteDialogId={itemToDelete?.type === 'product' ? openDeleteDialogId : null} // Pass only if it's a product delete
                        setOpenDeleteDialogId={setOpenDeleteDialogId}
                        handleConfirmDelete={handleDelete}
                    />
                </CardContent>
            </Card>

            {/* Ürün EKLEME Dialogu (Şimdi burada render ediliyor) */}
            <AddProductDialog
                isOpen={productSettingsHook.isAddProductDialogOpen}
                onOpenChange={(open) => { if (!open) productSettingsHook.closeAddProductDialog(); }}
                newProductSetting={productSettingsHook.newProductSetting}
                handleInputChange={productSettingsHook.handleProductInputChange}
                onSave={productSettingsHook.handleAddProductSetting}
                isSaving={productSettingsHook.isSavingProduct}
                productSearchQuery={productSettingsHook.productSearchQuery}
                productSearchResults={productSettingsHook.productSearchResults}
                isLoadingProductSearch={productSettingsHook.isLoadingProductSearch}
                isComboboxOpen={productSettingsHook.isComboboxOpen}
                setIsComboboxOpen={productSettingsHook.setIsComboboxOpen}
                handleProductSearchChange={productSettingsHook.handleProductSearchChange}
                handleProductSelect={productSettingsHook.handleProductSelect}
            />

            {/* Ürün Düzenleme Dialogu */}
            <EditProductDialog
                 isOpen={productSettingsHook.isEditProductDialogOpen}
                 onOpenChange={(open) => { if (!open) productSettingsHook.closeEditProductDialog(); }}
                 editProductSetting={productSettingsHook.editProductSetting}
                 handleInputChange={productSettingsHook.handleProductInputChange}
                 onSave={productSettingsHook.handleUpdateProductSetting}
                 isSaving={productSettingsHook.isSavingProduct}
            />

            {/* Kategori Bazlı Komisyonlar */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Kategori Bazlı Komisyonlar</CardTitle>
                        <CardDescription>
                            Belirli kategoriler için varsayılan komisyon oranını geçersiz kılın.
                        </CardDescription>
                    </div>
                    <Button onClick={categoryCommissionsHook.openAddCategoryDialog} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Kategori Komisyonu
                    </Button>
                </CardHeader>
                <CardContent>
                    <CategoryCommissionsTable
                         categoryCommissions={categoryCommissionsHook.categoryCommissions}
                         isLoading={categoryCommissionsHook.isLoadingCategory}
                         isDeleting={isDeleting}
                         onEdit={categoryCommissionsHook.openEditCategoryDialog}
                         onDelete={(settingId, categoryId, categoryName) => openDeleteConfirmation(settingId, categoryId, 'category', categoryName)}
                         openDeleteDialogId={itemToDelete?.type === 'category' ? openDeleteDialogId : null} // Pass only if it's a category delete
                         setOpenDeleteDialogId={setOpenDeleteDialogId}
                         handleConfirmDelete={handleDelete}
                    />
                </CardContent>
            </Card>

            {/* Kategori EKLEME Dialogu (Şimdi burada render ediliyor) */}
            <AddCategoryDialog
                isOpen={categoryCommissionsHook.isAddCategoryDialogOpen}
                onOpenChange={(open) => { if (!open) categoryCommissionsHook.closeAddCategoryDialog(); }}
                newCategoryCommission={categoryCommissionsHook.newCategoryCommission}
                handleInputChange={categoryCommissionsHook.handleCategoryInputChange}
                onSave={categoryCommissionsHook.handleAddCategoryCommission}
                isSaving={categoryCommissionsHook.isSavingCategory}
                allCategories={categoryCommissionsHook.allCategories}
                isLoadingAllCategories={categoryCommissionsHook.isLoadingAllCategories}
                handleCategorySelect={categoryCommissionsHook.handleCategorySelect}
            />

             {/* Kategori Düzenleme Dialogu */}
             <EditCategoryDialog
                 isOpen={categoryCommissionsHook.isEditCategoryDialogOpen}
                 onOpenChange={(open) => { if (!open) categoryCommissionsHook.closeEditCategoryDialog(); }}
                 editCategoryCommission={categoryCommissionsHook.editCategoryCommission}
                 handleInputChange={categoryCommissionsHook.handleCategoryInputChange}
                 onSave={categoryCommissionsHook.handleUpdateCategoryCommission}
                 isSaving={categoryCommissionsHook.isSavingCategory}
            />
        </div>
    );
} 