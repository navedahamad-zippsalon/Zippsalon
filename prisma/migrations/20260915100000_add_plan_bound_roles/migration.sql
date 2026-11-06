ALTER TABLE "Role" ADD COLUMN "subscriptionPlanId" TEXT;
ALTER TABLE "Role" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Role_subscriptionPlanId_idx" ON "Role"("subscriptionPlanId");

ALTER TABLE "Role" ADD CONSTRAINT "Role_subscriptionPlanId_fkey"
  FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;