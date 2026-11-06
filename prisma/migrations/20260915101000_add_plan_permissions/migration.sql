CREATE TABLE "SubscriptionPlanPermission" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "SubscriptionPlanPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlanPermission_planId_permissionId_key" ON "SubscriptionPlanPermission"("planId", "permissionId");
CREATE INDEX "SubscriptionPlanPermission_permissionId_idx" ON "SubscriptionPlanPermission"("permissionId");

ALTER TABLE "SubscriptionPlanPermission" ADD CONSTRAINT "SubscriptionPlanPermission_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanPermission" ADD CONSTRAINT "SubscriptionPlanPermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

