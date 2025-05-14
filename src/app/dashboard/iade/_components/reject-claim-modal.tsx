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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { SerializedClaim, SerializedClaimItem } from '@/app/dashboard/iadeler/page';
import { toast } from 'sonner';

interface RejectReason {
  id: number;
  name: string;
}

interface RejectClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: SerializedClaim | null;
  onSubmit: (claimId: string, trendyolClaimId: string, reasonId: number, description: string, lineItemIds: string[]) => Promise<void>;
  isLoading: boolean; // Ana submit işlemi için
  error: string | null;   // Ana submit işlemi için
}

const RejectClaimModal: React.FC<RejectClaimModalProps> = ({
  isOpen,
  onClose,
  claim,
  onSubmit,
  isLoading,
  error,
}) => {
  const [reasonOptions, setReasonOptions] = useState<RejectReason[]>([]);
  const [isReasonsLoading, setIsReasonsLoading] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [rejectDescription, setRejectDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const waitingActionItems = useMemo(() => {
    return claim?.claimItems.filter(item => item.status === 'WaitingInAction') || [];
  }, [claim]);

  useEffect(() => {
    if (isOpen) {
      const fetchReasons = async () => {
        setIsReasonsLoading(true);
        try {
          const response = await fetch('/api/claims/issue-reasons');
          if (!response.ok) {
            throw new Error('Red nedenleri yüklenemedi.');
          }
          const data = await response.json();
          setReasonOptions(data.data || []);
        } catch (err: any) {
          toast.error(err.message || 'Red nedenleri çekilirken bir hata oluştu.');
          setReasonOptions([]);
        }
        setIsReasonsLoading(false);
      };
      fetchReasons();
      setRejectDescription("");
      setSelectedReasonId("");
      const initialSelected: Record<string, boolean> = {};
      waitingActionItems.forEach(item => {
        initialSelected[item.trendyolClaimItemId] = true;
      });
      setSelectedItems(initialSelected);
    } else if (!isOpen) {
      setSelectedItems({});
    }
  }, [isOpen, claim]);

  if (!claim) return null;

  const handleItemSelect = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const getSelectedIds = () => Object.keys(selectedItems).filter(id => selectedItems[id]);

  const handleSubmit = async () => {
    const finalSelectedIds = getSelectedIds();
    if (!selectedReasonId || finalSelectedIds.length === 0) {
      toast.error("Lütfen bir red nedeni ve en az bir ürün seçin.");
      return;
    }
    if (!rejectDescription.trim()) {
      toast.error("Lütfen bir red açıklaması girin.");
      return;
    }
    await onSubmit(claim.id, claim.trendyolClaimId, parseInt(selectedReasonId), rejectDescription, finalSelectedIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>İade Talebini Reddet</DialogTitle>
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

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <p className="text-sm font-medium mb-1">Reddedilecek iade kalemlerini seçin:</p>
            {waitingActionItems.length > 0 ? (
              <div className="space-y-2">
                {waitingActionItems.map((item) => (
                  <div key={item.trendyolClaimItemId} className="flex items-center space-x-2 p-2 border rounded-md">
                    <Checkbox
                      id={`reject-${item.trendyolClaimItemId}`}
                      checked={!!selectedItems[item.trendyolClaimItemId]}
                      onCheckedChange={(checked) => handleItemSelect(item.trendyolClaimItemId, !!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`reject-${item.trendyolClaimItemId}`} className="text-sm font-normal flex-grow cursor-pointer">
                      {item.productName} (Barkod: {item.barcode || 'N/A'}) - Adet: {item.quantity}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-500">Bu iadede 'Aksiyon Bekliyor' durumunda reddedilecek ürün bulunmuyor.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectReason">Red Nedeni</Label>
            {isReasonsLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Red nedenleri yükleniyor...</span>
              </div>
            ) : (
              <Select value={selectedReasonId} onValueChange={setSelectedReasonId} disabled={isLoading}>
                <SelectTrigger id="rejectReason">
                  <SelectValue placeholder="Bir red nedeni seçin" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((reason) => (
                    <SelectItem key={reason.id} value={String(reason.id)}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectDescription">Red Açıklaması (Gerekli)</Label>
            <Textarea
              id="rejectDescription"
              placeholder="Müşteriye gösterilecek red açıklamasını girin..."
              value={rejectDescription}
              onChange={(e) => setRejectDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Vazgeç
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isReasonsLoading || !selectedReasonId || !rejectDescription.trim() || getSelectedIds().length === 0}
            variant="destructive"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Reddet'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectClaimModal; 