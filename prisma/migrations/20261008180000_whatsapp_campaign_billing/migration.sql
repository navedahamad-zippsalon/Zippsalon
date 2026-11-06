ALTER TABLE "WhatsAppPricing"
ADD COLUMN "campaignCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "WhatsAppCampaign"
ADD COLUMN "pricingSnapshot" JSONB;

ALTER TABLE "WhatsAppUsageLedger"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "WhatsAppUsageLedger_idempotencyKey_key"
ON "WhatsAppUsageLedger"("idempotencyKey");

CREATE TABLE "WhatsAppCampaignBilling" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "billableMessageCount" INTEGER NOT NULL DEFAULT 0,
    "perMessageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campaignCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "pricingSnapshot" JSONB NOT NULL,
    "billingStatus" TEXT NOT NULL DEFAULT 'CALCULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCampaignBilling_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCampaignBilling_campaignId_key"
ON "WhatsAppCampaignBilling"("campaignId");
CREATE INDEX "WhatsAppCampaignBilling_vendorId_createdAt_idx"
ON "WhatsAppCampaignBilling"("vendorId", "createdAt");
CREATE INDEX "WhatsAppCampaignBilling_salonId_branchId_createdAt_idx"
ON "WhatsAppCampaignBilling"("salonId", "branchId", "createdAt");
CREATE INDEX "WhatsAppCampaignBilling_billingStatus_createdAt_idx"
ON "WhatsAppCampaignBilling"("billingStatus", "createdAt");

ALTER TABLE "WhatsAppCampaignBilling"
ADD CONSTRAINT "WhatsAppCampaignBilling_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppCampaignBilling"
ADD CONSTRAINT "WhatsAppCampaignBilling_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppCampaignBilling"
ADD CONSTRAINT "WhatsAppCampaignBilling_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "Salon"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppCampaignBilling"
ADD CONSTRAINT "WhatsAppCampaignBilling_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Salon"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
