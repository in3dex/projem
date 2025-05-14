"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Globe, Palette, Search, Phone, Share2, Footprints, Code } from 'lucide-react';

// API'deki Zod şemasıyla uyumlu olmalı
const siteSettingsFormSchema = z.object({
  siteName: z.string().min(2, "Site adı en az 2 karakter olmalıdır.").optional().nullable(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional().nullable(),
  logoUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  logoDarkUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  faviconUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  appleTouchIconUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  googleAnalyticsId: z.string().optional().nullable(),
  defaultOpenGraphImageUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  contactEmail: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal('')).nullable(),
  contactPhone: z.string().optional().nullable(),
  contactAddress: z.string().optional().nullable(),
  contactWorkingHours: z.string().optional().nullable(),
  contactMapLat: z.string().optional().nullable(),
  contactMapLng: z.string().optional().nullable(),
  googleMapsApiKey: z.string().optional().nullable(),
  showMapOnContactPage: z.boolean().optional(),
  socialFacebook: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialInstagram: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialX: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialLinkedin: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialYoutube: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialTiktok: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  socialWhatsapp: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')).nullable(),
  footerText: z.string().optional().nullable(),
  headerScripts: z.string().optional().nullable(),
  footerScripts: z.string().optional().nullable(),
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

const defaultValues: Partial<SiteSettingsFormValues> = {
  siteName: "",
  maintenanceMode: false,
  maintenanceMessage: "",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  appleTouchIconUrl: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  googleAnalyticsId: "",
  defaultOpenGraphImageUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  contactWorkingHours: "",
  contactMapLat: "",
  contactMapLng: "",
  googleMapsApiKey: "",
  showMapOnContactPage: true,
  socialFacebook: "",
  socialInstagram: "",
  socialX: "",
  socialLinkedin: "",
  socialYoutube: "",
  socialTiktok: "",
  socialWhatsapp: "",
  footerText: "",
  headerScripts: "",
  footerScripts: "",
};

export default function SiteAyarlariPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("genel");

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const response = await fetch("/api/site-settings");
        if (!response.ok) {
          toast.error("Ayarlar yüklenemedi", { description: response.statusText });
          throw new Error("Ayarlar yüklenemedi");
        }
        const data = await response.json();
        if (Object.keys(data).length > 0) {
          const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
            const typedKey = key as keyof SiteSettingsFormValues;
            if (typedKey === 'maintenanceMode' || typedKey === 'showMapOnContactPage') {
              acc[typedKey] = typeof value === 'boolean' ? value : false;
            } else {
              acc[typedKey] = value === null || typeof value === 'undefined' ? "" : value as any;
            }
            return acc;
          }, {} as Partial<SiteSettingsFormValues>);
          form.reset(sanitizedData);
        }
      } catch (error) {
        console.error(error);
        if (!(error instanceof Error && error.message === "Ayarlar yüklenemedi")) {
           toast.error("Site ayarları yüklenirken bir hata oluştu.");
        }
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [form]);

  async function onSubmit(data: SiteSettingsFormValues) {
    setIsLoading(true);
    toast.info("Ayarlar güncelleniyor...");
    try {
      const response = await fetch("/api/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error("Ayarlar güncellenemedi", { description: errorData.error || response.statusText });
        throw new Error(errorData.error || "Ayarlar güncellenemedi.");
      }

      const updatedData = await response.json();
      const sanitizedData = Object.entries(updatedData).reduce((acc, [key, value]) => {
        const typedKey = key as keyof SiteSettingsFormValues;
        if (typedKey === 'maintenanceMode' || typedKey === 'showMapOnContactPage') {
          acc[typedKey] = typeof value === 'boolean' ? value : false;
        } else {
          acc[typedKey] = value === null || typeof value === 'undefined' ? "" : value as any;
        }
        return acc;
      }, {} as Partial<SiteSettingsFormValues>);
      form.reset(sanitizedData); 
      toast.success("Site ayarları başarıyla güncellendi!");
    } catch (error) {
      console.error(error);
      if (!(error instanceof Error && error.message.includes("güncellenemedi"))) {
         toast.error("Ayarlar güncellenirken bir hata oluştu.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return <div className="flex justify-center items-center h-64">Ayarlar yükleniyor...</div>;
  }

  const renderFormField = (name: keyof SiteSettingsFormValues, label: string, placeholder: string, description?: string, type: "input" | "textarea" | "switch" = "input") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={type === 'switch' ? 'flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm' : ''}>
          <div className={type === 'switch' ? 'space-y-0.5' : ''}>
            <FormLabel>{label}</FormLabel>
            {description && type !== 'switch' && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            {type === "input" ? (
              <Input placeholder={placeholder} {...field} value={field.value === null || typeof field.value === 'undefined' ? '' : String(field.value)} />
            ) : type === "textarea" ? (
              <Textarea placeholder={placeholder} {...field} value={field.value === null || typeof field.value === 'undefined' ? '' : String(field.value)} rows={name === 'headerScripts' || name === 'footerScripts' ? 6 : 3} />
            ) : type === "switch" ? (
              <Switch checked={typeof field.value === 'boolean' ? field.value : false} onCheckedChange={field.onChange} />
            ) : null}
          </FormControl>
          {type !== 'switch' && <FormMessage />}
          {description && type === 'switch' && <FormDescription className="pr-2">{description}</FormDescription>}
        </FormItem>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Genel Ayarları</CardTitle>
        <CardDescription>
          Sitenizin genel ayarlarını, SEO bilgilerini, iletişim detaylarını ve daha fazlasını buradan yönetebilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7 mb-6">
                <TabsTrigger value="genel"><Globe className="w-4 h-4 mr-1.5 inline-block" />Genel</TabsTrigger>
                <TabsTrigger value="gorunum"><Palette className="w-4 h-4 mr-1.5 inline-block" />Görünüm</TabsTrigger>
                <TabsTrigger value="seo"><Search className="w-4 h-4 mr-1.5 inline-block" />SEO</TabsTrigger>
                <TabsTrigger value="iletisim"><Phone className="w-4 h-4 mr-1.5 inline-block" />İletişim</TabsTrigger>
                <TabsTrigger value="sosyal"><Share2 className="w-4 h-4 mr-1.5 inline-block" />Sosyal</TabsTrigger>
                <TabsTrigger value="footer"><Footprints className="w-4 h-4 mr-1.5 inline-block" />Footer</TabsTrigger>
                <TabsTrigger value="kodlar"><Code className="w-4 h-4 mr-1.5 inline-block" />Ek Kodlar</TabsTrigger>
              </TabsList>

              <TabsContent value="genel" className="space-y-6">
                <h3 className="text-xl font-semibold">Genel Site Ayarları</h3>
                {renderFormField("siteName", "Site Adı", "Projem Online", "Sitenizin tarayıcı başlığında ve genel alanlarda görünecek adı.")}
                {renderFormField("maintenanceMode", "Bakım Modu", "", "Siteyi ziyaretçilere kapatıp bakım modu mesajı göstermek için aktifleştirin.", "switch")}
                {renderFormField("maintenanceMessage", "Bakım Modu Mesajı", "Sitemiz şu anda bakımda. Kısa süre sonra tekrar yayında olacağız.", "Bakım modu aktifken gösterilecek mesaj.", "textarea")}
              </TabsContent>

              <TabsContent value="gorunum" className="space-y-6">
                <h3 className="text-xl font-semibold">Logo & Favicon Ayarları</h3>
                {renderFormField("logoUrl", "Logo URL (Açık Tema)", "https://example.com/logo-light.png", "Sitenizin açık temadaki logosu.")}
                {renderFormField("logoDarkUrl", "Logo URL (Koyu Tema)", "https://example.com/logo-dark.png", "Sitenizin koyu temadaki logosu.")}
                {renderFormField("faviconUrl", "Favicon URL", "https://example.com/favicon.ico", "Tarayıcı sekmesinde görünecek ikon (.ico, .png, .svg).")}
                {renderFormField("appleTouchIconUrl", "Apple Touch Icon URL", "https://example.com/apple-touch-icon.png", "iPhone/iPad ana ekranına eklenince görünecek ikon.")}
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                <h3 className="text-xl font-semibold">SEO Ayarları</h3>
                {renderFormField("seoTitle", "Varsayılan SEO Başlığı", "Harika Ürünler, İnanılmaz Fiyatlar", "Arama motorları için varsayılan sayfa başlığı.")}
                {renderFormField("seoDescription", "Varsayılan SEO Açıklaması", "En kaliteli ürünleri en uygun fiyatlarla sunuyoruz...", "Arama motorları için varsayılan sayfa açıklaması.", "textarea")}
                {renderFormField("seoKeywords", "Anahtar Kelimeler", "ürün, alışveriş, online, ucuz", "Virgülle ayırarak siteniz için genel anahtar kelimeler.")}
                {renderFormField("googleAnalyticsId", "Google Analytics ID", "UA-XXXXX-Y", "Google Analytics İzleme Kimliği.")}
                {renderFormField("defaultOpenGraphImageUrl", "Varsayılan OpenGraph Resim URL", "https://example.com/og-image.png", "Sosyal medyada paylaşım için varsayılan görsel.")}
              </TabsContent>

              <TabsContent value="iletisim" className="space-y-6">
                <h3 className="text-xl font-semibold">İletişim & Harita Bilgileri</h3>
                {renderFormField("contactEmail", "İletişim E-postası", "info@example.com")}
                {renderFormField("contactPhone", "İletişim Telefonu", "+90 555 123 4567")}
                {renderFormField("contactAddress", "Adres", "123 Ana Cadde, İlçe, Şehir", "", "textarea")}
                {renderFormField("contactWorkingHours", "Çalışma Saatleri", "Hafta içi: 09:00 - 18:00\nCumartesi: 10:00 - 14:00", "İletişim sayfasında gösterilecek çalışma saatleri.", "textarea")}
                <h4 className="text-md font-medium pt-2">Google Harita Ayarları</h4>
                {renderFormField("showMapOnContactPage", "Haritayı İletişim Sayfasında Göster", "", "", "switch")}
                {renderFormField("contactMapLat", "Harita Enlem (Latitude)", "41.0082")}
                {renderFormField("contactMapLng", "Harita Boylam (Longitude)", "28.9784")}
                {renderFormField("googleMapsApiKey", "Google Maps API Key", "AIzaSyB...", "Google Maps JavaScript API için anahtar (client-side).")}
              </TabsContent>
              
              <TabsContent value="sosyal" className="space-y-6">
                <h3 className="text-xl font-semibold">Sosyal Medya Linkleri</h3>
                {renderFormField("socialFacebook", "Facebook URL", "https://facebook.com/kullanici")}
                {renderFormField("socialInstagram", "Instagram URL", "https://instagram.com/kullanici")}
                {renderFormField("socialX", "X (Twitter) URL", "https://x.com/kullanici")}
                {renderFormField("socialLinkedin", "LinkedIn URL", "https://linkedin.com/in/kullanici")}
                {renderFormField("socialYoutube", "Youtube URL", "https://youtube.com/channel/kanalid")}
                {renderFormField("socialTiktok", "TikTok URL", "https://tiktok.com/@kullanici")}
                {renderFormField("socialWhatsapp", "WhatsApp Linki", "https://wa.me/905001112233", "Format: https://wa.me/ULKEKODUTELEFON")}
              </TabsContent>

              <TabsContent value="footer" className="space-y-6">
                <h3 className="text-xl font-semibold">Footer Ayarları</h3>
                {renderFormField("footerText", "Footer Metni", "© 2025 Projem. Tüm hakları saklıdır.", "Sitenin en altında görünecek telif hakkı vb. metin.", "textarea")}
              </TabsContent>

              <TabsContent value="kodlar" className="space-y-6">
                <h3 className="text-xl font-semibold">Ek Scriptler / Özel Kodlar</h3>
                {renderFormField("headerScripts", "Head Scriptleri", "<meta name=\"custom-tag\" content=\"deger\" />", "Sitenizin <head> bölümüne eklenecek özel HTML/script kodları.", "textarea")}
                {renderFormField("footerScripts", "Body Sonu Scriptleri", "<script>console.log(\"Body sonu scripti\");</script>", "Sitenizin <body> etiketinin kapanışından hemen önce eklenecek özel HTML/script kodları.", "textarea")}
              </TabsContent>
            </Tabs>

            <div className="pt-6">
              <Button type="submit" disabled={isLoading || isFetching} size="lg">
                {isLoading ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 