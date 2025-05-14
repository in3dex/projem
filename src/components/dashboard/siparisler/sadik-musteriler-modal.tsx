"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { LoyalCustomer } from "@/lib/types/siparis";
import { formatCurrency } from "@/lib/utils";

interface SadikMusterilerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: LoyalCustomer[];
  isLoading: boolean;
}

export function SadikMusterilerModal({
  isOpen,
  onOpenChange,
  customers,
  isLoading,
}: SadikMusterilerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>En Sadık Müşteriler (Son 90 Gün)</DialogTitle>
          <DialogDescription>
            Son 90 gün içinde en çok sipariş veren ilk 10 müşteri.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Sipariş Sayısı</TableHead>
                <TableHead className="text-right">Toplam Harcama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.customerId}>
                  <TableCell>
                    <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                     {/* <div className="text-sm text-muted-foreground">{customer.customerCity}</div> // Tipte yoksa yorumlu kalsın */}
                  </TableCell>
                  <TableCell className="text-right">{customer.orderCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-4">Veri bulunamadı.</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 