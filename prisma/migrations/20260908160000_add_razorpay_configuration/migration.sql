CREATE TYPE "RazorpayEnvironment" AS ENUM ('TEST', 'LIVE');

CREATE TABLE "RazorpayConfiguration" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
  "environment" "RazorpayEnvironment" NOT NULL DEFAULT 'TEST',
  "keyId" TEXT NOT NULL,
  "encryptedKeySecret" TEXT NOT NULL,
  "encryptedWebhookSecret" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RazorpayConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RazorpayConfiguration_provider_key" ON "RazorpayConfiguration"("provider");
CREATE INDEX "RazorpayConfiguration_environment_enabled_idx" ON "RazorpayConfiguration"("environment", "enabled");
ALTER TABLE "RazorpayConfiguration" ADD CONSTRAINT "RazorpayConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'payment-gateway.manage', 'Manage Razorpay payment gateway configuration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "action" = 'payment-gateway.manage');
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN') AND p."action" = 'payment-gateway.manage'
AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id");
