/*
  Warnings:

  - You are about to drop the `site_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "site_settings";

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "faviconUrl" TEXT,
    "contactAddress" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactMapEmbed" TEXT,
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "footerText" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
