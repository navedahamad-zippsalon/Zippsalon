INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), child."id", permission."id"
FROM (VALUES
  ('/admin/tracking/activity', 'User Activity', 'tracking.activity'),
  ('/admin/tracking/sessions', 'Login Sessions', 'tracking.sessions'),
  ('/admin/tracking/menu-usage', 'CRM Menu Usage', 'tracking.menu_usage'),
  ('/admin/tracking/customer-app', 'Customer App Usage', 'tracking.customer_app'),
  ('/admin/tracking/vendors', 'Vendor Usage', 'tracking.vendor'),
  ('/admin/tracking/staff', 'Staff Usage', 'tracking.staff'),
  ('/admin/tracking/customers', 'Customer Usage', 'tracking.customer'),
  ('/admin/tracking/location-device', 'Location & Device', 'tracking.location'),
  ('/admin/tracking/analytics', 'Analytics', 'tracking.analytics')
) AS item(path, label, permission_action)
JOIN "Menu" parent
  ON parent."path" = '/admin/tracking'
  AND parent."parentId" IS NULL
JOIN "Menu" child
  ON child."parentId" = parent."id"
  AND child."path" = item.path
  AND child."label" = item.label
JOIN "Permission" permission
  ON permission."action" = item.permission_action
WHERE NOT EXISTS (
  SELECT 1
  FROM "MenuPermission" existing
  WHERE existing."menuId" = child."id"
    AND existing."permissionId" = permission."id"
);
