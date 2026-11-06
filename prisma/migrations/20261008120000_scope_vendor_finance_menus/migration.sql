ALTER TABLE "Menu"
ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'ALL';

UPDATE "Menu"
SET "audience" = 'VENDOR',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "path" IN ('/vendor/finance/wallet', '/vendor/finance/payout-account');

DELETE FROM "MenuPermission" mp
USING "Menu" menu, "Permission" permission
WHERE mp."menuId" = menu."id"
  AND mp."permissionId" = permission."id"
  AND menu."path" = '/vendor/finance/payout-account'
  AND permission."action" = 'booking-finance.wallet.view';

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" menu
JOIN "Permission" permission ON permission."action" = 'booking-finance.payout-account.manage'
WHERE menu."path" = '/vendor/finance/payout-account'
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
