INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'booking-finance.wallet.view', 'View own vendor wallet and transaction history', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.payout-account.manage', 'Manage own vendor payout account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'VENDOR'
  AND p."action" IN ('booking-finance.wallet.view', 'booking-finance.payout-account.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

UPDATE "SubscriptionPlanFeature" spf
SET "enabled" = true
FROM "SubscriptionPlan" plan, "SubscriptionFeature" feature
WHERE spf."planId" = plan."id"
  AND spf."featureId" = feature."id"
  AND plan."slug" = 'FREE'
  AND feature."key" = 'payment_wallet';

INSERT INTO "SubscriptionPlanPermission" ("id", "planId", "permissionId", "userType")
SELECT gen_random_uuid(), plan."id", sfp."permissionId", 'VENDOR'
FROM "SubscriptionPlan" plan
CROSS JOIN "SubscriptionFeature" feature
JOIN "SubscriptionFeaturePermission" sfp ON sfp."featureId" = feature."id"
WHERE plan."slug" = 'FREE'
  AND feature."key" = 'payment_wallet'
ON CONFLICT ("planId", "permissionId", "userType") DO NOTHING;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" menu
JOIN "Permission" permission ON permission."action" = 'booking-finance.wallet.view'
WHERE menu."path" = '/vendor/finance/payout-account'
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
