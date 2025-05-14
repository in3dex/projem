"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Gerekirse diye ekliyorum
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettings {
  notifyOnOrderStatusUpdate: boolean;
}

export default function BildirimAyarlariPage() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchNotificationSettings = async () => {
      try {
        const response = await fetch('/api/settings/notifications');
        if (response.ok) {
          const data: NotificationSettings | null = await response.json();
          setNotificationSettings(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Bildirim ayarları alınamadı:', response.status, errorData);
          toast.error(`Bildirim ayarları alınamadı (${response.status})`);
          setNotificationSettings({ notifyOnOrderStatusUpdate: true }); // Varsayılan
        }
      } catch (error) {
        console.error('Bildirim ayarları yükleme hatası:', error);
        toast.error('Bildirim ayarları yüklenirken bir hata oluştu.');
        setNotificationSettings({ notifyOnOrderStatusUpdate: true }); // Varsayılan
      } finally {
        setLoading(false);
      }
    };
    fetchNotificationSettings();
  }, []);

  const handleNotificationSettingChange = async (checked: boolean) => {
    if (!notificationSettings) return;

    const newSettings = { notifyOnOrderStatusUpdate: checked };
    setSavingNotifications(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Bildirim ayarları kaydedilemedi (${response.status})`);
      }
      setNotificationSettings(newSettings);
      toast.success(result.message || 'Bildirim ayarları kaydedildi.');
    } catch (error) {
      console.error('Bildirim ayarları kaydetme hatası:', error);
      toast.error(error instanceof Error ? error.message : 'Bildirim ayarları kaydedilemedi.');
      setNotificationSettings({ notifyOnOrderStatusUpdate: !checked });
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Bildirim Ayarları</h1>
      <Card>
        <CardHeader>
          <CardTitle>Uygulama İçi Bildirimler</CardTitle>
          <CardDescription>Hangi durumlarda uygulama içi bildirim almak istediğinizi seçin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading || notificationSettings === null ? (
            <Skeleton className="h-6 w-full" /> // Yükleniyor durumu
          ) : (
            <div className="flex items-center space-x-2">
              <Switch
                id="notify-order-status"
                checked={notificationSettings.notifyOnOrderStatusUpdate}
                onCheckedChange={handleNotificationSettingChange}
                disabled={savingNotifications}
              />
              <Label htmlFor="notify-order-status" className="flex items-center cursor-pointer">
                <BellRing className="mr-2 h-4 w-4" />
                Sipariş durumu güncellemelerinde bildirim al
              </Label>
              {savingNotifications && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          )}
        </CardContent>
         {/* Bu sayfada ayrı bir kaydet butonu gerekmiyor */}
      </Card>
    </div>
  );
} 