ALTER TYPE "WhatsAppRecipientStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

CREATE TYPE "WhatsAppConsentSource" AS ENUM ('APP', 'WEB', 'ADMIN', 'IMPORT', 'WHATSAPP', 'MANUAL');

ALTER TABLE "WhatsAppContact"
  ADD COLUMN IF NOT EXISTS "consentSource" "WhatsAppConsentSource";
