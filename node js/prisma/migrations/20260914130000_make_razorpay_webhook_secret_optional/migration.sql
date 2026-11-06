UPDATE "RazorpayConfiguration"
SET "encryptedWebhookSecret" = NULL
WHERE "encryptedWebhookSecret" = '';

ALTER TABLE "RazorpayConfiguration"
ALTER COLUMN "encryptedWebhookSecret" DROP NOT NULL;