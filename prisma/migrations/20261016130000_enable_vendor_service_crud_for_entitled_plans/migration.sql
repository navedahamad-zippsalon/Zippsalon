WITH eligible_vendor_service_actions AS (
  SELECT
    plan."id" AS "planId",
    vendor_role."id" AS "roleId",
    permission."id" AS "permissionId"
  FROM "SubscriptionPlan" AS plan
  JOIN "SubscriptionPlanFeature" AS plan_feature
    ON plan_feature."planId" = plan."id"
   AND plan_feature."enabled" = TRUE
  JOIN "SubscriptionFeature" AS feature
    ON feature."id" = plan_feature."featureId"
   AND feature."key" = 'service_management'
   AND feature."isActive" = TRUE
  JOIN "Role" AS vendor_role
    ON vendor_role."name" = 'VENDOR'
  JOIN "Permission" AS permission
    ON permission."action" IN ('services.create', 'services.edit', 'services.delete')
  WHERE plan."isActive" = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM "SubscriptionPlanMenu" AS plan_menu
      JOIN "Menu" AS services_menu
        ON services_menu."id" = plan_menu."menuId"
       AND services_menu."path" = '/services'
       AND services_menu."parentId" IS NULL
      WHERE plan_menu."planId" = plan."id"
        AND plan_menu."userType" = 'VENDOR'
        AND plan_menu."enabled" = FALSE
    )
)
INSERT INTO "SubscriptionPlanRolePermission" (
  "id",
  "planId",
  "roleId",
  "staffRoleId",
  "permissionId",
  "accessKey",
  "enabled",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  eligible."planId",
  eligible."roleId",
  NULL,
  eligible."permissionId",
  eligible."planId" || ':' || eligible."roleId" || ':' || eligible."permissionId",
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM eligible_vendor_service_actions AS eligible
ON CONFLICT ("accessKey") DO NOTHING;
