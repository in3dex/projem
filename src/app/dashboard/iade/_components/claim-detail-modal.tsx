'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Terminal, Truck, User as UserIcon, Package, Info, History, Hash, CalendarDays, RefreshCw, FileText, Loader2 } from 'lucide-react';
import type { SerializedClaim, SerializedClaimItem } from '@/app/dashboard/iadeler/page';
import { toast } from "sonner";

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

interface ClaimDetailsModalProps {
    claim: SerializedClaim | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimDetailsModal({ claim, isOpen, onClose }: ClaimDetailsModalProps) {
    const [auditLogs, setAuditLogs] = useState<Record<string, ClaimAuditLog[]>>({});
    const [isLoadingAudit, setIsLoadingAudit] = useState<Record<string, boolean>>({});
    const [errorAudit, setErrorAudit] = useState<Record<string, string | null>>({});

    const fetchAuditLogs = useCallback(async (claimItemId: string) => {
        if (!claimItemId || auditLogs[claimItemId]) return;

        setIsLoadingAudit(prev => ({ ...prev, [claimItemId]: true }));
        setErrorAudit(prev => ({ ...prev, [claimItemId]: null }));

        try {
            console.log(`Fetching audit logs for claim item: ${claimItemId}`);
            const response = await fetch(`/api/claims/items/${claimItemId}/audit`);
          if (!response.ok) {
            const errorData = await response.json();
                throw new Error(errorData.error || 'Audit logları alınamadı.');
            }
            const data: AuditLogApiResponse = await response.json();
            const sortedLogs = data.data.sort((a, b) => b.date - a.date);
            setAuditLogs(prev => ({ ...prev, [claimItemId]: sortedLogs }));
            console.log(`Audit logs received for ${claimItemId}:`, sortedLogs);
        } catch (err: any) {
            console.error(`Audit log çekme hatası (${claimItemId}):`, err);
            setErrorAudit(prev => ({ ...prev, [claimItemId]: err.message || 'Loglar yüklenirken hata oluştu.' }));
            toast.error(`İade kalemi (${claimItemId.substring(0, 8)}...) logları yüklenirken bir hata oluştu.`);
        } finally {
            setIsLoadingAudit(prev => ({ ...prev, [claimItemId]: false }));
        }
    }, []);

    const getStatusBadgeVariant = (status: ClaimStatusKey | string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Accepted': return "default";
            case 'Created': return "secondary";
            case 'WaitingInAction':
            case 'InAnalysis': return "outline";
            case 'Rejected':
            case 'Cancelled': return "destructive";
            case 'Unresolved': return "outline";
            default: return "secondary";
        }
    };

    const formatTimestamp = (timestampOrDate: number | Date | string | null | undefined): string => {
        if (!timestampOrDate) return '-';
        let dateObject: Date;
        try {
            if (typeof timestampOrDate === 'number') {
                dateObject = new Date(timestampOrDate);
            } else if (timestampOrDate instanceof Date) {
                dateObject = timestampOrDate;
            } else {
                dateObject = new Date(timestampOrDate);
            }
            if (isNaN(dateObject.getTime())) { return 'Geçersiz Tarih'; }
            return format(dateObject, 'dd.MM.yyyy HH:mm', { locale: tr });
        } catch (e) {
            return 'Tarih Hatası';
        }
    };

    const renderAuditLogs = (claimItemId: string) => {
        const logs = auditLogs[claimItemId];
        const isLoading = isLoadingAudit[claimItemId];
        const error = errorAudit[claimItemId];

    if (isLoading) {
      return (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loglar yükleniyor...</span>
        </div>
      );
    }

    if (error) {
      return (
                <Alert variant="destructive" className="my-2">
          <Terminal className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

        if (!logs || logs.length === 0) {
            return <p className="text-sm text-muted-foreground px-4 py-2">İşlem geçmişi bulunamadı.</p>;
        }

        return (
            <ul className="space-y-3 px-1 py-2">
                {logs.map((log, index) => (
                    <li key={`${log.claimItemId}-${index}`} className="text-xs border-b pb-2 last:border-b-0">
                        <div className="flex justify-between items-center mb-1">
                            <Badge variant={log.previousStatus ? getStatusBadgeVariant(log.newStatus as ClaimStatusKey) : 'secondary'}
                                className="text-xs px-1.5 py-0.5">
                                {claimStatuses[log.newStatus as ClaimStatusKey] || log.newStatus}
                            </Badge>
                            <span className="text-muted-foreground">{formatTimestamp(log.date)}</span>
                        </div>
                        {log.previousStatus && (
                            <p><span className="font-medium">Önceki Durum:</span> {claimStatuses[log.previousStatus as ClaimStatusKey] || log.previousStatus}</p>
                        )}
                        {log.userInfoDocument && (
                            <p className="text-muted-foreground mt-1">
                                <UserIcon className="inline h-3 w-3 mr-1" />
                                {log.userInfoDocument.executorUser || '-'} ({log.userInfoDocument.executorApp || 'Sistem'})
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    const renderContent = () => {
        if (!claim) {
            return (
                 <div className="flex items-center justify-center h-32">
                     <Info className="h-6 w-6 text-muted-foreground mr-2"/>
                     <p className="text-muted-foreground">İade bilgileri yüklenemedi.</p>
                 </div>
            );
        }

        return (
            <ScrollArea className="max-h-[75vh]">
                <div className="pr-6 py-4 space-y-6">
                    {/* Genel Bilgiler Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Hash className="mr-2 h-5 w-5" /> Genel Bilgiler
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                <div className="flex items-center">
                                    <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium mr-2">Sipariş No:</span>
                                    <span>{claim.orderNumber}</span>
                                </div>
                                <div className="flex items-center">
                                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium mr-2">Sipariş Tarihi:</span>
                                    <span>{formatTimestamp(claim.orderDate)}</span>
                                </div>
                                <div className="flex items-center">
                                    <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium mr-2">Müşteri:</span>
                                    <span>{claim.customerFirstName} {claim.customerLastName}</span>
                                </div>
                                <div className="flex items-center">
                                     <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium mr-2">Talep Tarihi:</span>
                                    <span>{formatTimestamp(claim.claimDate)}</span>
                                </div>
                                <div className="flex items-center md:col-span-2">
                                     <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium mr-2">Son Güncelleme:</span>
                                    <span>{formatTimestamp(claim.updatedAt)}</span>
                                </div>
                            </div>
                            {claim.cargoProviderName && (
                                <>
                                    <Separator className="my-3" />
                                    <h4 className="text-md font-semibold flex items-center mb-2">
                                        <Truck className="mr-2 h-5 w-5" /> Kargo Bilgileri
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                         <div className="flex items-center">
                                             <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium mr-2">Firma:</span>
                                            <span>{claim.cargoProviderName}</span>
                                        </div>
                                         <div className="flex items-center">
                                             <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium mr-2">Takip No:</span>
                                            <span>{claim.cargoTrackingNumber || '-'}</span>
                                        </div>
                                        {claim.cargoTrackingLink && (
                                            <div className="md:col-span-2 mt-1">
                                                <a href={claim.cargoTrackingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center">
                                                     <Truck className="mr-1 h-3 w-3" /> Kargo Takip Linki
                        </a>
                     </div>
                 )}
                                    </div>
               </>
           )}
                        </CardContent>
                    </Card>

        {/* İade Edilen Ürünler */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Package className="mr-2 h-5 w-5" /> İade Edilen Ürünler ({claim.claimItems.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {claim.claimItems.map((item, index) => (
                                    <AccordionItem value={`item-${index}`} key={item.id || item.trendyolClaimItemId}>
                                        <AccordionTrigger className="hover:no-underline">
                                            {item.productName || 'Ürün Adı Bilinmiyor'}
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                <p><span className="font-medium">Fiyat:</span> {item.price?.toFixed(2) || '-'} TL</p>
                                                <p><span className="font-medium">Renk:</span> {item.productColor || '-'}</p>
                                                <p><span className="font-medium">Boyut:</span> {item.productSize || '-'}</p>
                                            </div>
                                            {item.customerReasonName && (
                                                <p><span className="font-medium">Müşteri Sebebi:</span> {item.customerReasonName} {item.customerReasonCode ? `(${item.customerReasonCode})` : ''}</p>
                                            )}
                                            {item.customerNote && (
                                                <p><span className="font-medium">Müşteri Notu:</span> {item.customerNote}</p>
                                            )}
                                            {item.trendyolReasonName && (
                                                <p><span className="font-medium">Trendyol Sebebi:</span> {item.trendyolReasonName} {item.trendyolReasonCode ? `(${item.trendyolReasonCode})` : ''}</p>
                                            )}
                                            {item.note && (
                                                <p><span className="font-medium">Satıcı Notu:</span> {item.note}</p>
                                            )}
                                            <div className="pt-2">
                                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => fetchAuditLogs(item.trendyolClaimItemId)} disabled={!!isLoadingAudit[item.trendyolClaimItemId] || !!auditLogs[item.trendyolClaimItemId]}> 
                                                   {isLoadingAudit[item.trendyolClaimItemId] ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <History className="h-3 w-3 mr-1"/>} İşlem Geçmişini Görüntüle
                                                </Button>
                                                {renderAuditLogs(item.trendyolClaimItemId)}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Kargo Bilgileri Card (Varsa) */}
                    {(claim.cargoTrackingNumber || claim.cargoProviderName || claim.cargoSenderNumber) && (
                       <Card>
                           <CardHeader>
                               <CardTitle className="text-lg flex items-center">
                                   <Truck className="mr-2 h-5 w-5" /> Kargo Bilgileri
                               </CardTitle>
                           </CardHeader>
                           <CardContent className="text-sm space-y-2">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                   <div className="flex items-center">
                                       <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                                       <span className="font-medium mr-2">Firma:</span>
                                       <span>{claim.cargoProviderName}</span>
                                   </div>
                                   <div className="flex items-center">
                                       <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                       <span className="font-medium mr-2">Takip No:</span>
                                       <span>{claim.cargoTrackingNumber || '-'}</span>
                                   </div>
                               </div>
                           </CardContent>
                       </Card>
                    )}
                </div>
            </ScrollArea>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>İade Detayları</DialogTitle>
                     {claim && <DialogDescription>Sipariş No: {claim.orderNumber} | Talep Tarihi: {formatTimestamp(claim.claimDate)}</DialogDescription>} 
                </DialogHeader>
                {renderContent()}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Kapat</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 