CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER');
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'VOID');

CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "categoryId" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "ExpensePaymentMethod" NOT NULL,
    "note" TEXT,
    "description" TEXT,
    "referenceNumber" TEXT,
    "receiptUrl" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseCategory_vendorId_name_key" ON "ExpenseCategory"("vendorId", "name");
CREATE INDEX "ExpenseCategory_vendorId_isActive_idx" ON "ExpenseCategory"("vendorId", "isActive");
CREATE INDEX "Expense_salonId_branchId_expenseDate_idx" ON "Expense"("salonId", "branchId", "expenseDate");
CREATE INDEX "Expense_categoryId_expenseDate_idx" ON "Expense"("categoryId", "expenseDate");
CREATE INDEX "Expense_status_deletedAt_idx" ON "Expense"("status", "deletedAt");

ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_salonId_fkey"
    FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ExpenseCategory" ("id", "name", "updatedAt")
SELECT gen_random_uuid()::text, seed.name, CURRENT_TIMESTAMP
FROM (VALUES
    ('Rent'),
    ('Electricity'),
    ('Products & Supplies'),
    ('Salary'),
    ('Marketing'),
    ('Repairs'),
    ('Misc')
) AS seed(name)
WHERE NOT EXISTS (
    SELECT 1 FROM "ExpenseCategory" existing
    WHERE existing."vendorId" IS NULL AND lower(existing."name") = lower(seed.name)
);

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'expenses.view', 'View Expenses overview', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.list', 'View and search expenses', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.create', 'Create expenses', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.update', 'Update expenses', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.delete', 'Delete expenses', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.categories.view', 'View expense categories', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.categories.create', 'Create expense categories', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.categories.update', 'Update expense categories', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.categories.delete', 'Delete expense categories', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'expenses.reports.view', 'View expense reports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid()::text, role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" IN ('ADMIN', 'SUPER_ADMIN', 'VENDOR')
  AND permission."action" LIKE 'expenses.%'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" existing
    WHERE existing."roleId" = role."id" AND existing."permissionId" = permission."id"
  );

INSERT INTO "SubscriptionPlanPermission" ("id", "planId", "permissionId", "userType")
SELECT gen_random_uuid()::text, plan."id", permission."id", 'VENDOR'
FROM "SubscriptionPlan" plan
CROSS JOIN "Permission" permission
WHERE permission."action" LIKE 'expenses.%'
  AND NOT EXISTS (
    SELECT 1 FROM "SubscriptionPlanPermission" existing
    WHERE existing."planId" = plan."id"
      AND existing."permissionId" = permission."id"
      AND existing."userType" = 'VENDOR'
  );

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Expenses', 'Receipt', '/expenses', NULL, 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/expenses' AND "parentId" IS NULL);

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid()::text, menu."id", permission."id"
FROM "Menu" menu
JOIN "Permission" permission ON permission."action" = 'expenses.view'
WHERE menu."path" = '/expenses' AND menu."parentId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "MenuPermission" mp WHERE mp."menuId" = menu."id" AND mp."permissionId" = permission."id");

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, item.label, item.icon, item.path, parent."id", item.menu_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Expense List', 'List', '/expenses/list', 'expenses.list', 1),
  ('Add Expense', 'Plus', '/expenses/new', 'expenses.create', 2),
  ('Expense Categories', 'Tags', '/expenses/categories', 'expenses.categories.view', 3),
  ('Expense Reports', 'ChartNoAxesCombined', '/expenses/reports', 'expenses.reports.view', 4)
) AS item(label, icon, path, permission_action, menu_order)
JOIN "Menu" parent ON parent."path" = '/expenses' AND parent."parentId" IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "Menu" existing WHERE existing."path" = item.path);

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid()::text, menu."id", permission."id"
FROM "Menu" menu
JOIN (VALUES
  ('/expenses/list', 'expenses.list'),
  ('/expenses/new', 'expenses.create'),
  ('/expenses/categories', 'expenses.categories.view'),
  ('/expenses/reports', 'expenses.reports.view')
) AS item(path, permission_action) ON item.path = menu."path"
JOIN "Permission" permission ON permission."action" = item.permission_action
WHERE NOT EXISTS (SELECT 1 FROM "MenuPermission" mp WHERE mp."menuId" = menu."id" AND mp."permissionId" = permission."id");

INSERT INTO "SubscriptionPlanMenu" ("id", "planId", "menuId", "userType", "enabled")
SELECT gen_random_uuid()::text, plan."id", menu."id", 'VENDOR', true
FROM "SubscriptionPlan" plan
CROSS JOIN "Menu" menu
WHERE menu."path" IN ('/expenses', '/expenses/list', '/expenses/new', '/expenses/categories', '/expenses/reports')
  AND NOT EXISTS (
    SELECT 1 FROM "SubscriptionPlanMenu" existing
    WHERE existing."planId" = plan."id" AND existing."menuId" = menu."id" AND existing."userType" = 'VENDOR'
  );
