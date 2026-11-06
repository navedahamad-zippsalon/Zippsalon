INSERT INTO "SubscriptionPlanRolePermission" (
    "id",
    "planId",
    "roleId",
    "permissionId",
    "accessKey",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    plan."id",
    role."id",
    permission."id",
    plan."id" || ':' || role."id" || ':' || permission."id",
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "SubscriptionPlan" plan
CROSS JOIN "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" ILIKE '%vendor%'
  AND permission."action" LIKE 'expenses.%'
  AND NOT EXISTS (
      SELECT 1
      FROM "SubscriptionPlanRolePermission" existing
      WHERE existing."planId" = plan."id"
        AND existing."roleId" = role."id"
        AND existing."permissionId" = permission."id"
  );
