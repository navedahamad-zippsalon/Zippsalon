DELETE FROM "MenuPermission" mp
USING "Menu" menu, "Permission" permission
WHERE mp."menuId" = menu."id"
  AND mp."permissionId" = permission."id"
  AND permission."action" = 'booking-finance.wallet.view'
  AND menu."path" IN (
    '/booking-finance',
    '/booking/commission/summary',
    '/booking/commission/dashboard',
    '/booking/commission/wallet-transactions',
    '/booking/commission/transactions',
    '/booking/commission/pending-settlement',
    '/booking/commission/settlements'
  );
