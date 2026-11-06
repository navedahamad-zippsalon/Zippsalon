CREATE TYPE "WhatsAppBillingStatus" AS ENUM ('PENDING', 'CALCULATED', 'BILLED', 'CANCELLED', 'FAILED');

ALTER TABLE "WhatsAppCampaignBilling"
ALTER COLUMN "billingStatus" DROP DEFAULT;

ALTER TABLE "WhatsAppCampaignBilling"
ALTER COLUMN "billingStatus" TYPE "WhatsAppBillingStatus"
USING "billingStatus"::"WhatsAppBillingStatus";

ALTER TABLE "WhatsAppCampaignBilling"
ALTER COLUMN "billingStatus" SET DEFAULT 'CALCULATED';
