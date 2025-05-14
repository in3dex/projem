import { Suspense } from 'react';
import { getSmtpSettings } from "@/actions/admin/email-settings-actions";
import { SmtpSettingsForm } from "@/components/admin/smtp-settings-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, InfoIcon } from "lucide-react";

async function SmtpSettingsLoader() {
    if (process.env.IS_DOCKER_BUILD === 'true') {
        console.log("[SmtpSettingsLoader] Docker build detected, skipping SMTP settings fetch.");
        return (
            <Alert variant="default">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Bilgilendirme</AlertTitle>
              <AlertDescription>
                SMTP ayarları formu Docker build sırasında varsayılan değerlerle gösterilir (mevcut ayarlar yüklenmez).
              </AlertDescription>
            </Alert>
        );
    }

    let settings = null;
    let error = null;

    try {
      settings = await getSmtpSettings();
    } catch (err: any) {
      console.error("SMTP ayarları alınamadı:", err);
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

    // Hata yoksa formu göster (settings null olabilir, form bunu yönetir)
    return <SmtpSettingsForm currentSettings={settings} />;
}

export default function AdminSmtpSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">E-posta Gönderim (SMTP) Ayarları</h3>
        <p className="text-sm text-muted-foreground">
          Sistemden e-posta gönderimi için kullanılacak SMTP sunucu bilgilerini yapılandırın.
        </p>
      </div>
      <Suspense fallback={<div className="p-4 text-center">SMTP ayarları yükleniyor...</div>}>
        <SmtpSettingsLoader />
      </Suspense>
    </div>
  );
} 