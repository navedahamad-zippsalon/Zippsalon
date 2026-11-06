ALTER TABLE "SmtpConfiguration" ADD COLUMN IF NOT EXISTS "lastTestStatus" TEXT;
ALTER TABLE "PlatformWhatsAppConfiguration" ADD COLUMN IF NOT EXISTS "lastTestStatus" TEXT;
