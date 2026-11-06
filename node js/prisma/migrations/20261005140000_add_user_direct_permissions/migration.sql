ALTER TABLE "Salon" ADD COLUMN "salonType" TEXT;

CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");

ALTER TABLE "UserPermission"
    ADD CONSTRAINT "UserPermission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermission"
    ADD CONSTRAINT "UserPermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'users.view', 'View users in an assigned salon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users.create', 'Create users in an assigned salon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users.update', 'Update users in an assigned salon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users.delete', 'Deactivate users in an assigned salon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'VENDOR'
  AND p."action" IN ('users.view', 'users.create', 'users.update', 'users.delete')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "SubscriptionFeature" ("id", "key", "displayName", "featureText", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'staff_management', 'Staff Management', 'Staff Management', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SubscriptionFeaturePermission" ("id", "featureId", "permissionId")
SELECT gen_random_uuid()::text, f."id", p."id"
FROM "SubscriptionFeature" f
CROSS JOIN "Permission" p
WHERE f."key" = 'staff_management'
  AND p."action" IN ('users.view', 'users.create', 'users.update', 'users.delete')
ON CONFLICT ("featureId", "permissionId") DO NOTHING;
