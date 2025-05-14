"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("oid");
    const [isChecking, setIsChecking] = useState(true);
    const [isTestMode, setIsTestMode] = useState(false);
    const [isProcessed, setIsProcessed] = useState(false);
    
    const faturalarimPath = '/dashboard/ayarlar/faturalarim';

    const processTestPayment = async (oid: string) => {
        try {
            toast.info("Test ödemesi işleniyor...");
            const response = await fetch('/api/payment/paytr/process-test-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchant_oid: oid
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success("Test ödemesi başarıyla işlendi!");
                setIsProcessed(true);
                return true;
            } else {
                toast.error(data.error || "Ödeme işlenemedi!");
                return false;
            }
        } catch (error) {
            console.error("Test ödemesi işlenirken hata:", error);
            toast.error("Ödeme işlenirken bir hata oluştu!");
            return false;
        }
    };

    useEffect(() => {
        toast.success("Ödeme başarıyla tamamlandı!");
        
        const checkPaymentSettings = async () => {
            try {
                const settingsResponse = await fetch('/api/payment/paytr/settings');
                const settings = await settingsResponse.json();
                
                if (settings.success && settings.isTestMode) {
                    setIsTestMode(true);
                    setIsChecking(false);
                    toast.info("Ödeme test modunda yapıldı.");
                    
                    if (orderId) {
                        const success = await processTestPayment(orderId);
                        if (success) {
                            toast.success("Faturalarım sayfasına yönlendiriliyorsunuz...");
                            setTimeout(() => {
                                router.push(faturalarimPath);
                            }, 3000);
                        }
                    }
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Ödeme ayarları kontrolünde hata:", error);
                return false;
            }
        };

        const checkPaymentStatus = async () => {
            try {
                const testMode = await checkPaymentSettings();
                
                if (testMode || !orderId) return;
                
                await new Promise(resolve => setTimeout(resolve, 3000));

                const response = await fetch('/api/payment/check-status?oid=' + orderId);
                const data = await response.json();
                
                setIsChecking(false);
                
                if (data.success && data.isPaid) {
                    toast.success("Ödemeniz onaylandı, yönlendiriliyorsunuz...");
                    router.push(faturalarimPath);
                } else {
                    toast.info("Ödemeniz işleniyor, lütfen bekleyin...");
                    setTimeout(() => {
                        router.push(faturalarimPath);
                    }, 5000);
                }
            } catch (error) {
                console.error("Ödeme durumu kontrolünde hata:", error);
                setIsChecking(false);
                setTimeout(() => {
                    router.push(faturalarimPath);
                }, 5000);
            }
        };

        checkPaymentStatus();
    }, [router, orderId, faturalarimPath]);

    const handleManualRedirect = async () => {
        if (isTestMode && !isProcessed && orderId) {
            const success = await processTestPayment(orderId);
            setTimeout(() => {
                router.push(faturalarimPath);
            }, 1000);
        } else {
            router.push(faturalarimPath);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="bg-card p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold mb-2">Ödeme Başarılı!</h1>
                <p className="text-muted-foreground mb-6">
                    Ödemeniz başarıyla alındı. {isTestMode ? (isProcessed ? "Test ödemesi işlendi ve aboneliğiniz aktifleştirildi." : "Test ödemesi yapıldı.") : "Aboneliğiniz aktif edildi ve faturanız ödendi olarak işaretlendi."}
                </p>
                {orderId && (
                    <p className="text-xs text-muted-foreground mb-4">
                        İşlem referansı: <span className="font-mono">{orderId}</span>
                    </p>
                )}
                
                {isTestMode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                        <div className="flex items-start">
                            <AlertCircleIcon className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                            <div className="text-sm text-amber-800 text-left">
                                <p className="font-medium">Ödeme test modunda yapıldı</p>
                                <p className="mt-1">
                                    {isProcessed 
                                        ? "Test ödemesi işlendi. Aboneliğiniz aktif edildi. Otomatik yönlendirme yapılıyor..." 
                                        : "Aşağıdaki butona tıklayarak aboneliğinizi aktifleştirebilirsiniz."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <p className="text-sm text-muted-foreground mb-4">
                    {isTestMode 
                        ? isProcessed
                            ? "Birkaç saniye içinde Faturalarım sayfasına yönlendirileceksiniz..." 
                            : "Devam etmek için aşağıdaki butona tıklayın"
                        : isChecking 
                            ? "Ödemeniz işleniyor, lütfen bekleyin..." 
                            : "Birkaç saniye içinde Faturalarım sayfasına yönlendirileceksiniz..."}
                </p>
                
                <div className="flex space-x-4 justify-center">
                    {isTestMode && !isProcessed ? (
                        <Button 
                            variant="default" 
                            onClick={handleManualRedirect} 
                            className="w-full"
                        >
                            Aboneliği Aktifleştir ve Devam Et
                        </Button>
                    ) : (
                        <>
                            <Link href={faturalarimPath} passHref>
                                <Button variant="default">Faturalarıma Git</Button>
                            </Link>
                            <Link href="/dashboard/ayarlar/abonelik" passHref>
                                <Button variant="outline">Abonelik Sayfam</Button>
                </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 