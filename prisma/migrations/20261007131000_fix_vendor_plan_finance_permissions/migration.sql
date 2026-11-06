WITH candidates AS (
  SELECT DISTINCT plan."id" AS "planId", role."id" AS "roleId", permission."id" AS "permissionId"
  FROM "SubscriptionPlan" plan
  JOIN "Role" role ON role."name" = 'VENDOR'
  JOIN "SubscriptionPlanRolePermission" existing
    ON existing."planId" = plan."id" AND existing."roleId" = role."id"
  CROSS JOIN "Permission" permission
  WHERE permission."action" IN ('booking-finance.wallet.view', 'booking-finance.payout-account.manage')
)
INSERT INTO "SubscriptionPlanRolePermission" (
  "id", "planId", "roleId", "staffRoleId", "permissionId", "accessKey", "enabled", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  candidates."planId",
  candidates."roleId",
  NULL,
  candidates."permissionId",
  candidates."planId" || ':' || candidates."roleId" || ':' || candidates."permissionId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM candidates
ON CONFLICT ("accessKey") DO UPDATE
SET "enabled" = true, "updatedAt" = CURRENT_TIMESTAMP;
