'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { SerializedClaim, SerializedClaimItem } from '@/app/dashboard/iadeler/page';

interface ApproveClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: SerializedClaim | null;
  onSubmit: (claimId: string, selectedItemIds: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ApproveClaimModal: React.FC<ApproveClaimModalProps> = ({
  isOpen,
  onClose,
  claim,
  onSubmit,
  isLoading,
  error,
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const waitingActionItems = useMemo(() => {
    return claim?.claimItems.filter(item => item.status === 'WaitingInAction') || [];
  }, [claim]);

  useEffect(() => {
    if (isOpen && claim) {
      const initialSelected: Record<string, boolean> = {};
      waitingActionItems.forEach(item => {
        initialSelected[item.trendyolClaimItemId] = true;
      });
      setSelectedItems(initialSelected);
    } else if (!isOpen) {
      setSelectedItems({});
    }
  }, [isOpen, claim, waitingActionItems]);

  if (!claim) return null;

  const handleItemSelect = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const getSelectedIds = () => Object.keys(selectedItems).filter(id => selectedItems[id]);

  const handleSubmit = async () => {
    const finalSelectedIds = getSelectedIds();
    if (finalSelectedIds.length === 0) {
        // toast.error("Lütfen onaylamak için en az bir ürün seçin."); // ApproveClaimModal'da zaten kontrol var
        return;
    }
    await onSubmit(claim.id, finalSelectedIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>İade Kalemlerini Onayla</DialogTitle>
          <DialogDescription>
            Sipariş No: {claim.orderNumber} - Müşteri: {claim.customerFirstName} {claim.customerLastName}
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm font-medium">Onaylanacak iade kalemlerini seçin:</p>
          {waitingActionItems.length > 0 ? (
            <div className="space-y-2">
              {waitingActionItems.map((item) => (
                <div key={item.trendyolClaimItemId} className="flex items-center space-x-2 p-2 border rounded-md">
                  <Checkbox
                    id={`approve-${item.trendyolClaimItemId}`}
                    checked={!!selectedItems[item.trendyolClaimItemId]}
                    onCheckedChange={(checked) => handleItemSelect(item.trendyolClaimItemId, !!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`approve-${item.trendyolClaimItemId}`} className="text-sm font-normal flex-grow cursor-pointer">
                    {item.productName} (Barkod: {item.barcode || 'N/A'}) - Adet: {item.quantity}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-500">Bu iadede 'Aksiyon Bekliyor' durumunda onaylanacak ürün bulunmuyor.</p>
          )}
        </div>
        
        <div className="pt-2">
            {getSelectedIds().length > 0 && (
                 <p className="text-sm text-muted-foreground mb-2">
                    Toplam {getSelectedIds().length} kalem onaylanacak. Emin misiniz?
                </p>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Vazgeç
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || getSelectedIds().length === 0}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Onayla'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveClaimModal; 