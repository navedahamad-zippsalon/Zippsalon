const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const app = require("../dist/app").default;
const { seedReportsMenuAndPermissions } = require("../dist/modules/rbac/reports-menu.seed");
const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");

const prisma = new PrismaClient();
let server;
let baseUrl;
let adminToken;
let vendorToken;
let adminUser;
let vendorUser;

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test.before(async () => {
  // Ensure seed is in place
  await seedReportsMenuAndPermissions();

  adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    include: { roles: { include: { role: true } } },
  });

  vendorUser = await prisma.user.findFirst({
    where: { email: "glowstudio.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });

  const jwtSecret = process.env.JWT_SECRET || "your-jwt-secret";
  adminToken = jwt.sign(
    { userId: adminUser.id, roles: adminUser.roles.map((r) => r.role.name) },
    jwtSecret
  );
  vendorToken = jwt.sign(
    { userId: vendorUser.id, roles: vendorUser.roles.map((r) => r.role.name) },
    jwtSecret
  );

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  // Ensure permissions are restored in case of any test failure
  await seedReportsMenuAndPermissions();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test("GET /api/v1/rbac/menus - Admin receives Reports & Analytics without child menus", async () => {
  const { status, body } = await request("/api/v1/rbac/menus", adminToken);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));

  const reportsMenu = body.data.find((m) => m.label === "Reports & Analytics");
  assert.ok(reportsMenu, "Reports & Analytics parent menu must be present for Admin");
  assert.equal(reportsMenu.path, "/reports-analytics");
  assert.equal(reportsMenu.order, 14);
  assert.equal(reportsMenu.icon, "BarChart3");

  assert.equal(reportsMenu.children.length, 0, "Reports & Analytics must not have child menus");

});

test("GET /api/v1/rbac/menus - Vendor receives Reports & Analytics without child menus", async () => {
  const { status, body } = await request("/api/v1/rbac/menus", vendorToken);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));

  const reportsMenu = body.data.find((m) => m.label === "Reports & Analytics");
  assert.ok(reportsMenu, "Reports & Analytics parent menu must be present for Vendor");
  assert.equal(reportsMenu.path, "/reports-analytics");
  assert.equal(reportsMenu.children.length, 0, "Vendor must receive no child menus");

});

test("GET /api/v1/rbac/menus scopes vendor finance pages to the authorized Vendor", async () => {
  const [admin, vendor] = await Promise.all([
    request("/api/v1/rbac/menus", adminToken),
    request("/api/v1/rbac/menus", vendorToken),
  ]);
  assert.equal(admin.status, 200);
  assert.equal(vendor.status, 200);

  const adminFinance = admin.body.data.find((menu) => menu.label === "Payment & Wallet");
  assert.ok(adminFinance, "Admin should retain the administrative Payment & Wallet parent");
  const adminPaths = adminFinance.children.map((menu) => menu.path);
  assert.ok(!adminPaths.includes("/vendor/finance/wallet"));
  assert.ok(!adminPaths.includes("/vendor/finance/payout-account"));
  assert.ok(!adminPaths.includes("/vendor/payment-gateway"));
  assert.ok(adminPaths.includes("/payment-wallet/overview"));
  assert.ok(adminPaths.includes("/payment-gateway"));
  assert.ok(adminPaths.includes("/booking/commission/dashboard"));
  assert.ok(adminPaths.includes("/booking/commission/settlements"));

  const vendorFinance = vendor.body.data.find((menu) => menu.label === "Payment & Wallet");
  assert.ok(vendorFinance, "The entitled Vendor should receive the Payment & Wallet parent");
  const vendorPaths = vendorFinance.children.map((menu) => menu.path);
  assert.ok(!vendorPaths.includes("/payment-wallet/overview"));
  assert.ok(!vendorPaths.includes("/payments"));
  assert.ok(!vendorPaths.includes("/payments/transactions"));
  assert.ok(!vendorPaths.includes("/payment-gateway"));
  assert.ok(!vendorPaths.includes("/refunds"));
  assert.ok(!vendorPaths.includes("/customer-wallet"));
  assert.ok(!vendorPaths.includes("/booking/commission/dashboard"));
  assert.ok(!vendorPaths.includes("/booking/commission/settlement-settings"));
  assert.ok(vendorPaths.includes("/vendor/finance/wallet"));
  assert.ok(vendorPaths.includes("/vendor/finance/payout-account"));
  assert.equal((await request("/api/v1/vendor/finance/wallet", vendorToken)).status, 200);
  assert.equal((await request("/api/v1/vendor/finance/payout-account", vendorToken)).status, 200);

  for (const path of ["/api/v1/vendor/finance/wallet", "/api/v1/vendor/finance/payout-account"]) {
    const denied = await request(path, adminToken);
    assert.equal(denied.status, 403, `Admin must not access Vendor endpoint ${path}`);
  }

  const payoutPermission = await prisma.permission.findUnique({
    where: { action: "booking-finance.payout-account.view" },
  });
  assert.ok(payoutPermission);
  const existingOverride = await prisma.userPermission.findUnique({
    where: { userId_permissionId: { userId: vendorUser.id, permissionId: payoutPermission.id } },
  });
  try {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: vendorUser.id, permissionId: payoutPermission.id } },
      create: { userId: vendorUser.id, permissionId: payoutPermission.id, isAllowed: false },
      update: { isAllowed: false },
    });
    await cacheInvalidate("menus:*");
    await cacheInvalidate("rbac:perms:*");

    const restricted = await request("/api/v1/rbac/menus", vendorToken);
    const restrictedFinance = restricted.body.data.find((menu) => menu.label === "Payment & Wallet");
    assert.ok(restrictedFinance);
    assert.ok(restrictedFinance.children.some((menu) => menu.path === "/vendor/finance/wallet"));
    assert.ok(!restrictedFinance.children.some((menu) => menu.path === "/vendor/finance/payout-account"));
    assert.equal((await request("/api/v1/vendor/finance/payout-account", vendorToken)).status, 403);
  } finally {
    if (existingOverride) {
      await prisma.userPermission.update({
        where: { userId_permissionId: { userId: vendorUser.id, permissionId: payoutPermission.id } },
        data: { isAllowed: existingOverride.isAllowed },
      });
    } else {
      await prisma.userPermission.deleteMany({
        where: { userId: vendorUser.id, permissionId: payoutPermission.id },
      });
    }
    await cacheInvalidate("menus:*");
    await cacheInvalidate("rbac:perms:*");
  }

  assert.equal((await request("/api/v1/admin/payment-gateway/razorpay", vendorToken)).status, 403);
  const ownConfiguration = await request("/api/v1/vendor/me/payment-gateway/razorpay", vendorToken);
  assert.equal(ownConfiguration.status, 200);
  assert.equal(ownConfiguration.body.data.keySecret, undefined);
  assert.equal(ownConfiguration.body.data.webhookSecret, undefined);
});

test("Vendor payment gateway access requires its explicit view permission", async () => {
  const gatewayPermission = await prisma.permission.findUnique({
    where: { action: "payment-gateway.view" },
  });
  assert.ok(gatewayPermission);
  const existingOverride = await prisma.userPermission.findUnique({
    where: { userId_permissionId: { userId: vendorUser.id, permissionId: gatewayPermission.id } },
  });
  try {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: vendorUser.id, permissionId: gatewayPermission.id } },
      create: { userId: vendorUser.id, permissionId: gatewayPermission.id, isAllowed: false },
      update: { isAllowed: false },
    });
    await cacheInvalidate("rbac:perms:*");

    const denied = await request("/api/v1/vendor/me/payment-gateway/razorpay", vendorToken);
    assert.equal(denied.status, 403);
  } finally {
    if (existingOverride) {
      await prisma.userPermission.update({
        where: { userId_permissionId: { userId: vendorUser.id, permissionId: gatewayPermission.id } },
        data: { isAllowed: existingOverride.isAllowed },
      });
    } else {
      await prisma.userPermission.deleteMany({
        where: { userId: vendorUser.id, permissionId: gatewayPermission.id },
      });
    }
    await cacheInvalidate("rbac:perms:*");
  }
});

test("GET /api/v1/access-control/permission-tree - Displays reports module and child permissions", async () => {
  const { status, body } = await request("/api/v1/access-control/permission-tree", adminToken);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));

  const reportsNode = body.data.find((n) => n.key === "reports");
  assert.ok(reportsNode, "Permission tree must contain a reports node");
  const actions = reportsNode.permissions.map((p) => p.action);
  assert.ok(actions.includes("reports.view"), "Must contain reports.view");
  assert.ok(actions.includes("reports.revenue"), "Must contain reports.revenue");
  assert.ok(actions.includes("reports.customers"), "Must contain reports.customers");
  assert.ok(actions.includes("reports.services"), "Must contain reports.services");
  assert.ok(actions.includes("reports.staff"), "Must contain reports.staff");
  assert.ok(actions.includes("reports.bookings"), "Must contain reports.bookings");
  assert.ok(actions.includes("reports.reviews"), "Must contain reports.reviews");
  assert.ok(actions.includes("reports.export"), "Must contain reports.export");
});

test("Duplicate Protection - Repeated seed execution does not create duplicate menus", async () => {
  await seedReportsMenuAndPermissions();
  await seedReportsMenuAndPermissions();

  const parents = await prisma.menu.findMany({
    where: { label: "Reports & Analytics", parentId: null },
  });
  assert.equal(parents.length, 1, "There must only be 1 parent Reports & Analytics menu");

  const children = await prisma.menu.findMany({
    where: { parentId: parents[0].id },
  });
  assert.equal(children.length, 0, "There must be no submenus under Reports & Analytics");
});

test("Permission Revocation & Restoration - Vendor menu follows Access Control", async () => {
  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  assert.ok(vendorRole);

  const subscription = await prisma.subscription.findFirst({
    where: { vendorId: vendorUser.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    select: { planId: true },
  });
  const reportsPerms = await prisma.permission.findMany({
    where: { action: { startsWith: "reports." } },
    select: { id: true },
  });
  const assignedRoles = await prisma.userRole.findMany({
    where: { userId: vendorUser.id },
    select: { roleId: true },
  });
  const roleIds = assignedRoles.map(({ roleId }) => roleId);
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds }, permissionId: { in: reportsPerms.map(({ id }) => id) } },
  });
  const userPermissions = await prisma.userPermission.findMany({
    where: { userId: vendorUser.id, permissionId: { in: reportsPerms.map(({ id }) => id) } },
  });
  const scopedPermissions = subscription
    ? await prisma.subscriptionPlanRolePermission.findMany({
      where: { planId: subscription.planId, roleId: { in: roleIds }, permissionId: { in: reportsPerms.map(({ id }) => id) } },
    })
    : [];

  try {
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roleIds }, permissionId: { in: reportsPerms.map(({ id }) => id) } },
    });
    await prisma.userPermission.deleteMany({
      where: { userId: vendorUser.id, permissionId: { in: reportsPerms.map(({ id }) => id) } },
    });
    if (subscription) {
      await prisma.subscriptionPlanRolePermission.deleteMany({
        where: { planId: subscription.planId, roleId: { in: roleIds }, permissionId: { in: reportsPerms.map(({ id }) => id) } },
      });
    }
    await cacheInvalidate("menus:*");
    await cacheInvalidate("rbac:perms:*");

    // A Vendor's Access Control grants can override global role permissions.
    // Revoke each source to verify that the menu follows effective RBAC.
    const resRevoked = await request("/api/v1/rbac/menus", vendorToken);
    assert.equal(resRevoked.status, 200);
    const hiddenMenu = resRevoked.body.data.find((m) => m.label === "Reports & Analytics");
    assert.equal(hiddenMenu, undefined, "Reports & Analytics must be hidden when all report grants are revoked");
  } finally {
    await seedReportsMenuAndPermissions();
    if (userPermissions.length) {
      await prisma.userPermission.createMany({
        data: userPermissions.map(({ userId, permissionId, isAllowed }) => ({ userId, permissionId, isAllowed })),
        skipDuplicates: true,
      });
    }
    if (scopedPermissions.length) {
      await prisma.subscriptionPlanRolePermission.createMany({
        data: scopedPermissions.map(({ planId, roleId, permissionId, enabled, accessKey }) => ({
          planId, roleId, permissionId, enabled, accessKey,
        })),
        skipDuplicates: true,
      });
    }
    await cacheInvalidate("menus:*");
    await cacheInvalidate("rbac:perms:*");
  }

  const resRestored = await request("/api/v1/rbac/menus", vendorToken);
  assert.equal(resRestored.status, 200);
  const restoredMenu = resRestored.body.data.find((m) => m.label === "Reports & Analytics");
  assert.ok(restoredMenu, "Reports & Analytics must be visible again after restoring permissions");
  assert.equal(restoredMenu.children.length, 0);
});
