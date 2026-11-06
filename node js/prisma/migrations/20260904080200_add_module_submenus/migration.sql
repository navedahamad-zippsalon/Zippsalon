-- Add submenu records under the module menus. They reuse the parent view permission so
-- enabling the module permission makes its submenu available without a second policy.
INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), item.label, item.icon, item.path, parent."id", item.menu_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Feed', 'Newspaper', '/feed', 'Feed', 1),
  ('Posts', 'Images', '/feed/posts', 'Feed', 2),
  ('Stories', 'CirclePlay', '/feed/stories', 'Feed', 3),
  ('WhatsApp Dashboard', 'LayoutDashboard', '/whatsapp', 'WhatsApp', 1),
  ('Connections', 'Wifi', '/whatsapp/connections', 'WhatsApp', 2),
  ('Campaigns', 'Send', '/whatsapp/campaigns', 'WhatsApp', 3),
  ('Templates', 'FileText', '/whatsapp/templates', 'WhatsApp', 4),
  ('Contacts', 'Users', '/whatsapp/contacts', 'WhatsApp', 5),
  ('Messages', 'MessageSquare', '/whatsapp/messages', 'WhatsApp', 6),
  ('Automation', 'Zap', '/whatsapp/automation', 'WhatsApp', 7),
  ('Usage', 'ChartNoAxesCombined', '/whatsapp/usage', 'WhatsApp', 8),
  ('Settings', 'Settings', '/whatsapp/settings', 'WhatsApp', 9),
  ('Products', 'Package', '/inventory/products', 'Inventory', 1),
  ('Categories', 'Tags', '/inventory/categories', 'Inventory', 2),
  ('Stock', 'Warehouse', '/inventory/stock', 'Inventory', 3),
  ('Reports', 'ChartNoAxesCombined', '/inventory/reports', 'Inventory', 4)
) AS item(label, icon, path, parent_label, menu_order)
JOIN "Menu" parent ON parent."label" = item.parent_label AND parent."parentId" IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "Menu" existing WHERE existing."path" = item.path);

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), child."id", permission."id"
FROM "Menu" child
JOIN "Menu" parent ON parent."id" = child."parentId"
JOIN "Permission" permission ON permission."action" = lower(parent."label") || '.view'
WHERE child."path" IN (
  '/feed', '/feed/posts', '/feed/stories',
  '/whatsapp', '/whatsapp/connections', '/whatsapp/campaigns', '/whatsapp/templates', '/whatsapp/contacts', '/whatsapp/messages', '/whatsapp/automation', '/whatsapp/usage', '/whatsapp/settings',
  '/inventory/products', '/inventory/categories', '/inventory/stock', '/inventory/reports'
)
AND NOT EXISTS (
  SELECT 1 FROM "MenuPermission" existing
  WHERE existing."menuId" = child."id" AND existing."permissionId" = permission."id"
);
