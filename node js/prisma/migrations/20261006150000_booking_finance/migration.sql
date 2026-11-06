-- CreateEnum
CREATE TYPE "BookingCommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "BookingFinanceApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HELD', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "BookingSettlementStatus" AS ENUM ('NOT_READY', 'ELIGIBLE', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "BookingSettlementMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "BookingSettlementIntervalUnit" AS ENUM ('SECONDS', 'MINUTES', 'HOURS', 'DAYS', 'WEEKS', 'MONTHS');

-- CreateEnum
CREATE TYPE "VendorWalletBucket" AS ENUM ('PENDING', 'AVAILABLE', 'PROCESSING', 'PAID');

-- CreateEnum
CREATE TYPE "VendorWalletEntryType" AS ENUM ('BOOKING_PENDING_CREDIT', 'PENDING_RELEASE', 'VENDOR_PAYABLE_CREDIT', 'COMMISSION_DEBIT', 'SETTLEMENT_INITIATED', 'SETTLEMENT_PAID', 'SETTLEMENT_RETURNED', 'CANCELLATION_REVERSAL', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VendorSettlementStatus" AS ENUM ('PROCESSING', 'PENDING', 'QUEUED', 'PAID', 'FAILED', 'REVERSED', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "BookingCommissionRule" (
    "id" TEXT NOT NULL,
    "commissionType" "BookingCommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "applicableTo" TEXT NOT NULL DEFAULT 'BOOKINGS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingCommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFinancialTransaction" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "staffId" TEXT,
    "commissionRuleId" TEXT,
    "bookingAmount" DECIMAL(12,2) NOT NULL,
    "vendorGrossAmount" DECIMAL(12,2) NOT NULL,
    "commissionType" "BookingCommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "vendorPayableAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "approvalStatus" "BookingFinanceApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "settlementStatus" "BookingSettlementStatus" NOT NULL DEFAULT 'NOT_READY',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "settledAt" TIMESTAMP(3),
    "manualReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingFinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorWallet" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "pendingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "processingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorWalletLedger" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bookingFinanceId" TEXT,
    "settlementId" TEXT,
    "type" "VendorWalletEntryType" NOT NULL,
    "bucket" "VendorWalletBucket" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceBefore" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reference" TEXT,
    "paymentReference" TEXT,
    "razorpayReference" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorWalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayoutAccount" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "encryptedAccountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'CURRENT',
    "razorpayContactId" TEXT,
    "razorpayFundAccountId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSettlementSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "settlementMode" "BookingSettlementMode" NOT NULL DEFAULT 'MANUAL',
    "intervalValue" INTEGER NOT NULL DEFAULT 1,
    "intervalUnit" "BookingSettlementIntervalUnit" NOT NULL DEFAULT 'DAYS',
    "minimumSettlementAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "autoSettlementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nextSettlementAt" TIMESTAMP(3),
    "encryptedDebitAccountNumber" TEXT,
    "payoutMode" TEXT NOT NULL DEFAULT 'IMPS',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSettlementSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSettlement" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "VendorSettlementStatus" NOT NULL DEFAULT 'PROCESSING',
    "idempotencyKey" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "razorpayPayoutId" TEXT,
    "utr" TEXT,
    "failureReason" TEXT,
    "initiatedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFinanceAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingFinanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RazorpayPayoutWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payoutId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RazorpayPayoutWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BookingFinancialTransactionToVendorSettlement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookingFinancialTransactionToVendorSettlement_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "BookingCommissionRule_isActive_effectiveFrom_effectiveTo_idx" ON "BookingCommissionRule"("isActive", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "BookingFinancialTransaction_bookingId_key" ON "BookingFinancialTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "BookingFinancialTransaction_vendorId_createdAt_idx" ON "BookingFinancialTransaction"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinancialTransaction_salonId_branchId_createdAt_idx" ON "BookingFinancialTransaction"("salonId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinancialTransaction_customerId_createdAt_idx" ON "BookingFinancialTransaction"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinancialTransaction_approvalStatus_settlementStatus_idx" ON "BookingFinancialTransaction"("approvalStatus", "settlementStatus", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinancialTransaction_paymentStatus_createdAt_idx" ON "BookingFinancialTransaction"("paymentStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorWallet_vendorId_key" ON "VendorWallet"("vendorId");

-- CreateIndex
CREATE INDEX "VendorWallet_updatedAt_idx" ON "VendorWallet"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorWalletLedger_idempotencyKey_key" ON "VendorWalletLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VendorWalletLedger_walletId_createdAt_idx" ON "VendorWalletLedger"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorWalletLedger_bookingFinanceId_createdAt_idx" ON "VendorWalletLedger"("bookingFinanceId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorWalletLedger_settlementId_createdAt_idx" ON "VendorWalletLedger"("settlementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayoutAccount_vendorId_key" ON "VendorPayoutAccount"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_razorpayFundAccountId_idx" ON "VendorPayoutAccount"("razorpayFundAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSettlement_idempotencyKey_key" ON "VendorSettlement"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSettlement_referenceId_key" ON "VendorSettlement"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSettlement_razorpayPayoutId_key" ON "VendorSettlement"("razorpayPayoutId");

-- CreateIndex
CREATE INDEX "VendorSettlement_vendorId_status_createdAt_idx" ON "VendorSettlement"("vendorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VendorSettlement_status_createdAt_idx" ON "VendorSettlement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinanceAuditLog_targetType_targetId_createdAt_idx" ON "BookingFinanceAuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFinanceAuditLog_actorId_createdAt_idx" ON "BookingFinanceAuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayPayoutWebhookEvent_eventId_key" ON "RazorpayPayoutWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "RazorpayPayoutWebhookEvent_payoutId_createdAt_idx" ON "RazorpayPayoutWebhookEvent"("payoutId", "createdAt");

-- CreateIndex
CREATE INDEX "RazorpayPayoutWebhookEvent_processed_createdAt_idx" ON "RazorpayPayoutWebhookEvent"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "_BookingFinancialTransactionToVendorSettlement_B_index" ON "_BookingFinancialTransactionToVendorSettlement"("B");

-- AddForeignKey
ALTER TABLE "BookingCommissionRule" ADD CONSTRAINT "BookingCommissionRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "BookingCommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinancialTransaction" ADD CONSTRAINT "BookingFinancialTransaction_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWallet" ADD CONSTRAINT "VendorWallet_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWalletLedger" ADD CONSTRAINT "VendorWalletLedger_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "VendorWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWalletLedger" ADD CONSTRAINT "VendorWalletLedger_bookingFinanceId_fkey" FOREIGN KEY ("bookingFinanceId") REFERENCES "BookingFinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWalletLedger" ADD CONSTRAINT "VendorWalletLedger_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "VendorSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWalletLedger" ADD CONSTRAINT "VendorWalletLedger_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayoutAccount" ADD CONSTRAINT "VendorPayoutAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSettlementSettings" ADD CONSTRAINT "BookingSettlementSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSettlement" ADD CONSTRAINT "VendorSettlement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSettlement" ADD CONSTRAINT "VendorSettlement_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFinanceAuditLog" ADD CONSTRAINT "BookingFinanceAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingFinancialTransactionToVendorSettlement" ADD CONSTRAINT "_BookingFinancialTransactionToVendorSettlement_A_fkey" FOREIGN KEY ("A") REFERENCES "BookingFinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingFinancialTransactionToVendorSettlement" ADD CONSTRAINT "_BookingFinancialTransactionToVendorSettlement_B_fkey" FOREIGN KEY ("B") REFERENCES "VendorSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'booking-finance.view', 'View booking financial transactions and settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.configure', 'Configure commissions and settlement settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.update', 'Update booking commission and settlement settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.approve', 'Approve, reject, or hold booking financial transactions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.settle', 'Initiate and retry vendor settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.wallet.view', 'View own vendor wallet and transaction history', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'booking-finance.payout-account.manage', 'Manage own vendor payout account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.overview.view', 'View payment and wallet overview', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.payments.view', 'View booking payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.payments.create', 'Create booking payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.payments.update', 'Update booking payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.transactions.view', 'View payment transaction ledger', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.refunds.view', 'View payment refunds', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.refunds.create', 'Create payment refunds', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.refunds.update', 'Update payment refunds', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.customer-wallet.view', 'View customer wallets', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.customer-wallet.create', 'Create customer wallet transactions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment-wallet.customer-wallet.update', 'Update customer wallet transactions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" LIKE 'booking-finance.%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" LIKE 'payment-wallet.%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'VENDOR'
  AND p."action" IN ('booking-finance.wallet.view', 'booking-finance.payout-account.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DO $payment_wallet_feature$
DECLARE
  old_feature_id TEXT;
  payment_wallet_feature_id TEXT;
BEGIN
  SELECT "id" INTO old_feature_id FROM "SubscriptionFeature" WHERE "key" = 'payments';
  SELECT "id" INTO payment_wallet_feature_id FROM "SubscriptionFeature" WHERE "key" = 'payment_wallet';

  IF old_feature_id IS NOT NULL AND payment_wallet_feature_id IS NULL THEN
    UPDATE "SubscriptionFeature"
    SET "key" = 'payment_wallet',
        "displayName" = 'Payment & Wallet',
        "description" = 'Payment processing, customer/vendor wallets, booking commissions, settlements, refunds and financial reporting.',
        "featureText" = 'Payment & Wallet',
        "isActive" = true
    WHERE "id" = old_feature_id;
    payment_wallet_feature_id := old_feature_id;
  ELSIF payment_wallet_feature_id IS NULL THEN
    INSERT INTO "SubscriptionFeature" ("id", "key", "displayName", "description", "featureText", "sortOrder", "isActive", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'payment_wallet', 'Payment & Wallet', 'Payment processing, customer/vendor wallets, booking commissions, settlements, refunds and financial reporting.', 'Payment & Wallet', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING "id" INTO payment_wallet_feature_id;
  ELSIF old_feature_id IS NOT NULL THEN
    INSERT INTO "SubscriptionPlanFeature" ("id", "planId", "featureId", "enabled", "limits", "sortOrder")
    SELECT gen_random_uuid(), "planId", payment_wallet_feature_id, "enabled", "limits", "sortOrder"
    FROM "SubscriptionPlanFeature" WHERE "featureId" = old_feature_id
    ON CONFLICT ("planId", "featureId") DO UPDATE
    SET "enabled" = "SubscriptionPlanFeature"."enabled" OR EXCLUDED."enabled";
    INSERT INTO "SubscriptionFeaturePermission" ("id", "featureId", "permissionId")
    SELECT gen_random_uuid(), payment_wallet_feature_id, "permissionId"
    FROM "SubscriptionFeaturePermission" WHERE "featureId" = old_feature_id
    ON CONFLICT ("featureId", "permissionId") DO NOTHING;
    DELETE FROM "SubscriptionPlanFeature" WHERE "featureId" = old_feature_id;
    DELETE FROM "SubscriptionFeaturePermission" WHERE "featureId" = old_feature_id;
    DELETE FROM "SubscriptionFeature" WHERE "id" = old_feature_id;
  END IF;

  UPDATE "SubscriptionFeature"
  SET "displayName" = 'Payment & Wallet',
      "description" = 'Payment processing, customer/vendor wallets, booking commissions, settlements, refunds and financial reporting.',
      "featureText" = 'Payment & Wallet',
      "isActive" = true
  WHERE "id" = payment_wallet_feature_id;

  INSERT INTO "SubscriptionPlanFeature" ("id", "planId", "featureId", "enabled", "sortOrder")
  SELECT gen_random_uuid(), plan."id", payment_wallet_feature_id, false, 13
  FROM "SubscriptionPlan" plan
  ON CONFLICT ("planId", "featureId") DO NOTHING;

  INSERT INTO "SubscriptionFeaturePermission" ("id", "featureId", "permissionId")
  SELECT gen_random_uuid(), payment_wallet_feature_id, permission."id"
  FROM "Permission" permission
  WHERE permission."action" IN (
    'payment-gateway.view', 'payment-gateway.manage', 'payment-gateway.navbar',
    'payment-wallet.overview.view', 'payment-wallet.payments.view', 'payment-wallet.payments.create',
    'payment-wallet.payments.update', 'payment-wallet.transactions.view', 'payment-wallet.refunds.view',
    'payment-wallet.refunds.create', 'payment-wallet.refunds.update', 'payment-wallet.customer-wallet.view',
    'payment-wallet.customer-wallet.create', 'payment-wallet.customer-wallet.update',
    'booking-finance.view', 'booking-finance.configure', 'booking-finance.update', 'booking-finance.approve',
    'booking-finance.settle', 'booking-finance.wallet.view', 'booking-finance.payout-account.manage'
  )
  ON CONFLICT ("featureId", "permissionId") DO NOTHING;
END
$payment_wallet_feature$;

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Booking & Commission', 'WalletCards', '/booking-finance', NULL, 17, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/booking-finance' AND "parentId" IS NULL);

UPDATE "Menu"
SET "label" = 'Payment & Wallet', "icon" = 'WalletCards', "order" = 17, "showInSidebar" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "path" = '/booking-finance' AND "parentId" IS NULL;

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Vendor Wallet', 'Wallet', '/vendor/finance', NULL, 18, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/vendor/finance' AND "parentId" IS NULL);

UPDATE "Menu"
SET "showInSidebar" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "path" = '/vendor/finance' AND "parentId" IS NULL;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m JOIN "Permission" p ON p."action" = 'booking-finance.view'
WHERE m."path" = '/booking-finance' AND m."parentId" IS NULL
ON CONFLICT ("menuId", "permissionId") DO NOTHING;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m JOIN "Permission" p ON p."action" = 'booking-finance.wallet.view'
WHERE m."path" = '/booking-finance' AND m."parentId" IS NULL
ON CONFLICT ("menuId", "permissionId") DO NOTHING;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m JOIN "Permission" p ON p."action" = 'booking-finance.wallet.view'
WHERE m."path" = '/vendor/finance' AND m."parentId" IS NULL
ON CONFLICT ("menuId", "permissionId") DO NOTHING;

UPDATE "Menu"
SET "parentId" = (SELECT "id" FROM "Menu" WHERE "path" = '/booking-finance' AND "parentId" IS NULL LIMIT 1),
    "label" = 'Payment Gateway',
    "icon" = 'CreditCard',
    "order" = 4,
    "showInSidebar" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "path" = '/payment-gateway' AND "parentId" IS NULL
  AND EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/booking-finance' AND "parentId" IS NULL);

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), child.label, child.icon, child.path, parent."id", child.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Payment & Wallet', 'Payment Overview', 'ChartNoAxesCombined', '/payment-wallet/overview', 1),
  ('Payment & Wallet', 'Payments', 'CreditCard', '/payments', 2),
  ('Payment & Wallet', 'Payment Transactions', 'Receipt', '/payments/transactions', 3),
  ('Payment & Wallet', 'Payment Gateway', 'CreditCard', '/payment-gateway', 4),
  ('Payment & Wallet', 'Refunds', 'Undo2', '/refunds', 5),
  ('Payment & Wallet', 'Customer Wallet', 'Wallet', '/customer-wallet', 6),
  ('Payment & Wallet', 'Wallet Overview', 'Wallet', '/booking/commission/dashboard', 7),
  ('Payment & Wallet', 'Wallet Transactions', 'Receipt', '/booking/commission/wallet-transactions', 8),
  ('Payment & Wallet', 'Booking Commission', 'Percent', '/booking/commission/summary', 9),
  ('Payment & Wallet', 'Commission Transactions', 'ListChecks', '/booking/commission/transactions', 10),
  ('Payment & Wallet', 'Pending Settlements', 'Clock3', '/booking/commission/pending-settlement', 11),
  ('Payment & Wallet', 'Settlement History', 'Landmark', '/booking/commission/settlements', 12),
  ('Payment & Wallet', 'Settlement Settings', 'Settings', '/booking/commission/settlement-settings', 13),
  ('Payment & Wallet', 'Financial Reports', 'ChartNoAxesCombined', '/booking/commission/reports', 14),
  ('Payment & Wallet', 'Commission Settings', 'Percent', '/booking/commission/settings', 17),
  ('Payment & Wallet', 'Wallet & Transactions', 'Wallet', '/vendor/finance/wallet', 15),
  ('Payment & Wallet', 'Payout Account', 'Landmark', '/vendor/finance/payout-account', 16)
) AS child(parent_label, label, icon, path, sort_order)
JOIN "Menu" parent ON parent."label" = child.parent_label AND parent."parentId" IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "Menu" current WHERE current."path" = child.path);

UPDATE "Menu" AS current
SET "label" = child.label,
    "icon" = child.icon,
    "parentId" = parent."id",
    "order" = child.sort_order,
    "showInSidebar" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('Payment & Wallet', 'Payment Overview', 'ChartNoAxesCombined', '/payment-wallet/overview', 1),
  ('Payment & Wallet', 'Payments', 'CreditCard', '/payments', 2),
  ('Payment & Wallet', 'Payment Transactions', 'Receipt', '/payments/transactions', 3),
  ('Payment & Wallet', 'Payment Gateway', 'CreditCard', '/payment-gateway', 4),
  ('Payment & Wallet', 'Refunds', 'Undo2', '/refunds', 5),
  ('Payment & Wallet', 'Customer Wallet', 'Wallet', '/customer-wallet', 6),
  ('Payment & Wallet', 'Wallet Overview', 'Wallet', '/booking/commission/dashboard', 7),
  ('Payment & Wallet', 'Wallet Transactions', 'Receipt', '/booking/commission/wallet-transactions', 8),
  ('Payment & Wallet', 'Booking Commission', 'Percent', '/booking/commission/summary', 9),
  ('Payment & Wallet', 'Commission Transactions', 'ListChecks', '/booking/commission/transactions', 10),
  ('Payment & Wallet', 'Pending Settlements', 'Clock3', '/booking/commission/pending-settlement', 11),
  ('Payment & Wallet', 'Settlement History', 'Landmark', '/booking/commission/settlements', 12),
  ('Payment & Wallet', 'Settlement Settings', 'Settings', '/booking/commission/settlement-settings', 13),
  ('Payment & Wallet', 'Financial Reports', 'ChartNoAxesCombined', '/booking/commission/reports', 14),
  ('Payment & Wallet', 'Commission Settings', 'Percent', '/booking/commission/settings', 17),
  ('Payment & Wallet', 'Wallet & Transactions', 'Wallet', '/vendor/finance/wallet', 15),
  ('Payment & Wallet', 'Payout Account', 'Landmark', '/vendor/finance/payout-account', 16)
) AS child(parent_label, label, icon, path, sort_order)
JOIN "Menu" parent ON parent."label" = child.parent_label AND parent."parentId" IS NULL
WHERE current."path" = child.path;

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), child."id", p."id"
FROM "Menu" child
JOIN "Menu" parent ON parent."id" = child."parentId"
JOIN (VALUES
  ('/booking/commission/summary', 'booking-finance.view'),
  ('/booking/commission/summary', 'booking-finance.wallet.view'),
  ('/booking/commission/summary', 'booking-finance.configure'),
  ('/booking/commission/summary', 'booking-finance.update'),
  ('/booking/commission/dashboard', 'booking-finance.view'),
  ('/booking/commission/dashboard', 'booking-finance.wallet.view'),
  ('/booking/commission/transactions', 'booking-finance.view'),
  ('/booking/commission/transactions', 'booking-finance.wallet.view'),
  ('/booking/commission/pending-settlement', 'booking-finance.view'),
  ('/booking/commission/pending-settlement', 'booking-finance.wallet.view'),
  ('/booking/commission/pending-settlement', 'booking-finance.approve'),
  ('/booking/commission/pending-settlement', 'booking-finance.settle'),
  ('/booking/commission/settlements', 'booking-finance.view'),
  ('/booking/commission/settlements', 'booking-finance.wallet.view'),
  ('/booking/commission/settlement-settings', 'booking-finance.view'),
  ('/booking/commission/settlement-settings', 'booking-finance.configure'),
  ('/booking/commission/settlement-settings', 'booking-finance.update'),
  ('/booking/commission/settings', 'booking-finance.view'),
  ('/booking/commission/settings', 'booking-finance.configure'),
  ('/booking/commission/settings', 'booking-finance.update'),
  ('/payment-wallet/overview', 'payment-wallet.overview.view'),
  ('/payments', 'payment-wallet.payments.view'),
  ('/payments', 'payment-wallet.payments.create'),
  ('/payments', 'payment-wallet.payments.update'),
  ('/payments/transactions', 'payment-wallet.transactions.view'),
  ('/payment-gateway', 'payment-gateway.view'),
  ('/payment-gateway', 'payment-gateway.manage'),
  ('/payment-gateway', 'payment-gateway.navbar'),
  ('/refunds', 'payment-wallet.refunds.view'),
  ('/refunds', 'payment-wallet.refunds.create'),
  ('/refunds', 'payment-wallet.refunds.update'),
  ('/customer-wallet', 'payment-wallet.customer-wallet.view'),
  ('/customer-wallet', 'payment-wallet.customer-wallet.create'),
  ('/customer-wallet', 'payment-wallet.customer-wallet.update'),
  ('/booking/commission/wallet-transactions', 'booking-finance.view'),
  ('/booking/commission/wallet-transactions', 'booking-finance.wallet.view'),
  ('/booking/commission/reports', 'booking-finance.view'),
  ('/vendor/finance/wallet', 'booking-finance.wallet.view'),
  ('/vendor/finance/payout-account', 'booking-finance.payout-account.manage')
) AS mapping("path", "action") ON mapping."path" = child."path"
JOIN "Permission" p ON p."action" = mapping."action"
ON CONFLICT ("menuId", "permissionId") DO NOTHING;
