import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/components/auth-provider";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const geistSans = GeistSans;
const geistMono = GeistMono;

// Dinamik metadata için generateMetadata fonksiyonu
export async function generateMetadata(): Promise<Metadata> {
  if (process.env.IS_DOCKER_BUILD === 'true') {
    console.log("[generateMetadata] Docker build detected, returning default metadata for RootLayout.");
    return {
      title: {
        default: "Projem (Build)",
        template: "%s | Projem (Build)",
      },
      description: "İşletmeniz için modern çözümler sunuyoruz. (Build)",
      icons: {
        icon: "/favicon.ico",
      },
    };
  }

  try {
    const settings = await prisma.siteSettings.findFirst();

    const siteName = settings?.siteName || "Projem";
    const defaultTitle = `${siteName} - Modern Çözümler`;
    const defaultDescription = "İşletmeniz için modern çözümler sunuyoruz.";

    return {
      title: {
        default: settings?.seoTitle || defaultTitle,
        template: `%s | ${siteName}`,
      },
      description: settings?.seoDescription || defaultDescription,
      icons: {
        icon: settings?.faviconUrl || "/favicon.ico", // Varsayılan favicon yolu
        // apple: settings?.appleTouchIconUrl || "/apple-touch-icon.png",
      },
      // Diğer metadata alanları eklenebilir (openGraph, twitter vb.)
      // openGraph: {
      //   title: settings?.seoTitle || defaultTitle,
      //   description: settings?.seoDescription || defaultDescription,
      //   url: process.env.NEXT_PUBLIC_SITE_URL, // .env dosyasından site URL'i alınmalı
      //   siteName: siteName,
      //   images: [
      //     {
      //       url: settings?.logoUrl || "/og-image.png", // Varsayılan OG image
      //       width: 1200,
      //       height: 630,
      //     },
      //   ],
      //   type: "website",
      // },
    };
  } catch (error) {
    console.error("Error generating metadata for RootLayout:", error);
    return {
      title: "Projem (Hata)",
      description: "Metadata yüklenirken bir sorun oluştu.",
      icons: { icon: "/favicon.ico" },
    };
  }
}

// Viewport ayarları (tema rengi vb.)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
