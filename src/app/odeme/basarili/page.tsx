import { Suspense } from 'react';
// useRouter, useSearchParams, useEffect, useState, ikonlar, Button, Link, toast artık burada değil
// import { useRouter, useSearchParams } from 'next/navigation';
// import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import Link from 'next/link';
// import { toast } from 'sonner';

import PaymentSuccessContent from './payment-success-content'; // Yeni client componentini import et

export default function OdemeBasariliPage() {
    // useSearchParams ve ilgili state/effect logic'i PaymentSuccessContent içine taşındı.
    // Page component artık Server Component olarak kalabilir.

    return (
        // useSearchParams kullanan client componentini Suspense içine alıyoruz.
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
// processTestPayment ve handleManualRedirect fonksiyonları kaldırıldı 