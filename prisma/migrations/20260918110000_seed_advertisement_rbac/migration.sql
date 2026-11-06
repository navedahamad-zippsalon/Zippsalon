INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'advertisement.view', 'View advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advertisement.create', 'Create advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advertisement.update', 'Update advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advertisement.delete', 'Delete advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advertisement.status', 'Activate or deactivate advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advertisement.reorder', 'Reorder advertisements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" LIKE 'advertisement.%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Advertisements', 'Megaphone', '/advertisements', NULL, 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/advertisements');

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m
JOIN "Permission" p ON p."action" = 'advertisement.view'
WHERE m."path" = '/advertisements'
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
