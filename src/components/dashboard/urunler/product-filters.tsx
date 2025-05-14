'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Filter, Search, X, Building, Tags, DollarSign } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedBrandId: string | 'all';
  onBrandChange: (value: string | null) => void;
  availableBrands: ComboboxOption[];
  selectedCategoryId: string | 'all';
  onCategoryChange: (value: string | null) => void;
  availableCategories: ComboboxOption[];
  onClearFilters: () => void;
  isLoading: boolean;
  isFilterOptionsLoading: boolean;
  showCostFilter?: boolean;
  costFilterValue?: boolean;
  onCostFilterChange?: (checked: boolean) => void;
}

export function ProductFilters({
  searchQuery,
  onSearchChange,
  selectedBrandId,
  onBrandChange,
  availableBrands,
  selectedCategoryId,
  onCategoryChange,
  availableCategories,
  onClearFilters,
  isLoading,
  isFilterOptionsLoading,
  showCostFilter = false,
  costFilterValue = false,
  onCostFilterChange = () => {},
}: ProductFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" /> Filtrele
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
        {/* Arama (Daha geniş ekranlarda 2 sütun kaplayacak) */}
        <div className="relative md:col-span-2 lg:col-span-1 xl:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ürün adı, SKU, Barkod ara..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 w-full"
            disabled={isLoading}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Marka Filtresi */}
        <div>
          <Combobox
            id="brand-filter"
            options={[{ value: 'all', label: 'Tüm Markalar' }, ...availableBrands]}
            value={selectedBrandId === 'all' ? null : selectedBrandId}
            onSelect={onBrandChange}
            placeholder="Marka Seçin"
            searchPlaceholder="Marka ara..."
            notFoundMessage="Marka bulunamadı."
            triggerIcon={<Building className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
            disabled={isFilterOptionsLoading || isLoading}
            className="w-full"
          />
        </div>

        {/* Kategori Filtresi */}
        <div>
          <Combobox
            id="category-filter"
            options={[{ value: 'all', label: 'Tüm Kategoriler' }, ...availableCategories]}
            value={selectedCategoryId === 'all' ? null : selectedCategoryId}
            onSelect={onCategoryChange}
            placeholder="Kategori Seçin"
            searchPlaceholder="Kategori ara..."
            notFoundMessage="Kategori bulunamadı."
            triggerIcon={<Tags className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
            disabled={isFilterOptionsLoading || isLoading}
            className="w-full"
          />
        </div>

        {/* Maliyet Filtresi ve Temizle Butonu yan yana */}
        <div className="flex flex-col sm:flex-row gap-4 xl:col-span-1 items-end">
          {showCostFilter && (
            <div className="flex items-center space-x-2 justify-start border rounded-md p-2 h-10 flex-shrink-0 whitespace-nowrap">
              <Checkbox
                id="cost-filter-checkbox"
                checked={costFilterValue}
                onCheckedChange={onCostFilterChange}
                disabled={isLoading}
              />
              <Label
                htmlFor="cost-filter-checkbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer"
              >
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Maliyeti Tanımlılar
              </Label>
            </div>
          )}

          {/* Filtreleri Temizle Butonu */}
          <Button
            variant="outline"
            onClick={onClearFilters}
            disabled={isLoading}
            className="w-full sm:w-auto flex-grow sm:flex-grow-0"
          >
            <X className="mr-2 h-4 w-4" /> Temizle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 