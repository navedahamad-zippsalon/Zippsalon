UPDATE "Menu"
SET "path" = replace("path", '/admin/tracking', '/tracking')
WHERE "path" LIKE '/admin/tracking%';

UPDATE "Menu"
SET "label" = CASE "path"
  WHEN '/tracking/menu-usage' THEN 'Menu Usage'
  WHEN '/tracking/vendors' THEN 'Vendor Tracking'
  WHEN '/tracking/staff' THEN 'Staff Tracking'
  WHEN '/tracking/customers' THEN 'Customer Tracking'
  WHEN '/tracking/analytics' THEN 'Tracking Analytics'
  ELSE "label"
END
WHERE "path" IN (
  '/tracking/menu-usage',
  '/tracking/vendors',
  '/tracking/staff',
  '/tracking/customers',
  '/tracking/analytics'
);
