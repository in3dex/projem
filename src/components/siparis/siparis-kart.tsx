"use client";

import { 
  Clipboard, FileText, Package, Truck, UploadCloud, 
  ChevronDown, RefreshCw, Edit, Barcode, 
  Check // Checkbox için
} from "lucide-react";
import { formatDistanceToNow, format, addHours } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react"; // useState import et
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Checkbox import et
import { toast } from "sonner";
import { Siparis } from "@/lib/types/siparis";
import { KargoDegistirModal } from "./kargo-degistir-modal"; // Yeni modal bileşenini import edeceğiz (henüz oluşturulmadı)

interface SiparisKartProps {
  siparis: Siparis; 
  onClick: (siparis: Siparis) => void;
  onFaturaYukleClick: (siparis: Siparis) => void;
  // Kargo güncellendikten sonra listeyi yenilemek için bir callback ekleyelim
  onCargoProviderUpdated?: () => void; 
  // Toplu seçim için proplar
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
}

export function SiparisKart({ 
  siparis, 
  onClick, 
  onFaturaYukleClick, 
  onCargoProviderUpdated,
  isSelected,
  onSelectChange
}: SiparisKartProps) {
  const [isChangingCargo, setIsChangingCargo] = useState(false);
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false); // Barkod oluşturma durumu için state

  const siparisNo = siparis.orderNumber;
  
  // Güvenli tarih dönüşümü
  let tarihStr: string;
  try {
    if (siparis.orderDate) {
      // orderDate veritabanında ISO string veya Date nesnesi olarak geliyor artık
      const tarih = new Date(siparis.orderDate);
      
      // Geçerli tarih mi kontrol et
      if (isNaN(tarih.getTime())) {
        throw new Error('Geçersiz tarih');
      }
      
      tarihStr = formatDistanceToNow(tarih, { 
        addSuffix: true,
        locale: tr
      });
    } else {
      throw new Error('Tarih bulunamadı');
    }
  } catch (error) {
    // Tarih dönüşümünde hata olursa yedek format kullan
    console.error('Tarih dönüşüm hatası:', error, siparis.orderDate);
    tarihStr = "Bilinmiyor";
  }
  
  const toplamTutar = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: siparis.currencyCode || 'TRY'
  }).format(siparis.totalPrice || 0);
  
  const urunSayisi = siparis.items.length;
  
  const durumRenkMap: Record<string, string> = {
    "Created": "bg-blue-500",
    "Picking": "bg-amber-500",
    "Invoiced": "bg-purple-500",
    "Shipped": "bg-green-500",
    "Cancelled": "bg-red-500",
    "Delivered": "bg-emerald-500",
    "UnDelivered": "bg-rose-500",
  };
  
  const durumAdMap: Record<string, string> = {
    "Created": "Oluşturuldu",
    "Picking": "Hazırlanıyor",
    "Invoiced": "Faturalandı",
    "Shipped": "Kargoya Verildi",
    "Cancelled": "İptal Edildi",
    "Delivered": "Teslim Edildi",
    "UnDelivered": "Teslim Edilemedi",
  };
  
  // Sipariş numarasını kopyalamak için
  const copyToClipboard = () => {
    navigator.clipboard.writeText(siparisNo);
    toast.success("Sipariş numarası kopyalandı!");
  };
  
  // Son durum
  const sonDurum = siparis.status;
  const paketDurumu = siparis.shipmentPackages?.[0]?.status; // İlk paketin durumu
  const trendyolPackageId = siparis.shipmentPackages?.[0]?.trendyolPackageId; // İlk paketin Trendyol ID'si
  const cargoTrackingNumber = siparis.shipmentPackages?.[0]?.cargoTrackingNumber; // Kargo takip numarası
  
  // Fatura linkini daha sağlam kontrol et
  const hasInvoice = !(siparis.invoiceLink === null || siparis.invoiceLink === undefined || siparis.invoiceLink.trim() === '');
  
  // Butonun görünürlüğü sadece fatura linkinin olmamasına bağlı
  const canUploadInvoice = !hasInvoice; 
  
  // Kargo firması değiştirme koşulu: Paket ID var mı? VE Durum 'Created' VEYA 'Invoiced' mı?
  const canChangeCargo = trendyolPackageId && paketDurumu && ["Created", "Invoiced"].includes(paketDurumu);

  // Barkod butonunun gösterilmeyeceği durumlar (kargoya verilmiş veya tamamlanmış/iptal edilmiş)
  const nonBarcodeStatuses = ["Shipped", "Delivered", "Cancelled", "Returned", "UnDelivered"];
  // Kargo barkodu oluşturma koşulu: Paket listesi var mı? ve Durum 'Created' VEYA 'Invoiced' mı?
  const canGenerateBarcode = siparis.shipmentPackages && // Paket listesi var mı?
                             paketDurumu && 
                             ["Created", "Invoiced"].includes(paketDurumu);

  // Barkod oluşturma fonksiyonu
  const generateBarcode = async () => {
    // Sipariş numarası var mı kontrol et (genelde hep olur ama garanti olsun)
    if (!siparis.orderNumber) {
      toast.error("Barkod oluşturmak için sipariş numarası bulunamadı.");
      return;
    }
    // Backend takip no kontrolü yapacağı için frontend'deki kontrolü kaldırabiliriz.
    /*
    if (!trendyolPackageId || !cargoTrackingNumber) {
      toast.error("Barkod oluşturmak için gerekli paket bilgileri (ID ve Takip No) eksik.");
      return;
    }
    */

    setIsGeneratingBarcode(true);
    try {
      const response = await fetch(`/api/orders/barkod?orderNumber=${siparis.orderNumber}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen bir hata oluştu.', details: response.statusText }));
        // Backend'den gelen hatayı göster
        throw new Error(errorData.error || errorData.details || 'Barkod etiketi alınamadı.'); 
      }
      const htmlContent = await response.text();

      // HTML içeriğini yeni pencerede aç
      const barcodeWindow = window.open("");
      if (barcodeWindow) {
        barcodeWindow.document.write(htmlContent);
        barcodeWindow.document.close(); // İçerik yüklenmesini bitir
        
        // PDF İndirme Fonksiyonu (Yeni pencereye eklemek yerine doğrudan burada tetikleyebiliriz)
        // html2pdf() .from(htmlContent) .save(`${siparisNo}_barkod.pdf`);
        // Şimdilik sadece yeni pencerede açalım, yazdırma/indirme butonlarını HTML'e eklemek daha iyi olabilir.
      } else {
        toast.error("Barkod penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
      }

    } catch (error: any) {
      toast.error(`Barkod oluşturulamadı: ${error.message}`);
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  return (
    <>
      <Card
        className={`cursor-pointer border hover:border-primary/30 transition-all flex flex-col relative ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-primary/10'}`}
        onClick={() => onClick(siparis)} // Kartın kendisine tıklanınca detayı aç
      >
        {/* Checkbox - Sağ üst köşe */}
        <div className="absolute top-2 right-2 z-10">
           <Checkbox
             checked={isSelected}
             onCheckedChange={(checked) => {
               // Olayın karta yayılmasını engelle
               // event.stopPropagation(); // Checkbox zaten bunu yapıyor olmalı, ama emin olmak için ekleyebiliriz. Radix UI genellikle bunu halleder.
               // Eğer hala sorun varsa, handler'a event objesini ekleyip (e) => { e.stopPropagation(); onSelectChange(...) } şeklinde kullanmak gerekir.
               onSelectChange(Boolean(checked));
             }}
             onClick={(e) => e.stopPropagation()} // Tıklama olayının karta yayılmasını kesin engelle
             aria-label={`Sipariş ${siparisNo} seç`}
             className="bg-background/80 border-border hover:bg-muted/80 h-6 w-6" // Boyut artırıldı
           />
        </div>

        <CardContent className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm md:text-base">{siparisNo}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard();
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Clipboard className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">{tarihStr}</span>
            </div>
            <Badge variant="outline" className={`${durumRenkMap[sonDurum] || "bg-gray-500"} text-white`}>
              {durumAdMap[sonDurum] || sonDurum}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs md:text-sm mb-3">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Ürünler</span>
              <span className="font-medium">{urunSayisi} ürün</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-muted-foreground">Müşteri</span>
              <span className="font-medium truncate">{siparis.customer.firstName} {siparis.customer.lastName}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-muted-foreground">Toplam</span>
              <span className="font-medium">{toplamTutar}</span>
            </div>
          </div>

          {/* Alt Kısım: Aksiyonlar */}
          <div className="mt-auto pt-3 border-t border-dashed border-border space-y-2">
            {/* Kargo Değiştirme Butonu (Select yerine) */}
            {canChangeCargo && (
              <Button 
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCargoModalOpen(true);
                }}
                disabled={isChangingCargo}
              >
                <Edit className="h-4 w-4" />
                Kargo Firmasını Değiştir
              </Button>
            )}

            {/* Kargo Barkodu Oluşturma Butonu */} 
            {canGenerateBarcode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation(); // Kartın tıklanmasını engelle
                  generateBarcode();
                }}
                disabled={isGeneratingBarcode || isChangingCargo}
              >
                {isGeneratingBarcode ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4" />
                )}
                Kargo Barkodu Oluştur
              </Button>
            )}

            {/* Fatura Yükleme Butonu */}
            {canUploadInvoice && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation(); 
                  onFaturaYukleClick(siparis); 
                }}
                disabled={isChangingCargo} 
              >
                <UploadCloud className="h-4 w-4" />
                Fatura Yükle
              </Button>
            )}

            {/* Detayları Gör Butonu */}
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full gap-2"
              onClick={() => onClick(siparis)}
              disabled={isChangingCargo} 
            >
              <FileText className="h-4 w-4" />
              Detayları Gör
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kargo Değiştirme Modalı (Render edilecek) */}
      {canChangeCargo && trendyolPackageId && (
        <KargoDegistirModal 
          isOpen={isCargoModalOpen}
          setIsOpen={setIsCargoModalOpen}
          trendyolPackageId={Number(trendyolPackageId)} // ID'yi number olarak geçelim
          onCargoProviderUpdated={() => {
            setIsCargoModalOpen(false); // Modalı kapat
            onCargoProviderUpdated?.(); // Ana sayfaya bildir
          }}
        />
      )}
    </>
  );
} 