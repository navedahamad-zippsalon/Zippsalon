INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'services.create', 'Create Services', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'services.edit', 'Edit Services', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'services.delete', 'Delete Services', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" AS menu
CROSS JOIN "Permission" AS permission
WHERE menu."path" = '/services'
  AND menu."parentId" IS NULL
  AND permission."action" IN ('services.create', 'services.edit', 'services.delete')
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
