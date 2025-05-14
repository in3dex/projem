'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendyolClaim, TrendyolClaimItem } from '@prisma/client'; // Prisma tiplerini import et
import { RefreshCw, Search, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClaimDetailsModal from '../iade/_components/claim-detail-modal';
import ApproveClaimModal from '../iade/_components/approve-claim-modal';
import RejectClaimModal from '../iade/_components/reject-claim-modal';
import { columns, ClaimTableMeta } from '../iade/_components/columns';

// API'den gelen iade tipi (serialize edilmiş)
export interface SerializedClaimItem extends Omit<TrendyolClaimItem, 'trendyolOrderLineId' | 'trendyolOrderLineItemId'> {
    trendyolOrderLineId: string | null; // BigInt -> string
    trendyolOrderLineItemId: string; // BigInt -> string
    quantity: number; // EKLENDİ - Linter hatası için
}

// SerializedClaim arayüzü Omit olmadan, doğrudan alanlarla tanımlanıyor
export interface SerializedClaim {
    id: string; // Prisma CUID
    userId: string; // Prisma User ilişkisi
    trendyolClaimId: string; // Trendyol UUID
    orderNumber: string; 
    orderDate: Date; // Bu da muhtemelen Date olmalı API'den sonra
    customerFirstName?: string;
    customerLastName?: string;
    claimDate: Date; 
    cargoTrackingNumber?: string | null;
    cargoProviderName?: string | null;
    cargoSenderNumber?: string | null;
    cargoTrackingLink?: string | null;
    rejectedPackageInfo?: any | null; 
    replacementPackageInfo?: any | null;
    lastModifiedDate: Date; 
    status: string; // Bu, bizim eklediğimiz genel durum olabilir veya Trendyol'dan gelen ana durum.
                    // columns.tsx ilk item'ın status'unu kullanıyor, bu alanın netleşmesi lazım.
    createdAt: Date; 
    updatedAt: Date; 
    claimItems: SerializedClaimItem[];
}

interface ClaimsApiResponse {
    data: SerializedClaim[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        pageSize: number;
    };
}

// API'den gelen Audit Log tipi
interface ClaimAuditLog {
    claimId: string;
    claimItemId: string;
    previousStatus: string;
    newStatus: string;
    userInfoDocument?: {
        executorId?: string;
        executorApp?: string;
        executorUser?: string;
    };
    date: number; // timestamp ms
}

interface AuditLogApiResponse {
    data: ClaimAuditLog[];
}

// İade Durumları (Türkçe karşılıkları ile - Dokümandan)
const claimStatuses = {
    Created: 'Oluşturuldu',
    WaitingInAction: 'Aksiyon Bekliyor',
    Accepted: 'Kabul Edildi',
    Cancelled: 'İptal Edildi',
    Rejected: 'Reddedildi',
    Unresolved: 'İhtilaflı',
    InAnalysis: 'Analizde',
};

type ClaimStatusKey = keyof typeof claimStatuses;
type FilterStatus = ClaimStatusKey | 'all';

export default function IadelerPage() {
    const [claims, setClaims] = useState<SerializedClaim[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('Created');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedClaimForModal, setSelectedClaimForModal] = useState<SerializedClaim | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Yeni state'ler onay/red için
    const [selectedClaimForApprove, setSelectedClaimForApprove] = useState<SerializedClaim | null>(null);
    const [itemIdsToApprove, setItemIdsToApprove] = useState<string[]>([]);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isApprovingClaim, setIsApprovingClaim] = useState(false);
    const [approveError, setApproveError] = useState<string | null>(null);

    const [selectedClaimForReject, setSelectedClaimForReject] = useState<SerializedClaim | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isRejectingClaim, setIsRejectingClaim] = useState(false);
    const [rejectError, setRejectError] = useState<string | null>(null);

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset page on new search
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Veri çekme fonksiyonu
    const fetchClaims = useCallback(async (pageToFetch = 1, sync = false) => {
        if (pageToFetch === 1 || sync) {
            setIsLoading(true);
        }
        if (sync) setIsSyncing(true);
        setError(null);

        const params = new URLSearchParams({
            page: pageToFetch.toString(),
            size: pageSize.toString(),
            ...(statusFilter !== 'all' && { status: statusFilter }),
            ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
            ...(sync && { sync: 'true' }),
        });

        try {
            console.log(`Fetching claims with params: ${params.toString()}`);
            const response = await fetch(`/api/claims?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Hatası: ${response.statusText}`);
            }
            const apiData: ClaimsApiResponse = await response.json();
            console.log("Claims data received:", apiData);
            
            const formattedData = apiData.data.map((claim: any) => ({ // claim tipini `any` yapıyoruz, çünkü API yanıtı tam eşleşmeyebilir
                ...claim, // Gelen tüm alanları al
                // Prisma modelinde olan ve SerializedClaim'de beklediğimiz alanları Date'e çevir
                claimDate: new Date(claim.claimDate), 
                createdAt: new Date(claim.createdAt),
                updatedAt: new Date(claim.updatedAt),
                orderDate: new Date(claim.orderDate), // orderDate de Date olmalı
                lastModifiedDate: new Date(claim.lastModifiedDate), // Bu da muhtemelen Date
            }));

            setClaims(formattedData as SerializedClaim[] || []); // Tip ataması yapıyoruz
            setCurrentPage(apiData.pagination.currentPage);
            setTotalPages(apiData.pagination.totalPages);
            setTotalCount(apiData.pagination.totalCount);
            setPageSize(apiData.pagination.pageSize);
            if (sync) {
                toast.success('Trendyol iadeleri ile senkronizasyon tamamlandı.');
            }
        } catch (err: any) {
            console.error('İadeler çekilirken hata:', err);
            const errorMessage = err.message || 'İadeler yüklenirken bir hata oluştu.';
            setError(errorMessage);
            toast.error(errorMessage);
            setClaims([]); // Hata durumunda listeyi boşalt
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [pageSize, statusFilter, debouncedSearchTerm]);

    // İlk yükleme ve filtre/arama değişimi
    useEffect(() => {
        fetchClaims(1); // Reset to page 1 on filter/search change
    }, [statusFilter, debouncedSearchTerm, fetchClaims]);

    // TanStack Table Kurulumu
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const table = useReactTable<SerializedClaim>({
        data: claims ?? [],
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
            pagination: {
                pageIndex: currentPage - 1, // API 1-based, table 0-based
                pageSize: pageSize,
            },
        },
        pageCount: totalPages, // Set page count for pagination controls
        manualPagination: true, // We handle pagination externally
        manualFiltering: true, // We handle filtering externally
        manualSorting: false, // Let table handle sorting client-side for now
        meta: {
            openModal: (claim: SerializedClaim) => {
                setSelectedClaimForModal(claim);
                setIsModalOpen(true);
            },
            triggerApprove: (claimId: string, itemLineIds: string[]) => {
                const claimToApprove = claims.find(c => c.id === claimId);
                if (claimToApprove) {
                    console.log('Approve triggered for Claim ID (Prisma):', claimId, 'Item IDs:', itemLineIds);
                    setSelectedClaimForApprove(claimToApprove);
                    setItemIdsToApprove(itemLineIds);
                    setApproveError(null);
                    setIsApproveModalOpen(true);
                } else {
                    console.error('Onaylanacak iade bulunamadı, Claim ID:', claimId);
                    toast.error('Onaylanacak iade bulunamadı.');
                }
            },
            triggerReject: (claim: SerializedClaim) => {
                console.log('Reject triggered for Claim:', claim);
                setSelectedClaimForReject(claim);
                setRejectError(null);
                setIsRejectModalOpen(true);
            }
        } as ClaimTableMeta,
        debugTable: process.env.NODE_ENV === 'development',
    });

    // Event Handlers
    const handleStatusChange = (value: string) => {
        setStatusFilter(value as FilterStatus);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleSync = () => {
        fetchClaims(1, true); // Always sync from page 1
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchClaims(newPage); // Fetch data for the new page
        }
    };

    // Yardımcı Fonksiyonlar
    const getStatusBadgeVariant = (status: ClaimStatusKey | string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Accepted': return "default";
            case 'Created': return "secondary";
            case 'WaitingInAction': return "outline";
            case 'Rejected': return "destructive";
            case 'Cancelled':
            case 'Unresolved':
            case 'InAnalysis': return "outline";
            default: return "secondary";
        }
    };

    const formatTimestamp = (dateObject: Date | null | undefined): string => {
        if (!dateObject) return '-';
        if (isNaN(dateObject.getTime())) {
            return 'Geçersiz Tarih';
        }
        return format(dateObject, 'dd.MM.yyyy HH:mm', { locale: tr });
    };

    // Onaylama API çağrısını yapacak fonksiyon
    const handleApproveSubmit = async (claimId: string, itemLineIdsToApprove: string[]) => {
        if (!selectedClaimForApprove) return;
        setIsApprovingClaim(true);
        setApproveError(null);
        try {
            const response = await fetch('/api/claims/approve', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    claimId: selectedClaimForApprove.trendyolClaimId, // Trendyol API'si claimId (UUID) bekliyor
                    claimLineItemIdList: itemLineIdsToApprove 
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'İade onaylanırken bir hata oluştu.');
            }
            toast.success('İade kalemleri başarıyla onaylandı.');
            setIsApproveModalOpen(false);
            setSelectedClaimForApprove(null);
            fetchClaims(currentPage); // Listeyi yenile
        } catch (err: any) {
            console.error("Onaylama hatası:", err);
            setApproveError(err.message || 'Bir hata oluştu.');
            toast.error(err.message || 'Bir hata oluştu.');
        } finally {
            setIsApprovingClaim(false);
        }
    };

    // Reddetme API çağrısını yapacak fonksiyon
    const handleRejectSubmit = async (claimId: string, trendyolClaimId: string, reasonId: number, description: string, lineItemIdsToReject: string[]) => {
        setIsRejectingClaim(true);
        setRejectError(null);
        try {
            const response = await fetch('/api/claims/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claimId: trendyolClaimId, // Trendyol API'si createClaimIssue için ana iade ID'sini bekliyor
                    reasonId: reasonId,
                    description: description,
                    claimLineItemIdList: lineItemIdsToReject,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'İade reddedilirken bir hata oluştu.');
            }
            toast.success('İade talebi başarıyla reddedildi.');
            setIsRejectModalOpen(false);
            setSelectedClaimForReject(null);
            fetchClaims(currentPage); // Listeyi yenile
        } catch (err: any) {
            console.error("Reddetme hatası:", err);
            setRejectError(err.message || 'Bir hata oluştu.');
            toast.error(err.message || 'Bir hata oluştu.');
        } finally {
            setIsRejectingClaim(false);
        }
    };

    // JSX
    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <div className="py-8 px-4 md:px-6 lg:px-8">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-2xl font-semibold tracking-tight">İade Yönetimi</CardTitle>
                                <CardDescription>Trendyol mağazanızdaki iade taleplerini görüntüleyin ve yönetin.</CardDescription>
                            </div>
                            <Button onClick={handleSync} disabled={isSyncing}>
                                {isSyncing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Trendyol ile Senkronize Et
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filtreleme Alanı (Mobil uyumlu hale getirildi) */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Sipariş No, Müşteri Adı, Ürün Adı ara..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="pl-10 w-full"
                                    disabled={isLoading}
                                />
                            </div>
                            <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap md:w-auto">
                                    <TabsTrigger value="all" className="w-full md:w-auto">Tümü</TabsTrigger>
                                    {Object.entries(claimStatuses).map(([key, value]) => (
                                        <TabsTrigger key={key} value={key} className="w-full md:w-auto">
                                            {value}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Hata Durumu */}
                        {error && !isLoading && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Hata</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Mobil Görünüm: Kartlar */}
                        <div className="md:hidden space-y-4">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <Card key={`skeleton-card-${index}`} className="animate-pulse">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <Skeleton className="h-5 w-3/4" />
                                                <Skeleton className="h-5 w-1/4" />
                                            </div>
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-4 w-full" />
                                            <div className="flex justify-end">
                                                 <Skeleton className="h-8 w-20" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => {
                                    const claim = row.original as SerializedClaim;
                                    return (
                                        <Card key={claim.id}>
                                            <CardContent className="p-4 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold text-sm">#{claim.id}</span>
                                                    <Badge variant={getStatusBadgeVariant(claim.status as ClaimStatusKey)}>{claimStatuses[claim.status as ClaimStatusKey] || claim.status}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Sipariş No: {claim.orderNumber}
                                                </p>
                                                <p className="text-sm font-medium line-clamp-2">
                                                    {claim.claimItems[0]?.productName || 'Ürün bilgisi yok'} {claim.claimItems.length > 1 ? `ve ${claim.claimItems.length - 1} diğer ürün` : ''}
                                                </p>
                                                 <p className="text-xs text-muted-foreground">
                                                    Oluşturulma: {formatTimestamp(claim.createdAt)}
                                                </p>
                                                <div className="flex justify-end pt-2">
                                                    <Button variant="outline" size="sm" onClick={() => table.options.meta?.openModal(claim)}>
                                                        Detay Gör
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                     {error ? "Veri yüklenirken hata oluştu." : "Gösterilecek iade bulunamadı."}
                                </div>
                            )}
                        </div>

                        {/* Masaüstü Görünüm: Tablo */}
                        <div className="hidden md:block rounded-md border">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="whitespace-nowrap">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        // Skeleton Loader
                                        Array.from({ length: pageSize }).map((_, index) => (
                                            <TableRow key={`skeleton-${index}`}>
                                                {table.getAllColumns().map((column) => (
                                                     <TableCell key={`${column.id}-skeleton-${index}`}>
                                                        <Skeleton className="h-6 w-full" />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => table.options.meta?.openModal(row.original as SerializedClaim)} // Satıra tıklanınca modal aç
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="whitespace-nowrap">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                                                {error ? "Veri yüklenirken hata oluştu." : "Gösterilecek iade bulunamadı."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Sayfalama (Her iki görünümde de gösterilecek) */}
                        {!isLoading && totalPages > 1 && (
                             <div className="flex items-center justify-between flex-wrap gap-4 py-4">
                                 <span className="text-sm text-muted-foreground whitespace-nowrap">
                                     Toplam {totalCount} kayıttan {table.getState().pagination.pageIndex * pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, totalCount)} arası gösteriliyor.
                                 </span>
                                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                    >
                                        İlk
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Önceki
                                    </Button>
                                     <span className="text-sm px-2 py-1 border rounded-md whitespace-nowrap">
                                        {currentPage} / {totalPages}
                                     </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Sonraki
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Son
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedClaimForModal && (
                 <ClaimDetailsModal
                    claim={selectedClaimForModal}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                 />
            )}

            {selectedClaimForApprove && (
                <ApproveClaimModal 
                    isOpen={isApproveModalOpen}
                    onClose={() => {
                        setIsApproveModalOpen(false);
                        setSelectedClaimForApprove(null);
                    }}
                    claim={selectedClaimForApprove}
                    onSubmit={handleApproveSubmit}
                    isLoading={isApprovingClaim}
                    error={approveError}
                />
            )}

            {selectedClaimForReject && (
                <RejectClaimModal 
                    isOpen={isRejectModalOpen}
                    onClose={() => {
                        setIsRejectModalOpen(false);
                        setSelectedClaimForReject(null);
                    }}
                    claim={selectedClaimForReject}
                    onSubmit={handleRejectSubmit}
                    isLoading={isRejectingClaim}
                    error={rejectError}
                 />
            )}
        </Dialog>
    );
} 