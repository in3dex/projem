"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircleIcon } from 'lucide-react';
import { toast } from "sonner";

export default function OdemeBasarisizClient() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('oid');

    useEffect(() => {
        toast.error("Ödeme işlemi sırasında bir hata oluştu veya işlem iptal edildi.");
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <XCircleIcon className="mx-auto h-16 w-16 text-destructive" />
                    <CardTitle className="mt-4 text-2xl font-bold">Ödeme Başarısız</CardTitle>
                    <CardDescription>Ödeme işlemi tamamlanamadı veya iptal edildi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Ödeme alınırken bir sorun oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin veya farklı bir ödeme yöntemi kullanın.
                         İlgili sipariş referansı:
                        <br />
                        <strong className="break-all">{orderId || "N/A"}</strong>
                    </p>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/odeme">Ödeme Sayfasına Geri Dön</Link>
                    </Button>
                     <Button asChild className="w-full">
                        <Link href="/iletisim">Destek Merkezi</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
} 