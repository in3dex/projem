import { Suspense } from 'react';
import GirisClient from './giris-client';

// Yükleniyor göstergesi için basit bir bileşen
function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <p>Giriş sayfası yükleniyor...</p> 
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GirisClient />
    </Suspense>
  );
} 