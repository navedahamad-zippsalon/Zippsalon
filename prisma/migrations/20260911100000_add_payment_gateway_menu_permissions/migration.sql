INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v."action", v."description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('payment-gateway.navbar', 'Show Payment Gateway in navigation'),
  ('payment-gateway.view', 'View payment gateway configuration'),
  ('payment-gateway.manage', 'Manage payment gateway configuration')
) AS v("action", "description")
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."action" = v."action");

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" IN ('payment-gateway.navbar', 'payment-gateway.view', 'payment-gateway.manage')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

WITH created_menu AS (
  INSERT INTO "Menu" ("id", "label", "icon", "path", "order", "showInSidebar", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'Payment Gateway', 'CreditCard', '/payment-gateway', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM "Menu" WHERE "path" = '/payment-gateway' OR "label" = 'Payment Gateway'
  )
  RETURNING "id"
)
INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM (
  SELECT "id" FROM created_menu
  UNION ALL
  SELECT "id" FROM "Menu" WHERE "path" = '/payment-gateway' OR "label" = 'Payment Gateway'
) m
JOIN "Permission" p ON p."action" = 'payment-gateway.navbar'
WHERE NOT EXISTS (
  SELECT 1 FROM "MenuPermission" mp
  WHERE mp."menuId" = m."id" AND mp."permissionId" = p."id"
);

WITH parent_menu AS (
  SELECT "id" FROM "Menu" WHERE "path" = '/payment-gateway' OR "label" = 'Payment Gateway' LIMIT 1
), created_child AS (
  INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), 'Razorpay', 'CreditCard', '/payment-gateway/razorpay', p."id", 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM parent_menu p
  WHERE NOT EXISTS (
    SELECT 1 FROM "Menu" WHERE "path" = '/payment-gateway/razorpay' OR ("label" = 'Razorpay' AND "parentId" = p."id")
  )
  RETURNING "id"
)
INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM (
  SELECT "id" FROM created_child
  UNION ALL
  SELECT "id" FROM "Menu" WHERE "path" = '/payment-gateway/razorpay'
) m
JOIN "Permission" p ON p."action" = 'payment-gateway.view'
WHERE NOT EXISTS (
  SELECT 1 FROM "MenuPermission" mp
  WHERE mp."menuId" = m."id" AND mp."permissionId" = p."id"
);
