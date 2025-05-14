import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SiparisDetayModal } from "@/components/siparis/siparis-detay-modal";
import { RefreshCw } from "lucide-react";
import { Siparis, LoyalCustomer } from "@/lib/types/siparis";
import { DateRange } from "react-day-picker";

interface SiparislerModalsProps {
  // Detay Modal
  seciliSiparis: Siparis | null;
  detayModalAcik: boolean;
  closeDetayModal: () => void;
  // Sadık Müşteri Modal
  isLoyalCustomersModalOpen: boolean;
  isLoyalCustomersLoading: boolean;
  topLoyalCustomers: LoyalCustomer[];
  closeLoyalCustomersModal: () => void;
  // Fatura Yükleme Modal
  isInvoiceUploadModalOpen: boolean;
  selectedPackageIdForInvoice: number | null;
  invoiceNumberInput: string;
  invoiceDateInput: string;
  isUploadingInvoice: boolean;
  selectedFile: File | null;
  closeInvoiceUploadModal: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleInvoiceNumberChange: (value: string) => void;
  handleInvoiceDateChange: (value: string) => void;
  handleInvoiceUpload: () => void;
  // Toplu Kargo Modal
  isBulkCargoModalOpen: boolean;
  isBulkUpdatingCargo: boolean;
  newCargoProvider: string;
  eligibleCargoChangeCount: number;
  closeBulkCargoModal: () => void;
  handleNewCargoProviderChange: (value: string) => void;
  handleBulkCargoChange: () => void;
}

export function SiparislerModals({
  seciliSiparis,
  detayModalAcik,
  closeDetayModal,
  isLoyalCustomersModalOpen,
  isLoyalCustomersLoading,
  topLoyalCustomers,
  closeLoyalCustomersModal,
  isInvoiceUploadModalOpen,
  selectedPackageIdForInvoice,
  invoiceNumberInput,
  invoiceDateInput,
  isUploadingInvoice,
  selectedFile,
  closeInvoiceUploadModal,
  handleFileChange,
  handleInvoiceNumberChange,
  handleInvoiceDateChange,
  handleInvoiceUpload,
  isBulkCargoModalOpen,
  isBulkUpdatingCargo,
  newCargoProvider,
  eligibleCargoChangeCount,
  closeBulkCargoModal,
  handleNewCargoProviderChange,
  handleBulkCargoChange,
}: SiparislerModalsProps) {
  return (
    <>
      {/* Sipariş Detay Modalı */}
      <SiparisDetayModal
        siparis={seciliSiparis}
        acik={detayModalAcik}
        setAcik={closeDetayModal}
      />

      {/* Sadık Müşteriler Modalı */}
      <Dialog open={isLoyalCustomersModalOpen} onOpenChange={closeLoyalCustomersModal}>
        <DialogContent className="sm:max-w-3xl p-6 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">En Sadık Müşteriler</DialogTitle>
            <DialogDescription>Platformunuzda en çok sipariş veren müşterileriniz.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 pr-2 -mr-2">
            {isLoyalCustomersLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : topLoyalCustomers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {topLoyalCustomers.slice(0, 6).map((customer, index) => (
                  <Card key={customer.customerId} className="overflow-hidden relative group border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg flex flex-col">
                    <div className="absolute top-2 right-2 bg-primary/10 text-primary font-bold text-xs rounded-full px-2.5 py-1 z-10">#{index + 1}</div>
                    <CardContent className="p-5 text-center flex flex-col items-center flex-grow justify-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border">
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {customer.firstName?.charAt(0).toUpperCase()}{customer.lastName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold mb-1 truncate w-full" title={`${customer.firstName} ${customer.lastName}`}>{customer.firstName} {customer.lastName}</h3>
                      <p className="text-xs text-muted-foreground mb-2">Toplam Sipariş</p>
                      <p className="text-3xl font-bold text-primary">{customer.orderCount}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                <p>Sadık müşteri bulunamadı.</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild><Button variant="outline">Kapat</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fatura Yükleme Modalı */}
      {isInvoiceUploadModalOpen && selectedPackageIdForInvoice && (
        <Dialog open={isInvoiceUploadModalOpen} onOpenChange={closeInvoiceUploadModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fatura Yükle (Paket ID: {selectedPackageIdForInvoice})</DialogTitle>
              <DialogDescription>Lütfen siparişinize ait faturayı PDF formatında yükleyin.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice-file">Fatura Dosyası (PDF)</Label>
                <Input id="invoice-file" type="file" accept=".pdf" onChange={handleFileChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-number">Fatura Numarası (Opsiyonel)</Label>
                <Input id="invoice-number" value={invoiceNumberInput} onChange={(e) => handleInvoiceNumberChange(e.target.value)} placeholder="Örn: ABC123456" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-date">Fatura Tarihi (Opsiyonel)</Label>
                <Input id="invoice-date" type="datetime-local" value={invoiceDateInput} onChange={(e) => handleInvoiceDateChange(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeInvoiceUploadModal}>İptal</Button>
              <Button onClick={handleInvoiceUpload} disabled={!selectedFile || isUploadingInvoice}>
                {isUploadingInvoice ? (<><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>) : ('Yükle ve Gönder')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Toplu Kargo Değiştirme Modalı */}
      <Dialog open={isBulkCargoModalOpen} onOpenChange={closeBulkCargoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toplu Kargo Firması Değiştir</DialogTitle>
            <DialogDescription>Seçili ({eligibleCargoChangeCount}) uygun sipariş için yeni kargo firması adını girin.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="newCargoProvider">Yeni Kargo Firması Adı</Label>
            <Input id="newCargoProvider" value={newCargoProvider} onChange={(e) => handleNewCargoProviderChange(e.target.value)} placeholder="Örn: MNG Kargo" />
            <p className="text-xs text-muted-foreground">Lütfen Trendyol'un kabul ettiği kargo firması adını tam olarak girin.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkCargoModal}>İptal</Button>
            <Button onClick={handleBulkCargoChange} disabled={isBulkUpdatingCargo || !newCargoProvider}>
              {isBulkUpdatingCargo ? (<><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Güncelleniyor...</>) : 'Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 