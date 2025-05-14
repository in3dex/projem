'use client';

import Image from 'next/image';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { Loader2, Edit, Info, Package, Barcode, DollarSign, Warehouse } from 'lucide-react';
import { CostInputCell } from '@/components/dashboard/cost-input-cell';
import { formatCurrency, cn } from '@/lib/utils';

// ProductVariant arayüzü kaldırıldı.

// Product arayüzü güncellendi
interface Product {
  id: string;
  barcode: string;
  stockCode: string | null;
  title: string;
  brand: { name: string } | null;
  category: { name: string } | null;
  salePrice: number;
  costPrice: number | null;
  quantity: number;
  approved: boolean;
  archived: boolean;
  images: any; // JSON tipi
  attributes: any; // JSON tipi
  onSale?: boolean;
  rejected?: boolean;
  blacklisted?: boolean;
  // Diğer Product alanları (gerekirse eklenebilir)
}

// Props arayüzü güncellendi
interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  updatingCostBarcode: string | null; // updatingCostVariantId yerine
  handleCostChange: (barcode: string, newValue: string) => Promise<void>; // variantId yerine barcode
  onEditClick: (productId: string) => void; // handleOpenEditModal -> onEditClick, barcode -> productId
}

export function ProductTable({
  products,
  isLoading,
  updatingCostBarcode, // Güncellenmiş prop adı
  handleCostChange,
  onEditClick, // handleOpenEditModal -> onEditClick
}: ProductTableProps) {
  // Helper fonksiyonu: Attributes dizisini okunabilir metne çevirir
  const formatAttributes = (attributes: any): string => {
    if (Array.isArray(attributes) && attributes.length > 0) {
      return attributes
        .map(attr => `${attr.attributeName}: ${attr.attributeValue}`)
        .join(' / ');
    } else if (typeof attributes === 'object' && attributes !== null) {
      // JSON objesi olarak geliyorsa (örneğin, doğrudan DB'den)
      try {
        // Stringify edip tekrar parse etmeye gerek yok, zaten obje
        // Ancak yapısı { attributeName: string, attributeValue: string }[] olmayabilir.
        // Esnek olmak için şimdilik basit bir JSON stringify yapalım.
        // Daha iyi bir çözüm: Gelen verinin yapısını kontrol edip ona göre formatlamak.
        return JSON.stringify(attributes); 
      } catch (e) {
        return 'Özellikler okunamadı';
      }
    }
    return 'Özellik detayı yok';
  };

  // Helper fonksiyonu: Görsel URL'sini alır
  const getImageUrl = (images: any): string | null => {
    if (Array.isArray(images) && images.length > 0 && images[0].url) {
      return images[0].url;
    } else if (images && typeof images === 'object' && !Array.isArray(images) && images.url) {
      // Bazen tek bir obje olarak gelebiliyor
      return images.url;
    }
    return null;
  };

  const renderProductStatusBadges = (product: Product) => (
    <div className="flex flex-wrap gap-1 mt-2">
      {product.onSale && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Satışta</Badge>}
      {product.approved && !product.onSale && <Badge variant="secondary">Onaylı (Listelenmiyor)</Badge>}
      {!(product.approved ?? false) && <Badge variant="outline" className="text-orange-600 border-orange-600">Onaysız</Badge>}
      {product.archived && <Badge variant="destructive">Arşivlenmiş</Badge>}
      {product.rejected && <Badge variant="destructive">Reddedilmiş</Badge>}
      {product.blacklisted && <Badge variant="destructive">Kara Liste</Badge>}
    </div>
  );

  return (
    <div className="w-full">
      {/* Mobil Görünüm: Kartlar (md altında gizli) */}
      <div className="md:hidden space-y-4 p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          products.map((product) => {
            const imageUrl = getImageUrl(product.images);
            const attributesText = formatAttributes(product.attributes);
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="flex">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.title}
                      width={96} // Biraz daha büyük
                      height={96}
                      className="object-cover aspect-square"
                      onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
                      Görsel Yok
                    </div>
                  )}
                  <CardContent className="p-3 flex-grow">
                    <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{attributesText}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{product.brand?.name ?? '-'}</span> / <span>{product.category?.name ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <span className="font-semibold text-primary">
                         {formatCurrency ? formatCurrency(product.salePrice) : `${product.salePrice.toFixed(2)} TL`}
                       </span>
                       <span className="text-sm">Stok: {product.quantity}</span>
                    </div>
                  </CardContent>
                </div>
                <div className="px-3 pb-3">
                   {renderProductStatusBadges(product)}
                   <div className="flex items-center gap-2 mt-2">
                      <div className="flex-grow">
                        <CostInputCell
                            variantId={product.barcode}
                            initialCostPrice={product.costPrice}
                            onSave={handleCostChange}
                            isUpdating={updatingCostBarcode === product.barcode}
                         />
                       </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditClick(product.id)}
                      >
                        <Edit className="h-4 w-4" /> {/* Mobil için sadece ikon */}
                      </Button>
                   </div>
                   <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Barcode className="w-3 h-3"/> {product.barcode}
                   </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Package className="w-3 h-3"/> {product.stockCode || '-'}
                   </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Filtre kriterlerine uygun ürün bulunamadı.
          </div>
        )}
      </div>

      {/* Masaüstü Görünüm: Tablo (md ve üzeri ekranlarda görünür) */}
      <div className="hidden md:block">
        <Card>
           <CardContent className="p-0">
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Görsel</TableHead><TableHead>Ürün Adı / Özellikler</TableHead><TableHead>Marka / Kategori</TableHead><TableHead>SKU / Barkod</TableHead><TableHead className="text-right">Fiyat</TableHead><TableHead className="text-right w-[150px]">
                      <div className="flex items-center justify-end gap-1">
                        Maliyet
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Birim maliyetinizi girin. Otomatik kaydedilir.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead><TableHead className="text-right">Stok</TableHead><TableHead>Durum</TableHead><TableHead className="w-[100px] text-center">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : products.length > 0 ? (
                    products.map((product) => {
                      const imageUrl = getImageUrl(product.images);
                      const attributesText = formatAttributes(product.attributes);
                      return (
                        <TableRow key={product.id}> {/* key olarak id kullanıldı */}
                          <TableCell>
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={product.title}
                                width={64}
                                height={64}
                                className="rounded object-cover aspect-square"
                                onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                                Görsel Yok
                              </div>
                            )}
                          </TableCell><TableCell>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {attributesText}
                            </div>
                          </TableCell><TableCell>
                            <div className="font-medium">{product.brand?.name ?? '-'}</div >
                            <div className="text-xs text-muted-foreground">
                              {product.category?.name ?? '-'}
                            </div>
                          </TableCell><TableCell>
                            <div>{product.stockCode || '-'}</div>
                            <div className="text-xs text-muted-foreground">{product.barcode}</div>
                          </TableCell><TableCell className="text-right">
                            {formatCurrency ? formatCurrency(product.salePrice) : `${product.salePrice.toFixed(2)} TL`}
                          </TableCell><TableCell className="text-right">
                            <CostInputCell
                              variantId={product.barcode}
                              initialCostPrice={product.costPrice}
                              onSave={handleCostChange}
                              isUpdating={updatingCostBarcode === product.barcode}
                            />
                          </TableCell><TableCell className="text-right">{product.quantity}</TableCell><TableCell>
                             {renderProductStatusBadges(product)}
                          </TableCell><TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditClick(product.id)}
                            >
                              <Edit className="mr-1 h-3 w-3" /> Düzenle
                            </Button>
                          </TableCell></TableRow>);
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Filtre kriterlerine uygun ürün bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 