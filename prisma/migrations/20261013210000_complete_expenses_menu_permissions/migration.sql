INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid()::text, menu."id", permission."id"
FROM (VALUES
    ('/expenses', 'expenses.view'),
    ('/expenses/list', 'expenses.list'),
    ('/expenses/list', 'expenses.update'),
    ('/expenses/list', 'expenses.delete'),
    ('/expenses/new', 'expenses.create'),
    ('/expenses/categories', 'expenses.categories.view'),
    ('/expenses/categories', 'expenses.categories.create'),
    ('/expenses/categories', 'expenses.categories.update'),
    ('/expenses/categories', 'expenses.categories.delete'),
    ('/expenses/reports', 'expenses.reports.view')
) AS item(path, permission_action)
JOIN "Menu" menu ON menu."path" = item.path
JOIN "Permission" permission ON permission."action" = item.permission_action
WHERE NOT EXISTS (
    SELECT 1
    FROM "MenuPermission" existing
    WHERE existing."menuId" = menu."id"
      AND existing."permissionId" = permission."id"
);
