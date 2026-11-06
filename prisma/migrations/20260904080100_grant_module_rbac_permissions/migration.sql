-- Grant the new module permissions to the built-in Admin and Vendor roles.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" IN ('ADMIN', 'VENDOR')
  AND permission."action" IN (
    'feed.view', 'feed.create', 'feed.edit', 'feed.delete', 'feed.navbar',
    'whatsapp.view', 'whatsapp.create', 'whatsapp.edit', 'whatsapp.delete', 'whatsapp.navbar',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.navbar'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" existing
    WHERE existing."roleId" = role."id" AND existing."permissionId" = permission."id"
  );
