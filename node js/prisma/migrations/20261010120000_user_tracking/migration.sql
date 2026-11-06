CREATE TYPE "TrackingActorType" AS ENUM ('ADMIN', 'VENDOR', 'STAFF', 'CUSTOMER');
CREATE TYPE "TrackingSessionStatus" AS ENUM ('ACTIVE', 'LOGGED_OUT', 'EXPIRED');
CREATE TYPE "TrackingLocationSource" AS ENUM ('IP_GEOLOCATION', 'GPS_CONSENTED', 'UNKNOWN');

CREATE TABLE "UserTrackingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorType" "TrackingActorType" NOT NULL,
    "vendorId" TEXT,
    "staffId" TEXT,
    "customerId" TEXT,
    "salonId" TEXT,
    "branchId" TEXT,
    "roleId" TEXT,
    "sessionId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "activeDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" "TrackingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "state" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "locationProvider" TEXT,
    "locationSource" "TrackingLocationSource" NOT NULL DEFAULT 'UNKNOWN',
    "deviceType" TEXT,
    "deviceName" TEXT,
    "operatingSystem" TEXT,
    "browser" TEXT,
    "appVersion" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserTrackingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserTrackingActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorType" "TrackingActorType" NOT NULL,
    "vendorId" TEXT,
    "staffId" TEXT,
    "customerId" TEXT,
    "salonId" TEXT,
    "branchId" TEXT,
    "roleId" TEXT,
    "sessionId" TEXT,
    "menuId" TEXT,
    "parentMenuId" TEXT,
    "menuNameSnapshot" TEXT,
    "moduleName" TEXT,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "route" TEXT,
    "screenName" TEXT,
    "method" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTrackingActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserTrackingSession_sessionId_key" ON "UserTrackingSession"("sessionId");
CREATE INDEX "UserTrackingSession_userId_createdAt_idx" ON "UserTrackingSession"("userId", "createdAt");
CREATE INDEX "UserTrackingSession_vendorId_createdAt_idx" ON "UserTrackingSession"("vendorId", "createdAt");
CREATE INDEX "UserTrackingSession_staffId_createdAt_idx" ON "UserTrackingSession"("staffId", "createdAt");
CREATE INDEX "UserTrackingSession_customerId_createdAt_idx" ON "UserTrackingSession"("customerId", "createdAt");
CREATE INDEX "UserTrackingSession_salonId_createdAt_idx" ON "UserTrackingSession"("salonId", "createdAt");
CREATE INDEX "UserTrackingSession_branchId_createdAt_idx" ON "UserTrackingSession"("branchId", "createdAt");
CREATE INDEX "UserTrackingSession_roleId_createdAt_idx" ON "UserTrackingSession"("roleId", "createdAt");
CREATE INDEX "UserTrackingSession_actorType_createdAt_idx" ON "UserTrackingSession"("actorType", "createdAt");
CREATE INDEX "UserTrackingSession_loginAt_idx" ON "UserTrackingSession"("loginAt");
CREATE INDEX "UserTrackingSession_lastActivityAt_status_idx" ON "UserTrackingSession"("lastActivityAt", "status");
CREATE INDEX "UserTrackingSession_ipAddress_idx" ON "UserTrackingSession"("ipAddress");
CREATE INDEX "UserTrackingActivity_userId_createdAt_idx" ON "UserTrackingActivity"("userId", "createdAt");
CREATE INDEX "UserTrackingActivity_vendorId_createdAt_idx" ON "UserTrackingActivity"("vendorId", "createdAt");
CREATE INDEX "UserTrackingActivity_staffId_createdAt_idx" ON "UserTrackingActivity"("staffId", "createdAt");
CREATE INDEX "UserTrackingActivity_customerId_createdAt_idx" ON "UserTrackingActivity"("customerId", "createdAt");
CREATE INDEX "UserTrackingActivity_salonId_createdAt_idx" ON "UserTrackingActivity"("salonId", "createdAt");
CREATE INDEX "UserTrackingActivity_branchId_createdAt_idx" ON "UserTrackingActivity"("branchId", "createdAt");
CREATE INDEX "UserTrackingActivity_roleId_createdAt_idx" ON "UserTrackingActivity"("roleId", "createdAt");
CREATE INDEX "UserTrackingActivity_sessionId_createdAt_idx" ON "UserTrackingActivity"("sessionId", "createdAt");
CREATE INDEX "UserTrackingActivity_menuId_createdAt_idx" ON "UserTrackingActivity"("menuId", "createdAt");
CREATE INDEX "UserTrackingActivity_eventType_createdAt_idx" ON "UserTrackingActivity"("eventType", "createdAt");
CREATE INDEX "UserTrackingActivity_actorType_createdAt_idx" ON "UserTrackingActivity"("actorType", "createdAt");
CREATE INDEX "UserTrackingActivity_createdAt_idx" ON "UserTrackingActivity"("createdAt");
CREATE INDEX "UserTrackingActivity_ipAddress_idx" ON "UserTrackingActivity"("ipAddress");
ALTER TABLE "UserTrackingSession" ADD CONSTRAINT "UserTrackingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTrackingActivity" ADD CONSTRAINT "UserTrackingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), item.action, item.description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('tracking.view', 'Access CRM and customer app tracking'),
  ('tracking.overview', 'View tracking overview'),
  ('tracking.activity', 'View user activity'),
  ('tracking.sessions', 'View login sessions'),
  ('tracking.menu_usage', 'View CRM menu usage'),
  ('tracking.customer_app', 'View customer app usage'),
  ('tracking.vendor', 'View vendor usage'),
  ('tracking.staff', 'View staff usage'),
  ('tracking.customer', 'View customer usage'),
  ('tracking.location', 'View approximate location and device history'),
  ('tracking.analytics', 'View tracking analytics'),
  ('tracking.export', 'Export tracking data')
) AS item(action, description)
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."action" = item.action);

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."action" LIKE 'tracking.%'
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id");

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'CRM Tracking', 'Activity', '/admin/tracking', NULL, 99, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE "path" = '/admin/tracking');

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), m."id", p."id"
FROM "Menu" m CROSS JOIN "Permission" p
WHERE m."path" = '/admin/tracking' AND p."action" = 'tracking.view'
  AND NOT EXISTS (SELECT 1 FROM "MenuPermission" mp WHERE mp."menuId" = m."id" AND mp."permissionId" = p."id");

INSERT INTO "Menu" ("id", "label", "icon", "path", "parentId", "order", "showInSidebar", "createdAt", "updatedAt")
SELECT gen_random_uuid(), item.label, item.icon, item.path, parent."id", item.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Overview', 'LayoutDashboard', '/admin/tracking', 1, 'tracking.overview'),
  ('User Activity', 'List', '/admin/tracking/activity', 2, 'tracking.activity'),
  ('Login Sessions', 'Monitor', '/admin/tracking/sessions', 3, 'tracking.sessions'),
  ('CRM Menu Usage', 'PanelsTopLeft', '/admin/tracking/menu-usage', 4, 'tracking.menu_usage'),
  ('Customer App Usage', 'Smartphone', '/admin/tracking/customer-app', 5, 'tracking.customer_app'),
  ('Vendor Usage', 'Store', '/admin/tracking/vendors', 6, 'tracking.vendor'),
  ('Staff Usage', 'Users', '/admin/tracking/staff', 7, 'tracking.staff'),
  ('Customer Usage', 'UserRound', '/admin/tracking/customers', 8, 'tracking.customer'),
  ('Location & Device', 'MapPin', '/admin/tracking/location-device', 9, 'tracking.location'),
  ('Analytics', 'ChartNoAxesCombined', '/admin/tracking/analytics', 10, 'tracking.analytics')
) AS item(label, icon, path, sort_order, permission_action)
CROSS JOIN "Menu" parent
WHERE parent."path" = '/admin/tracking'
  AND NOT EXISTS (SELECT 1 FROM "Menu" existing WHERE existing."path" = item.path AND existing."parentId" = parent."id");

INSERT INTO "MenuPermission" ("id", "menuId", "permissionId")
SELECT gen_random_uuid(), menu."id", permission."id"
FROM "Menu" menu
JOIN (VALUES
  ('/admin/tracking', 'Overview', 'tracking.overview'),
  ('/admin/tracking/activity', 'User Activity', 'tracking.activity'),
  ('/admin/tracking/sessions', 'Login Sessions', 'tracking.sessions'),
  ('/admin/tracking/menu-usage', 'CRM Menu Usage', 'tracking.menu_usage'),
  ('/admin/tracking/customer-app', 'Customer App Usage', 'tracking.customer_app'),
  ('/admin/tracking/vendors', 'Vendor Usage', 'tracking.vendor'),
  ('/admin/tracking/staff', 'Staff Usage', 'tracking.staff'),
  ('/admin/tracking/customers', 'Customer Usage', 'tracking.customer'),
  ('/admin/tracking/location-device', 'Location & Device', 'tracking.location'),
  ('/admin/tracking/analytics', 'Analytics', 'tracking.analytics')
) AS item(parent_path, child_label, permission_action)
  ON menu."label" = item.child_label
JOIN "Menu" parent ON parent."path" = item.parent_path AND menu."parentId" = parent."id"
JOIN "Permission" permission ON permission."action" = item.permission_action
WHERE NOT EXISTS (SELECT 1 FROM "MenuPermission" mp WHERE mp."menuId" = menu."id" AND mp."permissionId" = permission."id");
