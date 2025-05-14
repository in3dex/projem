'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Loader2 } from "lucide-react"; 
import { Textarea } from "@/components/ui/textarea";

// Kullanıcı profili şeması (yeni alanlar eklendi)
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "İsim en az 2 karakter olmalıdır" }).optional().nullable(),
  email: z.string().email(), 
  phone: z.string().optional().nullable(), 
  companyName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  image: z.string().url({ message: "Geçerli bir URL girin." }).optional().nullable(), // Profil resmi URL
  logoUrl: z.string().url({ message: "Geçerli bir URL girin." }).optional().nullable(), // Logo URL
  shopName: z.string().optional().nullable(), // Mağaza adı
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// User tipi (API'den gelen) - Şemaya göre güncellendi
interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  logoUrl: string | null;
  companyName: string | null;
  address: string | null;
  shopName: string | null;
  role: string;
  createdAt: string; // Veya Date
  updatedAt?: string;
}

export default function ProfilAyarlariPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false); 

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      companyName: "",
      address: "",
      image: "",
      logoUrl: "",
      shopName: "",
    },
    mode: "onChange" 
  });

  useEffect(() => {
    setLoading(true);
    const fetchUserProfile = async () => {
      try {
        // API endpoint güncellendi
        const response = await fetch('/api/user/profile'); 
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.error || 'Profil bilgileri alınamadı');
        }
        const data : UserProfile = await response.json(); 
        setUser(data);
        // Form reset güncellendi
        profileForm.reset({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          companyName: data.companyName || "",
          address: data.address || "",
          image: data.image || "",
          logoUrl: data.logoUrl || "",
          shopName: data.shopName || "",
        });
      } catch (error) {
        console.error('Profil yükleme hatası:', error);
        toast.error(error instanceof Error ? error.message : 'Profil bilgileri yüklenirken bir hata oluştu');
      } finally {
          setLoading(false);
      }
    };
    fetchUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setSavingProfile(true);
    // Gönderilecek veriyi schema'dan gelenle eşleştir (null değerleri koru)
    // Zod zaten doğruladığı için data'yı doğrudan gönderebiliriz.
    // Ancak email'i çıkarmak için yeni bir obje oluşturalım.
    const dataToSend = { ...data };
    delete (dataToSend as { email?: string }).email; // Email'i sil

    // Debug için:
    console.log("Profil Güncelleme İsteği Gönderiliyor:", dataToSend);

    try {
      const response = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend), 
      });

      // Yanıtı her zaman json olarak okumaya çalışalım
      const result = await response.json().catch(() => ({ error: "Geçersiz sunucu yanıtı." })); 

      if (!response.ok) {
        // API'den gelen hata mesajını kullan, yoksa genel mesaj
        throw new Error(result.error || result.message || 'Profil güncelleme başarısız');
      }

      toast.success('Profil başarıyla güncellendi');
      // result objesinin UserProfile tipinde olduğunu varsayıyoruz
      // setUser(result); // State'i güncellemek yerine, başarılı olunca formu resetleyelim
      profileForm.reset(data); // Başarılı güncelleme sonrası formu sıfırla (yeni değerlerle)
      // Veya sayfayı yenileyerek verinin tekrar çekilmesini sağlayabiliriz:
      // window.location.reload();

    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      toast.error(error instanceof Error ? error.message : 'Profil güncellenirken bir hata oluştu');
    } finally {
        setSavingProfile(false);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    // Skeleton aynı kalabilir
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Card>
           <CardHeader>
             <Skeleton className="h-6 w-1/4" />
             <Skeleton className="h-4 w-1/2 mt-1" />
           </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2 flex-grow">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                 </div>
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-9 w-full" />
                 <Separator />
                 <Skeleton className="h-6 w-1/4" />
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-9 w-full" /> {/* Ek alanlar için placeholderlar */} 
                 <Skeleton className="h-9 w-full" />
            </CardContent>
             <CardFooter>
                <Skeleton className="h-9 w-[150px]" />
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Profil Ayarları</h1>
        <Form {...profileForm}>
           <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                {/* Profil Bilgileri Kartı */}
                <Card>
                <CardHeader>
                    <CardTitle>Kişisel Bilgiler</CardTitle>
                    <CardDescription>Temel profil bilgilerinizi güncelleyin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     {/* Avatar ve İsim yan yana */}
                     <div className="flex items-start space-x-6">
                        <div className="flex flex-col items-center space-y-2">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={profileForm.watch('image') ?? undefined} alt={profileForm.watch('name') ?? "Kullanıcı"} />
                                <AvatarFallback>{getInitials(profileForm.watch('name'))}</AvatarFallback>
                            </Avatar>
                             <FormField
                                control={profileForm.control}
                                name="image"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                    {/* <FormLabel>Profil Resmi URL</FormLabel> */}
                                    <FormControl>
                                        <Input className="text-xs" type="url" placeholder="Resim URL" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage className="text-xs"/>
                                    </FormItem>
                                )}
                             />
                        </div>
                        {/* Sağ taraf: İsim, Eposta, Telefon */}
                        <div className="flex-grow grid grid-cols-1 gap-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Ad Soyad</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Adınız Soyadınız" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>E-posta Adresi</FormLabel>
                                    <FormControl>
                                        <Input className="text-muted-foreground" {...field} readOnly disabled />
                                    </FormControl>
                                    <FormDescription>
                                        E-posta adresiniz değiştirilemez.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                              <FormField
                                control={profileForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Telefon Numarası</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="(5XX) XXX XX XX" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                    </div>
                </CardContent>
                </Card>

                {/* Mağaza Bilgileri Kartı */}
                <Card>
                 <CardHeader>
                    <CardTitle>Mağaza/Şirket Bilgileri</CardTitle>
                    <CardDescription>Faturalar ve etiketler için kullanılacak bilgileri girin.</CardDescription>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={profileForm.control}
                        name="shopName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Mağaza Adı</FormLabel>
                            <FormControl>
                                <Input placeholder="Mağazanızın adı (fatura vb. için)" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="companyName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Şirket Adı (Opsiyonel)</FormLabel>
                            <FormControl>
                                <Input placeholder="Şirketinizin resmi adı" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={profileForm.control}
                        name="logoUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Mağaza Logosu URL</FormLabel>
                            <FormControl>
                                <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                            </FormControl>
                             <FormDescription>
                               Barkod etiketlerinde kullanılacak logo.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                     />
                    {/* Adres alanı iki sütunu kaplayabilir veya tek sütunda kalabilir */}
                    <FormField
                        control={profileForm.control}
                        name="address"
                         render={({ field }) => (
                            <FormItem className="md:col-span-2"> {/* İki sütunu kapla */} 
                            <FormLabel>Adres</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Tam adresiniz" {...field} value={field.value ?? ''} className="resize-none min-h-[80px]" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </CardContent>
                </Card>

                 {/* Kaydet Butonu */}
                 <div className="flex justify-end">
                    <Button type="submit" disabled={savingProfile || !profileForm.formState.isDirty}>
                        {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Değişiklikleri Kaydet
                     </Button>
                 </div>
           </form>
        </Form>

        {/* Şifre Değiştirme Kartı (Ayrı) */}
        {/* <Card> ... </Card> */}
    </div>
  );
} 