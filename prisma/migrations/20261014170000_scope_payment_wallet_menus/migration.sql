UPDATE "Menu"
SET
  "audience" = CASE
    WHEN "path" IN ('/vendor/finance/wallet', '/vendor/finance/payout-account') THEN 'VENDOR'
    ELSE 'ADMIN'
  END,
  "showInSidebar" = CASE
    WHEN "path" = '/vendor/payment-gateway' THEN false
    ELSE "showInSidebar"
  END
WHERE "parentId" IN (
  SELECT "id"
  FROM "Menu"
  WHERE "label" = 'Payment & Wallet'
    AND "parentId" IS NULL
)
AND "path" IN (
  '/payment-wallet/overview',
  '/payments',
  '/payments/transactions',
  '/payment-gateway',
  '/vendor/payment-gateway',
  '/refunds',
  '/customer-wallet',
  '/booking/commission/dashboard',
  '/booking/commission/wallet-transactions',
  '/booking/commission/summary',
  '/booking/commission/transactions',
  '/booking/commission/pending-settlement',
  '/booking/commission/settlements',
  '/booking/commission/settlement-settings',
  '/booking/commission/reports',
  '/booking/commission/settings',
  '/vendor/finance/wallet',
  '/vendor/finance/payout-account'
);
