-- Add the module permissions used by Access Control and navigation.
INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'feed.view', 'View Feed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'feed.create', 'Create Feed content', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'feed.edit', 'Edit Feed content', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'feed.delete', 'Delete Feed content', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'feed.navbar', 'Show Feed in navigation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp.view', 'View WhatsApp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp.create', 'Create WhatsApp records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp.edit', 'Edit WhatsApp records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp.delete', 'Delete WhatsApp records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp.navbar', 'Show WhatsApp in navigation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory.view', 'View Inventory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory.create', 'Create Inventory records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory.edit', 'Edit Inventory records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory.delete', 'Delete Inventory records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory.navbar', 'Show Inventory in navigation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), module.label, module.icon, module.path, NULL, module.menu_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Feed', 'Newspaper', '/feed', 2),
  ('WhatsApp', 'MessageCircle', '/whatsapp', 3),
  ('Inventory', 'Package', '/inventory', 4)
) AS module(label, icon, path, menu_order)
WHERE NOT EXISTS (SELECT 1 FROM "Menu" existing WHERE existing."path" = module.path);

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" menu
JOIN "Permission" permission ON permission."action" = lower(menu."label") || '.view'
WHERE menu."path" IN ('/feed', '/whatsapp', '/inventory')
  AND NOT EXISTS (
    SELECT 1 FROM "MenuPermission" link
    WHERE link."menuId" = menu."id" AND link."permissionId" = permission."id"
  );
