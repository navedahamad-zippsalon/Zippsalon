INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES (
  md5('booking-finance.payout-account.view')::uuid,
  'booking-finance.payout-account.view',
  'View own vendor payout account',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT md5("role"."id" || ':' || "permission"."id")::uuid, "role"."id", "permission"."id"
FROM "Role" AS "role"
CROSS JOIN "Permission" AS "permission"
WHERE "role"."name" = 'VENDOR'
  AND "permission"."action" = 'booking-finance.payout-account.view'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "SubscriptionFeaturePermission" ("id", "featureId", "permissionId")
SELECT md5("feature"."id" || ':' || "permission"."id")::uuid, "feature"."id", "permission"."id"
FROM "SubscriptionFeature" AS "feature"
CROSS JOIN "Permission" AS "permission"
WHERE "feature"."key" = 'payment_wallet'
  AND "permission"."action" = 'booking-finance.payout-account.view'
ON CONFLICT ("featureId", "permissionId") DO NOTHING;

INSERT INTO "SubscriptionPlanRolePermission" (
  "id", "planId", "roleId", "permissionId", "accessKey", "enabled", "createdAt", "updatedAt"
)
SELECT
  md5("manage"."planId" || ':' || "manage"."roleId" || ':' || "viewPermission"."id")::uuid,
  "manage"."planId",
  "manage"."roleId",
  "viewPermission"."id",
  "manage"."planId" || ':' || "manage"."roleId" || ':' || "viewPermission"."id",
  "manage"."enabled",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "SubscriptionPlanRolePermission" AS "manage"
JOIN "Permission" AS "managePermission" ON "managePermission"."id" = "manage"."permissionId"
JOIN "Permission" AS "viewPermission" ON "viewPermission"."action" = 'booking-finance.payout-account.view'
WHERE "managePermission"."action" = 'booking-finance.payout-account.manage'
  AND "manage"."roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'VENDOR')
ON CONFLICT ("accessKey") DO NOTHING;

DELETE FROM "MenuPermission"
WHERE "menuId" IN (SELECT "id" FROM "Menu" WHERE "path" = '/vendor/finance/payout-account')
  AND "permissionId" IN (
    SELECT "id" FROM "Permission" WHERE "action" = 'booking-finance.payout-account.manage'
  );

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT md5("menu"."id" || ':' || "permission"."id")::uuid, "menu"."id", "permission"."id"
FROM "Menu" AS "menu"
CROSS JOIN "Permission" AS "permission"
WHERE "menu"."path" = '/vendor/finance/payout-account'
  AND "permission"."action" = 'booking-finance.payout-account.view'
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
