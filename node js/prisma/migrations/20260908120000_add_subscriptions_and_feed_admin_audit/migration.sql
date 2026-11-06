-- Additive subscription, billing, webhook, entitlement, and Feed admin audit storage.
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'INACTIVE');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE');

ALTER TABLE "FeedPost" ADD COLUMN "deletedBy" TEXT;
ALTER TABLE "FeedStory" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "FeedStory" ADD COLUMN "deletedBy" TEXT;

CREATE TABLE "SubscriptionFeature" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "featureText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionFeature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionFeature_key_key" ON "SubscriptionFeature"("key");
CREATE INDEX "SubscriptionFeature_isActive_sortOrder_idx" ON "SubscriptionFeature"("isActive", "sortOrder");
ALTER TABLE "SubscriptionFeature" ADD CONSTRAINT "SubscriptionFeature_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "shortDescription" TEXT,
  "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
  "annualPrice" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "monthlyEnabled" BOOLEAN NOT NULL DEFAULT true,
  "annualEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "badge" TEXT,
  "highlight" BOOLEAN NOT NULL DEFAULT false,
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "maxBranches" INTEGER,
  "maxStaff" INTEGER,
  "maxCustomers" INTEGER,
  "maxBookings" INTEGER,
  "maxStorage" INTEGER,
  "maxBookingsPerMonth" INTEGER,
  "featureTitle" TEXT,
  "featureDescription" TEXT,
  "ctaText" TEXT,
  "badgeText" TEXT,
  "monthlyDescription" TEXT,
  "annualDescription" TEXT,
  "promotionalText" TEXT,
  "termsText" TEXT,
  "renewalText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
CREATE INDEX "SubscriptionPlan_isActive_displayOrder_idx" ON "SubscriptionPlan"("isActive", "displayOrder");

CREATE TABLE "SubscriptionPlanFeature" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "limits" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SubscriptionPlanFeature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlanFeature_planId_featureId_key" ON "SubscriptionPlanFeature"("planId", "featureId");
CREATE INDEX "SubscriptionPlanFeature_featureId_enabled_idx" ON "SubscriptionPlanFeature"("featureId", "enabled");
ALTER TABLE "SubscriptionPlanFeature" ADD CONSTRAINT "SubscriptionPlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanFeature" ADD CONSTRAINT "SubscriptionPlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "SubscriptionFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "salonId" TEXT,
  "planId" TEXT NOT NULL,
  "billingCycle" "BillingCycle" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "amount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "renewsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "razorpaySubscriptionId" TEXT,
  "isManual" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "Subscription"("razorpaySubscriptionId");
CREATE INDEX "Subscription_vendorId_status_idx" ON "Subscription"("vendorId", "status");
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SubscriptionPayment" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'CREATED',
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "providerReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPayment_razorpayOrderId_key" ON "SubscriptionPayment"("razorpayOrderId");
CREATE UNIQUE INDEX "SubscriptionPayment_razorpayPaymentId_key" ON "SubscriptionPayment"("razorpayPaymentId");
CREATE INDEX "SubscriptionPayment_vendorId_status_idx" ON "SubscriptionPayment"("vendorId", "status");
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SubscriptionInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "paymentId" TEXT,
  "vendorId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "SubscriptionInvoice"("invoiceNumber");
CREATE UNIQUE INDEX "SubscriptionInvoice_paymentId_key" ON "SubscriptionInvoice"("paymentId");
CREATE INDEX "SubscriptionInvoice_vendorId_status_idx" ON "SubscriptionInvoice"("vendorId", "status");
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SubscriptionWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionWebhookEvent_eventId_key" ON "SubscriptionWebhookEvent"("eventId");

CREATE TABLE "SubscriptionAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "vendorId" TEXT,
  "subscriptionId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubscriptionAuditLog_vendorId_createdAt_idx" ON "SubscriptionAuditLog"("vendorId", "createdAt");
CREATE INDEX "SubscriptionAuditLog_targetType_targetId_idx" ON "SubscriptionAuditLog"("targetType", "targetId");
ALTER TABLE "SubscriptionAuditLog" ADD CONSTRAINT "SubscriptionAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAuditLog" ADD CONSTRAINT "SubscriptionAuditLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAuditLog" ADD CONSTRAINT "SubscriptionAuditLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FeedAdminAudit" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "salonId" TEXT,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedAdminAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeedAdminAudit_targetType_targetId_idx" ON "FeedAdminAudit"("targetType", "targetId");
CREATE INDEX "FeedAdminAudit_salonId_branchId_idx" ON "FeedAdminAudit"("salonId", "branchId");
ALTER TABLE "FeedAdminAudit" ADD CONSTRAINT "FeedAdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), item.action, item.description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('subscriptions.view', 'View subscription management'),
  ('subscriptions.manage', 'Manage subscription plans and subscribers')
) AS item(action, description)
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."action" = item.action);

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" IN ('subscriptions.view', 'subscriptions.manage')
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id");

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Subscriptions', 'CreditCard', '/admin/subscriptions', NULL, 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/admin/subscriptions');

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m CROSS JOIN "Permission" p
WHERE m."path" = '/admin/subscriptions' AND p."action" = 'subscriptions.view'
  AND NOT EXISTS (SELECT 1 FROM "MenuPermission" mp WHERE mp."menuId" = m."id" AND mp."permissionId" = p."id");
