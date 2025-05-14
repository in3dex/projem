"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon, UserIcon } from "lucide-react";
import { toast } from 'sonner';
import { Toaster } from "@/components/ui/sonner";
import { signIn } from "next-auth/react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function KayitPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    
    if (!acceptTerms) {
      toast.error("Devam etmek için koşulları kabul etmelisiniz");
      return;
    }
    
    setLoading(true);
    
    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const registerData = await registerResponse.json();
      
      if (!registerResponse.ok) {
        throw new Error(registerData.error || 'Kayıt işlemi sırasında bir hata oluştu');
      }
      
      toast.success("Kayıt başarılı! Şimdi giriş yapılıyor...");
      
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: email,
        password: password,
      });

      if (signInResult?.ok && !signInResult.error) {
        router.push('/dashboard');
      } else {
        console.error("Otomatik giriş hatası:", signInResult?.error);
        toast.error(signInResult?.error || "Kayıt sonrası otomatik giriş yapılamadı. Lütfen manuel giriş yapın.");
        router.push('/giris');
      }

    } catch (error) {
      console.error('Kayıt/Giriş hatası:', error);
      toast.error(error instanceof Error ? error.message : 'Kayıt veya giriş işlemi sırasında bir hata oluştu');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Yeni Hesap Oluştur</h1>
            <p className="text-muted-foreground">
              Trendyol entegrasyon hizmetlerimizden faydalanmak için kayıt olun
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad Soyad</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Adınız Soyadınız"
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              
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
                  <Label htmlFor="password">Şifre</Label>
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
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="acceptTerms" 
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    required
                  />
                  <Label htmlFor="acceptTerms" className="text-sm font-normal">
                    <span>
                      <Link href="/kullanim-kosullari" className="text-primary hover:underline">
                        Kullanım Koşullarını
                      </Link>
                      {" "}ve{" "}
                      <Link href="/gizlilik-politikasi" className="text-primary hover:underline">
                        Gizlilik Politikasını
                      </Link>
                      {" "}kabul ediyorum
                    </span>
                  </Label>
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
                    Kayıt Oluşturuluyor...
                  </span>
                ) : (
                  "Kayıt Ol"
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
                    Zaten bir hesabınız var mı?
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/giris">
                    Giriş Yap
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
} 