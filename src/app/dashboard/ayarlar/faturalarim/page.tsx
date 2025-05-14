'use client'

import React, { useEffect, useState } from 'react';
import { columns, InvoiceData } from "@/components/admin/invoices/columns"; // Düzeltilmiş yol
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, BanknoteIcon, CopyIcon, CreditCard, ClockIcon, Loader2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrency } from "@/lib/utils";
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// API'den dönen veri tipi (OdemeSecenekleri bileşenindeki ile uyumlu)
interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string | null;
    hesapNumarasi?: string | null;
    iban: string;
    hesapSahibi: string;
}

// YENİ: Ödeme Yöntemi Tipi (odeme/page.tsx ile aynı)
interface OdemeYontemi {
    type: 'eft' | 'paytr'; // Sadece EFT ve PayTR desteklenecek
    label: string;
    accounts?: BankaHesabi[];
}

// Global state veya context yerine basitçe banka hesaplarını tekrar çekelim
async function getActiveBankAccounts(): Promise<BankaHesabi[]> {
     try {
        const response = await fetch('/api/odeme-yontemleri'); // Sadece EFT için değil, genel endpoint
        if (!response.ok) throw new Error('Banka hesapları alınamadı');
         const data = await response.json();
        const eftMethod = data.odemeYontemleri?.find((y: OdemeYontemi) => y.type === 'eft');
         return eftMethod?.accounts || [];
     } catch (error) {
        console.error("Banka hesapları çekilirken hata:", error);
        return [];
    }
}

// YENİ: Tüm aktif ödeme yöntemlerini getiren fonksiyon
async function getActivePaymentMethods(): Promise<OdemeYontemi[]> {
    try {
        const response = await fetch('/api/odeme-yontemleri');
        if (!response.ok) throw new Error('Ödeme yöntemleri alınamadı');
        const data = await response.json();
        return data.odemeYontemleri || [];
    } catch (error) {
        console.error("Ödeme yöntemleri çekilirken hata:", error);
         return [];
     }
}

export default function FaturalarimPage() {
    const [invoices, setInvoices] = useState<InvoiceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<OdemeYontemi[]>([]);
    const [selectedModalPaymentMethod, setSelectedModalPaymentMethod] = useState<string | null>(null);
    const [isFetchingPaymentMethods, setIsFetchingPaymentMethods] = useState(false);
    const [paytrToken, setPaytrToken] = useState<string | null>(null);
    const [showPaytrIframe, setShowPaytrIframe] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    // IBAN Kopyalama Fonksiyonu
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
        toast.success("IBAN panoya kopyalandı!");
        }, (err) => {
        toast.error("Kopyalama başarısız oldu.");
        console.error('Kopyalama hatası: ', err);
        });
    };

    // Ödeme Modalını Açma Fonksiyonu
    const handleOpenPaymentModal = async (invoice: InvoiceData) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
        setPaytrToken(null);
        setShowPaytrIframe(false);
        setSelectedModalPaymentMethod(null);

        try {
            setIsFetchingPaymentMethods(true);
            const response = await fetch('/api/odeme-yontemleri');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ödeme yöntemleri alınamadı');
            }
            
            const data = await response.json();
            const methods = data.odemeYontemleri || [];
            
            setPaymentMethods(methods);
            if (methods.length > 0) {
                setSelectedModalPaymentMethod(methods[0].type);
            }
        } catch (error: any) {
            console.error('Ödeme yöntemleri yüklenirken hata:', error);
            toast.error('Ödeme yöntemleri yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
            setPaymentMethods([]);
        } finally {
            setIsFetchingPaymentMethods(false);
        }
    };

    // YENİ: PayTR Ödeme Başlatma Fonksiyonu (Modal İçin)
    const handlePayWithPayTR = async () => {
        if (!selectedInvoice || !selectedInvoice.subscriptionId) {
            toast.error("Ödeme başlatılamadı: Fatura veya abonelik bilgisi eksik.");
            return;
        }
        setPaymentLoading(true);
        setPaytrToken(null);
        setShowPaytrIframe(false);

        // Benzersiz merchant_oid oluştur - DÜZELTME: Alt çizgi yerine alfanumerik karakter kullan
        // Rastgele 6 haneli alfanumerik değer ekle
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const uniqueMerchantOid = `${selectedInvoice.subscriptionId}${randomSuffix}${Date.now()}`;

        try {
            const response = await fetch("/api/payment/paytr/pay-invoice", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ merchant_oid: uniqueMerchantOid }), 
            });
            
            // İstek başarısız oldu mu kontrol et
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "PayTR ile ödeme başlatılırken bir hata oluştu.");
            }

            const result = await response.json();

            if (result.status !== 'success' || !result.token) {
              throw new Error(result.error || "PayTR token alınamadı.");
            }
            
            console.log("PayTR Token alındı:", result.token);
            setPaytrToken(result.token);
            setShowPaytrIframe(true);

        } catch (error: any) {
            console.error("PayTR ödeme hatası:", error);
            toast.error(error.message || "PayTR ile ödeme başlatılırken bir hata oluştu.");
        } finally {
            setPaymentLoading(false);
        }
    };

    // useEffect içinde data çekme
    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/invoices');
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Faturalar alınamadı.');
                }
                const data = await response.json();
                setInvoices(data.invoices || []);
            } catch (err: any) {
                setError(err.message || 'Bir hata oluştu.');
                console.error("Fatura fetch hatası:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    // DataTable için sütunları burada tanımla veya import et
    // Ödeme Yap butonunun onClick olayını handleOpenPaymentModal ile güncelleyelim
    const invoiceColumns: typeof columns = columns.map(col => {
        if (col.id === 'actions') {
            return {
                ...col,
                cell: ({ row }) => {
                    const invoice = row.original as InvoiceData;
                    if (invoice.status === 'PENDING') {
                         return (
                            <div className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenPaymentModal(invoice)}>
                                    <CreditCard className="mr-1 h-4 w-4" /> Ödeme Yap
                                </Button>
                            </div>
                         );
                    }
                    return <div className="text-right">-</div>;
                }
            }
        }
        return col;
    });

    // YENİ: Modal içeriği için yardımcı fonksiyon
    const renderPaymentMethodContent = () => {
        if (!selectedModalPaymentMethod) return null;

        if (selectedModalPaymentMethod === 'eft') {
            const eftMethod = paymentMethods.find(m => m.type === 'eft');
            const accounts = eftMethod?.accounts || [];
            if (accounts.length > 0) {
                 return (
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                        {accounts.map((account, index) => (
                            <AccordionItem value={`item-${index}`} key={account.id}>
                                <AccordionTrigger className="text-sm font-medium">
                                    {account.bankaAdi} - {account.hesapSahibi}
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between items-center">
                                        <span>IBAN: {account.iban}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => account.iban && copyToClipboard(account.iban)} aria-label="IBAN Kopyala" disabled={!account.iban}>
                                            <CopyIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {account.subeKodu && <div>Şube Kodu: {account.subeKodu}</div>}
                                    {account.hesapNumarasi && <div>Hesap No: {account.hesapNumarasi}</div>}
                                    <p className="text-xs pt-2">Lütfen açıklama kısmına <strong className="text-foreground">Fatura No: #{selectedInvoice?.id.substring(0, 8)}</strong> yazınız.</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 );
            } else {
                return <p className="text-sm text-muted-foreground text-center">Aktif EFT/Havale hesabı bulunamadı.</p>;
            }
        }

        if (selectedModalPaymentMethod === 'paytr') {
             if (showPaytrIframe && paytrToken) {
                return (
                    <div className="w-full h-full border rounded-md">
                        <div className="paytr-iframe-container" style={{ position: 'relative', width: '100%', height: '800px', overflow: 'hidden' }}>
                            <iframe
                                id="paytriframe-modal"
                                src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
                                frameBorder="0"
                                scrolling="auto"
                                style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: '100%', 
                                    height: '100%', 
                                    minHeight: '800px'
                                }}
                            ></iframe>
                        </div>
                    </div>
                );
            } else {
                return (
                    <Button onClick={handlePayWithPayTR} disabled={paymentLoading} className="w-full mt-4">
                        {paymentLoading ? (
                            <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> İşleniyor...</>
                        ) : (
                            <><CreditCard className="mr-2 h-4 w-4"/> Kredi Kartı İle Öde</>
                        )}
                    </Button>
                );
            }
        }

        return null;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Faturalarım</h2>
            <p className="text-sm text-muted-foreground">
                Geçmiş ve mevcut faturalarınızı buradan görüntüleyebilirsiniz.
            </p>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-40 w-full rounded-md" /> 
                </div>
            ) : error ? (
                 <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>
                        Faturalar yüklenemedi: {error}
                    </AlertDescription>
                 </Alert>
            ) : (
                <DataTable columns={invoiceColumns} data={invoices} />
            )}

            {/* Ödeme Modalını Güncelle */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-7xl min-h-[700px]">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">Fatura Ödeme</DialogTitle>
                        <DialogDescription className="text-center">
                           #{selectedInvoice?.id.substring(0,8)} numaralı faturanız için ödeme yapın.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-1 gap-6 py-4">
                        <div className="w-1/3 border-r pr-6">
                            <div className="text-center border-b pb-4 mb-6">
                            <p className="text-sm text-muted-foreground">Ödenecek Tutar:</p>
                            <p className="text-2xl font-bold">
                                {formatCurrency(selectedInvoice?.amount ?? 0, selectedInvoice?.currency ?? 'TRY')}
                            </p>
                        </div>

                            {isFetchingPaymentMethods ? (
                                <div className="flex justify-center items-center h-20">
                                    <Loader2Icon className="h-6 w-6 animate-spin text-primary"/>
                                </div>
                            ) : paymentMethods.length > 0 ? (
                                 <RadioGroup
                                    value={selectedModalPaymentMethod || undefined}
                                    onValueChange={(value) => {
                                        setSelectedModalPaymentMethod(value);
                                        setShowPaytrIframe(false);
                                        setPaytrToken(null);
                                    }}
                                    className="space-y-3"
                                 >
                                    <p className="text-sm font-medium mb-2">Ödeme Yöntemi Seçin:</p>
                                    {paymentMethods.map((yontem) => (
                                        <Label
                                            key={yontem.type}
                                            htmlFor={`modal-${yontem.type}`}
                                            className={cn(
                                                "flex items-center gap-3 p-3 cursor-pointer border rounded-md transition-all",
                                                selectedModalPaymentMethod === yontem.type ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/50"
                                            )}
                                        >
                                            <RadioGroupItem value={yontem.type} id={`modal-${yontem.type}`} />
                                            {yontem.type === 'eft' && <BanknoteIcon className="h-5 w-5" />} 
                                            {yontem.type === 'paytr' && <CreditCard className="h-5 w-5 text-blue-600" />} 
                                            <span className="flex-1 text-sm font-medium">{yontem.label}</span>
                                        </Label>
                                    ))}
                                 </RadioGroup>
                            ) : (
                                <Alert>
                                <Terminal className="h-4 w-4" />
                                    <AlertTitle>Ödeme Yöntemi Bulunamadı</AlertTitle>
                                    <AlertDescription>
                                        Aktif ödeme yöntemi bulunmuyor. Lütfen yöneticinize başvurun.
                                    </AlertDescription>
                            </Alert>
                        )}
                        </div>

                        <div className="flex-1">
                             {renderPaymentMethodContent()}
                        </div>

                    </div>
                    {!showPaytrIframe && (
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Kapat</Button>
                        </DialogClose>
                    </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
} 