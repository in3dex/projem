"use client";

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { User, Settings, BarChart3, ArrowRight, Bell, DollarSign, CreditCard, FileText } from 'lucide-react'

interface SettingCardProps {
  title: string
  description: string
  href: string
  icon: React.ElementType
}

function SettingCard({ title, description, href, icon: Icon }: SettingCardProps) {
  return (
    <Link href={href} className="block hover:shadow-md transition-shadow duration-200 rounded-lg">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        {/* İsteğe bağlı olarak bir footer eklenebilir
        <CardFooter>
           <span className="text-xs text-blue-600 flex items-center">Git <ArrowRight className="h-3 w-3 ml-1"/></span>
        </CardFooter> 
        */}
      </Card>
    </Link>
  )
}

export default function AyarlarLandingPage() {
  const settings = [
    {
      title: "Profil Bilgileri",
      description: "Kişisel bilgilerinizi, mağaza detaylarınızı ve giriş yönteminizi yönetin.",
      href: "/dashboard/ayarlar/profil",
      icon: User
    },
    {
      title: "Trendyol API",
      description: "Trendyol mağazanızla entegrasyon için API anahtarlarınızı yapılandırın.",
      href: "/dashboard/ayarlar/api",
      icon: Settings
    },
    {
      title: "Barkod Tasarımı",
      description: "Sipariş etiketleriniz için barkod görünümünü ve içeriğini özelleştirin.",
      href: "/dashboard/ayarlar/barkod-tasarimi",
      icon: BarChart3
    },
    {
      title: "Bildirim Ayarları",
      description: "Uygulama içi bildirim tercihlerinizi yönetin.",
      href: "/dashboard/ayarlar/bildirimler",
      icon: Bell
    },
    {
      title: "Maliyet Ayarları",
      description: "Ürün maliyetleri ile ilgili genel ayarları yönetin.",
      href: "/dashboard/ayarlar/maliyet",
      icon: DollarSign
    },
    {
      title: "Abonelik Bilgileri",
      description: "Mevcut abonelik planınızı, durumunu ve fatura bilgilerinizi yönetin.",
      href: "/dashboard/ayarlar/abonelik",
      icon: CreditCard
    },
    {
      title: "Faturalarım",
      description: "Geçmiş ve mevcut faturalarınızı görüntüleyin ve ödemelerinizi yönetin.",
      href: "/dashboard/ayarlar/faturalarim",
      icon: FileText
    },
  ]

  return (
    <div className="container mx-auto py-10 px-4 md:px-6 space-y-8">
      <h1 className="text-3xl font-bold">Ayarlar</h1>
      <p className="text-muted-foreground">
        Uygulama ayarlarınızı ve tercihlerinizi buradan yönetebilirsiniz.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {settings.map((setting) => (
          <SettingCard key={setting.href} {...setting} />
        ))}
      </div>
    </div>
  )
} 