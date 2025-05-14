"use client";

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
  } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Siparis } from "@/lib/types/siparis";
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
    RefreshCw, 
    MoreHorizontal, 
    Info, 
    FileText, 
    DownloadCloud, 
    Download, 
    BadgeCheck, 
    AlertCircle 
} from "lucide-react";
import { CheckedState } from "@radix-ui/react-checkbox";

interface SiparislerTablosuProps {
    siparisler: Siparis[];
    isLoading: boolean;
    selectedRows: Set<string>;
    pageSize: number; // Skeleton için
    onSelectOrder: (orderId: string, selected: boolean) => void;
    onOpenDetailModal: (siparis: Siparis) => void;
    onOpenInvoiceUploadModal: (siparis: Siparis) => void;
    onSyncSingleOrder: (orderNumber: string) => void;
    onGenerateSingleBarcode: (orderIds: string[]) => void; // Dizi alacak şekilde güncellendi (tekli için de dizi)
    isGeneratingBarcode: boolean;
    onOpenChangeCarrierModal?: (siparis: Siparis) => void;
}

export function SiparislerTablosu({ 
    siparisler, 
    isLoading, 
    selectedRows, 
    pageSize,
    onSelectOrder,
    onOpenDetailModal,
    onOpenInvoiceUploadModal,
    onSyncSingleOrder,
    onGenerateSingleBarcode,
    isGeneratingBarcode,
    onOpenChangeCarrierModal
}: SiparislerTablosuProps) {
    return (
        <div className="relative overflow-x-auto">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Kargo Durumu</TableHead>
                        <TableHead>Fatura</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!isLoading && siparisler.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">Gösterilecek sipariş bulunamadı.</TableCell>
                        </TableRow>
                    )}
                    {isLoading && Array.from({ length: pageSize }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                            <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && siparisler.map((siparis) => (
                        <TableRow 
                            key={siparis.id}
                            data-state={selectedRows.has(siparis.id) ? "selected" : undefined}
                        >
                            <TableCell>
                                <Checkbox
                                    checked={selectedRows.has(siparis.id)}
                                    onCheckedChange={(selected: CheckedState) => onSelectOrder(siparis.id, selected === true)}
                                    aria-label={`Sipariş ${siparis.orderNumber} seç`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span 
                                                className="cursor-pointer hover:underline" 
                                                onClick={() => onOpenDetailModal(siparis)}
                                            >
                                                {siparis.orderNumber}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Detayları gör</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{siparis.customer.firstName} {siparis.customer.lastName}</div>
                            </TableCell>
                            <TableCell>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            {formatDistanceToNow(new Date(siparis.orderDate), { addSuffix: true, locale: tr })}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {format(new Date(siparis.orderDate), 'PPpp', { locale: tr })}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell>{formatCurrency(siparis.totalPrice)}</TableCell>
                            <TableCell>
                                <Badge variant={ 
                                    siparis.status === 'Delivered' ? 'default' :
                                    siparis.status === 'Shipped' ? 'secondary' :
                                    siparis.status === 'Cancelled' || siparis.status === 'UnDelivered' ? 'destructive' :
                                    'secondary'
                                }>
                                    {siparis.status} 
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={'secondary'} className="whitespace-nowrap">
                                    Durum Yok
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={siparis.invoiceLink ? 'default' : 'outline'}> 
                                    {siparis.invoiceLink ? (
                                        <a href={siparis.invoiceLink} target="_blank" rel="noopener noreferrer" className="flex items-center"> <BadgeCheck className="mr-1 h-3 w-3" /> Yüklendi</a>
                                    ) : (
                                        <span className="flex items-center cursor-pointer" onClick={() => onOpenInvoiceUploadModal(siparis)}> <AlertCircle className="mr-1 h-3 w-3" /> Yükle</span>
                                    )}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onOpenDetailModal(siparis)}>
                                            <Info className="mr-2 h-4 w-4" /> Detayları Gör
                                        </DropdownMenuItem>
                                        {siparis.invoiceLink ? (
                                            <DropdownMenuItem asChild>
                                                <a href={siparis.invoiceLink} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" /> Faturayı Görüntüle
                                                </a>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => onOpenInvoiceUploadModal(siparis)}>
                                                <DownloadCloud className="mr-2 h-4 w-4" /> Fatura Yükle
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem 
                                            onClick={() => onSyncSingleOrder(siparis.orderNumber)}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" /> Tekrar Senkronize Et
                                        </DropdownMenuItem>
                                        {(siparis.status === 'Created' || siparis.status === 'Invoiced') && (
                                            <DropdownMenuItem 
                                                onClick={() => onGenerateSingleBarcode([siparis.id])}
                                                disabled={isGeneratingBarcode}
                                            >
                                                <Download className="mr-2 h-4 w-4" /> Kargo Etiketi Yazdır
                                            </DropdownMenuItem>
                                        )}
                                        {(siparis.status === 'Created' || siparis.status === 'Invoiced') && (
                                            <DropdownMenuItem 
                                                onClick={() => onOpenChangeCarrierModal?.(siparis)}
                                            >
                                                <RefreshCw className="mr-2 h-4 w-4" /> Kargo Firması Değiştir
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 