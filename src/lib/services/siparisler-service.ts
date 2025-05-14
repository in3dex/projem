import { ApiResponse, SiparisStats, LoyalCustomer } from '@/lib/types/siparis';

// Siparişleri Getir
export const fetchOrdersAPI = async (params: URLSearchParams): Promise<ApiResponse> => {
    const response = await fetch(`/api/orders?${params.toString()}`); 
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Siparişler alınamadı.');
    }
    return response.json();
};

// İstatistikleri Getir
export const fetchStatsAPI = async (): Promise<SiparisStats> => {
    const response = await fetch('/api/orders/stats');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'İstatistik verisi alınamadı.');
    }
    return response.json();
};

// Sadık Müşterileri Getir
export const fetchTopLoyalCustomersAPI = async (): Promise<LoyalCustomer[]> => {
    const response = await fetch('/api/customers/sadik');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Sadık müşteriler alınamadı.");
    }
    return response.json();
};

// Siparişleri Senkronize Et
export const syncOrdersAPI = async (body: any): Promise<any> => {
    const response = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Senkronizasyon hatası");
    }
    return data; // Başarılı yanıtı döndür
};

// Fatura Yükle
export const uploadInvoiceAPI = async (formData: FormData): Promise<any> => {
    const response = await fetch('/api/orders/upload-invoice', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || result.details || 'Fatura yüklenemedi.');
    }
    return result;
};

// Toplu Kargo Firması Değiştir
export const bulkUpdateCargoAPI = async (packageIds: number[], newCargoProvider: string): Promise<any> => {
    const response = await fetch('/api/orders/paket/kargo-toplu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIds, newCargoProvider })
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Toplu kargo güncelleme başarısız.');
    }
    return result;
};

// Tekil Barkod HTML Getir (Toplu işlem için bu çağrılacak)
export const fetchBarcodeHtmlAPI = async (orderNumber: string): Promise<string> => {
    const response = await fetch(`/api/orders/barkod?orderNumber=${orderNumber}`);
    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Sipariş ${orderNumber}: ${errorText || response.statusText}`);
    }
    return response.text();
}; 