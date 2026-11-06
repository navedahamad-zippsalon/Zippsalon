INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'coupons.view', 'View coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.create', 'Create coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.update', 'Update coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.delete', 'Archive coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.status', 'Activate or deactivate coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.manage', 'Manage coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO UPDATE SET "description" = EXCLUDED."description", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN') AND p."action" LIKE 'coupons.%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'VENDOR' AND p."action" IN ('coupons.view', 'coupons.create', 'coupons.update', 'coupons.delete', 'coupons.status', 'coupons.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "SubscriptionPlanPermission" ("id", "planId", "permissionId")
SELECT gen_random_uuid(), sp."id", p."id"
FROM "SubscriptionPlan" sp CROSS JOIN "Permission" p
WHERE p."action" LIKE 'coupons.%'
ON CONFLICT ("planId", "permissionId") DO NOTHING;

WITH parent AS (
  SELECT COALESCE(
    (SELECT "id" FROM "Menu" WHERE "path" = '/coupons' AND "parentId" IS NULL LIMIT 1),
    gen_random_uuid()::text
  ) AS "id"
), ensured_parent AS (
  INSERT INTO "Menu" ("id", "label", "path", "icon", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
  SELECT "id", 'Coupons', '/coupons', 'TicketPercent', NULL, 85, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM parent
  WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/coupons' AND "parentId" IS NULL)
  RETURNING "id"
), actual_parent AS (
  SELECT DISTINCT "id" FROM (SELECT "id" FROM ensured_parent UNION ALL SELECT "id" FROM parent) parents
), parent_permission AS (
  INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
  SELECT gen_random_uuid(), ap."id", p."id" FROM actual_parent ap JOIN "Permission" p ON p."action" = 'coupons.view'
  ON CONFLICT ("menuId", "permissionId") DO NOTHING
  RETURNING "menuId"
), child_def(label, path, icon, action, ord) AS (
  VALUES
    ('All Coupons', '/coupons', 'TicketPercent', 'coupons.view', 0),
    ('Add Coupon', '/coupons/create', 'Plus', 'coupons.create', 1),
    ('Active Coupons', '/coupons/active', 'CircleCheck', 'coupons.view', 2),
    ('Expired Coupons', '/coupons/expired', 'CalendarX', 'coupons.view', 3),
    ('Coupon Usage', '/coupons/usage', 'ChartNoAxesCombined', 'coupons.view', 4)
), created_children AS (
  INSERT INTO "Menu" ("id", "label", "path", "icon", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), d.label, d.path, d.icon, ap."id", d.ord, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM child_def d CROSS JOIN actual_parent ap
  WHERE NOT EXISTS (SELECT 1 FROM "Menu" m WHERE m."path" = d.path AND m."parentId" = ap."id")
  RETURNING "id", "path", "parentId"
)
INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m JOIN actual_parent ap ON ap."id" = m."parentId"
JOIN child_def d ON d.path = m."path"
JOIN "Permission" p ON p."action" = d.action
ON CONFLICT ("menuId", "permissionId") DO NOTHING;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m CROSS JOIN "Permission" p
WHERE m."path" = '/coupons' AND m."parentId" IS NULL AND p."action" = 'coupons.view'
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
