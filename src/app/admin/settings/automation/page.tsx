import { Suspense } from 'react';
import { getAutomationSettings } from "@/actions/admin/automation-settings-actions";
import { AutomationSettingsForm } from "@/components/admin/automation-settings-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, InfoIcon } from "lucide-react";

async function AutomationSettingsLoader() {
    if (process.env.IS_DOCKER_BUILD === 'true') {
        console.log("[AutomationSettingsLoader] Docker build detected, skipping automation settings fetch.");
        return (
            <Alert variant="default">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Bilgilendirme</AlertTitle>
              <AlertDescription>
                Otomasyon ayarları formu Docker build sırasında varsayılan değerlerle gösterilir (mevcut ayarlar yüklenmez).
              </AlertDescription>
            </Alert>
        );
    }

    let settings = null;
    let error = null;

    try {
      settings = await getAutomationSettings();
    } catch (err: any) {
      console.error("Otomasyon ayarları alınamadı:", err);
      error = err.message || "Ayarlar yüklenirken bir hata oluştu.";
    }

    if (error) {
        return (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    // Hata yoksa formu göster (settings null olabilir, form varsayılanları kullanır)
    return <AutomationSettingsForm currentSettings={settings} />;
}

export default function AdminAutomationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Otomasyon Ayarları</h3>
        <p className="text-sm text-muted-foreground">
          Otomatik fatura oluşturma ve abonelik iptali zamanlamalarını yapılandırın.
        </p>
      </div>
      <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Önemli Not</AlertTitle>
          <AlertDescription>
            Bu ayarların etkili olabilmesi için sunucu tarafında zamanlanmış görevlerin (cron job) doğru şekilde kurulmuş ve çalışıyor olması gerekir. Bu ayarlar sadece görevlerin davranışını kontrol eder.
          </AlertDescription>
      </Alert>

      {/* Yeni Cron Job Bilgilendirme Kutusu */}
      <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Zamanlanmış Görev Kurulumu</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Aşağıdaki ayarların otomatik olarak çalışması için sunucunuzda (örn. cPanel) bir cron job tanımlamanız gerekmektedir.
              Bu cron job, belirtilen URL'yi düzenli aralıklarla (önerilen: günde bir kez, gece saatlerinde) ziyaret etmelidir.
            </p>
            <p className="mb-1 font-semibold">Cron Job URL:</p>
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold break-all">
              {`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron?secret=${process.env.CRON_SECRET || '<CRON_SECRET_ENV_EKSİK>'}`}
            </code>
            <p className="mt-2 mb-1 font-semibold">Örnek Cron Komutu (wget):</p>
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold break-all">
              {`wget -q -O - "${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron?secret=${process.env.CRON_SECRET || '<CRON_SECRET_ENV_EKSİK>'}" > /dev/null 2>&1`}
            </code>
            <p className="mt-1 text-xs text-muted-foreground">
              (Yukarıdaki URL ve komuttaki <code>&lt;CRON_SECRET_ENV_EKSİK&gt;</code> kısmını .env dosyanızdaki CRON_SECRET değeri ile değiştirmelisiniz veya .env dosyasında tanımlı olmalıdır. Ayrıca NEXT_PUBLIC_APP_URL environment değişkeninin de ayarlı olması önerilir.)
            </p>
          </AlertDescription>
      </Alert>

      <Suspense fallback={<div className="p-4 text-center">Ayarlar yükleniyor...</div>}>
        <AutomationSettingsLoader />
      </Suspense>
    </div>
  );
} 