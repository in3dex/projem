import { DateRange } from "react-day-picker"; // Eğer DateRange başka yerde kullanılmıyorsa kaldırılabilir

export interface Siparis {
  id: string;
  orderNumber: string;
  totalPrice: number;
  orderDate: string; // ISO string formatında geldiğini varsayıyoruz
  status: string;
  isInvoiceSent?: boolean; // Opsiyonel olabilir
  invoiceLink?: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  // API rotası include ettiği için zorunlu kabul ediyoruz
  shipmentAddress: {
    fullName: string;
    city: string;
    district: string;
  };
  items: {
    productName: string;
    quantity: number;
    id: string; // OrderItem ID
  }[];
  // shipmentPackages artık API'den gelecek, tipini düzeltelim
  shipmentPackages?: {
    id: string; // Bizim veritabanı ID'miz
    trendyolPackageId: bigint | number; // Prisma bigint döner, frontend number bekleyebilir
    status: string;
    cargoTrackingNumber?: string | null;
  }[];
  currencyCode?: string; // SiparisKart'ta kullanılıyor
  // İleride API yanıtına göre eklenebilecek diğer alanlar...
}

export interface LoyalCustomer {
    customerId: string;
    firstName: string;
    lastName: string;
    orderCount: number;
    totalSpent: number;
}

export interface SiparisStats {
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
    totalCancelledOrders: number;
    loyalCustomerCount: number;
}

export interface ApiResponse {
    content: Siparis[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    statusCounts: Record<string, number>;
} 