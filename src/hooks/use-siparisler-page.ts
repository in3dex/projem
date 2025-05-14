import { useState, useCallback, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, subDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { CheckedState } from '@radix-ui/react-checkbox';
import { Siparis, ApiResponse, SiparisStats, LoyalCustomer } from '@/lib/types/siparis';
// Yeni servis importları
import {
  fetchOrdersAPI,
  fetchStatsAPI,
  fetchTopLoyalCustomersAPI,
  syncOrdersAPI,
  uploadInvoiceAPI,
  bulkUpdateCargoAPI,
  fetchBarcodeHtmlAPI
} from '@/lib/services/siparisler-service';

// API fonksiyonları için placeholder tipler artık gereksiz
// ...

interface SiparislerPageHookProps {
  initialPageSize?: number;
}

export function useSiparislerPage(props: SiparislerPageHookProps = {}) {
  const { initialPageSize = 18 } = props;

  // --- State Tanımlamaları --- 
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [seciliSiparis, setSeciliSiparis] = useState<Siparis | null>(null);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [aramaMetni, setAramaMetni] = useState("");
  const [durum, setDurum] = useState("all");
  const [tarihAraligi, setTarihAraligi] = useState<DateRange | undefined>(undefined);
  const [sonSenkronizasyon, setSonSenkronizasyon] = useState<{
    tarih: Date | null;
    basarili: boolean;
    mesaj: string;
  }>({
    tarih: null,
    basarili: false,
    mesaj: "Henüz senkronizasyon yapılmadı"
  });
  const [toplamSiparis, setToplamSiparis] = useState(0);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [sayfaNo, setSayfaNo] = useState(0);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(initialPageSize);
  const [durumSayilari, setDurumSayilari] = useState<Record<string, number>>({
    "Awaiting": 0, "Created": 0, "Picking": 0, "Invoiced": 0, "Shipped": 0,
    "AtCollectionPoint": 0, "Delivered": 0, "Cancelled": 0, "UnPacked": 0,
    "UnDelivered": 0, "UnDeliveredAndReturned": 0
  });
  const [siparisStats, setSiparisStats] = useState<SiparisStats | null>(null);
  const [isLoyalCustomersModalOpen, setIsLoyalCustomersModalOpen] = useState(false);
  const [topLoyalCustomers, setTopLoyalCustomers] = useState<LoyalCustomer[]>([]);
  const [isLoyalCustomersLoading, setIsLoyalCustomersLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [isInvoiceUploadModalOpen, setIsInvoiceUploadModalOpen] = useState(false);
  const [selectedPackageIdForInvoice, setSelectedPackageIdForInvoice] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [invoiceDateInput, setInvoiceDateInput] = useState('');
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkCargoModalOpen, setIsBulkCargoModalOpen] = useState(false);
  const [newCargoProvider, setNewCargoProvider] = useState('');
  const [isBulkUpdatingCargo, setIsBulkUpdatingCargo] = useState(false);
  const [isGeneratingBulkBarcode, setIsGeneratingBulkBarcode] = useState(false);

  // --- API Çağrıları (Servis fonksiyonları kullanılarak) --- 
  const fetchDataInternal = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', sayfaNo.toString());
      params.set('size', sayfaBoyutu.toString());
      if (aramaMetni) params.set('orderNumber', aramaMetni);
      if (durum && durum !== 'all') params.set('status', durum);
      if (invoiceStatusFilter !== 'all') params.set('invoiceStatus', invoiceStatusFilter);
      if (tarihAraligi?.from && tarihAraligi?.to) {
        params.set('startDate', tarihAraligi.from.getTime().toString());
        params.set('endDate', tarihAraligi.to.getTime().toString());
      }
      
      const siparisData = await fetchOrdersAPI(params); // Servis çağrısı
      console.log("[useSiparislerPage] API Response Data:", JSON.stringify(siparisData, null, 2)); // Debug: API yanıtını logla
      setSiparisler(siparisData.content || []);
      setToplamSiparis(siparisData.totalElements || 0);
      setToplamSayfa(siparisData.totalPages || 1);
      if (siparisData.statusCounts) setDurumSayilari(siparisData.statusCounts);
    } catch (error: any) {
      console.error("Veri getirme hatası:", error);
      toast.error(error.message || "Siparişler alınırken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [sayfaNo, sayfaBoyutu, aramaMetni, durum, invoiceStatusFilter, tarihAraligi]);

  const fetchStatsInternal = async () => {
    setIsStatsLoading(true);
    try {
      const statsData = await fetchStatsAPI(); // Servis çağrısı
      setSiparisStats(statsData);
    } catch (error: any) {
      console.error("İstatistik getirme hatası:", error);
      toast.error(error.message || "Sipariş istatistikleri alınırken bir hata oluştu");
      setSiparisStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchTopLoyalCustomersInternal = async () => {
    setIsLoyalCustomersLoading(true);
    try {
      const data = await fetchTopLoyalCustomersAPI(); // Servis çağrısı
      setTopLoyalCustomers(data);
    } catch (error: any) {
      console.error("Sadık müşteri verisi alınırken hata:", error);
      toast.error(error.message || `Sadık müşteri verisi alınamadı`);
      setTopLoyalCustomers([]);
    } finally {
      setIsLoyalCustomersLoading(false);
    }
  };
  
  const senkronizeEtInternal = async () => {
    setSyncLoading(true);
    
    const body: any = { syncType: "all" }; 

    try {
      toast.info("Trendyol'dan siparişler alınıyor...");
      const data = await syncOrdersAPI(body); // Servis çağrısı
      const yeniSenkBilgi = { tarih: new Date(), basarili: true, mesaj: data.message || "Başarıyla senkronize edildi" };
      setSonSenkronizasyon(yeniSenkBilgi);
      localStorage.setItem('sonSenkronizasyon', JSON.stringify(yeniSenkBilgi));
      toast.success("Senkronizasyon Tamamlandı!", { description: `Alınan: ${data.details?.fetchedCount || 0}, Kaydedilen: ${data.details?.savedCount || 0}, Hata: ${data.details?.failedCount || 0}`, duration: 3000 });
      fetchDataInternal();
    } catch (error: any) {
      console.error("Sipariş senkronizasyon hatası:", error);
      const hataBilgi = { tarih: new Date(), basarili: false, mesaj: `Hata: ${error.message}` };
      setSonSenkronizasyon(hataBilgi);
      localStorage.setItem('sonSenkronizasyon', JSON.stringify(hataBilgi));
      toast.error(`Senkronizasyon hatası: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };
  
  const handleInvoiceUploadInternal = async () => {
    if (!selectedFile || !selectedPackageIdForInvoice) {
      toast.warning("Lütfen bir fatura dosyası seçin ve geçerli bir paket seçildiğinden emin olun.");
      return;
    }
    setIsUploadingInvoice(true);
    const formData = new FormData();
    formData.append('invoiceFile', selectedFile);
    formData.append('shipmentPackageId', selectedPackageIdForInvoice.toString());
    if (invoiceNumberInput) formData.append('invoiceNumber', invoiceNumberInput);
    if (invoiceDateInput) {
      try {
        const dateTimestamp = new Date(invoiceDateInput).getTime();
        if (!isNaN(dateTimestamp)) formData.append('invoiceDateTime', dateTimestamp.toString());
        else throw new Error("Geçersiz Fatura Tarihi formatı.");
      } catch (e: any) { toast.error(e.message); setIsUploadingInvoice(false); return; }
    }
    try {
      const result = await uploadInvoiceAPI(formData); // Servis çağrısı
      toast.success(result.message || 'Fatura başarıyla yüklendi.');
      setIsInvoiceUploadModalOpen(false);
      fetchDataInternal();
    } catch (error: any) { toast.error(`Fatura yüklenemedi: ${error.message}`);
    } finally { setIsUploadingInvoice(false); }
  };
  
  const handleBulkCargoChangeInternal = async () => {
    const eligibleOrders = getEligibleOrdersForCargoChange();
    if (eligibleOrders.length === 0 || !newCargoProvider) {
      toast.error("Uygun sipariş bulunamadı veya yeni kargo firması seçilmedi.");
      return;
    }
    const packageIds = eligibleOrders.map(s => Number(s.shipmentPackages![0].trendyolPackageId));
    setIsBulkUpdatingCargo(true);
    try {
       const result = await bulkUpdateCargoAPI(packageIds, newCargoProvider); // Servis çağrısı
       toast.success(`İşlem Tamamlandı! ${result.successCount || 0} başarı, ${result.failureCount || 0} hata.`);
       setIsBulkCargoModalOpen(false);
       setSelectedOrderIds(new Set());
       fetchDataInternal();
    } catch (error: any) { toast.error(`Hata: ${error.message}`);
    } finally { setIsBulkUpdatingCargo(false); }
  };
  
  const handleBulkGenerateBarcodeInternal = async () => {
     const eligibleOrders = getEligibleOrdersForBarcode();
     if (eligibleOrders.length === 0) {
       toast.warning("Seçili siparişler arasında barkod oluşturulabilecek uygun sipariş bulunamadı.");
       return;
     }
     setIsGeneratingBulkBarcode(true);
     toast.info(`Barkod etiketleri hazırlanıyor (${eligibleOrders.length} sipariş)...`);
     const errors: string[] = [];
     const labelHtmlContents: string[] = [];
 
     const fetchPromises = eligibleOrders.map(order => 
       fetchBarcodeHtmlAPI(order.orderNumber) // Servis çağrısı
         .catch(err => { errors.push(`Sipariş ${order.orderNumber}: ${err.message}`); return null; })
     );
 
     try {
       const htmlResults = await Promise.all(fetchPromises);
       htmlResults.forEach(fullHtml => {
         if (fullHtml) {
           const parser = new DOMParser();
           const doc = parser.parseFromString(fullHtml, 'text/html');
           const labelContainer = doc.querySelector('.label-container');
           const styleTag = doc.querySelector('style');
           if (labelContainer) labelHtmlContents.push((styleTag ? styleTag.outerHTML : '') + labelContainer.outerHTML);
           else errors.push("Alınan etiket formatı bozuk.");
         }
       });
 
       if (labelHtmlContents.length === 0) throw new Error("Yazdırılacak geçerli etiket bulunamadı.");
       
       const combinedHtml = labelHtmlContents.map((labelHtml, index) => `<div class="page" style="${index < labelHtmlContents.length - 1 ? 'break-after: page;' : ''}">${labelHtml}</div>`).join('\n');
       const printWindow = window.open('', '_blank');
       if (printWindow) {
         printWindow.document.write(/* ... HTML Structure with CSS ... */ `... ${combinedHtml} ...`);
         printWindow.document.close();
         setTimeout(() => { 
            try { if (printWindow.document.readyState === 'complete') printWindow.print(); else printWindow.onload = () => { setTimeout(() => printWindow.print(), 100); }; } catch (printError) { console.error("Print error:", printError); errors.push("Yazdırma hatası."); }
         }, 1000);
         toast.success(`${labelHtmlContents.length} adet barkod etiketi hazırlandı.`);
       } else errors.push("Yazdırma penceresi açılamadı.");
 
       if (errors.length > 0) toast.warning(`Bazı hatalar: ${errors.join(', ')}`);
       setSelectedOrderIds(new Set());
     } catch (error: any) { toast.error(`Toplu barkod oluşturma hatası: ${error.message}`);
     } finally { setIsGeneratingBulkBarcode(false); }
   };

  // --- State Güncelleme Fonksiyonları --- 
  const handleAramaMetniChange = (text: string) => setAramaMetni(text);
  const handleDurumChange = (newDurum: string) => {
    setDurum(newDurum);
    setSayfaNo(0); // Durum değişince ilk sayfaya dön
  };
  const handleTarihAraligiChange = (range: DateRange | undefined) => setTarihAraligi(range);
  const handleSayfaChange = (newPage: number) => setSayfaNo(newPage);
  const handleSayfaBoyutuChange = (newSize: number) => {
    setSayfaBoyutu(newSize);
    setSayfaNo(0); // Sayfa boyutu değişince ilk sayfaya dön
  };
  const handleInvoiceStatusFilterChange = (value: string) => {
    setInvoiceStatusFilter(value);
    setSayfaNo(0);
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") setSelectedFile(file);
    else { toast.error("Lütfen PDF dosyası seçin."); setSelectedFile(null); event.target.value = ""; }
  };
  const handleInvoiceNumberChange = (value: string) => setInvoiceNumberInput(value);
  const handleInvoiceDateChange = (value: string) => setInvoiceDateInput(value);
  const handleNewCargoProviderChange = (value: string) => setNewCargoProvider(value);

  // --- Modal Açma/Kapama --- 
  const openDetayModal = (siparis: Siparis) => { setSeciliSiparis(siparis); setDetayModalAcik(true); };
  const closeDetayModal = () => setDetayModalAcik(false);
  const openLoyalCustomersModal = () => { fetchTopLoyalCustomersInternal(); setIsLoyalCustomersModalOpen(true); };
  const closeLoyalCustomersModal = () => setIsLoyalCustomersModalOpen(false);
  const openInvoiceUploadModal = (siparis: Siparis) => {
    const packageId = siparis.shipmentPackages && siparis.shipmentPackages.length > 0 
                      ? siparis.shipmentPackages[0].trendyolPackageId 
                      : null;
    if (packageId) {
      setSelectedPackageIdForInvoice(Number(packageId));
      setSelectedFile(null);
      setInvoiceNumberInput('');
      setInvoiceDateInput('');
      setIsInvoiceUploadModalOpen(true);
    } else {
      toast.error("Bu sipariş için geçerli bir paket ID'si bulunamadı.");
    }
  };
  const closeInvoiceUploadModal = () => setIsInvoiceUploadModalOpen(false);
  const openBulkCargoModal = () => {
    if (getEligibleOrdersForCargoChange().length === 0) {
      toast.warning("Kargo firması değiştirilecek uygun sipariş bulunamadı."); return;
    }
    setNewCargoProvider(''); setIsBulkCargoModalOpen(true);
  };
  const closeBulkCargoModal = () => setIsBulkCargoModalOpen(false);

  // --- Toplu Seçim --- 
  const handleSelectOrder = (orderId: string, selected: boolean) => {
    setSelectedOrderIds(prev => { const ns = new Set(prev); if (selected) ns.add(orderId); else ns.delete(orderId); return ns; });
  };
  const handleSelectAllVisible = (select: boolean) => {
    setSelectedOrderIds(select ? new Set(siparisler.map(s => s.id)) : new Set());
  };
  const isAllVisibleSelected = siparisler.length > 0 && selectedOrderIds.size === siparisler.length;

  // --- Filtreleme Fonksiyonları --- 
  const getEligibleOrdersForCargoChange = useCallback(() => {
    return siparisler.filter(s => 
      selectedOrderIds.has(s.id) && 
      ['Created', 'Invoiced'].includes(s.shipmentPackages?.[0]?.status ?? '') &&
      s.shipmentPackages?.[0]?.trendyolPackageId
    );
  }, [siparisler, selectedOrderIds]);

  const getEligibleOrdersForBarcode = useCallback(() => {
    const nonBarcodeStatuses = ["Shipped", "Delivered", "Cancelled", "Returned", "UnDelivered"];
    return siparisler.filter(s => 
      selectedOrderIds.has(s.id) && 
      !nonBarcodeStatuses.includes(s.shipmentPackages?.[0]?.status ?? '')
    );
  }, [siparisler, selectedOrderIds]);

  // *** YENİ: Filtreleri Temizleme Fonksiyonu ***
  const temizleFiltreler = useCallback(() => {
    setAramaMetni("");
    setDurum("all");
    setTarihAraligi(undefined);
    setInvoiceStatusFilter("all");
    setSayfaNo(0); // Sayfayı sıfırla
    // Seçili ID'leri de temizleyebiliriz, isteğe bağlı:
    // setSelectedOrderIds(new Set()); 
    toast.info("Filtreler temizlendi.");
    // Not: Temizlendikten sonra veriyi tekrar çekmeye gerek yoksa fetchDataInternal() çağrılmaz.
    // Eğer filtreler temizlenince ilk sayfanın otomatik yüklenmesi isteniyorsa, useEffect bağımlılıkları bunu tetiklemeli.
  }, [setAramaMetni, setDurum, setTarihAraligi, setInvoiceStatusFilter, setSayfaNo]);

  // --- useEffects --- 
  useEffect(() => {
    fetchDataInternal();
  }, [fetchDataInternal]); // fetchDataInternal bağımlılığı

  // İstatistik çekme
  useEffect(() => {
    fetchStatsInternal();
  }, []); // Sadece mount'ta çalışır

  // Son senkronizasyon bilgisini yükle
  useEffect(() => {
    const sonSenkBilgi = localStorage.getItem('sonSenkronizasyon');
    if (sonSenkBilgi) {
      try {
        const parsedData = JSON.parse(sonSenkBilgi);
        setSonSenkronizasyon({ ...parsedData, tarih: parsedData.tarih ? new Date(parsedData.tarih) : null });
      } catch (e) { console.error("Son senk. bilgisi alınamadı:", e); }
    }
  }, []);

  // --- Hesaplanan Değerler --- 
  const toplamSiparisSayisi = durumSayilari ? Object.values(durumSayilari).reduce((a, b) => a + b, 0) : 0;
  const hazirlaniyor = (durumSayilari["Awaiting"] || 0) + (durumSayilari["Created"] || 0) + (durumSayilari["Picking"] || 0) + (durumSayilari["Invoiced"] || 0);
  const kargoyaVerildi = (durumSayilari["Shipped"] || 0) + (durumSayilari["AtCollectionPoint"] || 0);
  const tamamlandi = durumSayilari["Delivered"] || 0;

  // --- Döndürülen Değerler --- 
  return {
    // State Değerleri
    siparisler, seciliSiparis, detayModalAcik, isLoading, syncLoading, aramaMetni, durum, tarihAraligi,
    sonSenkronizasyon, toplamSiparis, toplamSayfa, sayfaNo, sayfaBoyutu,
    durumSayilari, siparisStats, isLoyalCustomersModalOpen, topLoyalCustomers, isLoyalCustomersLoading,
    invoiceStatusFilter, isInvoiceUploadModalOpen, selectedPackageIdForInvoice, selectedFile, invoiceNumberInput,
    invoiceDateInput, isUploadingInvoice, isStatsLoading, selectedOrderIds,
    isBulkCargoModalOpen, newCargoProvider, isBulkUpdatingCargo, isGeneratingBulkBarcode, isAllVisibleSelected,
    // Hesaplanan Değerler
    toplamSiparisSayisi, hazirlaniyor, kargoyaVerildi, tamamlandi,
    // Fonksiyonlar (State Güncelleyiciler)
    handleAramaMetniChange, handleDurumChange, handleTarihAraligiChange, handleSayfaChange, handleSayfaBoyutuChange,
    handleInvoiceStatusFilterChange, handleFileChange, handleInvoiceNumberChange,
    handleInvoiceDateChange, handleNewCargoProviderChange,
    // Fonksiyonlar (Modal Açma/Kapama)
    openDetayModal, closeDetayModal, openLoyalCustomersModal, closeLoyalCustomersModal, openInvoiceUploadModal,
    closeInvoiceUploadModal, openBulkCargoModal, closeBulkCargoModal,
    // Fonksiyonlar (Toplu Seçim)
    handleSelectOrder, handleSelectAllVisible,
    // Fonksiyonlar (API Çağrıları - Servisten gelen)
    fetchData: fetchDataInternal, 
    fetchStats: fetchStatsInternal,
    fetchTopLoyalCustomers: fetchTopLoyalCustomersInternal,
    senkronizeEt: senkronizeEtInternal,
    handleInvoiceUpload: handleInvoiceUploadInternal,
    handleBulkCargoChange: handleBulkCargoChangeInternal,
    handleBulkGenerateBarcode: handleBulkGenerateBarcodeInternal,
    // Fonksiyonlar (Diğer)
    getEligibleOrdersForCargoChange,
    getEligibleOrdersForBarcode,
    temizleFiltreler, // *** YENİ: Hook artık bu fonksiyonu döndürüyor ***
  };
} 