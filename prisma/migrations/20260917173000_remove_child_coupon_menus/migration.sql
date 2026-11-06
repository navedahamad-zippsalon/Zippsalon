-- Remove child menu permissions for child coupon menus
DELETE FROM "MenuPermission"
WHERE "menuId" IN (
  SELECT "id" FROM "Menu"
  WHERE "parentId" IS NOT NULL
    AND ("path" LIKE '/coupons/%' OR ("path" = '/coupons' AND "parentId" IS NOT NULL))
);

-- Remove child coupon menus so that only the parent coupon menu remains
DELETE FROM "Menu"
WHERE "parentId" IS NOT NULL
  AND ("path" LIKE '/coupons/%' OR ("path" = '/coupons' AND "parentId" IS NOT NULL));

