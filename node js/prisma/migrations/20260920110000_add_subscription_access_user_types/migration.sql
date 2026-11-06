CREATE TYPE "SubscriptionAccessUserType" AS ENUM ('VENDOR', 'STAFF');

ALTER TABLE "SubscriptionPlanPermission"
  ADD COLUMN "userType" "SubscriptionAccessUserType" NOT NULL DEFAULT 'VENDOR';
ALTER TABLE "SubscriptionPlanMenu"
  ADD COLUMN "userType" "SubscriptionAccessUserType" NOT NULL DEFAULT 'VENDOR';

DROP INDEX "SubscriptionPlanPermission_planId_permissionId_key";
DROP INDEX "SubscriptionPlanMenu_planId_menuId_key";

CREATE UNIQUE INDEX "SubscriptionPlanPermission_planId_permissionId_userType_key"
  ON "SubscriptionPlanPermission"("planId", "permissionId", "userType");
CREATE UNIQUE INDEX "SubscriptionPlanMenu_planId_menuId_userType_key"
  ON "SubscriptionPlanMenu"("planId", "menuId", "userType");

CREATE INDEX "SubscriptionPlanPermission_userType_idx"
  ON "SubscriptionPlanPermission"("userType");
CREATE INDEX "SubscriptionPlanMenu_userType_enabled_idx"
  ON "SubscriptionPlanMenu"("userType", "enabled");
