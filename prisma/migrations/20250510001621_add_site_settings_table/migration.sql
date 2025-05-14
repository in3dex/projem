/*
  Warnings:

  - You are about to drop the `SiteSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SiteSettings";

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "contactAddress" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactMapLat" TEXT,
    "contactMapLng" TEXT,
    "socialFacebook" TEXT,
    "socialInstagram" TEXT,
    "socialX" TEXT,
    "socialLinkedin" TEXT,
    "socialYoutube" TEXT,
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
