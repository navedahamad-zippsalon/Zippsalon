const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { getEffectivePermissions } = require("../dist/modules/rbac/rbac.service");
const app = require("../dist/app").default;

const prisma = new PrismaClient();
let server;
let baseUrl;
const serviceActions = ["services.view", "services.create", "services.edit", "services.delete"];

async function setUserPermission(userId, action, isAllowed) {
  const permission = await prisma.permission.findUnique({ where: { action }, select: { id: true } });
  assert.ok(permission, `Permission ${action} must be seeded`);
  await prisma.userPermission.upsert({
    where: { userId_permissionId: { userId, permissionId: permission.id } },
    update: { isAllowed },
    create: { userId, permissionId: permission.id, isAllowed },
  });
  const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");
  await cacheInvalidate("rbac:perms:*");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function requestAs(path, userId, roles, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ userId, roles }, process.env.JWT_SECRET || "your-jwt-secret")}`, ...(options.headers || {}) },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test("STAFF cannot create, update, or mutate combos", async (t) => {
  const staff = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "STAFF" } } } },
    select: { id: true },
  });
  if (!staff) return t.skip("No Staff account exists in the current database");
  const staffToken = jwt.sign({ userId: staff.id, roles: ["STAFF"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const salonId = "00000000-0000-4000-8000-000000000001";
  const serviceId = "00000000-0000-4000-8000-000000000002";
  const body = JSON.stringify({ name: "Staff attempt", categoryId: salonId, basePrice: 10, baseDuration: 30 });
  const options = { headers: { Authorization: `Bearer ${staffToken}` } };
  assert.equal((await request(`/api/v1/services/salon/${salonId}`, { ...options, method: "POST", body })).status, 403);
  assert.equal((await request(`/api/v1/services/${serviceId}`, { ...options, method: "PATCH", body: JSON.stringify({ name: "Staff attempt" }) })).status, 403);
  assert.equal((await request(`/api/v1/services/salon/${salonId}/combos`, { ...options, method: "POST", body: JSON.stringify({ name: "Staff combo", price: 10, duration: 30, serviceIds: [] }) })).status, 403);
  assert.equal((await request(`/api/v1/services/combos/${serviceId}`, { ...options, method: "PATCH", body: JSON.stringify({ name: "Staff combo" }) })).status, 403);
});

test("STAFF reads only an assigned salon's services when suitable existing data exists", async (t) => {
  const membership = await prisma.salonStaff.findFirst({ where: { isActive: true }, select: { userId: true, salonId: true } });
  if (!membership) return t.skip("No active staff membership exists in the current database");
  const permissions = await getEffectivePermissions(membership.userId, membership.salonId);
  if (!permissions.includes("services.view")) return t.skip("The staff member lacks the service-view permission");
  const staffToken = jwt.sign({ userId: membership.userId, roles: ["STAFF"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const response = await fetch(`${baseUrl}/api/v1/services/salon/${membership.salonId}`, { headers: { Authorization: `Bearer ${staffToken}` } });
  assert.equal(response.status, 200);
});

test("STAFF cannot read a salon without an active membership", async (t) => {
  const membership = await prisma.salonStaff.findFirst({ where: { isActive: true }, select: { userId: true, salonId: true } });
  const otherSalon = await prisma.salon.findFirst({ where: membership ? { id: { not: membership.salonId } } : {}, select: { id: true } });
  if (!membership || !otherSalon) return t.skip("No cross-salon records exist in the current database");
  const staffToken = jwt.sign({ userId: membership.userId, roles: ["STAFF"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const response = await fetch(`${baseUrl}/api/v1/services/salon/${otherSalon.id}`, { headers: { Authorization: `Bearer ${staffToken}` } });
  assert.equal(response.status, 403);
});

test("Vendors can update and soft-delete only their own services", async () => {
  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: "BASIC" } });
  let aiImagePermission;
  let aiFeature;
  const category = await prisma.serviceCategory.findFirst({ where: { isActive: true } });
  assert.ok(vendorRole && plan && category, "Seeded vendor role, service plan, and category are required");

  const users = [];
  const salons = [];
  const services = [];
  const branches = [];
  const uploadedImageUrls = [];
  const combos = [];
  const aiAuditIds = [];
  let aiPlanFeature;
  let aiPlanPermission;
  let aiRolePermission;
  let vendorCombo;
  const bookingServiceIds = [];
  const createVendor = async (label) => {
    const user = await prisma.user.create({
      data: {
        firstName: label,
        lastName: "Service Test",
        email: `${label.toLowerCase()}-${Date.now()}@example.test`,
        phone: `8${String(Date.now()).slice(-9)}`,
        countryCode: "+91",
        password: "unused-test-password",
        roles: { create: { roleId: vendorRole.id } },
        ownedSalons: { create: { name: `${label} Salon`, timings: {} } },
      },
      include: { ownedSalons: true },
    });
    users.push(user.id);
    await prisma.subscription.create({ data: { vendorId: user.id, salonId: user.ownedSalons[0].id, planId: plan.id, billingCycle: "MONTHLY", status: "ACTIVE", isManual: true } });
    salons.push(user.ownedSalons[0].id);
    return user;
  };

  try {
    const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");

    const vendorA = await createVendor("ServiceVendorA");
    const vendorB = await createVendor("ServiceVendorB");
    const vendorPermissions = await getEffectivePermissions(vendorA.id, vendorA.ownedSalons[0].id);
    for (const action of serviceActions) {
      assert.ok(vendorPermissions.includes(action), `Explicitly authorized Basic-plan Vendor should have ${action}`);
    }
    const branchA = await prisma.salon.create({
      data: { name: "Service Vendor A Branch", ownerId: vendorA.id, parentId: vendorA.ownedSalons[0].id, timings: {} },
    });
    branches.push(branchA.id);
    const branchB = await prisma.salon.create({
      data: { name: "Service Vendor B Branch", ownerId: vendorB.id, parentId: vendorB.ownedSalons[0].id, timings: {} },
    });
    branches.push(branchB.id);
    const branchWithSeparateOwner = await prisma.salon.create({
      data: { name: "Service Vendor A Managed Branch", ownerId: vendorB.id, parentId: vendorA.ownedSalons[0].id, timings: {} },
    });
    branches.push(branchWithSeparateOwner.id);
    const [serviceA, serviceB] = await Promise.all([
      prisma.service.create({ data: { salonId: vendorA.ownedSalons[0].id, name: "Service A", categoryId: category.id, basePrice: 100, baseDuration: 30, createdById: vendorA.id } }),
      prisma.service.create({ data: { salonId: vendorB.ownedSalons[0].id, name: "Service B", categoryId: category.id, basePrice: 200, baseDuration: 45, createdById: vendorB.id } }),
    ]);
    services.push(serviceA.id, serviceB.id);
    const imageBuffer = await require("sharp")({ create: { width: 2, height: 2, channels: 3, background: "#c07030" } }).png().toBuffer();
    const createPayload = (overrides = {}) => JSON.stringify({
      name: "Created Scoped Service",
      categoryId: category.id,
      basePrice: 150,
      baseDuration: 45,
      ...overrides,
    });
    await setUserPermission(vendorA.id, "services.create", false);
    const deniedCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload() },
    );
    assert.equal(deniedCreate.status, 403);
    assert.equal(deniedCreate.body.code, "PERMISSION_DENIED");
    assert.equal(deniedCreate.body.action, "CREATE");
    assert.equal(deniedCreate.body.message, "You do not have permission to perform this action.");
    await setUserPermission(vendorA.id, "services.create", true);
    const invalidVendorCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ name: "x" }) },
    );
    assert.equal(invalidVendorCreate.status, 400);
    assert.ok(invalidVendorCreate.body.errors.some(({ field }) => field === "name"));
    const vendorCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ vendorId: vendorA.id }) },
    );
    assert.equal(vendorCreate.status, 201, JSON.stringify(vendorCreate.body));
    services.push(vendorCreate.body.data.id);
    assert.equal(vendorCreate.body.data.salonId, vendorA.ownedSalons[0].id);
    const refreshedServices = await requestAs("/api/v1/services/salon/all", vendorA.id, ["VENDOR"]);
    assert.equal(refreshedServices.status, 200, JSON.stringify(refreshedServices.body));
    assert.ok(refreshedServices.body.data.some(({ id }) => id === vendorCreate.body.data.id));

    const vendorBranchCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ branchId: branchA.id, vendorId: vendorA.id }) },
    );
    assert.equal(vendorBranchCreate.status, 201, JSON.stringify(vendorBranchCreate.body));
    services.push(vendorBranchCreate.body.data.id);
    assert.equal(vendorBranchCreate.body.data.salonId, branchA.id);
    const separatelyOwnedBranchService = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ branchId: branchWithSeparateOwner.id }) },
    );
    assert.equal(separatelyOwnedBranchService.status, 201, JSON.stringify(separatelyOwnedBranchService.body));
    services.push(separatelyOwnedBranchService.body.data.id);
    assert.equal(separatelyOwnedBranchService.body.data.salonId, branchWithSeparateOwner.id);
    const vendorSalonLookups = await requestAs(
      `/api/v1/services/lookups/salons?search=ServiceVendorA`,
      vendorA.id,
      ["VENDOR"],
    );
    assert.equal(vendorSalonLookups.status, 200);
    assert.deepEqual(vendorSalonLookups.body.data.map(({ id }) => id), [vendorA.ownedSalons[0].id]);
    const vendorBranchLookups = await requestAs(
      `/api/v1/services/lookups/branches?salonId=${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
    );
    assert.equal(vendorBranchLookups.status, 200);
    assert.deepEqual(new Set(vendorBranchLookups.body.data.map(({ id }) => id)), new Set([branchA.id, branchWithSeparateOwner.id]));

    const foreignSalonCreate = await requestAs(
      `/api/v1/services/salon/${vendorB.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ vendorId: vendorB.id }) },
    );
    assert.equal(foreignSalonCreate.status, 403);
    const foreignBranchCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ branchId: branchB.id }) },
    );
    assert.equal(foreignBranchCreate.status, 403);
    assert.equal(foreignBranchCreate.body.code, "BRANCH_ACCESS_DENIED");
    const mismatchedVendorCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
      { method: "POST", body: createPayload({ vendorId: vendorB.id }) },
    );
    assert.equal(mismatchedVendorCreate.status, 403);

    const admin = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: "ADMIN" } } } },
      select: { id: true },
    });
    assert.ok(admin, "An Admin fixture is required for service creation integration tests");
    const adminVendorLookups = await requestAs("/api/v1/services/lookups/vendors?search=ServiceVendorA", admin.id, ["ADMIN"]);
    assert.equal(adminVendorLookups.status, 200);
    assert.deepEqual(adminVendorLookups.body.data.map(({ id }) => id), [vendorA.id]);
    const adminSalonLookups = await requestAs(`/api/v1/services/lookups/salons?vendorId=${vendorA.id}`, admin.id, ["ADMIN"]);
    assert.equal(adminSalonLookups.status, 200);
    assert.deepEqual(adminSalonLookups.body.data.map(({ id }) => id), [vendorA.ownedSalons[0].id]);
    const adminBranchLookups = await requestAs(`/api/v1/services/lookups/branches?salonId=${vendorA.ownedSalons[0].id}&vendorId=${vendorA.id}`, admin.id, ["ADMIN"]);
    assert.equal(adminBranchLookups.status, 200);
    assert.deepEqual(new Set(adminBranchLookups.body.data.map(({ id }) => id)), new Set([branchA.id, branchWithSeparateOwner.id]));
    const invalidAdminService = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: vendorB.id, branchId: branchA.id }) },
    );
    assert.equal(invalidAdminService.status, 400);
    const adminScopedService = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: vendorA.id, branchId: branchA.id }) },
    );
    assert.equal(adminScopedService.status, 201, JSON.stringify(adminScopedService.body));
    services.push(adminScopedService.body.data.id);
    assert.equal(adminScopedService.body.data.salonId, branchA.id);
    const adminServiceMove = await requestAs(`/api/v1/services/${adminScopedService.body.data.id}`, admin.id, ["ADMIN"], {
      method: "PATCH",
      body: JSON.stringify({ vendorId: vendorB.id, salonId: vendorB.ownedSalons[0].id, branchId: branchB.id }),
    });
    assert.equal(adminServiceMove.status, 200, JSON.stringify(adminServiceMove.body));
    assert.equal(adminServiceMove.body.data.salonId, branchB.id);
    const vendorServiceMove = await requestAs(`/api/v1/services/${adminScopedService.body.data.id}`, vendorA.id, ["VENDOR"], {
      method: "PATCH",
      body: JSON.stringify({ vendorId: vendorB.id, salonId: vendorB.ownedSalons[0].id, branchId: branchB.id }),
    });
    assert.equal(vendorServiceMove.status, 403);
    const adminComboCreate = await requestAs(`/api/v1/services/salon/${vendorA.ownedSalons[0].id}/combos`, admin.id, ["ADMIN"], {
      method: "POST",
      body: JSON.stringify({ name: "Admin Scoped Combo", price: 400, duration: 80, serviceIds: [], vendorId: vendorA.id, branchId: branchA.id }),
    });
    assert.equal(adminComboCreate.status, 201, JSON.stringify(adminComboCreate.body));
    combos.push(adminComboCreate.body.data.id);
    assert.equal(adminComboCreate.body.data.salonId, branchA.id);
    const adminComboMove = await requestAs(`/api/v1/services/combos/${adminComboCreate.body.data.id}`, admin.id, ["ADMIN"], {
      method: "PATCH",
      body: JSON.stringify({ vendorId: vendorB.id, salonId: vendorB.ownedSalons[0].id, branchId: branchB.id }),
    });
    assert.equal(adminComboMove.status, 200, JSON.stringify(adminComboMove.body));
    assert.equal(adminComboMove.body.data.salonId, branchB.id);
    const vendorForeignCombo = await requestAs(`/api/v1/services/salon/${vendorB.ownedSalons[0].id}/combos`, vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ name: "Vendor Foreign Combo", price: 400, duration: 80, serviceIds: [] }),
    });
    assert.equal(vendorForeignCombo.status, 403);
    const invalidAdminCombo = await requestAs(`/api/v1/services/salon/${vendorA.ownedSalons[0].id}/combos`, admin.id, ["ADMIN"], {
      method: "POST",
      body: JSON.stringify({ name: "Invalid Admin Combo", price: 400, duration: 80, serviceIds: [], vendorId: vendorB.id, branchId: branchA.id }),
    });
    assert.equal(invalidAdminCombo.status, 400);
    const aiAccessUrl = `/api/v1/admin/users/${vendorA.id}/ai-image-access`;
    const initialAiAccess = await requestAs(aiAccessUrl, admin.id, ["ADMIN"]);
    assert.equal(initialAiAccess.status, 200);
    assert.equal(initialAiAccess.body.data.enabled, false);
    const forbiddenAccessUpdate = await requestAs(aiAccessUrl, vendorA.id, ["VENDOR"], {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(forbiddenAccessUpdate.status, 403);
    const deniedAiGeneration = await requestAs("/api/v1/generate/image", vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ prompt: "Hair spa room", serviceId: serviceA.id }),
    });
    assert.equal(deniedAiGeneration.status, 403);
    assert.equal(deniedAiGeneration.body.code, "AI_IMAGE_ACCESS_DENIED");
    const vendorCapabilitiesWithoutAi = await requestAs("/api/v1/subscriptions/my-access?userType=VENDOR", vendorA.id, ["VENDOR"]);
    assert.equal(vendorCapabilitiesWithoutAi.status, 200);
    assert.equal(vendorCapabilitiesWithoutAi.body.data.capabilities.canUploadManualImage, true);
    assert.equal(vendorCapabilitiesWithoutAi.body.data.capabilities.canGenerateAIImage, false);
    const adminAiWithoutVendorAssignment = await requestAs("/api/v1/generate/image", admin.id, ["ADMIN"], {
      method: "POST",
      body: JSON.stringify({ prompt: "x" }),
    });
    assert.equal(adminAiWithoutVendorAssignment.status, 400);
    vendorCombo = await requestAs(`/api/v1/services/salon/${vendorA.ownedSalons[0].id}/combos`, vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ name: "Vendor Combo", price: 250, duration: 60, serviceIds: [], vendorId: vendorA.id, branchId: branchA.id }),
    });
    assert.equal(vendorCombo.status, 201, JSON.stringify(vendorCombo.body));
    combos.push(vendorCombo.body.data.id);
    assert.equal(vendorCombo.body.data.salonId, branchA.id);
    const vendorComboForeignMove = await requestAs(`/api/v1/services/combos/${vendorCombo.body.data.id}`, vendorA.id, ["VENDOR"], {
      method: "PATCH",
      body: JSON.stringify({ vendorId: vendorB.id, salonId: vendorB.ownedSalons[0].id, branchId: branchB.id }),
    });
    assert.equal(vendorComboForeignMove.status, 403);
    const vendorComboForeignBranch = await requestAs(`/api/v1/services/salon/${vendorA.ownedSalons[0].id}/combos`, vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ name: "Vendor Foreign Branch Combo", price: 250, duration: 60, serviceIds: [], branchId: branchB.id }),
    });
    assert.equal(vendorComboForeignBranch.status, 403);
    const enabledAiAccess = await requestAs(aiAccessUrl, admin.id, ["ADMIN"], {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(enabledAiAccess.status, 200);
    assert.equal(enabledAiAccess.body.data.enabled, true);
    aiImagePermission = await prisma.permission.findUnique({ where: { action: "services.ai-image.generate" } });
    aiFeature = await prisma.subscriptionFeature.findUnique({ where: { key: "service_ai_images" } });
    assert.ok(aiImagePermission && aiFeature, "Admin AI access assignment initializes the existing permission and feature records");
    aiPlanFeature = await prisma.subscriptionPlanFeature.findUnique({
      where: { planId_featureId: { planId: plan.id, featureId: aiFeature.id } },
    });
    const aiPlanPermissionWhere = {
      planId_permissionId_userType: {
        planId: plan.id,
        permissionId: aiImagePermission.id,
        userType: "VENDOR",
      },
    };
    aiPlanPermission = await prisma.subscriptionPlanPermission.findUnique({ where: aiPlanPermissionWhere });
    aiRolePermission = await prisma.subscriptionPlanRolePermission.findFirst({
      where: { planId: plan.id, roleId: vendorRole.id, permissionId: aiImagePermission.id },
    });
    await prisma.subscriptionPlanFeature.upsert({
      where: { planId_featureId: { planId: plan.id, featureId: aiFeature.id } },
      update: { enabled: true },
      create: { planId: plan.id, featureId: aiFeature.id, enabled: true },
    });
    await prisma.subscriptionPlanPermission.upsert({
      where: aiPlanPermissionWhere,
      update: {},
      create: { planId: plan.id, permissionId: aiImagePermission.id, userType: "VENDOR" },
    });
    if (await prisma.subscriptionPlanRolePermission.count({ where: { planId: plan.id, roleId: vendorRole.id } })) {
      const roleAccessKey = `${plan.id}:${vendorRole.id}:${aiImagePermission.id}`;
      await prisma.subscriptionPlanRolePermission.upsert({
        where: { accessKey: roleAccessKey },
        update: { enabled: true },
        create: { planId: plan.id, roleId: vendorRole.id, permissionId: aiImagePermission.id, accessKey: roleAccessKey, enabled: true },
      });
    }
    const vendorCapabilities = await requestAs("/api/v1/subscriptions/my-access?userType=VENDOR", vendorA.id, ["VENDOR"]);
    assert.equal(vendorCapabilities.status, 200);
    assert.equal(vendorCapabilities.body.data.capabilities.canUploadManualImage, true);
    assert.equal(vendorCapabilities.body.data.capabilities.canGenerateAIImage, true);
    if (!process.env.STABILITY_API_KEY?.trim()) {
      const unconfiguredProvider = await requestAs("/api/v1/generate/image", vendorA.id, ["VENDOR"], {
        method: "POST",
        body: JSON.stringify({ prompt: "Hair spa room", serviceId: serviceA.id }),
      });
      assert.equal(unconfiguredProvider.status, 503);
      assert.equal(unconfiguredProvider.body.code, "AI_PROVIDER_NOT_CONFIGURED");
    }
    const foreignServiceAi = await requestAs("/api/v1/generate/image", vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ prompt: "Hair spa room", serviceId: serviceB.id }),
    });
    assert.equal(foreignServiceAi.status, 403);
    assert.equal(foreignServiceAi.body.code, "AI_IMAGE_TARGET_ACCESS_DENIED");
    const foreignCombo = await requestAs(`/api/v1/services/salon/${vendorB.ownedSalons[0].id}/combos`, vendorB.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ name: "Foreign Vendor Combo", price: 300, duration: 70, serviceIds: [] }),
    });
    assert.equal(foreignCombo.status, 201, JSON.stringify(foreignCombo.body));
    combos.push(foreignCombo.body.data.id);
    const foreignComboAi = await requestAs("/api/v1/generate/image", vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ prompt: "Hair spa package", comboId: foreignCombo.body.data.id }),
    });
    assert.equal(foreignComboAi.status, 403);
    assert.equal(foreignComboAi.body.code, "AI_IMAGE_TARGET_ACCESS_DENIED");
    const comboImageForm = new FormData();
    comboImageForm.set("image", new Blob([imageBuffer], { type: "image/png" }), "combo.png");
    const comboImageResponse = await fetch(`${baseUrl}/api/v1/services/combos/${vendorCombo.body.data.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: vendorA.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: comboImageForm,
    });
    const updatedVendorCombo = await comboImageResponse.json();
    assert.equal(comboImageResponse.status, 200, JSON.stringify(updatedVendorCombo));
    assert.match(updatedVendorCombo.data.imageUrl, /^\/public\/uploads\/services\/.+\.webp$/);
    uploadedImageUrls.push(updatedVendorCombo.data.imageUrl);
    const adminComboForm = new FormData();
    adminComboForm.set("name", "Admin Manual Image Combo");
    adminComboForm.set("price", "375");
    adminComboForm.set("duration", "75");
    adminComboForm.set("serviceIds", "[]");
    adminComboForm.set("image", new Blob([imageBuffer], { type: "image/png" }), "admin-combo.png");
    const adminComboResponse = await fetch(`${baseUrl}/api/v1/services/salon/${branchA.id}/combos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: adminComboForm,
    });
    const adminCombo = await adminComboResponse.json();
    assert.equal(adminComboResponse.status, 201, JSON.stringify(adminCombo));
    combos.push(adminCombo.data.id);
    uploadedImageUrls.push(adminCombo.data.imageUrl);
    await prisma.combo.update({
      where: { id: vendorCombo.body.data.id },
      data: { imageUrl: "/public/uploads/ai-generated/existing-combo-image.png" },
    });
    const existingAiServiceImage = await prisma.serviceImage.create({
      data: { serviceId: serviceA.id, url: "/public/uploads/ai-generated/existing-service-image.png" },
    });
    const adminBranchCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: vendorA.id, branchId: branchA.id }) },
    );
    assert.equal(adminBranchCreate.status, 201, JSON.stringify(adminBranchCreate.body));
    services.push(adminBranchCreate.body.data.id);
    assert.equal(adminBranchCreate.body.data.salonId, branchA.id);
    const adminSalonCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: vendorA.id }) },
    );
    assert.equal(adminSalonCreate.status, 201, JSON.stringify(adminSalonCreate.body));
    services.push(adminSalonCreate.body.data.id);
    assert.equal(adminSalonCreate.body.data.salonId, vendorA.ownedSalons[0].id);
    const largeImageBuffer = await require("sharp")(crypto.randomBytes(256 * 256 * 3), {
      raw: { width: 256, height: 256, channels: 3 },
    }).png().toBuffer();
    assert.ok(largeImageBuffer.length > 100 * 1024, "Fixture image must exceed the default JSON request limit");
    const largeImageCreate = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      {
        method: "POST",
        body: createPayload({
          vendorId: vendorA.id,
          images: [`data:image/png;base64,${largeImageBuffer.toString("base64")}`],
        }),
      },
    );
    assert.equal(largeImageCreate.status, 201, JSON.stringify(largeImageCreate.body));
    services.push(largeImageCreate.body.data.id);
    uploadedImageUrls.push(largeImageCreate.body.data.images[0].url);
    const invalidAdminVendor = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: crypto.randomUUID() }) },
    );
    assert.equal(invalidAdminVendor.status, 400);
    const adminWrongBranch = await requestAs(
      `/api/v1/services/salon/${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
      { method: "POST", body: createPayload({ vendorId: vendorA.id, branchId: branchB.id }) },
    );
    assert.equal(adminWrongBranch.status, 400);

    const adminVendorLookup = await requestAs("/api/v1/services/lookups/vendors?search=ServiceVendorA", admin.id, ["ADMIN"]);
    assert.equal(adminVendorLookup.status, 200);
    assert.ok(adminVendorLookup.body.data.some(({ id }) => id === vendorA.id));
    const adminSalonLookup = await requestAs(
      `/api/v1/services/lookups/salons?vendorId=${vendorA.id}`,
      admin.id,
      ["ADMIN"],
    );
    assert.equal(adminSalonLookup.status, 200);
    assert.ok(adminSalonLookup.body.data.some(({ id }) => id === vendorA.ownedSalons[0].id));
    const adminBranchLookup = await requestAs(
      `/api/v1/services/lookups/branches?salonId=${vendorA.ownedSalons[0].id}`,
      admin.id,
      ["ADMIN"],
    );
    assert.equal(adminBranchLookup.status, 200);
    assert.ok(adminBranchLookup.body.data.some(({ id }) => id === branchA.id));

    const vendorLookup = await requestAs(
      `/api/v1/services/lookups/salons`,
      vendorA.id,
      ["VENDOR"],
    );
    assert.equal(vendorLookup.status, 200);
    assert.ok(vendorLookup.body.data.some(({ id }) => id === vendorA.ownedSalons[0].id));
    assert.ok(!vendorLookup.body.data.some(({ id }) => id === vendorB.ownedSalons[0].id));
    const forbiddenLookup = await requestAs(
      `/api/v1/services/lookups/branches?salonId=${vendorB.ownedSalons[0].id}`,
      vendorA.id,
      ["VENDOR"],
    );
    assert.equal(forbiddenLookup.status, 403);

    const vendorForm = new FormData();
    vendorForm.set("name", "Vendor Uploaded Image Service");
    vendorForm.set("categoryId", category.id);
    vendorForm.set("basePrice", "175");
    vendorForm.set("baseDuration", "45");
    vendorForm.set("image", new Blob([imageBuffer], { type: "image/png" }), "vendor-service.png");
    const vendorUploadResponse = await fetch(`${baseUrl}/api/v1/services/salon/${vendorA.ownedSalons[0].id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: vendorA.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: vendorForm,
    });
    const vendorUploadedService = await vendorUploadResponse.json();
    assert.equal(vendorUploadResponse.status, 201, JSON.stringify(vendorUploadedService));
    services.push(vendorUploadedService.data.id);
    uploadedImageUrls.push(vendorUploadedService.data.images[0].url);

    const adminForm = new FormData();
    adminForm.set("name", "Admin Uploaded Image Service");
    adminForm.set("categoryId", category.id);
    adminForm.set("basePrice", "180");
    adminForm.set("baseDuration", "50");
    adminForm.set("vendorId", vendorA.id);
    adminForm.set("branchId", branchA.id);
    adminForm.set("image", new Blob([imageBuffer], { type: "image/png" }), "admin-service.png");
    const uploadResponse = await fetch(`${baseUrl}/api/v1/services/salon/${vendorA.ownedSalons[0].id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: adminForm,
    });
    const uploadedService = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201, JSON.stringify(uploadedService));
    services.push(uploadedService.data.id);
    assert.match(uploadedService.data.images[0].url, /^\/public\/uploads\/services\/.+\.webp$/);
    uploadedImageUrls.push(uploadedService.data.images[0].url);
    const originalImageUrl = uploadedService.data.images[0].url;
    const replacementForm = new FormData();
    replacementForm.set("image", new Blob([imageBuffer], { type: "image/png" }), "replacement-service.png");
    const replacementResponse = await fetch(`${baseUrl}/api/v1/services/${uploadedService.data.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: replacementForm,
    });
    const replacedService = await replacementResponse.json();
    assert.equal(replacementResponse.status, 200, JSON.stringify(replacedService));
    assert.notEqual(replacedService.data.images[0].url, originalImageUrl);
    uploadedImageUrls.push(replacedService.data.images[0].url);
    await assert.rejects(fs.access(path.join(process.cwd(), "public", originalImageUrl.replace(/^\/public\//, ""))));

    const revokedAiAccess = await requestAs(aiAccessUrl, admin.id, ["ADMIN"], {
      method: "PUT",
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(revokedAiAccess.status, 200);
    assert.equal(revokedAiAccess.body.data.enabled, false);
    const aiAccessAudits = await prisma.subscriptionAuditLog.findMany({
      where: { vendorId: vendorA.id, targetType: "VENDOR_FEATURE_ACCESS", targetId: vendorA.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(aiAccessAudits.length, 2);
    assert.deepEqual(aiAccessAudits.map(({ details }) => details.newEnabled), [true, false]);
    aiAuditIds.push(...aiAccessAudits.map(({ id }) => id));
    const vendorCapabilitiesAfterRevoke = await requestAs("/api/v1/subscriptions/my-access?userType=VENDOR", vendorA.id, ["VENDOR"]);
    assert.equal(vendorCapabilitiesAfterRevoke.body.data.capabilities.canUploadManualImage, true);
    assert.equal(vendorCapabilitiesAfterRevoke.body.data.capabilities.canGenerateAIImage, false);
    const revokedAiGeneration = await requestAs("/api/v1/generate/image", vendorA.id, ["VENDOR"], {
      method: "POST",
      body: JSON.stringify({ prompt: "Hair spa room", serviceId: serviceA.id }),
    });
    assert.equal(revokedAiGeneration.status, 403);
    assert.equal(revokedAiGeneration.body.code, "AI_IMAGE_ACCESS_DENIED");
    assert.equal((await prisma.serviceImage.findUnique({ where: { id: existingAiServiceImage.id } })).url, existingAiServiceImage.url);
    assert.equal((await prisma.combo.findUnique({ where: { id: vendorCombo.body.data.id } })).imageUrl, "/public/uploads/ai-generated/existing-combo-image.png");

    const manualAfterRevoke = new FormData();
    manualAfterRevoke.set("name", "Vendor Manual Image After Revoke");
    manualAfterRevoke.set("categoryId", category.id);
    manualAfterRevoke.set("basePrice", "190");
    manualAfterRevoke.set("baseDuration", "55");
    manualAfterRevoke.set("image", new Blob([imageBuffer], { type: "image/png" }), "manual-after-revoke.png");
    const manualAfterRevokeResponse = await fetch(`${baseUrl}/api/v1/services/salon/${vendorA.ownedSalons[0].id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: vendorA.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: manualAfterRevoke,
    });
    const manualService = await manualAfterRevokeResponse.json();
    assert.equal(manualAfterRevokeResponse.status, 201, JSON.stringify(manualService));
    services.push(manualService.data.id);
    uploadedImageUrls.push(manualService.data.images[0].url);
    const manualComboAfterRevoke = new FormData();
    manualComboAfterRevoke.set("image", new Blob([imageBuffer], { type: "image/png" }), "manual-combo-after-revoke.png");
    const manualComboResponse = await fetch(`${baseUrl}/api/v1/services/combos/${vendorCombo.body.data.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: vendorA.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret")}` },
      body: manualComboAfterRevoke,
    });
    const manualCombo = await manualComboResponse.json();
    assert.equal(manualComboResponse.status, 200, JSON.stringify(manualCombo));
    uploadedImageUrls.push(manualCombo.data.imageUrl);

    const vendorDetails = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"]);
    assert.equal(vendorDetails.status, 200);
    assert.equal(vendorDetails.body.data.salon.owner.id, vendorA.id);
    const foreignDetails = await requestAs(`/api/v1/services/${serviceB.id}`, vendorA.id, ["VENDOR"]);
    assert.equal(foreignDetails.status, 403);

    const booking = await prisma.booking.findFirst({ select: { id: true } });
    if (booking) {
      const bookingService = await prisma.bookingService.create({ data: { bookingId: booking.id, serviceId: serviceA.id, name: serviceA.name, price: serviceA.basePrice } });
      bookingServiceIds.push(bookingService.id);
    }

    await setUserPermission(vendorA.id, "services.edit", false);
    const deniedUpdate = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"], { method: "PATCH", body: JSON.stringify({ name: "Denied Update" }) });
    assert.equal(deniedUpdate.status, 403);
    assert.equal(deniedUpdate.body.code, "PERMISSION_DENIED");
    assert.equal(deniedUpdate.body.action, "EDIT");
    assert.equal(deniedUpdate.body.message, "You do not have permission to perform this action.");
    await setUserPermission(vendorA.id, "services.edit", true);
    const ownUpdate = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"], { method: "PATCH", body: JSON.stringify({ name: "Updated Service A", basePrice: 125 }) });
    const scopeTamperUpdate = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"], { method: "PATCH", body: JSON.stringify({ salonId: vendorB.ownedSalons[0].id, vendorId: vendorB.id }) });
    const foreignUpdate = await requestAs(`/api/v1/services/${serviceB.id}`, vendorA.id, ["VENDOR"], { method: "PATCH", body: JSON.stringify({ name: "Tampered Service" }) });
    assert.equal(ownUpdate.status, 200);
    assert.equal(ownUpdate.body.data.name, "Updated Service A");
    const persistedUpdate = await prisma.service.findUnique({ where: { id: serviceA.id }, select: { name: true, basePrice: true } });
    assert.deepEqual(persistedUpdate, { name: "Updated Service A", basePrice: 125 });
    assert.equal(scopeTamperUpdate.status, 403);
    assert.equal(foreignUpdate.status, 403);

    const ownList = await requestAs(`/api/v1/services?salonId=${vendorA.ownedSalons[0].id}`, vendorA.id, ["VENDOR"]);
    assert.equal(ownList.status, 200);
    assert.ok(ownList.body.data.some((item) => item.id === serviceA.id));

    const adminUpdate = await requestAs(`/api/v1/services/${serviceB.id}`, admin.id, ["ADMIN"], { method: "PATCH", body: JSON.stringify({ name: "Admin Updated Service B" }) });
    assert.equal(adminUpdate.status, 200);

    await setUserPermission(vendorA.id, "services.delete", false);
    const deniedDelete = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"], { method: "DELETE" });
    assert.equal(deniedDelete.status, 403);
    assert.equal(deniedDelete.body.action, "DELETE");
    await setUserPermission(vendorA.id, "services.delete", true);
    const ownDelete = await requestAs(`/api/v1/services/${serviceA.id}`, vendorA.id, ["VENDOR"], { method: "DELETE" });
    const foreignDelete = await requestAs(`/api/v1/services/${serviceB.id}`, vendorA.id, ["VENDOR"], { method: "DELETE" });
    assert.equal(ownDelete.status, 200);
    assert.equal(ownDelete.body.message, "Service deleted successfully");
    assert.equal(foreignDelete.status, 403);

    const persisted = await prisma.service.findUnique({ where: { id: serviceA.id }, include: { bookingItems: true } });
    assert.equal(persisted.isActive, false);
    assert.equal(persisted.salonId, vendorA.ownedSalons[0].id);
    if (booking) assert.ok(persisted.bookingItems.some((item) => item.serviceId === serviceA.id));

    const unauthenticated = await fetch(`${baseUrl}/api/v1/services/${serviceB.id}`, { method: "DELETE" });
    assert.equal(unauthenticated.status, 401);

    const customer = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "CUSTOMER" } } } }, select: { id: true } });
    if (customer) {
      const customerUpdate = await requestAs(`/api/v1/services/${serviceB.id}`, customer.id, ["CUSTOMER"], { method: "PATCH", body: JSON.stringify({ name: "Customer attempt" }) });
      const customerDelete = await requestAs(`/api/v1/services/${serviceB.id}`, customer.id, ["CUSTOMER"], { method: "DELETE" });
      assert.equal(customerUpdate.status, 403);
      assert.equal(customerDelete.status, 403);
    }
  } finally {
    if (aiAuditIds.length) await prisma.subscriptionAuditLog.deleteMany({ where: { id: { in: aiAuditIds } } });
    await prisma.bookingService.deleteMany({ where: { id: { in: bookingServiceIds } } });
    if (combos.length) await prisma.combo.deleteMany({ where: { id: { in: combos } } });
    if (services.length) await prisma.service.deleteMany({ where: { id: { in: services } } });
    await Promise.all(uploadedImageUrls.map((url) =>
      fs.unlink(path.join(process.cwd(), "public", url.replace(/^\/public\//, ""))).catch(() => undefined),
    ));
    await prisma.salon.deleteMany({ where: { id: { in: branches } } });
    if (salons.length) await prisma.salon.deleteMany({ where: { id: { in: salons } } });
    if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (aiFeature && aiImagePermission) {
      if (aiPlanFeature) {
        await prisma.subscriptionPlanFeature.update({
          where: { id: aiPlanFeature.id },
          data: { enabled: aiPlanFeature.enabled },
        });
      } else {
        await prisma.subscriptionPlanFeature.deleteMany({ where: { planId: plan.id, featureId: aiFeature.id } });
      }
    }
    if (!aiPlanPermission && aiImagePermission) {
      await prisma.subscriptionPlanPermission.deleteMany({
        where: { planId: plan.id, permissionId: aiImagePermission.id, userType: "VENDOR" },
      });
    }
    if (aiRolePermission) {
      await prisma.subscriptionPlanRolePermission.update({
        where: { id: aiRolePermission.id },
        data: { enabled: aiRolePermission.enabled },
      });
    } else if (aiImagePermission) {
      await prisma.subscriptionPlanRolePermission.deleteMany({
        where: { planId: plan.id, roleId: vendorRole.id, permissionId: aiImagePermission.id },
      });
    }
    const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
  }
});
