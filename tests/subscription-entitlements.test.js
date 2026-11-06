const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { prisma } = require("../dist/infrastructure/database/prisma");
const app = require("../dist/app").default;
const { getEffectivePermissions, getMenus } = require("../dist/modules/rbac/rbac.service");
const { getSubscriptionPermissionActions, subscriptionMenuIds } = require("../dist/modules/subscription/subscription.service");
const { DEFAULT_PLAN_ENABLED_FEATURE_KEYS, SUBSCRIPTION_FEATURE_DEFINITIONS } = require("../dist/modules/subscription/subscription-features");
const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");

let server;
let baseUrl;
let admin;
let vendor;
let basic;
let inventory;
let vendorRole;
let adminRole;

test("Basic feature configuration includes Expenses, standard Reports, and Attendance while Free restrictions remain", () => {
  const permissionsByFeature = new Map(
    SUBSCRIPTION_FEATURE_DEFINITIONS.map(({ key, permissions }) => [key, permissions]),
  );
  const basicFeatures = new Set(DEFAULT_PLAN_ENABLED_FEATURE_KEYS.BASIC);
  const freeFeatures = new Set(DEFAULT_PLAN_ENABLED_FEATURE_KEYS.FREE);
  const advanceFeatures = new Set(DEFAULT_PLAN_ENABLED_FEATURE_KEYS.ADVANCE);
  const enterpriseFeatures = new Set(DEFAULT_PLAN_ENABLED_FEATURE_KEYS.ENTERPRISE);

  assert.equal(basicFeatures.has("service_management"), true);
  assert.equal(basicFeatures.has("expenses_management"), true);
  assert.equal(basicFeatures.has("reports"), true);
  assert.equal(basicFeatures.has("staff_management"), true);
  assert.equal(advanceFeatures.has("expenses_management"), true);
  assert.equal(enterpriseFeatures.has("expenses_management"), true);
  assert.equal(freeFeatures.has("expenses_management"), false);
  assert.equal(freeFeatures.has("reports"), false);

  for (const action of [
    "expenses.view",
    "expenses.list",
    "expenses.create",
    "expenses.update",
    "expenses.delete",
    "expenses.categories.view",
    "expenses.reports.view",
  ]) {
    assert.ok(permissionsByFeature.get("expenses_management").includes(action), `${action} must be gated by the Expenses feature`);
  }
  for (const action of ["reports.view", "reports.export"]) {
    assert.ok(permissionsByFeature.get("reports").includes(action), `${action} must be gated by the Reports feature`);
  }
  for (const action of ["attendance.view", "attendance.create", "attendance.edit", "attendance.delete"]) {
    assert.ok(permissionsByFeature.get("staff_management").includes(action), `${action} must remain gated by Staff Management`);
  }
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret")}`,
      ...(options.headers || {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

async function enablePlanFeature(planId, featureKey) {
  const definition = SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === featureKey);
  assert.ok(definition, `${featureKey} must have a canonical entitlement definition`);
  const feature = await prisma.subscriptionFeature.upsert({
    where: { key: featureKey },
    update: { isActive: true },
    create: { key: featureKey, displayName: featureKey, isActive: true },
  });
  await prisma.subscriptionPlanFeature.upsert({
    where: { planId_featureId: { planId, featureId: feature.id } },
    update: { enabled: true },
    create: { planId, featureId: feature.id, enabled: true },
  });
  for (const action of definition.permissions) {
    const permission = await prisma.permission.upsert({
      where: { action },
      update: {},
      create: { action, description: `Access ${action}` },
    });
    await prisma.subscriptionFeaturePermission.upsert({
      where: { featureId_permissionId: { featureId: feature.id, permissionId: permission.id } },
      update: {},
      create: { featureId: feature.id, permissionId: permission.id },
    });
    await prisma.subscriptionPlanPermission.upsert({
      where: { planId_permissionId_userType: { planId, permissionId: permission.id, userType: "VENDOR" } },
      update: {},
      create: { planId, permissionId: permission.id, userType: "VENDOR" },
    });
  }
}

test.before(async () => {
  admin = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "ADMIN" } } } }, select: { id: true } });
  vendor = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "VENDOR" } } } }, select: { id: true } });
  vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" }, select: { id: true } });
  adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" }, select: { id: true } });
  basic = await prisma.subscriptionPlan.create({ data: { name: "Access Control Test", slug: `ACCESS_TEST_${Date.now()}`, monthlyPrice: 0, annualPrice: 0, currency: "INR", isActive: true } });
  inventory = await prisma.menu.findFirst({ where: { path: "/inventory", parentId: null }, select: { id: true, label: true } });
  assert.ok(admin && vendor && vendorRole && adminRole && basic && inventory, "entitlement test fixtures must exist");
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (basic) {
    await prisma.subscriptionPlan.delete({ where: { id: basic.id } });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test("admin can read and update plan menu entitlements", async () => {
  const listed = await request(`/api/v1/admin/subscription-plans/${basic.id}/menus`);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.plan.id, basic.id);
  assert.ok(listed.body.data.menus.some((menu) => menu.id === inventory.id));

  const updated = await request(`/api/v1/admin/subscription-plans/${basic.id}/menus`, {
    method: "PUT",
    body: JSON.stringify({ menus: [{ menuId: inventory.id, enabled: false }] }),
  });
  assert.equal(updated.status, 200);
  const saved = await prisma.subscriptionPlanMenu.findUnique({ where: { planId_menuId_userType: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } } });
  assert.equal(saved.enabled, false);
});

test("Admin-created Vendors receive their role and subscription and can manage services when entitled", async () => {
  const category = await prisma.serviceCategory.findFirst({ where: { isActive: true }, select: { id: true } });
  const basicPlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "BASIC" },
    include: { features: { include: { feature: true } } },
  });
  assert.ok(category, "An active service category is required");
  assert.ok(basicPlan, "The seeded Basic subscription plan is required");
  assert.ok(basicPlan.features.some(({ enabled, feature }) => enabled && feature.isActive && feature.key === "service_management"),
    "The Basic plan must enable Service Management");

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `admin-created-vendor-${suffix}@example.test`;
  let vendorId;
  let salonId;
  let serviceId;

  try {
    const createdSalon = await request("/api/v1/admin/salons", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Admin Created",
        lastName: "Vendor",
        email,
        phone: `7${String(Date.now()).slice(-9)}`,
        countryCode: "+91",
        password: "vendor-test-password",
        name: `Admin Created Vendor Salon ${suffix}`,
        timings: {},
      }),
    });
    assert.equal(createdSalon.status, 201, JSON.stringify(createdSalon.body));
    salonId = createdSalon.body.data.id;
    vendorId = createdSalon.body.data.ownerId;

    const additionalRoles = await prisma.role.findMany({
      where: { name: { in: ["STAFF", "CUSTOMER"] }, isActive: true },
      select: { id: true, name: true },
    });
    assert.deepEqual(new Set(additionalRoles.map(({ name }) => name)), new Set(["STAFF", "CUSTOMER"]),
      "The mixed-role regression requires the existing STAFF and CUSTOMER roles");
    await prisma.userRole.createMany({
      data: additionalRoles.map(({ id: roleId }) => ({ userId: vendorId, roleId })),
      skipDuplicates: true,
    });

    const persistedVendor = await prisma.user.findUnique({
      where: { id: vendorId },
      include: { roles: { include: { role: true } } },
    });
    assert.ok(persistedVendor, "Admin workflow must persist the Vendor account");
    assert.ok(persistedVendor.roles.some(({ role }) => role.name === "VENDOR"),
      "Admin workflow must assign the canonical VENDOR role");
    assert.ok(persistedVendor.roles.some(({ role }) => role.name === "STAFF"));
    assert.ok(persistedVendor.roles.some(({ role }) => role.name === "CUSTOMER"));

    const defaultSubscription = await prisma.subscription.findFirst({
      where: { vendorId, status: "ACTIVE" },
      include: { plan: true },
    });
    assert.equal(defaultSubscription?.plan.slug, "FREE",
      "Admin salon creation must initialize the Vendor's default subscription");
    await prisma.subscription.update({
      where: { id: defaultSubscription.id },
      data: { planId: basicPlan.id },
    });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");

    const token = jwt.sign({ userId: vendorId, roles: ["VENDOR", "STAFF", "CUSTOMER"] }, process.env.JWT_SECRET || "your-jwt-secret");
    const sendAsVendor = async (path, method = "GET", body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    };

    const accessControl = await sendAsVendor("/api/v1/access-control/me");
    assert.equal(accessControl.status, 200, JSON.stringify(accessControl.body));
    for (const action of ["services.create", "services.edit", "services.delete"]) {
      assert.ok(accessControl.body.data.permissions.includes(action),
        `The frontend permission endpoint must return ${action} for an entitled Vendor`);
      assert.ok((await getEffectivePermissions(vendorId, salonId)).includes(action),
        `Admin-created Vendor must receive ${action} from the enabled Service Management entitlement`);
    }

    const createdService = await sendAsVendor(`/api/v1/services/salon/${salonId}`, "POST", {
      name: `Admin Created Vendor Service ${suffix}`,
      categoryId: category.id,
      basePrice: 125,
      baseDuration: 45,
    });
    assert.equal(createdService.status, 201, JSON.stringify(createdService.body));
    serviceId = createdService.body.data.id;

    const updatedService = await sendAsVendor(`/api/v1/services/${serviceId}`, "PATCH", {
      name: `Admin Created Vendor Service Updated ${suffix}`,
    });
    assert.equal(updatedService.status, 200, JSON.stringify(updatedService.body));
    assert.equal(updatedService.body.data.name, `Admin Created Vendor Service Updated ${suffix}`);
    const persistedUpdate = await prisma.service.findUnique({ where: { id: serviceId }, select: { name: true } });
    assert.equal(persistedUpdate?.name, `Admin Created Vendor Service Updated ${suffix}`);

    const deletedService = await sendAsVendor(`/api/v1/services/${serviceId}`, "DELETE");
    assert.equal(deletedService.status, 200, JSON.stringify(deletedService.body));
    const persistedService = await prisma.service.findUnique({ where: { id: serviceId }, select: { isActive: true } });
    assert.equal(persistedService?.isActive, false, "Service deletion must preserve the existing soft-delete behavior");
  } finally {
    if (serviceId) {
      await prisma.serviceImage.deleteMany({ where: { serviceId } });
      await prisma.service.deleteMany({ where: { id: serviceId } });
    }
    if (vendorId) {
      await prisma.subscription.deleteMany({ where: { vendorId } });
      if (salonId) await prisma.salon.deleteMany({ where: { id: salonId } });
      await prisma.user.deleteMany({ where: { id: vendorId } });
      await cacheInvalidate("rbac:perms:*");
      await cacheInvalidate("menus:*");
    }
  }
});

test("access-control loads an unconfigured plan and role menu tree", async () => {
  const vendorAccess = await request(`/api/v1/admin/access-control?planId=${basic.id}&roleId=${vendorRole.id}`);
  assert.equal(vendorAccess.status, 200);
  assert.equal(vendorAccess.body.success, true);
  assert.equal(vendorAccess.body.data.plan.id, basic.id);
  assert.equal(vendorAccess.body.data.role.id, vendorRole.id);
  assert.ok(Array.isArray(vendorAccess.body.data.menus));

  const adminAccess = await request(`/api/v1/admin/access-control?planId=${basic.id}&roleId=${adminRole.id}`);
  assert.equal(adminAccess.status, 200);
  assert.equal(adminAccess.body.success, true);
  assert.equal(adminAccess.body.data.plan.id, basic.id);
  assert.equal(adminAccess.body.data.role.id, adminRole.id);
  assert.ok(Array.isArray(adminAccess.body.data.menus));

  const inventoryPermissions = await prisma.permission.findMany({
    where: { action: { in: ["inventory.view", "inventory.create"] } },
    select: { id: true, action: true },
  });
  const rolePermissionsBefore = await prisma.rolePermission.findMany({
    where: { roleId: vendorRole.id, permissionId: { in: inventoryPermissions.map(({ id }) => id) } },
    select: { permissionId: true },
  });
  const savedPlanRoleAccess = await request("/api/v1/admin/access-control", {
    method: "PUT",
    body: JSON.stringify({
      planId: basic.id,
      roleId: vendorRole.id,
      userType: "VENDOR",
      permissions: [{
        menuId: inventory.id,
        actions: { view: true, create: false },
      }],
    }),
  });
  assert.equal(savedPlanRoleAccess.status, 200);
  const rolePermissionsAfter = await prisma.rolePermission.findMany({
    where: { roleId: vendorRole.id, permissionId: { in: inventoryPermissions.map(({ id }) => id) } },
    select: { permissionId: true },
  });
  assert.deepEqual(rolePermissionsAfter, rolePermissionsBefore, "plan configuration must not mutate global role permissions");
  const savedPlanPermissions = await prisma.subscriptionPlanRolePermission.findMany({
    where: { planId: basic.id, roleId: vendorRole.id, permissionId: { in: inventoryPermissions.map(({ id }) => id) } },
    include: { permission: { select: { action: true } } },
  });
  assert.equal(savedPlanPermissions.find(({ permission }) => permission.action === "inventory.view")?.enabled, true);
  assert.equal(savedPlanPermissions.find(({ permission }) => permission.action === "inventory.create")?.enabled, false);

  const invalidCombination = await request(`/api/v1/admin/access-control?planId=${basic.id}&roleId=${vendorRole.id}&userType=STAFF`);
  assert.equal(invalidCombination.status, 422);
  assert.equal(invalidCombination.body.code, "INVALID_ROLE_USER_TYPE");
  await prisma.subscriptionPlanRolePermission.deleteMany({
    where: { planId: basic.id, roleId: vendorRole.id },
  });
});

test("role-level Service Management Access Control grants and denies vendor CRUD permissions", async () => {
  const serviceActions = ["services.view", "services.create", "services.edit", "services.delete"];
  const permissions = await prisma.permission.findMany({
    where: { action: { in: serviceActions } },
    select: { id: true, action: true },
  });
  const featureDefinition = SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === "service_management");
  const serviceMenu = await prisma.menu.findFirst({ where: { path: "/services", parentId: null }, select: { id: true, path: true } });
  assert.ok(featureDefinition, "Service Management feature definition must exist");
  assert.equal(permissions.length, serviceActions.length, "Canonical service permissions must exist");
  assert.ok(serviceMenu, "The existing Services menu must be available");
  const permissionIds = permissions.map(({ id }) => id);
  const previousServiceMenuLinks = await prisma.menuPermission.findMany({
    where: { menuId: serviceMenu.id, permissionId: { in: permissionIds } },
    select: { permissionId: true },
  });
  const previousRolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: vendorRole.id, permissionId: { in: permissionIds } },
    select: { permissionId: true },
  });
  const previousFeature = await prisma.subscriptionFeature.findUnique({
    where: { key: "service_management" },
    select: { id: true, isActive: true },
  });
  const previousPlanFeature = previousFeature
    ? await prisma.subscriptionPlanFeature.findUnique({
      where: { planId_featureId: { planId: basic.id, featureId: previousFeature.id } },
    })
    : null;
  const previousPlanPermissions = await prisma.subscriptionPlanPermission.findMany({
    where: { planId: basic.id, userType: "VENDOR", permissionId: { in: permissionIds } },
  });
  const previousScopedRolePermissions = await prisma.subscriptionPlanRolePermission.findMany({
    where: { planId: basic.id, roleId: vendorRole.id },
  });
  const previousServiceMenuRows = await prisma.subscriptionPlanMenu.findMany({
    where: { planId: basic.id, userType: "VENDOR", menuId: serviceMenu.id },
  });

  const feature = await prisma.subscriptionFeature.upsert({
    where: { key: "service_management" },
    update: { isActive: true },
    create: { key: "service_management", displayName: "Service Management", isActive: true },
  });
  const serviceCreatePermission = permissions.find(({ action }) => action === "services.create");
  const serviceDeletePermission = permissions.find(({ action }) => action === "services.delete");
  assert.ok(serviceCreatePermission && serviceDeletePermission);
  const user = await prisma.user.create({
    data: {
      firstName: "Service Entitlement",
      lastName: "Test",
      email: `service-entitlement-${Date.now()}@example.test`,
      phone: `7${String(Date.now()).slice(-9)}`,
      countryCode: "+91",
      password: "unused-test-password",
      roles: { create: { roleId: vendorRole.id } },
      ownedSalons: { create: { name: `Service Entitlement Salon ${Date.now()}`, timings: {} } },
    },
    include: { ownedSalons: true },
  });
  let subscription;
  let service;

  try {
    await prisma.subscriptionPlanFeature.upsert({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      update: { enabled: true },
      create: { planId: basic.id, featureId: feature.id, enabled: true },
    });
    await prisma.subscriptionFeaturePermission.createMany({
      data: permissions.map(({ id: permissionId }) => ({ featureId: feature.id, permissionId })),
      skipDuplicates: true,
    });
    for (const { id: permissionId } of permissions) {
      await prisma.menuPermission.upsert({
        where: { menuId_permissionId: { menuId: serviceMenu.id, permissionId } },
        update: {},
        create: { menuId: serviceMenu.id, permissionId },
      });
    }
    await prisma.subscriptionPlanMenu.upsert({
      where: { planId_menuId_userType: { planId: basic.id, menuId: serviceMenu.id, userType: "VENDOR" } },
      update: { enabled: false },
      create: { planId: basic.id, menuId: serviceMenu.id, userType: "VENDOR", enabled: false },
    });
    await prisma.subscriptionPlanPermission.upsert({
      where: {
        planId_permissionId_userType: {
          planId: basic.id,
          permissionId: serviceCreatePermission.id,
          userType: "VENDOR",
        },
      },
      update: {},
      create: { planId: basic.id, permissionId: serviceCreatePermission.id, userType: "VENDOR" },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: vendorRole.id, permissionId: { in: permissionIds } } });
    await prisma.subscriptionPlanRolePermission.deleteMany({ where: { planId: basic.id, roleId: vendorRole.id } });
    subscription = await prisma.subscription.create({
      data: {
        vendorId: user.id,
        salonId: user.ownedSalons[0].id,
        planId: basic.id,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        isManual: true,
      },
    });
    await cacheInvalidate("rbac:perms:*");
    const category = await prisma.serviceCategory.findFirst({ where: { isActive: true }, select: { id: true } });
    assert.ok(category, "An active service category is required");
    const token = jwt.sign({ userId: user.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret");
    const sendAsVendor = async (path, method = "GET", body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    };
    const basicPlanPermissions = await getEffectivePermissions(user.id);
    for (const action of ["services.create", "services.edit", "services.delete"]) {
      assert.ok(basicPlanPermissions.includes(action),
        `Basic-plan Service Management must grant ${action} independently of role and menu overrides`);
    }
    assert.ok((await subscriptionMenuIds(user.id, "VENDOR")).includes(serviceMenu.id),
      "An enabled Service Management feature must keep its menu available on the Basic plan");
    const basicPlanCreated = await sendAsVendor(`/api/v1/services/salon/${user.ownedSalons[0].id}`, "POST", {
      name: "Basic Plan Service CRUD",
      categoryId: category.id,
      basePrice: 125,
      baseDuration: 45,
    });
    assert.equal(basicPlanCreated.status, 201, JSON.stringify(basicPlanCreated.body));
    service = basicPlanCreated.body.data;
    const basicPlanUpdated = await sendAsVendor(`/api/v1/services/${service.id}`, "PATCH", {
      name: "Basic Plan Service CRUD Updated",
    });
    assert.equal(basicPlanUpdated.status, 200, JSON.stringify(basicPlanUpdated.body));
    const basicPlanDeleted = await sendAsVendor(`/api/v1/services/${service.id}`, "DELETE");
    assert.equal(basicPlanDeleted.status, 200, JSON.stringify(basicPlanDeleted.body));
    await prisma.service.deleteMany({ where: { id: service.id } });
    service = undefined;

    const accessControl = await request("/api/v1/admin/access-control", {
      method: "PUT",
      body: JSON.stringify({
        planId: basic.id,
        roleId: vendorRole.id,
        userType: "VENDOR",
        permissions: [{
          menuId: serviceMenu.id,
          actions: { view: true, create: true, edit: true, delete: false },
        }],
      }),
    });
    assert.equal(accessControl.status, 200, JSON.stringify(accessControl.body));
    const savedServiceMenu = accessControl.body.data.menus.find(({ path }) => path === serviceMenu.path);
    assert.ok(savedServiceMenu, "Access Control must return the Services permission group");
    for (const action of serviceActions) {
      assert.ok(savedServiceMenu.permissions.some(({ action: savedAction }) => savedAction === action),
        `Access Control must expose ${action} under Services`);
    }
    await cacheInvalidate("rbac:perms:*");
    const effective = await getEffectivePermissions(user.id);
    assert.ok(effective.includes("services.view"));
    assert.ok(effective.includes("services.create"));
    assert.ok(effective.includes("services.edit"));
    assert.ok(!effective.includes("services.delete"), "An explicit role-level denial must still block delete");

    await prisma.subscriptionPlanFeature.update({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      data: { enabled: false },
    });
    const featureRestrictedCreate = await sendAsVendor(
      `/api/v1/services/salon/${user.ownedSalons[0].id}`,
      "POST",
      {
        name: "Service Entitlement Restricted",
        categoryId: category.id,
        basePrice: 125,
        baseDuration: 45,
      },
    );
    assert.equal(featureRestrictedCreate.status, 403);
    assert.equal(featureRestrictedCreate.body.code, "FEATURE_NOT_AVAILABLE");
    await prisma.subscriptionPlanFeature.update({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      data: { enabled: true },
    });
    const created = await sendAsVendor(`/api/v1/services/salon/${user.ownedSalons[0].id}`, "POST", {
      name: "Service Entitlement Regression",
      categoryId: category.id,
      basePrice: 125,
      baseDuration: 45,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    service = created.body.data;
    assert.ok(await prisma.service.findUnique({ where: { id: service.id } }), "Created service must be persisted");
    await prisma.subscriptionPlanFeature.update({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      data: { enabled: false },
    });
    const featureRestrictedUpdate = await sendAsVendor(`/api/v1/services/${service.id}`, "PATCH", {
      name: "Restricted Update",
    });
    const featureRestrictedDelete = await sendAsVendor(`/api/v1/services/${service.id}`, "DELETE");
    assert.equal(featureRestrictedUpdate.status, 403);
    assert.equal(featureRestrictedUpdate.body.code, "FEATURE_NOT_AVAILABLE");
    assert.equal(featureRestrictedDelete.status, 403);
    assert.equal(featureRestrictedDelete.body.code, "FEATURE_NOT_AVAILABLE");
    await prisma.subscriptionPlanFeature.update({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      data: { enabled: true },
    });
    const refreshedList = await sendAsVendor("/api/v1/services/salon/all");
    assert.equal(refreshedList.status, 200, JSON.stringify(refreshedList.body));
    assert.ok(refreshedList.body.data.some(({ id }) => id === service.id));
    const updated = await sendAsVendor(`/api/v1/services/${service.id}`, "PATCH", { name: "Service Entitlement Updated" });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.name, "Service Entitlement Updated");
    const deniedDelete = await sendAsVendor(`/api/v1/services/${service.id}`, "DELETE");
    assert.equal(deniedDelete.status, 403);
    assert.equal(deniedDelete.body.action, "DELETE");

    const deleteEnabled = await request("/api/v1/admin/access-control", {
      method: "PUT",
      body: JSON.stringify({
        planId: basic.id,
        roleId: vendorRole.id,
        userType: "VENDOR",
        permissions: [{
          menuId: serviceMenu.id,
          actions: { view: true, create: true, edit: true, delete: true },
        }],
      }),
    });
    assert.equal(deleteEnabled.status, 200, JSON.stringify(deleteEnabled.body));
    await cacheInvalidate("rbac:perms:*");
    const deleted = await sendAsVendor(`/api/v1/services/${service.id}`, "DELETE");
    assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  } finally {
    if (service) await prisma.service.deleteMany({ where: { id: service.id } });
    if (subscription) await prisma.subscription.delete({ where: { id: subscription.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.subscriptionPlanRolePermission.deleteMany({ where: { planId: basic.id, roleId: vendorRole.id } });
    if (previousScopedRolePermissions.length) {
      await prisma.subscriptionPlanRolePermission.createMany({ data: previousScopedRolePermissions });
    }
    await prisma.subscriptionPlanPermission.deleteMany({ where: { planId: basic.id, userType: "VENDOR", permissionId: { in: permissions.map(({ id }) => id) } } });
    if (previousPlanPermissions.length) {
      await prisma.subscriptionPlanPermission.createMany({ data: previousPlanPermissions });
    }
    await prisma.rolePermission.createMany({
      data: previousRolePermissions.map(({ permissionId }) => ({ roleId: vendorRole.id, permissionId })),
      skipDuplicates: true,
    });
    for (const { id: permissionId } of permissions) {
      if (!previousServiceMenuLinks.some((link) => link.permissionId === permissionId)) {
        await prisma.menuPermission.deleteMany({ where: { menuId: serviceMenu.id, permissionId } });
      }
    }
    const previousServiceMenuRow = previousServiceMenuRows[0];
    if (previousServiceMenuRow) {
      await prisma.subscriptionPlanMenu.update({
        where: { planId_menuId_userType: { planId: basic.id, menuId: serviceMenu.id, userType: "VENDOR" } },
        data: { enabled: previousServiceMenuRow.enabled },
      });
    } else {
      await prisma.subscriptionPlanMenu.deleteMany({
        where: { planId: basic.id, menuId: serviceMenu.id, userType: "VENDOR" },
      });
    }
    if (previousPlanFeature) {
      await prisma.subscriptionPlanFeature.update({
        where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
        data: {
          enabled: previousPlanFeature.enabled,
          limits: previousPlanFeature.limits,
          sortOrder: previousPlanFeature.sortOrder,
        },
      });
    } else {
      await prisma.subscriptionPlanFeature.deleteMany({ where: { planId: basic.id, featureId: feature.id } });
    }
    if (previousFeature) {
      await prisma.subscriptionFeature.update({
        where: { id: feature.id },
        data: { isActive: previousFeature.isActive },
      });
    } else {
      await prisma.subscriptionFeature.delete({ where: { id: feature.id } });
    }
    await cacheInvalidate("rbac:perms:*");
  }
});

test("disabled plan menu is excluded from effective menus", async () => {
  const menus = await getMenus(["VENDOR"], ["inventory.view"], false, false, ["inventory.view"], []);
  assert.equal(menus.some((menu) => menu.id === inventory.id), false);
});

test("vendor access requires both enabled plan entitlements and role permissions", async () => {
  const subscription = await prisma.subscription.findFirst({
    where: { vendorId: vendor.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, planId: true, status: true, startsAt: true, expiresAt: true },
  });
  const permission = await prisma.permission.findUnique({ where: { action: "inventory.view" }, select: { id: true } });
  const feature = await prisma.subscriptionFeature.findUnique({ where: { key: "inventory_management" }, select: { id: true } });
  assert.ok(subscription && permission && feature, "vendor subscription inventory permission and feature must exist");

  const previousFeature = await prisma.subscriptionPlanFeature.findUnique({
    where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
  });
  const previousMenu = await prisma.subscriptionPlanMenu.findUnique({
    where: { planId_menuId_userType: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } },
  });
  const rolePermission = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: permission.id } },
  });
  const vendorToken = jwt.sign({ userId: vendor.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret");

  const invalidate = async () => {
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
  };
  try {
    await prisma.subscription.update({ where: { id: subscription.id }, data: { planId: basic.id } });
    await prisma.subscriptionPlanFeature.upsert({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      update: { enabled: false },
      create: { planId: basic.id, featureId: feature.id, enabled: false },
    });
    await prisma.subscriptionPlanMenu.upsert({
      where: { planId_menuId_userType: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } },
      update: { enabled: false },
      create: { planId: basic.id, menuId: inventory.id, userType: "VENDOR", enabled: false },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: vendorRole.id, permissionId: permission.id },
    });
    await invalidate();

    const featureDisabledPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(featureDisabledPermissions.includes("inventory.view"), false);
    const deniedResponse = await fetch(`${baseUrl}/api/v1/inventory/vendor/products`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    assert.equal(deniedResponse.status, 403);

    await prisma.subscriptionPlanFeature.update({
      where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
      data: { enabled: true },
    });
    await invalidate();
    const menuDisabledPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(menuDisabledPermissions.includes("inventory.view"), false);

    await prisma.subscriptionPlanMenu.update({
      where: { planId_menuId_userType: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } },
      data: { enabled: true },
    });
    await invalidate();
    const entitledPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(entitledPermissions.includes("inventory.view"), true);
    const entitledMenuIds = await subscriptionMenuIds(vendor.id, "VENDOR");
    const permittedMenus = await getMenus(
      ["VENDOR"],
      entitledPermissions,
      false,
      false,
      await getSubscriptionPermissionActions(vendor.id, "VENDOR", vendorRole.id),
      entitledMenuIds,
    );
    assert.equal(permittedMenus.some((menu) => menu.id === inventory.id), true);

    const allowedResponse = await fetch(`${baseUrl}/api/v1/inventory/vendor/products`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    assert.equal(allowedResponse.status, 200);

    await prisma.rolePermission.deleteMany({
      where: { roleId: vendorRole.id, permissionId: permission.id },
    });
    await invalidate();
    const roleDeniedPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(roleDeniedPermissions.includes("inventory.view"), false);
    const roleDeniedResponse = await fetch(`${baseUrl}/api/v1/inventory/vendor/products`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    assert.equal(roleDeniedResponse.status, 403);

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: vendorRole.id, permissionId: permission.id },
    });
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } });
    await invalidate();
    const expiredPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(expiredPermissions.includes("inventory.view"), false);
    const expiredResponse = await fetch(`${baseUrl}/api/v1/inventory/vendor/products`, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    assert.equal(expiredResponse.status, 403);
  } finally {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.planId,
        status: subscription.status,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
      },
    });
    if (previousFeature) {
      await prisma.subscriptionPlanFeature.update({
        where: { planId_featureId: { planId: basic.id, featureId: feature.id } },
        data: { enabled: previousFeature.enabled, limits: previousFeature.limits, sortOrder: previousFeature.sortOrder },
      });
    } else {
      await prisma.subscriptionPlanFeature.deleteMany({ where: { planId: basic.id, featureId: feature.id } });
    }
    if (previousMenu) {
      await prisma.subscriptionPlanMenu.update({
        where: { planId_menuId_userType: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } },
        data: { enabled: previousMenu.enabled },
      });
    } else {
      await prisma.subscriptionPlanMenu.deleteMany({ where: { planId: basic.id, menuId: inventory.id, userType: "VENDOR" } });
    }
    if (!rolePermission) {
      await prisma.rolePermission.deleteMany({ where: { roleId: vendorRole.id, permissionId: permission.id } });
    }
    await invalidate();
  }
});

test("Manage Access keeps Vendor and Staff selections independent", async () => {
  const updated = await request(`/api/v1/admin/subscription-plans/${basic.id}/access`, {
    method: "PUT",
    body: JSON.stringify({
      vendor: { menus: [{ menuId: inventory.id, enabled: false }], modules: [], permissions: [] },
      staff: { menus: [{ menuId: inventory.id, enabled: true }], modules: [], permissions: [] },
    }),
  });
  assert.equal(updated.status, 200);
  const access = await request(`/api/v1/admin/subscription-plans/${basic.id}/access`);
  assert.equal(access.status, 200);
  assert.equal(access.body.data.access.vendor.find((menu) => menu.menuId === inventory.id).enabled, false);
  assert.equal(access.body.data.access.staff.find((menu) => menu.menuId === inventory.id).enabled, true);
});

test("Basic module entitlements authorize Expenses, Reports and Attendance only when RBAC grants access", async () => {
  const subscription = await prisma.subscription.findFirst({
    where: { vendorId: vendor.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, planId: true, status: true, startsAt: true, expiresAt: true },
  });
  assert.ok(subscription, "vendor must have a current subscription to exercise plan entitlements");
  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" }, select: { id: true } });
  assert.ok(customerRole, "the CUSTOMER role must exist for mixed-role authorization coverage");
  const existingCustomerRoleLink = await prisma.userRole.findFirst({
    where: { userId: vendor.id, roleId: customerRole.id },
    select: { id: true },
  });
  const testPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Basic Module Entitlement Test",
      slug: `BASIC_MODULE_TEST_${Date.now()}`,
      monthlyPrice: 0,
      annualPrice: 0,
      currency: "INR",
      isActive: true,
    },
  });

  const moduleActions = [
    { featureKey: "expenses_management", actions: ["expenses.view"] },
    { featureKey: "reports", actions: ["reports.view"] },
    { featureKey: "staff_management", actions: ["attendance.view"] },
  ];
  const rolePermissions = [];
  for (const { actions } of moduleActions) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Access ${action}` },
      });
      rolePermissions.push({ permissionId: permission.id, action });
    }
  }
  const previousRolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: vendorRole.id, permissionId: { in: rolePermissions.map(({ permissionId }) => permissionId) } },
    select: { permissionId: true },
  });
  let addedCustomerRoleLink = false;
  const vendorToken = jwt.sign({ userId: vendor.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const vendorHeaders = { Authorization: `Bearer ${vendorToken}` };
  const moduleRequests = [
    "/api/v1/expenses",
    "/api/v1/reports/analytics",
    "/api/v1/staff/attendance",
  ];
  const invalidate = async () => {
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
  };

  try {
    for (const { featureKey, actions } of moduleActions) {
      await enablePlanFeature(testPlan.id, featureKey);
    }
    for (const { permissionId } of rolePermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: vendorRole.id, permissionId } },
        update: {},
        create: { roleId: vendorRole.id, permissionId },
      });
    }
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: testPlan.id, status: "ACTIVE", startsAt: new Date(Date.now() - 60_000), expiresAt: null },
    });
    await invalidate();

    const effectivePermissions = await getEffectivePermissions(vendor.id);
    const planPermissions = await getSubscriptionPermissionActions(vendor.id, "VENDOR");
    for (const { action } of rolePermissions) {
      assert.ok(effectivePermissions.includes(action), `${action} should be present in effective permissions`);
      assert.ok(planPermissions.includes(action), `${action} should be enabled by the test Basic plan`);
    }

    for (const path of moduleRequests) {
      const response = await fetch(`${baseUrl}${path}`, { headers: vendorHeaders });
      const body = await response.json().catch(() => null);
      assert.equal(response.status, 200, `${path} should succeed for a Basic Vendor with the corresponding permission: ${JSON.stringify(body)}`);
    }
    const menuResponse = await fetch(`${baseUrl}/api/v1/rbac/menus`, { headers: vendorHeaders });
    assert.equal(menuResponse.status, 200);
    const visibleMenuPaths = (await menuResponse.json()).data.map(({ path }) => path);
    assert.ok(visibleMenuPaths.includes("/expenses"), "Basic Vendor with Expenses access should receive the Expenses sidebar menu");
    assert.ok(visibleMenuPaths.includes("/reports-analytics"), "Basic Vendor with Reports access should receive the Reports sidebar menu");

    if (!existingCustomerRoleLink) {
      await prisma.userRole.create({ data: { userId: vendor.id, roleId: customerRole.id } });
      addedCustomerRoleLink = true;
    }
    for (const path of [
      "/api/v1/expenses",
      "/api/v1/expenses/overview",
      "/api/v1/expenses/filters",
      "/api/v1/reports/analytics",
      "/api/v1/reports/filters",
    ]) {
      const response = await fetch(`${baseUrl}${path}`, { headers: vendorHeaders });
      const body = await response.json().catch(() => null);
      assert.equal(response.status, 200, `${path} should allow a Basic Vendor who also has a CUSTOMER role: ${JSON.stringify(body)}`);
    }

    const expensesPermission = rolePermissions.find(({ action }) => action === "expenses.view");
    await prisma.subscriptionPlanPermission.delete({
      where: {
        planId_permissionId_userType: {
          planId: testPlan.id,
          permissionId: expensesPermission.permissionId,
          userType: "VENDOR",
        },
      },
    });
    await invalidate();
    assert.equal((await fetch(`${baseUrl}/api/v1/expenses/overview`, { headers: vendorHeaders })).status, 403);
    await prisma.subscriptionPlanPermission.create({
      data: { planId: testPlan.id, permissionId: expensesPermission.permissionId, userType: "VENDOR" },
    });
    await invalidate();

    for (const { featureKey } of moduleActions) {
      const feature = await prisma.subscriptionFeature.findUniqueOrThrow({ where: { key: featureKey }, select: { id: true } });
      await prisma.subscriptionPlanFeature.update({
        where: { planId_featureId: { planId: testPlan.id, featureId: feature.id } },
        data: { enabled: false },
      });
    }
    await invalidate();
    for (const path of moduleRequests) {
      const response = await fetch(`${baseUrl}${path}`, { headers: vendorHeaders });
      assert.equal(response.status, 403, `${path} must remain restricted when the plan disables its feature`);
    }
  } finally {
    if (addedCustomerRoleLink) {
      await prisma.userRole.deleteMany({ where: { userId: vendor.id, roleId: customerRole.id } });
    }
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.planId,
        status: subscription.status,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
      },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: vendorRole.id, permissionId: { in: rolePermissions.map(({ permissionId }) => permissionId) } },
    });
    if (previousRolePermissions.length) {
      await prisma.rolePermission.createMany({
        data: previousRolePermissions.map(({ permissionId }) => ({ roleId: vendorRole.id, permissionId })),
        skipDuplicates: true,
      });
    }
    await prisma.subscriptionPlan.delete({ where: { id: testPlan.id } });
    await invalidate();
  }
});

test("assigned Vendor roles receive Access Control grants and revocations", async () => {
  const subscription = await prisma.subscription.findFirst({
    where: { vendorId: vendor.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, planId: true, status: true, startsAt: true, expiresAt: true },
  });
  const [expenseRoot, expenseList, expenseCreate, expenseCategories] = await Promise.all([
    prisma.menu.findFirst({ where: { path: "/expenses", parentId: null }, select: { id: true } }),
    prisma.menu.findFirst({ where: { path: "/expenses/list" }, select: { id: true, parentId: true } }),
    prisma.menu.findFirst({ where: { path: "/expenses/new" }, select: { id: true } }),
    prisma.menu.findFirst({ where: { path: "/expenses/categories" }, select: { id: true } }),
  ]);
  const originalUserRoles = await prisma.userRole.findMany({ where: { userId: vendor.id }, select: { roleId: true } });
  assert.ok(subscription && expenseRoot && expenseList && expenseCreate && expenseCategories && expenseList.parentId === expenseRoot.id);
  const testPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Expenses Access Control Test",
      slug: `EXPENSES_ACCESS_TEST_${Date.now()}`,
      monthlyPrice: 0,
      annualPrice: 0,
      currency: "INR",
      isActive: true,
    },
  });

  let testRole;
  const token = jwt.sign({ userId: vendor.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const vendorHeaders = { Authorization: `Bearer ${token}` };
  const accessControlEntries = ({ view = false, full = false } = {}) => [
    { menuId: expenseRoot.id, actions: { view } },
    { menuId: expenseRoot.id, submenuId: expenseList.id, actions: { list: false, update: full, delete: full } },
    { menuId: expenseRoot.id, submenuId: expenseCreate.id, actions: { create: full } },
    { menuId: expenseRoot.id, submenuId: expenseCategories.id, actions: { view: full, create: full, update: full, delete: full } },
  ];
  const updateAccess = (enabled) => request("/api/v1/admin/access-control", {
    method: "PUT",
    body: JSON.stringify({
    planId: testPlan.id,
      roleId: testRole.id,
      userType: "VENDOR",
      permissions: accessControlEntries(enabled),
    }),
  });
  const vendorMenus = () => fetch(`${baseUrl}/api/v1/rbac/menus`, { headers: vendorHeaders });
  const expenseListResponse = () => fetch(`${baseUrl}/api/v1/expenses`, { headers: vendorHeaders });
  const vendorRequest = (path, method, body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...vendorHeaders, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  try {
    await enablePlanFeature(testPlan.id, "expenses_management");
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: testPlan.id, status: "ACTIVE", startsAt: new Date(Date.now() - 60_000), expiresAt: null },
    });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    testRole = await prisma.role.create({
      data: { name: `Vendor Expenses RBAC Test ${Date.now()}`, subscriptionPlanId: testPlan.id },
    });

    const assigned = await request(`/api/v1/rbac/vendors/${vendor.id}/role`, {
      method: "PUT",
      body: JSON.stringify({ roleId: testRole.id }),
    });
    assert.equal(assigned.status, 200);
    const assignedRole = await request(`/api/v1/rbac/vendors/${vendor.id}/role`);
    assert.equal(assignedRole.body.data.roleId, testRole.id);
    const unconfiguredPermissions = await getEffectivePermissions(vendor.id);
    assert.equal(unconfiguredPermissions.includes("expenses.view"), false, "an unconfigured custom Vendor role must not inherit Expenses");
    const unconfiguredMenus = await vendorMenus();
    assert.equal(unconfiguredMenus.status, 200);
    assert.equal((await unconfiguredMenus.json()).data.some((menu) => menu.path === "/expenses"), false);

    const deniedSave = await updateAccess({});
    assert.equal(deniedSave.status, 200);
    const deniedPermissions = await request("/api/v1/rbac/permissions/me", { headers: vendorHeaders });
    assert.equal(deniedPermissions.body.data.includes("expenses.view"), false);
    const deniedMenus = await vendorMenus();
    assert.equal(deniedMenus.status, 200);
    assert.equal((await deniedMenus.json()).data.some((menu) => menu.path === "/expenses"), false);
    assert.equal((await expenseListResponse()).status, 403);
    assert.equal((await vendorRequest("/api/v1/expenses", "POST", {})).status, 403);
    assert.equal((await vendorRequest("/api/v1/expenses/not-a-uuid", "PATCH", {})).status, 403);
    assert.equal((await vendorRequest("/api/v1/expenses/not-a-uuid", "DELETE")).status, 403);

    const viewOnlySave = await updateAccess({ view: true });
    assert.equal(viewOnlySave.status, 200);
    assert.equal((await vendorRequest("/api/v1/rbac/permissions/me", "GET")).status, 200);
    assert.equal((await expenseListResponse()).status, 200);
    assert.equal((await vendorRequest("/api/v1/expenses", "POST", {})).status, 403);

    const allowedSave = await updateAccess({ view: true, full: true });
    assert.equal(allowedSave.status, 200);
    const reloadedAccess = await request(`/api/v1/admin/access-control?planId=${testPlan.id}&roleId=${testRole.id}&userType=VENDOR`);
    const hasEnabledPermission = (nodes, action) => nodes.some((node) =>
      node.permissions.some((permission) => permission.action === action && permission.enabled)
      || hasEnabledPermission(node.children, action),
    );
    assert.equal(hasEnabledPermission(reloadedAccess.body.data.menus, "expenses.view"), true);
    const savedPermissions = await prisma.subscriptionPlanRolePermission.findMany({
      where: { planId: testPlan.id, roleId: testRole.id },
      include: { permission: { select: { action: true } } },
    });
    assert.equal(savedPermissions.find(({ permission }) => permission.action === "expenses.view")?.enabled, true);
    for (const action of [
      "expenses.create",
      "expenses.update",
      "expenses.delete",
      "expenses.categories.view",
      "expenses.categories.create",
      "expenses.categories.update",
      "expenses.categories.delete",
    ]) {
      assert.equal(savedPermissions.find(({ permission }) => permission.action === action)?.enabled, true, `${action} should be persisted`);
    }
    assert.equal(savedPermissions.find(({ permission }) => permission.action === "expenses.list")?.enabled, false);
    const allowedPermissions = await request("/api/v1/rbac/permissions/me", { headers: vendorHeaders });
    assert.equal(allowedPermissions.body.data.includes("expenses.view"), true);

    const allowedMenus = await vendorMenus();
    assert.equal(allowedMenus.status, 200);
    assert.equal((await allowedMenus.json()).data.some((menu) => menu.path === "/expenses"), true);
    assert.equal((await expenseListResponse()).status, 200);
    for (const [path, method, body] of [
      ["/api/v1/expenses", "POST", {}],
      ["/api/v1/expenses/not-a-uuid", "PATCH", {}],
      ["/api/v1/expenses/not-a-uuid", "DELETE"],
      ["/api/v1/expenses/categories", "GET"],
      ["/api/v1/expenses/categories", "POST", {}],
      ["/api/v1/expenses/categories/not-a-uuid", "PATCH", {}],
      ["/api/v1/expenses/categories/not-a-uuid", "DELETE"],
    ]) {
      assert.notEqual((await vendorRequest(path, method, body)).status, 403, `${method} ${path} should pass its permission check`);
    }
    const crossVendorExpenses = await fetch(`${baseUrl}/api/v1/expenses?vendorId=${admin.id}`, { headers: vendorHeaders });
    assert.equal(crossVendorExpenses.status, 403);
    const adminMenus = await request("/api/v1/rbac/menus");
    assert.equal(adminMenus.body.data.some((menu) => menu.path === "/expenses"), true);
    assert.equal((await request("/api/v1/expenses")).status, 200);

    const otherVendor = await prisma.user.findFirst({
      where: {
        id: { not: vendor.id },
        roles: { some: { role: { name: "VENDOR" } } },
      },
      select: { id: true },
    });
    assert.ok(otherVendor, "a second Vendor account must exist for isolation coverage");
    const otherVendorToken = jwt.sign(
      { userId: otherVendor.id, roles: ["VENDOR"] },
      process.env.JWT_SECRET || "your-jwt-secret",
    );
    const otherVendorHeaders = { Authorization: `Bearer ${otherVendorToken}` };
    const otherVendorMenus = await fetch(`${baseUrl}/api/v1/rbac/menus`, { headers: otherVendorHeaders });
    assert.equal(otherVendorMenus.status, 200);
    assert.equal((await otherVendorMenus.json()).data.some((menu) => menu.path === "/expenses"), false);
    const otherVendorExpenses = await fetch(`${baseUrl}/api/v1/expenses`, { headers: otherVendorHeaders });
    assert.equal(otherVendorExpenses.status, 403);

    const revokedSave = await updateAccess({});
    assert.equal(revokedSave.status, 200);
    const revokedPermissions = await request("/api/v1/rbac/permissions/me", { headers: vendorHeaders });
    assert.equal(revokedPermissions.body.data.includes("expenses.view"), false);
    const revokedMenus = await vendorMenus();
    assert.equal(revokedMenus.status, 200);
    assert.equal((await revokedMenus.json()).data.some((menu) => menu.path === "/expenses"), false);
    assert.equal((await expenseListResponse()).status, 403);
  } finally {
    if (testRole) {
      await prisma.userRole.deleteMany({ where: { userId: vendor.id, roleId: testRole.id } });
      await prisma.role.delete({ where: { id: testRole.id } });
    }
    if (originalUserRoles.length) {
      await prisma.userRole.createMany({
        data: originalUserRoles.map(({ roleId }) => ({ userId: vendor.id, roleId })),
        skipDuplicates: true,
      });
    }
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.planId,
        status: subscription.status,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
      },
    });
    await prisma.subscriptionPlan.delete({ where: { id: testPlan.id } });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
  }
});

test("admin entitlement route rejects non-admin users", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/subscription-plans/${basic.id}/menus`, {
    headers: { Authorization: `Bearer ${jwt.sign({ userId: vendor.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
  });
  assert.equal(response.status, 403);
});
