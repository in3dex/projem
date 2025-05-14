'use client'; // Client bileşenine dönüştür

import React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
// import { getAktifBankaHesaplari } from '@/lib/odeme-ayarlari'; // Veri çekme kaldırıldı
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Banknote, Terminal, CreditCard } from 'lucide-react'; // CreditCard icon eklendi
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

// Bileşene props olarak gelecek veri tipleri
interface BankaHesabi {
    id: string;
    bankaAdi: string;
    subeKodu?: string;
    hesapNumarasi: string;
    iban: string;
    hesapSahibi: string;
}

interface OdemeYontemi {
    type: 'eft' | 'stripe'; // Desteklenen tipler
    label: string;
    accounts?: BankaHesabi[]; // Sadece EFT için
    // Kredi kartı için ek bilgiler eklenebilir
}

interface OdemeSecenekleriProps {
    odemeYontemleri: OdemeYontemi[];
}

export default function OdemeSecenekleri({ odemeYontemleri }: OdemeSecenekleriProps) {
    // const aktifHesaplar = await getAktifBankaHesaplari(); // Veri çekme kaldırıldı

    if (!odemeYontemleri || odemeYontemleri.length === 0) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ödeme Yöntemi Bulunamadı</AlertTitle>
                <AlertDescription>
                    Şu anda kullanılabilir bir ödeme yöntemi bulunmamaktadır. Lütfen daha sonra tekrar deneyin veya yönetici ile iletişime geçin.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
             <h2 className="text-2xl font-semibold">Ödeme Yöntemleri</h2>
             <Accordion type="single" collapsible className="w-full">
                 {odemeYontemleri.map((yontem) => {
                    if (yontem.type === 'eft' && yontem.accounts && yontem.accounts.length > 0) {
                        const aktifHesaplar = yontem.accounts;
                        return (
                             <AccordionItem key={yontem.type} value={yontem.type}>
                                <AccordionTrigger className="text-lg">
                                    <div className='flex items-center gap-2'>
                                        <Banknote className="h-5 w-5" />
                                        <span>{yontem.label}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Aşağıdaki hesap bilgilerini kullanarak ödemenizi gerçekleştirebilirsiniz. Açıklama kısmına sipariş numaranızı yazmayı unutmayın.
                                    </p>
                                    {aktifHesaplar.map((hesap, index) => (
                                        <React.Fragment key={hesap.id}>
                                            <Card className="bg-background">
                                                <CardHeader>
                                                    <CardTitle className="text-base">{hesap.bankaAdi}</CardTitle>
                                                    <CardDescription>{hesap.hesapSahibi}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium">IBAN:</span>
                                                        <span>{hesap.iban}</span>
                                                        {/* Kopyalama butonu eklenebilir */}
                                                    </div>
                                                    {hesap.subeKodu && (
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">Şube Kodu:</span>
                                                            <span>{hesap.subeKodu}</span>
                                                        </div>
                                                    )}
                                                    {hesap.hesapNumarasi && (
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">Hesap No:</span>
                                                            <span>{hesap.hesapNumarasi}</span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                            {index < aktifHesaplar.length - 1 && <Separator />} 
                                        </React.Fragment>
                                    ))}
                                    <Alert>
                                    <Terminal className="h-4 w-4" />
                                    <AlertTitle>Önemli!</AlertTitle>
                                    <AlertDescription>
                                        Ödemeniz onaylandıktan sonra aboneliğiniz aktifleşecektir. Lütfen ödeme dekontunu veya referans numarasını saklayınız.
                                    </AlertDescription>
                                    </Alert>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    }
                    // else if (yontem.type === 'stripe') {
                    //     return (
                    //          <AccordionItem key={yontem.type} value={yontem.type}>
                    //              <AccordionTrigger className="text-lg">
                    //                  <div className='flex items-center gap-2'>
                    //                     <CreditCard className="h-5 w-5" />
                    //                     <span>{yontem.label}</span>
                    //                  </div>
                    //              </AccordionTrigger>
                    //              <AccordionContent>
                    //                  {/* Kredi kartı formu buraya gelecek */}
                    //                  <p>Kredi kartı ile ödeme seçeneği yakında...</p>
                    //              </AccordionContent>
                    //          </AccordionItem>
                    //     )
                    // }
                    return null; // Desteklenmeyen veya geçersiz yöntem tipi
                 })}
            </Accordion>
        </div>
    );
}

// Card bileşenleri zaten import edilmişti, tekrar gerek yok. 