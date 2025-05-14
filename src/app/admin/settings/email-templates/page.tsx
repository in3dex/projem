import { Suspense } from 'react';
import { getEmailTemplates } from "@/actions/admin/email-template-actions";
import { EmailTemplateForm } from "@/components/admin/email-template-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function EmailTemplatesList() {
    if (process.env.IS_DOCKER_BUILD === 'true') {
        console.log("[EmailTemplatesList] Docker build detected, skipping email templates fetch.");
        return (
            <Alert variant="default">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Bilgilendirme</AlertTitle>
              <AlertDescription>
                E-posta şablonları Docker build sırasında yüklenmez.
              </AlertDescription>
            </Alert>
        );
    }

    let templates = [];
    let error = null;

    try {
      templates = await getEmailTemplates();
    } catch (err: any) {
      console.error("E-posta şablonları alınamadı:", err);
      error = err.message || "Şablonlar yüklenirken bir hata oluştu.";
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

    if (templates.length === 0) {
        return (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Bilgi</AlertTitle>
              <AlertDescription>Gösterilecek e-posta şablonu bulunamadı. Sistemin şablonları otomatik oluşturması veya elle eklenmesi gerekebilir.</AlertDescription>
            </Alert>
        );
    }

  return (
    <div>
      {templates.map((template) => (
        <EmailTemplateForm key={template.id} template={template} />
      ))}
    </div>
  );
}

export default function AdminEmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">E-posta Şablonları</h3>
        <p className="text-sm text-muted-foreground">
          Sistem tarafından gönderilen otomatik e-postaların içeriklerini yönetin.
        </p>
      </div>
      <Suspense fallback={<div className="p-4 text-center">Şablonlar yükleniyor...</div>}>
        <EmailTemplatesList />
      </Suspense>
    </div>
  );
} 