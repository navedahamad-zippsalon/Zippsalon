-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'INVALID', 'ERROR', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppOptInStatus" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignType" AS ENUM ('SEND_NOW', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "WhatsAppAudienceType" AS ENUM ('ALL', 'OPTED_IN', 'TAGGED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'PAUSED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppRecipientStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'TEMPLATE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppLedgerStatus" AS ENUM ('PENDING', 'BILLED', 'VOID');

-- CreateEnum
CREATE TYPE "WhatsAppEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "WhatsAppConfigStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVALID');

-- DropIndex
DROP INDEX "FeedPost_createdAt_idx";

-- DropIndex
DROP INDEX "FeedPost_visibility_idx";

-- DropIndex
DROP INDEX "FeedStory_createdAt_idx";

-- CreateTable
CREATE TABLE "WhatsAppConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "metaAppId" TEXT NOT NULL,
    "encryptedMetaAppSecret" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL,
    "webhookVerifyToken" TEXT NOT NULL,
    "encryptedWebhookSecret" TEXT NOT NULL,
    "publicWebhookUrl" TEXT NOT NULL,
    "environment" "WhatsAppEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "status" "WhatsAppConfigStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "businessAccountId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "apiVersion" TEXT NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "qualityRating" TEXT,
    "messagingLimit" TEXT,
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "normalizedPhoneNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "optInStatus" "WhatsAppOptInStatus" NOT NULL DEFAULT 'UNKNOWN',
    "optInAt" TIMESTAMP(3),
    "optOutAt" TIMESTAMP(3),
    "tags" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsAppConnectionId" TEXT,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "salonId" TEXT,
    "branchId" TEXT,
    "providerTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "headerType" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "buttons" JSONB,
    "variables" JSONB,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "providerStatus" TEXT,
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCampaign" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "campaignType" "WhatsAppCampaignType" NOT NULL,
    "audienceType" "WhatsAppAudienceType" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT,
    "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "customerId" TEXT,
    "phoneNumberSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "status" "WhatsAppRecipientStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppPricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "messageCategory" "WhatsAppTemplateCategory" NOT NULL,
    "costPerMessage" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "campaignId" TEXT,
    "contactId" TEXT,
    "customerId" TEXT,
    "connectionId" TEXT NOT NULL,
    "templateId" TEXT,
    "direction" "WhatsAppDirection" NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL,
    "providerMessageId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "messageBody" TEXT,
    "templatePayload" JSONB,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "failureCode" TEXT,
    "failureReason" TEXT,
    "pricingId" TEXT,
    "messageCategory" "WhatsAppTemplateCategory" NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppUsageLedger" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "campaignId" TEXT,
    "messageId" TEXT,
    "messageCategory" "WhatsAppTemplateCategory" NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "WhatsAppLedgerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppIdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "vendorId" TEXT,
    "userId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "vendorId" TEXT,
    "salonId" TEXT,
    "branchId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomationSettings" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "bookingConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "bookingReminder" BOOLEAN NOT NULL DEFAULT false,
    "bookingCancellation" BOOLEAN NOT NULL DEFAULT false,
    "paymentConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "invoice" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppConfiguration_status_idx" ON "WhatsAppConfiguration"("status");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_vendorId_idx" ON "WhatsAppConnection"("vendorId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_salonId_idx" ON "WhatsAppConnection"("salonId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_branchId_idx" ON "WhatsAppConnection"("branchId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_phoneNumberId_idx" ON "WhatsAppConnection"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_status_idx" ON "WhatsAppConnection"("status");

-- CreateIndex
CREATE INDEX "WhatsAppContact_vendorId_idx" ON "WhatsAppContact"("vendorId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_salonId_idx" ON "WhatsAppContact"("salonId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_branchId_idx" ON "WhatsAppContact"("branchId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_normalizedPhoneNumber_idx" ON "WhatsAppContact"("normalizedPhoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppContact_optInStatus_idx" ON "WhatsAppContact"("optInStatus");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_salonId_normalizedPhoneNumber_key" ON "WhatsAppContact"("salonId", "normalizedPhoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_vendorId_idx" ON "WhatsAppTemplate"("vendorId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_salonId_idx" ON "WhatsAppTemplate"("salonId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_branchId_idx" ON "WhatsAppTemplate"("branchId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_vendorId_status_idx" ON "WhatsAppCampaign"("vendorId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_salonId_branchId_idx" ON "WhatsAppCampaign"("salonId", "branchId");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_templateId_idx" ON "WhatsAppCampaign"("templateId");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_connectionId_idx" ON "WhatsAppCampaign"("connectionId");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_scheduledAt_idx" ON "WhatsAppCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_createdAt_idx" ON "WhatsAppCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppCampaignRecipient_campaignId_status_idx" ON "WhatsAppCampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppCampaignRecipient_providerMessageId_idx" ON "WhatsAppCampaignRecipient"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppCampaignRecipient_campaignId_contactId_key" ON "WhatsAppCampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "WhatsAppPricing_provider_messageCategory_active_idx" ON "WhatsAppPricing"("provider", "messageCategory", "active");

-- CreateIndex
CREATE INDEX "WhatsAppPricing_effectiveFrom_effectiveTo_idx" ON "WhatsAppPricing"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_vendorId_status_idx" ON "WhatsAppMessage"("vendorId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_salonId_idx" ON "WhatsAppMessage"("salonId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_branchId_idx" ON "WhatsAppMessage"("branchId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_campaignId_idx" ON "WhatsAppMessage"("campaignId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_templateId_idx" ON "WhatsAppMessage"("templateId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_contactId_idx" ON "WhatsAppMessage"("contactId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_connectionId_idx" ON "WhatsAppMessage"("connectionId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_providerMessageId_idx" ON "WhatsAppMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppUsageLedger_vendorId_createdAt_idx" ON "WhatsAppUsageLedger"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppUsageLedger_salonId_branchId_idx" ON "WhatsAppUsageLedger"("salonId", "branchId");

-- CreateIndex
CREATE INDEX "WhatsAppUsageLedger_messageCategory_status_idx" ON "WhatsAppUsageLedger"("messageCategory", "status");

-- CreateIndex
CREATE INDEX "WhatsAppIdempotencyKey_expiresAt_idx" ON "WhatsAppIdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppIdempotencyKey_key_userId_key" ON "WhatsAppIdempotencyKey"("key", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppWebhookEvent_eventId_key" ON "WhatsAppWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "WhatsAppWebhookEvent_provider_eventType_idx" ON "WhatsAppWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "WhatsAppWebhookEvent_processed_createdAt_idx" ON "WhatsAppWebhookEvent"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppAuditLog_vendorId_createdAt_idx" ON "WhatsAppAuditLog"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppAuditLog_entityType_entityId_idx" ON "WhatsAppAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomationSettings_vendorId_idx" ON "WhatsAppAutomationSettings"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutomationSettings_salonId_branchId_key" ON "WhatsAppAutomationSettings"("salonId", "branchId");

-- AddForeignKey
ALTER TABLE "WhatsAppConfiguration" ADD CONSTRAINT "WhatsAppConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_whatsAppConnectionId_fkey" FOREIGN KEY ("whatsAppConnectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppUsageLedger" ADD CONSTRAINT "WhatsAppUsageLedger_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppUsageLedger" ADD CONSTRAINT "WhatsAppUsageLedger_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppUsageLedger" ADD CONSTRAINT "WhatsAppUsageLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppUsageLedger" ADD CONSTRAINT "WhatsAppUsageLedger_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

