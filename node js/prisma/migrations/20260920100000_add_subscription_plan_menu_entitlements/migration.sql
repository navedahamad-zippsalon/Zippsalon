CREATE TABLE "SubscriptionPlanMenu" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "menuId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlanMenu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlanMenu_planId_menuId_key" ON "SubscriptionPlanMenu"("planId", "menuId");
CREATE INDEX "SubscriptionPlanMenu_menuId_enabled_idx" ON "SubscriptionPlanMenu"("menuId", "enabled");

ALTER TABLE "SubscriptionPlanMenu" ADD CONSTRAINT "SubscriptionPlanMenu_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanMenu" ADD CONSTRAINT "SubscriptionPlanMenu_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve current access for existing plans. New plans have no implicit access
-- and must be configured by an administrator.
INSERT INTO "SubscriptionPlanMenu" ("id", "planId", "menuId", "enabled")
SELECT gen_random_uuid(), sp."id", m."id", true
FROM "SubscriptionPlan" sp
CROSS JOIN "Menu" m
WHERE EXISTS (
  SELECT 1
  FROM "SubscriptionPlanPermission" spp
  JOIN "MenuPermission" mp ON mp."permissionId" = spp."permissionId"
  WHERE spp."planId" = sp."id" AND mp."menuId" = m."id"
)
ON CONFLICT ("planId", "menuId") DO NOTHING;
