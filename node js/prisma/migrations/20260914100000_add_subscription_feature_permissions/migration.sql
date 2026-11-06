CREATE TABLE "SubscriptionFeaturePermission" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "SubscriptionFeaturePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionFeaturePermission_featureId_permissionId_key" ON "SubscriptionFeaturePermission"("featureId", "permissionId");
CREATE INDEX "SubscriptionFeaturePermission_permissionId_idx" ON "SubscriptionFeaturePermission"("permissionId");

ALTER TABLE "SubscriptionFeaturePermission" ADD CONSTRAINT "SubscriptionFeaturePermission_featureId_fkey"
    FOREIGN KEY ("featureId") REFERENCES "SubscriptionFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionFeaturePermission" ADD CONSTRAINT "SubscriptionFeaturePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
