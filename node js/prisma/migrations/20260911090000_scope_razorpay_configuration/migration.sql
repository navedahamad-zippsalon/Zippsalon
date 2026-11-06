CREATE TYPE "RazorpayScope" AS ENUM ('PLATFORM', 'VENDOR');

ALTER TABLE "RazorpayConfiguration"
  ADD COLUMN "scope" "RazorpayScope" NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN "ownerId" TEXT;

DROP INDEX "RazorpayConfiguration_provider_key";

ALTER TABLE "RazorpayConfiguration"
  ADD CONSTRAINT "RazorpayConfiguration_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RazorpayConfiguration_scope_ownerId_environment_idx"
  ON "RazorpayConfiguration"("scope", "ownerId", "environment");

CREATE UNIQUE INDEX "RazorpayConfiguration_platform_environment_key"
  ON "RazorpayConfiguration"("environment")
  WHERE "scope" = 'PLATFORM' AND "ownerId" IS NULL;

CREATE UNIQUE INDEX "RazorpayConfiguration_vendor_environment_key"
  ON "RazorpayConfiguration"("ownerId", "environment")
  WHERE "scope" = 'VENDOR' AND "ownerId" IS NOT NULL;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v."action", v."description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('payment-gateway.view', 'View payment gateway configuration'),
  ('payment-gateway.manage', 'Manage payment gateway configuration'),
  ('payment-gateway.navbar', 'Show Payment Integration in navigation'),
  ('feed.posts.view', 'View feed posts'),
  ('feed.stories.view', 'View feed stories')
) AS v("action", "description")
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."action" = v."action");

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'VENDOR'
  AND p."action" IN ('feed.posts.view', 'feed.stories.view', 'payment-gateway.view', 'payment-gateway.manage', 'payment-gateway.navbar')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );