ALTER TYPE "WhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

ALTER TABLE "WhatsAppMessage"
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

ALTER TABLE "WhatsAppCampaign"
  ADD COLUMN IF NOT EXISTS "templatePayload" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMessage_campaignId_contactId_key"
  ON "WhatsAppMessage"("campaignId", "contactId");
