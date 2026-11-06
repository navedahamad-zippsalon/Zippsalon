CREATE TABLE "SmtpConfiguration" (
  "id" TEXT NOT NULL, "provider" TEXT NOT NULL DEFAULT 'SMTP', "vendorId" TEXT, "salonId" TEXT, "host" TEXT NOT NULL, "port" INTEGER NOT NULL,
  "username" TEXT NOT NULL, "encryptedPassword" TEXT NOT NULL, "secure" BOOLEAN NOT NULL DEFAULT false,
  "requireTLS" BOOLEAN NOT NULL DEFAULT false, "encryption" TEXT NOT NULL DEFAULT 'tls', "fromEmail" TEXT NOT NULL, "fromName" TEXT NOT NULL,
  "replyTo" TEXT, "connectionTimeout" INTEGER NOT NULL DEFAULT 10000, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL, "updatedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isVerified" BOOLEAN NOT NULL DEFAULT false, "lastTestedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmtpConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmtpConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SmtpConfiguration_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SmtpConfiguration_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SmtpConfiguration_vendorId_salonId_enabled_idx" ON "SmtpConfiguration"("vendorId", "salonId", "enabled");
CREATE INDEX "SmtpConfiguration_salonId_idx" ON "SmtpConfiguration"("salonId");

CREATE TABLE "PlatformWhatsAppConfiguration" (
  "id" TEXT NOT NULL, "provider" TEXT NOT NULL DEFAULT 'META_WHATSAPP_CLOUD_API', "vendorId" TEXT, "salonId" TEXT, "encryptedAccessToken" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL, "businessAccountId" TEXT NOT NULL, "apiVersion" TEXT NOT NULL DEFAULT 'v20.0', "metaAppId" TEXT, "encryptedWebhookVerifyToken" TEXT, "webhookUrl" TEXT,
  "otpTemplateName" TEXT NOT NULL DEFAULT 'authentication', "templateLanguage" TEXT NOT NULL DEFAULT 'en_US',
  "enabled" BOOLEAN NOT NULL DEFAULT false, "isVerified" BOOLEAN NOT NULL DEFAULT false, "lastTestedAt" TIMESTAMP(3), "createdBy" TEXT NOT NULL, "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformWhatsAppConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformWhatsAppConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlatformWhatsAppConfiguration_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PlatformWhatsAppConfiguration_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PlatformWhatsAppConfiguration_vendorId_salonId_enabled_idx" ON "PlatformWhatsAppConfiguration"("vendorId", "salonId", "enabled");
CREATE INDEX "PlatformWhatsAppConfiguration_phoneNumberId_idx" ON "PlatformWhatsAppConfiguration"("phoneNumberId");
