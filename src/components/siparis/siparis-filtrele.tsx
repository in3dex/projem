"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface SiparisFiltreleProps {
  aramaMetni: string;
  setAramaMetni: (value: string) => void;
  tarihAraligi: DateRange | undefined;
  setTarihAraligi: (value: DateRange | undefined) => void;
  invoiceStatus: string;
  setInvoiceStatus: (value: string) => void;
  filtrele: () => void;
  temizle: () => void;
}

export function SiparisFiltrele({
  aramaMetni,
  setAramaMetni,
  tarihAraligi,
  setTarihAraligi,
  invoiceStatus,
  setInvoiceStatus,
  filtrele,
  temizle,
}: SiparisFiltreleProps) {
  
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Sipariş numarası ara..."
          className="pl-10"
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && filtrele()}
        />
      </div>
      
      <div className="flex gap-2 flex-wrap md:flex-nowrap">
        <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Fatura Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü (Fatura)</SelectItem>
            <SelectItem value="uploaded">Faturalanmış</SelectItem>
            <SelectItem value="notUploaded">Faturalanmamış</SelectItem>
          </SelectContent>
        </Select>
        
        <DateRangePicker
          range={tarihAraligi}
          onRangeChange={setTarihAraligi}
          align="end"
          className="w-full md:w-auto"
          placeholder="Tarih aralığı seçin"
        />
        
        <Button onClick={filtrele}>Filtrele</Button>
        <Button variant="outline" onClick={temizle}>Temizle</Button>
      </div>
    </div>
  );
} 