import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { Spinner } from '@/components/ui/spinner';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Kullanıcı oturumu yoksa admin login'e yönlendir
    if (status === 'unauthenticated') {
      console.log('Oturum yok, admin girişe yönlendiriliyor');
      router.push('/admin/giris');
      return;
    }

    // Kullanıcı admin değilse dashboard'a yönlendir
    if (session?.user?.role !== Role.ADMIN) {
      console.log('Admin rolü yok, dashboard\'a yönlendiriliyor. Rol:', session?.user?.role);
      router.push('/dashboard');
      return;
    }

    // Kullanıcı admin ise içeriği göster
    console.log('Admin rolü doğrulandı, içeriği göster. Rol:', session?.user?.role);
    setIsAuthorized(true);
  }, [status, session, router]);

  // Yükleniyor...
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Yetki kontrolü yapılana kadar beklet
  if (!isAuthorized) {
    return null;
  }

  // Yetki onaylandı, çocukları render et
  return <>{children}</>;
} 