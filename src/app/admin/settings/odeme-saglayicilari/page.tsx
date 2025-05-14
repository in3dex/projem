export const dynamic = 'force-dynamic';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOdemeAyarlari } from "@/actions/odeme-ayarlari.actions"; // Action'ı import et
import { EftAyarlariForm } from "@/components/admin/settings/eft-ayarlari-form"; // Yeni formu import et
import { BankaHesaplariListesi } from "@/components/admin/settings/banka-hesaplari-listesi"; // Liste bileşenini import et
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { PaytrAyarlariForm } from "@/components/admin/settings/paytr-ayarlari-form"; // YENİ: PayTR formunu import et
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // YENİ: Accordion importları
import { Banknote, CreditCard } from 'lucide-react'; // YENİ: İkon importları

// Sayfayı async yap
export default async function OdemeSaglayicilariPage() {
  // Veriyi fetch et
  const { success, ayarlar, bankaHesaplari, message } = await getOdemeAyarlari();

  if (!success || !ayarlar) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>
          Ödeme ayarları yüklenirken bir hata oluştu: {message || "Bilinmeyen hata."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="w-full space-y-4">
        {/* EFT Ayarları Accordion Item */}
        <AccordionItem value="eft">
          <AccordionTrigger className="text-lg font-medium px-4 py-3 bg-muted/50 rounded-t-lg border data-[state=closed]:rounded-b-lg data-[state=closed]:border-b">
             <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                <span>Banka Havalesi / EFT Ayarları</span>
             </div>
          </AccordionTrigger>
          <AccordionContent className="border border-t-0 rounded-b-lg p-6 pt-4 space-y-6">
            <EftAyarlariForm mevcutDurum={ayarlar.eftAktif} />
            <Separator /> 
            <div>
                 <h3 className="text-lg font-medium mb-2">Banka Hesap Bilgileri</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                    Müşterilerin ödeme yaparken göreceği banka hesaplarınızı yönetin.
                 </p>
                 <BankaHesaplariListesi hesaplar={bankaHesaplari || []} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* PayTR Ayarları Accordion Item */}
        <AccordionItem value="paytr">
           <AccordionTrigger className="text-lg font-medium px-4 py-3 bg-muted/50 rounded-t-lg border data-[state=closed]:rounded-b-lg data-[state=closed]:border-b">
              <div className="flex items-center gap-2">
                 <CreditCard className="h-5 w-5 text-blue-600" />
                 <span>PayTR Kredi Kartı Ayarları</span>
              </div>
           </AccordionTrigger>
           <AccordionContent className="border border-t-0 rounded-b-lg p-6 pt-4 space-y-6">
             <PaytrAyarlariForm mevcutAyarlar={{
                 paytrAktif: ayarlar.paytrAktif,
                 paytrMerchantId: ayarlar.paytrMerchantId,
                 paytrMerchantKey: ayarlar.paytrMerchantKey,
                 paytrMerchantSalt: ayarlar.paytrMerchantSalt,
                 paytrTestMode: ayarlar.paytrTestMode,
             }} />
           </AccordionContent>
        </AccordionItem>

        {/* Gelecekte diğer sağlayıcılar buraya eklenebilir */}
      </Accordion>
    </div>
  );
} 