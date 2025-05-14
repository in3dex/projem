export interface SalesTrendDataPoint {
  month: string; 
  yearMonth: string; 
  siparisSayisi: number;
  toplamTutar: number;
}

export interface CostDistributionDataPoint {
  name: string; 
  value: number; 
}

// İleride başka analiz tipleri buraya eklenebilir 