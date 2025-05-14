"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false, // Yönlendirmeyi kendimiz yapacağız
        email: email,
        password: password,
        callbackUrl: "/admin", // Başarılı kimlik doğrulama sonrası hedef (middleware kontrol edecek)
        // role: "ADMIN", // Bu parametre kaldırıldı
      });

      if (result?.error) {
        // authorize fonksiyonu null döndürürse veya başka bir hata olursa
        console.error("signIn error:", result.error); // Hatayı konsola yazdır
        // Kullanıcıya genel bir hata mesajı gösterelim
        toast.error("Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin veya daha sonra tekrar deneyin.");
        // Spesifik hata mesajları (CredentialsSignin vb.) next-auth tarafından 
        // error sayfasına query parametresi olarak gönderilebilir, ancak burada genel tutuyoruz.
      } else if (result?.ok && result?.url) {
        // Giriş başarılı ve yönlendirme URL'i var (middleware izin verdi)
        toast.success("Admin paneline başarıyla giriş yapıldı!");
        // Middleware zaten doğru yere yönlendirecek, ancak biz yine de push yapalım
        router.push(result.url); 
        router.refresh(); // Session bilgisini yenilemek için
      } else if (result?.ok && !result?.url) {
         // Giriş başarılı AMA yönlendirme URL'i yoksa (middleware engelledi - normalde olmamalı)
         console.warn("Giriş başarılı ancak yönlendirme URL'i yok.");
         toast.error("Giriş yapıldı ancak panele yönlendirme başarısız.");
      } else {
        // Beklenmedik bir durum
        console.error("Beklenmedik signIn sonucu:", result);
        toast.error("Giriş sırasında bilinmeyen bir hata oluştu.");
      }
    } catch (error) {
      console.error("Giriş fonksiyonunda hata:", error);
      toast.error("Giriş sırasında bir istemci hatası oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Admin Girişi</CardTitle>
          <CardDescription>
            Admin paneline erişmek için giriş yapın.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 