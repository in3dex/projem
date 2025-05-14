"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from 'sonner';
import { signIn } from "@/lib/auth/auth-provider"; // Bu signIn fonksiyonu next-auth/react'tan mı geliyor, yoksa özel bir provider mı?

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// Component adını GirisClient olarak değiştirelim
export default function GirisClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // signIn fonksiyonunun çağrısı buradaCredentialsSignin
      const result = await signIn('credentials', {
        redirect: false,
        email: email,
        password: password,
        // callbackUrl: callbackUrl // signIn fonksiyonu bu parametreyi destekliyorsa eklenebilir
      });

      if (result?.error) {
        console.error("NextAuth giriş hatası:", result.error);
        let errorMessage = "Giriş bilgileri hatalı veya kullanıcı bulunamadı.";
        if (result.error === 'CredentialsSignin') {
             errorMessage = 'E-posta veya şifre hatalı.';
        } else if (result.error.includes('fetch')) {
             errorMessage = 'Sunucuya bağlanırken bir hata oluştu.';
        }
        toast.error(errorMessage);
      } else if (result?.ok) {
        toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
        router.push(callbackUrl); 
      } else {
         toast.error('Giriş sırasında beklenmedik bir sorun oluştu.');
      }

    } catch (error) {
      console.error('Giriş fonksiyonunda yakalanan hata:', error);
      toast.error('Giriş yapılırken bir ağ hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Header ve Footer olmadan, sadece form ve etrafındaki divler
    // Bu bileşen Suspense içinde kullanılacak, ana layout Header/Footer'ı sağlayacak varsayımı.
    // Eğer bu sayfa kendine özel bir layout'a sahip değilse, Header/Footer buradan çıkarılmalı.
    // Şimdilik Header ve Footer'ı bu client component içinde bırakıyorum, çünkü ana page.tsx'de nasıl bir yapı var bilmiyorum.
    <div className="flex min-h-screen flex-col">
      <Header /> 
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Hesabınıza Giriş Yapın</h1>
            <p className="text-muted-foreground">
              Trendyol entegrasyon hesabınıza giriş yaparak panele erişin
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@mail.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Şifre</Label>
                    <Link 
                      href="/sifremi-unuttum" 
                      className="text-xs text-primary hover:underline"
                    >
                      Şifremi Unuttum
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Giriş Yapılıyor
                  </span>
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">
                    Henüz hesabınız yok mu?
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/kayit">
                    Yeni Hesap Oluştur
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Giriş yaparak{" "}
              <Link href="/kullanim-kosullari" className="text-primary hover:underline">
                Kullanım Koşullarını
              </Link>{" "}
              ve{" "}
              <Link href="/gizlilik-politikasi" className="text-primary hover:underline">
                Gizlilik Politikasını
              </Link>{" "}
              kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 