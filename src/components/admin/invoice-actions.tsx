'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { approveInvoice, cancelInvoice } from '@/actions/invoice-actions';
import { InvoiceStatus } from '@prisma/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface InvoiceActionsProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}

export function InvoiceActions({ invoiceId, currentStatus }: InvoiceActionsProps) {
  const [isPendingApprove, startTransitionApprove] = useTransition();
  const [isPendingCancel, startTransitionCancel] = useTransition();

  const handleApprove = () => {
    startTransitionApprove(async () => {
      const result = await approveInvoice(invoiceId);
      if (result.success) {
        toast.success(`Fatura #${invoiceId.substring(0, 6)}... onaylandı.`);
      } else {
        toast.error(result.error || 'Fatura onaylanırken bir hata oluştu.');
      }
    });
  };

  const handleCancel = () => {
    // İptal etmeden önce bir onay istemek iyi olabilir
    startTransitionCancel(async () => {
      const result = await cancelInvoice(invoiceId);
      if (result.success) {
        toast.success(`Fatura #${invoiceId.substring(0, 6)}... iptal edildi.`);
      } else {
        toast.error(result.error || 'Fatura iptal edilirken bir hata oluştu.');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {currentStatus === InvoiceStatus.PENDING && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleApprove}
          disabled={isPendingApprove || isPendingCancel}
          aria-label="Faturayı Onayla"
        >
          {isPendingApprove ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Onayla
        </Button>
      )}

      {currentStatus !== InvoiceStatus.PAID && currentStatus !== InvoiceStatus.CANCELED && (
         <Button
           variant="destructive"
           size="sm"
           onClick={handleCancel}
           disabled={isPendingApprove || isPendingCancel}
           aria-label="Faturayı İptal Et"
         >
           {isPendingCancel ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
             <XCircle className="mr-2 h-4 w-4" />
           )}
           İptal Et
         </Button>
      )}
    </div>
  );
} 