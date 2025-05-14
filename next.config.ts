import type { NextConfig } from "next";
import { NextRequest, NextResponse } from "next/server"; // NextResponse tipi burada da gerekli olabilir

// Bundle Analyzer'ı yalnızca ANALYZE=true olduğunda etkinleştirmek için
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  serverExternalPackages: ['jsbarcode', 'xmldom'],
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dsmcdn.com',
        port: '',
        pathname: '/**', // Bu domaindeki tüm yollara izin ver
      },
      // İleride başka domainler gerekirse buraya eklenebilir
    ],
  },
  turbopack: {
    resolveAlias: {
      // Workaround for Turbopack issue resolving server-only
      // https://github.com/vercel/next.js/issues/48631
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
    // Turbopack'e özel diğer yapılandırmalar buraya eklenebilir
  },
  typescript: {
    ignoreBuildErrors: true, // Build hatalarını yoksay
  },
  eslint: {
    ignoreDuringBuilds: true, // Build sırasındaki ESLint hatalarını yoksay
  },
  // experimental bloğu kaldırıldı

  // CSP Başlığını eklemek için headers fonksiyonunu kullan
  async headers() {
    return [
      {
        // Ödeme sayfası için CSP başlığını ayarla
        source: '/odeme',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' www.paytr.com www.iframe-example.com cdn.paytr.com *.paytr.com",
              "child-src 'self' www.paytr.com *.paytr.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: *.paytr.com",
              "media-src 'self'",
              "connect-src 'self' www.paytr.com cdn.paytr.com *.paytr.com",
              "font-src 'self'",
              "frame-src 'self' www.paytr.com *.paytr.com",
            ].join('; ') + ';',
          },
          // PayTR'nin düzgün çalışması için ek header'lar
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ],
      },
      // Diğer yollar için farklı başlıklar veya genel başlıklar buraya eklenebilir
    ];
  },
};

// Yapılandırmayı Bundle Analyzer ile yalnızca ANALYZE=true olduğunda sarmala
const config = process.env.ANALYZE === 'true' ? withBundleAnalyzer(nextConfig) : nextConfig;

export default config;
