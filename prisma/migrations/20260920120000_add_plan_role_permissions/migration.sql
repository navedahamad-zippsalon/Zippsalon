CREATE TABLE "SubscriptionPlanRolePermission" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "roleId" TEXT,
  "staffRoleId" TEXT,
  "permissionId" TEXT NOT NULL,
  "accessKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlanRolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlanRolePermission_accessKey_key" ON "SubscriptionPlanRolePermission"("accessKey");
CREATE INDEX "SubscriptionPlanRolePermission_planId_roleId_idx" ON "SubscriptionPlanRolePermission"("planId", "roleId");
CREATE INDEX "SubscriptionPlanRolePermission_planId_staffRoleId_idx" ON "SubscriptionPlanRolePermission"("planId", "staffRoleId");
CREATE INDEX "SubscriptionPlanRolePermission_permissionId_idx" ON "SubscriptionPlanRolePermission"("permissionId");

ALTER TABLE "SubscriptionPlanRolePermission" ADD CONSTRAINT "SubscriptionPlanRolePermission_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanRolePermission" ADD CONSTRAINT "SubscriptionPlanRolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanRolePermission" ADD CONSTRAINT "SubscriptionPlanRolePermission_staffRoleId_fkey"
  FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanRolePermission" ADD CONSTRAINT "SubscriptionPlanRolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPlanRolePermission"
  ADD CONSTRAINT "SubscriptionPlanRolePermission_one_role_check"
  CHECK (("roleId" IS NOT NULL AND "staffRoleId" IS NULL) OR ("roleId" IS NULL AND "staffRoleId" IS NOT NULL));
