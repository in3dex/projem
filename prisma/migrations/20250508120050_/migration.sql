-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_UPDATE', 'ORDER_CANCELLED', 'ORDER_RETURNED', 'NEW_QUESTION', 'QUESTION_ANSWERED', 'API_CONNECTION_ERROR', 'GENERAL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('PRODUCT_COUNT', 'ORDER_COUNT', 'USER_COUNT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('WELCOME', 'PASSWORD_RESET', 'ORDER_CONFIRMATION', 'ORDER_SHIPPED', 'NEW_ORDER_ADMIN', 'QUESTION_ANSWERED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_CANCELED', 'PAYMENT_INSTRUCTIONS_EFT', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'SUBSCRIPTION_RENEWAL_REMINDER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'PENDING_USER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "webhookApiKey" TEXT,
    "trendyolWebhookId" TEXT,
    "shopName" TEXT,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includeLogo" BOOLEAN NOT NULL DEFAULT false,
    "includeOrderNumber" BOOLEAN NOT NULL DEFAULT true,
    "includeCustomerName" BOOLEAN NOT NULL DEFAULT true,
    "includeCustomerAddress" BOOLEAN NOT NULL DEFAULT true,
    "includeProductList" BOOLEAN NOT NULL DEFAULT false,
    "includeShippingProvider" BOOLEAN NOT NULL DEFAULT true,
    "includeBarcodeText" BOOLEAN NOT NULL DEFAULT true,
    "barcodeType" TEXT NOT NULL DEFAULT 'CODE128',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_settings" (
    "id" TEXT NOT NULL,
    "sellerID" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_orders" (
    "id" TEXT NOT NULL,
    "trendyolId" BIGINT,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "shipmentPackageStatus" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "totalTyDiscount" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "cargoTrackingNumber" TEXT,
    "cargoProviderName" TEXT,
    "cargoTrackingLink" TEXT,
    "deliveryType" TEXT,
    "deliveryAddressType" TEXT,
    "estimatedDeliveryStartDate" TIMESTAMP(3),
    "estimatedDeliveryEndDate" TIMESTAMP(3),
    "agreedDeliveryDate" TIMESTAMP(3),
    "fastDelivery" BOOLEAN NOT NULL DEFAULT false,
    "fastDeliveryType" TEXT,
    "identityNumber" TEXT,
    "taxNumber" TEXT,
    "invoiceLink" TEXT,
    "commercial" BOOLEAN NOT NULL DEFAULT false,
    "micro" BOOLEAN NOT NULL DEFAULT false,
    "giftBoxRequested" BOOLEAN NOT NULL DEFAULT false,
    "deliveredByService" BOOLEAN DEFAULT false,
    "originShipmentDate" TIMESTAMP(3),
    "lastModifiedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shipmentAddressId" TEXT NOT NULL,
    "invoiceAddressId" TEXT NOT NULL,
    "isSynced" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trendyol_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_shipment_packages" (
    "id" TEXT NOT NULL,
    "trendyolPackageId" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "cargoTrackingNumber" TEXT,
    "cargoProviderName" TEXT,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_shipment_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_order_items" (
    "id" TEXT NOT NULL,
    "trendyolId" BIGINT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "merchantSku" TEXT NOT NULL,
    "barcode" TEXT,
    "productSize" TEXT,
    "productOrigin" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "tyDiscount" DOUBLE PRECISION NOT NULL,
    "vatBaseAmount" INTEGER NOT NULL,
    "orderLineItemStatusName" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_addresses" (
    "id" TEXT NOT NULL,
    "trendyolId" BIGINT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "fullAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityCode" INTEGER,
    "district" TEXT,
    "districtId" INTEGER,
    "neighborhood" TEXT,
    "neighborhoodId" INTEGER,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_customers" (
    "id" TEXT NOT NULL,
    "trendyolId" BIGINT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_order_statuses" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_order_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "trendyolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "trendyolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trendyolId" TEXT NOT NULL,
    "productMainId" TEXT NOT NULL,
    "trendyolContentId" INTEGER,
    "barcode" TEXT NOT NULL,
    "stockCode" TEXT,
    "platformListingId" TEXT,
    "productCode" INTEGER,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "listPrice" DOUBLE PRECISION NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "dimensionalWeight" DOUBLE PRECISION,
    "stockUnitType" TEXT,
    "productUrl" TEXT,
    "hasHtmlContent" BOOLEAN,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "onSale" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "hasActiveCampaign" BOOLEAN,
    "images" JSONB NOT NULL,
    "attributes" JSONB NOT NULL,
    "rejectReasonDetails" JSONB,
    "recommended_sale_price" DOUBLE PRECISION,
    "trendyolCreateDateTime" TIMESTAMP(3),
    "trendyolLastUpdateDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generalCostSettingId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trendyolQuestionId" BIGINT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT,
    "status" TEXT NOT NULL,
    "askedDate" TIMESTAMP(3) NOT NULL,
    "answeredDate" TIMESTAMP(3),
    "trendyolAnswerId" BIGINT,
    "customerName" TEXT,
    "showUserName" BOOLEAN NOT NULL,
    "productName" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "productId" TEXT,
    "webUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" TEXT,
    "relatedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trendyolClaimId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "customerFirstName" TEXT,
    "customerLastName" TEXT,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "cargoTrackingNumber" TEXT,
    "cargoProviderName" TEXT,
    "cargoSenderNumber" TEXT,
    "cargoTrackingLink" TEXT,
    "rejectedPackageInfo" JSONB,
    "replacementPackageInfo" JSONB,
    "lastModifiedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_claim_items" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "trendyolClaimItemId" TEXT NOT NULL,
    "trendyolOrderLineId" BIGINT,
    "trendyolOrderLineItemId" BIGINT NOT NULL,
    "trendyolOrderItemId" TEXT,
    "productName" TEXT NOT NULL,
    "barcode" TEXT,
    "merchantSku" TEXT,
    "productColor" TEXT,
    "productSize" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "vatBaseAmount" DOUBLE PRECISION,
    "productCategory" TEXT,
    "customerReasonId" INTEGER,
    "customerReasonName" TEXT,
    "customerReasonCode" TEXT,
    "trendyolReasonId" INTEGER,
    "trendyolReasonName" TEXT,
    "trendyolReasonCode" TEXT,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "customerNote" TEXT,
    "resolved" BOOLEAN NOT NULL,
    "autoAccepted" BOOLEAN,
    "acceptedBySeller" BOOLEAN,
    "autoApproveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_claim_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_cost_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultShippingCost" DOUBLE PRECISION,
    "defaultCommissionRate" DOUBLE PRECISION,
    "defaultTaxRate" DOUBLE PRECISION,
    "defaultAdditionalCost" DOUBLE PRECISION,
    "defaultCarrierName" TEXT,
    "defaultDesi" DOUBLE PRECISION,
    "defaultProfitCalculationMethod" TEXT DEFAULT 'MARGIN',
    "defaultProfitRate" DOUBLE PRECISION,
    "salesVatRate" DOUBLE PRECISION DEFAULT 20,
    "shippingVatRate" DOUBLE PRECISION DEFAULT 20,
    "commissionVatRate" DOUBLE PRECISION DEFAULT 20,
    "serviceFeeAmount" DOUBLE PRECISION DEFAULT 8.49,
    "serviceFeeVatRate" DOUBLE PRECISION DEFAULT 20,
    "costVatRate" DOUBLE PRECISION,
    "includeCostVat" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_cost_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barem_prices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "minOrderValue" DOUBLE PRECISION NOT NULL,
    "maxOrderValue" DOUBLE PRECISION NOT NULL,
    "maxDesi" DOUBLE PRECISION,
    "priceExclVat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barem_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shippingCost" DOUBLE PRECISION,
    "additionalCost" DOUBLE PRECISION,
    "commissionRate" DOUBLE PRECISION,
    "taxRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_commissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION,
    "priceYearly" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "maxProducts" INTEGER,
    "maxMonthlyOrders" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "paymentProvider" TEXT,
    "paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banka_hesaplari" (
    "id" TEXT NOT NULL,
    "bankaAdi" TEXT NOT NULL,
    "subeKodu" TEXT,
    "hesapNumarasi" TEXT,
    "iban" TEXT NOT NULL,
    "hesapSahibi" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banka_hesaplari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odeme_ayarlari" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "eftAktif" BOOLEAN NOT NULL DEFAULT false,
    "paytrAktif" BOOLEAN NOT NULL DEFAULT false,
    "paytrMerchantId" TEXT,
    "paytrMerchantKey" TEXT,
    "paytrMerchantSalt" TEXT,
    "paytrIframeUrl" TEXT DEFAULT 'https://www.paytr.com/odeme/api/get-token',
    "paytrTestMode" TEXT DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odeme_ayarlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmtpSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "password" TEXT,
    "from" TEXT NOT NULL DEFAULT 'info@domain.com',
    "fromName" TEXT NOT NULL DEFAULT 'Sistem',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "invoiceGenerationDaysBeforeEnd" INTEGER NOT NULL DEFAULT 7,
    "invoiceDueDays" INTEGER NOT NULL DEFAULT 7,
    "overdueMarkDays" INTEGER NOT NULL DEFAULT 3,
    "cancelSubscriptionAfterOverdueDays" INTEGER NOT NULL DEFAULT 30,
    "sendSubscriptionEndingSoonEmail" BOOLEAN NOT NULL DEFAULT true,
    "daysBeforeEndingToSendEmail" INTEGER NOT NULL DEFAULT 7,
    "sendPaymentOverdueEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendSubscriptionCancelledEmail" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "syncOrders" BOOLEAN NOT NULL DEFAULT true,
    "syncProducts" BOOLEAN NOT NULL DEFAULT true,
    "syncClaims" BOOLEAN NOT NULL DEFAULT true,
    "syncCustomerQuestions" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAdminMessage" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_webhookApiKey_key" ON "users"("webhookApiKey");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_webhookApiKey_idx" ON "users"("webhookApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeSetting_userId_key" ON "BarcodeSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_settings_userId_key" ON "api_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_orders_orderNumber_key" ON "trendyol_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "trendyol_orders_userId_idx" ON "trendyol_orders"("userId");

-- CreateIndex
CREATE INDEX "trendyol_orders_orderDate_idx" ON "trendyol_orders"("orderDate");

-- CreateIndex
CREATE INDEX "trendyol_orders_status_idx" ON "trendyol_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_shipment_packages_trendyolPackageId_key" ON "trendyol_shipment_packages"("trendyolPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_order_items_trendyolId_key" ON "trendyol_order_items"("trendyolId");

-- CreateIndex
CREATE INDEX "trendyol_order_items_orderId_idx" ON "trendyol_order_items"("orderId");

-- CreateIndex
CREATE INDEX "trendyol_order_items_barcode_idx" ON "trendyol_order_items"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_addresses_trendyolId_key" ON "trendyol_addresses"("trendyolId");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_customers_trendyolId_key" ON "trendyol_customers"("trendyolId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_trendyolId_key" ON "brands"("trendyolId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_trendyolId_key" ON "categories"("trendyolId");

-- CreateIndex
CREATE UNIQUE INDEX "products_trendyolId_key" ON "products"("trendyolId");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_userId_idx" ON "products"("userId");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_stockCode_idx" ON "products"("stockCode");

-- CreateIndex
CREATE INDEX "products_approved_idx" ON "products"("approved");

-- CreateIndex
CREATE INDEX "products_archived_idx" ON "products"("archived");

-- CreateIndex
CREATE INDEX "products_onSale_idx" ON "products"("onSale");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_quantity_idx" ON "products"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "customer_questions_trendyolQuestionId_key" ON "customer_questions"("trendyolQuestionId");

-- CreateIndex
CREATE INDEX "customer_questions_userId_idx" ON "customer_questions"("userId");

-- CreateIndex
CREATE INDEX "customer_questions_status_idx" ON "customer_questions"("status");

-- CreateIndex
CREATE INDEX "customer_questions_productId_idx" ON "customer_questions"("productId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_claims_trendyolClaimId_key" ON "trendyol_claims"("trendyolClaimId");

-- CreateIndex
CREATE INDEX "trendyol_claims_userId_idx" ON "trendyol_claims"("userId");

-- CreateIndex
CREATE INDEX "trendyol_claims_orderNumber_idx" ON "trendyol_claims"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_claim_items_trendyolClaimItemId_key" ON "trendyol_claim_items"("trendyolClaimItemId");

-- CreateIndex
CREATE INDEX "trendyol_claim_items_claimId_idx" ON "trendyol_claim_items"("claimId");

-- CreateIndex
CREATE INDEX "trendyol_claim_items_status_idx" ON "trendyol_claim_items"("status");

-- CreateIndex
CREATE INDEX "trendyol_claim_items_trendyolOrderLineItemId_idx" ON "trendyol_claim_items"("trendyolOrderLineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "general_cost_settings_userId_key" ON "general_cost_settings"("userId");

-- CreateIndex
CREATE INDEX "barem_prices_userId_idx" ON "barem_prices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_settings_userId_productId_key" ON "product_cost_settings"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "category_commissions_userId_categoryId_key" ON "category_commissions"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripePriceIdMonthly_key" ON "plans"("stripePriceIdMonthly");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripePriceIdYearly_key" ON "plans"("stripePriceIdYearly");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "banka_hesaplari_iban_key" ON "banka_hesaplari"("iban");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_userId_idx" ON "SupportMessage"("userId");

-- AddForeignKey
ALTER TABLE "BarcodeSetting" ADD CONSTRAINT "BarcodeSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_settings" ADD CONSTRAINT "api_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_orders" ADD CONSTRAINT "trendyol_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_orders" ADD CONSTRAINT "trendyol_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "trendyol_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_orders" ADD CONSTRAINT "trendyol_orders_shipmentAddressId_fkey" FOREIGN KEY ("shipmentAddressId") REFERENCES "trendyol_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_orders" ADD CONSTRAINT "trendyol_orders_invoiceAddressId_fkey" FOREIGN KEY ("invoiceAddressId") REFERENCES "trendyol_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_shipment_packages" ADD CONSTRAINT "trendyol_shipment_packages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "trendyol_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_order_items" ADD CONSTRAINT "trendyol_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "trendyol_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_order_statuses" ADD CONSTRAINT "trendyol_order_statuses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "trendyol_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_generalCostSettingId_fkey" FOREIGN KEY ("generalCostSettingId") REFERENCES "general_cost_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_questions" ADD CONSTRAINT "customer_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_questions" ADD CONSTRAINT "customer_questions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_claims" ADD CONSTRAINT "trendyol_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_claim_items" ADD CONSTRAINT "trendyol_claim_items_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "trendyol_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_claim_items" ADD CONSTRAINT "trendyol_claim_items_trendyolOrderItemId_fkey" FOREIGN KEY ("trendyolOrderItemId") REFERENCES "trendyol_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_cost_settings" ADD CONSTRAINT "general_cost_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barem_prices" ADD CONSTRAINT "barem_prices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_settings" ADD CONSTRAINT "product_cost_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_settings" ADD CONSTRAINT "product_cost_settings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_commissions" ADD CONSTRAINT "category_commissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_commissions" ADD CONSTRAINT "category_commissions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
