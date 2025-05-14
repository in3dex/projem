import '@tanstack/react-table';
import type { SerializedClaim } from '@/app/dashboard/iadeler/page'; // Doğru yolu kontrol et

// TanStack Table'ın TableMeta arayüzünü genişletiyoruz
declare module '@tanstack/react-table' {
  // Meta verisine kendi özel fonksiyonlarımızı ekliyoruz
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    openModal?: (claim: SerializedClaim) => void;
    triggerApprove?: (claimId: string, itemIds: string[]) => void;
    triggerReject?: (claim: SerializedClaim) => void;
  }
} 