-- Register coupon permissions for Access Control and navigation.
INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'coupons.view', 'View Coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.create', 'Create Coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.update', 'Update Coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.delete', 'Archive Coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.status', 'Change Coupon Status', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'coupons.manage', 'Manage Coupons', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

-- Add one shared backend menu; the frontend maps it to the role-specific route.
INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Coupons', 'TicketPercent', '/coupons', NULL, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/coupons');

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" menu
CROSS JOIN "Permission" permission
WHERE menu."path" = '/coupons'
  AND permission."action" = 'coupons.view'
  AND NOT EXISTS (
    SELECT 1 FROM "MenuPermission" existing
    WHERE existing."menuId" = menu."id" AND existing."permissionId" = permission."id"
  );

-- Built-in Admin and Vendor roles receive the coupon module permissions.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" IN ('ADMIN', 'VENDOR')
  AND permission."action" IN ('coupons.view', 'coupons.create', 'coupons.update', 'coupons.delete', 'coupons.status', 'coupons.manage')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" existing
    WHERE existing."roleId" = role."id" AND existing."permissionId" = permission."id"
  );
