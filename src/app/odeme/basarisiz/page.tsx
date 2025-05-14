import { Suspense } from 'react';
import OdemeBasarisizClient from './odeme-basarisiz-client';

// Yükleniyor göstergesi için basit bir bileşen
function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <p>Yükleniyor...</p>
    </div>
  );
}

export default function OdemeBasarisizPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OdemeBasarisizClient />
    </Suspense>
  );
} 