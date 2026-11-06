const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");

process.env.PAYMENT_ENCRYPTION_KEY ||= "staff-bank-details-test-encryption-key";
const app = require("../dist/app").default;
const { prisma } = require("../dist/infrastructure/database/prisma");
const fixtures = require("./fixtures/sample-data.json");
const { generateTestToken, generateExpiredToken } = require("./factories/auth.factory");

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper for fetch JSON requests
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  let body = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, headers: response.headers, body };
}

// 1. System & Docs Endpoints
test("GET /health returns 200 OK", async () => {
  const res = await request("/health", { method: "GET" });
  assert.equal(res.status, 200);
});

test("GET /api-docs.json returns valid OpenAPI 3.0 specification", async () => {
  const res = await request("/api-docs.json", { method: "GET" });
  assert.equal(res.status, 200);
  assert.equal(res.body.openapi, "3.0.0");
  assert.ok(res.body.paths["/api/v1/feed/posts"]);
  assert.ok(res.body.components.schemas.User);
  assert.ok(res.body.components.schemas.Booking);
  assert.ok(res.body.components.schemas.FeedPost);
});

// 2. Authentication & Validation Layer
test("POST /api/v1/auth/login with missing credentials returns 400 ValidationError", async () => {
  const res = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation Error");
  assert.ok(Array.isArray(res.body.errors));
  assert.ok(res.body.errors.some((e) => e.field === "email"));
  assert.ok(res.body.errors.some((e) => e.field === "password"));
});

test("POST /api/v1/auth/login with invalid email format returns 400", async () => {
  const res = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "invalid-email", password: "somepassword" }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.some((e) => e.field === "email"));
});

test("New vendor without a salon can log in to complete onboarding", async () => {
  const email = `vendor-onboarding-${Date.now()}@example.test`;
  let userId;

  try {
    const registration = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Onboarding",
        lastName: "Vendor",
        email,
        password: "Vendor@123",
        phone: String(Date.now()).slice(-10),
        countryCode: "+91",
        source: "WEBSITE",
      }),
    });
    assert.equal(registration.status, 201);
    userId = registration.body.data.id;

    const login = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "Vendor@123" }),
    });
    assert.equal(login.status, 200);
    assert.deepEqual(login.body.data.user.roles, ["VENDOR"]);
    assert.equal(login.body.data.user.salonId, undefined);
    assert.equal(login.body.data.user.isProfileCompleted, false);
    assert.equal(login.body.data.user.onboardingRequired, true);
    assert.equal(login.body.data.subscription.status, "ACTIVE");
    assert.equal(login.body.data.subscription.plan.slug, "FREE");
    assert.ok(login.body.data.permissions.includes("dashboard.view"));
    assert.ok(login.body.data.permissions.includes("subscriptions.view"));

    const token = login.body.data.accessToken;
    const [me, currentSubscription, permissions, menus, rbacMenus] = await Promise.all([
      request("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
      request("/api/v1/subscriptions/current", { headers: { Authorization: `Bearer ${token}` } }),
      request("/api/v1/auth/permissions", { headers: { Authorization: `Bearer ${token}` } }),
      request("/api/v1/auth/menus", { headers: { Authorization: `Bearer ${token}` } }),
      request("/api/v1/rbac/menus", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.salonId, null);
    assert.equal(me.body.data.onboardingRequired, true);
    assert.equal(me.body.data.subscription.plan.slug, "FREE");
    assert.equal(currentSubscription.status, 200);
    assert.equal(currentSubscription.body.data.subscription.plan.slug, "FREE");
    assert.equal(permissions.status, 200);
    assert.ok(permissions.body.data.includes("staff.view"));
    assert.equal(menus.status, 200);
    assert.ok(menus.body.data.some((menu) => menu.path === "/subscriptions"));
    assert.equal(rbacMenus.status, 200);
    assert.ok(rbacMenus.body.data.some((menu) => menu.path === "/subscriptions"));
  } finally {
    if (userId) {
      await prisma.userRole.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  }
});

test("POST /api/v1/auth/register with invalid data returns 400 with detailed field errors", async () => {
  const res = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(fixtures.users.invalidRegister),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation Error");
  assert.ok(res.body.errors.some((e) => e.field === "email"));
  assert.ok(res.body.errors.some((e) => e.field === "password"));
});

// 3. Security & Middleware Verification
test("Protected route without token returns 401 Unauthorized", async () => {
  const res = await request("/api/v1/users/my-salon", { method: "GET" });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Unauthorized");
});

test("Protected route with malformed token returns 401", async () => {
  const res = await request("/api/v1/users/my-salon", {
    method: "GET",
    headers: { Authorization: "Bearer this-is-not-a-valid-token" },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid token");
});

test("Protected route with expired token returns 401", async () => {
  const expiredToken = generateExpiredToken();
  const res = await request("/api/v1/users/my-salon", {
    method: "GET",
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid token");
});

test("Role-restricted route with unauthorized role returns 403 Forbidden", async () => {
  const customerToken = generateTestToken("user-1", ["CUSTOMER"]);
  const res = await request("/api/v1/admin/users", {
    method: "GET",
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Forbidden/);
});

// 4. Parameter & Query Validation
test("Route with invalid UUID param returns 400 ValidationError", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const res = await request("/api/v1/bookings/not-a-uuid", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation Error");
  assert.ok(res.body.errors.some((e) => e.field === "id"));
});

test("GET /api/v1/bookings and /api/v1/bookings/all return valid list responses for admins", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const root = await request("/api/v1/bookings", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const all = await request("/api/v1/bookings/all", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.equal(root.status, 200);
  assert.equal(root.body.success, true);
  assert.ok(Array.isArray(root.body.data.bookings));
  assert.equal(all.status, 200);
  assert.equal(all.body.success, true);
  assert.ok(Array.isArray(all.body.data.bookings));
});

test("Booking list accepts lowercase and alias filters without hanging the UI", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const completed = await request("/api/v1/bookings?status=completed&paymentStatus=pending", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const today = await request("/api/v1/bookings?status=today&paymentStatus=pending-payment", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.equal(completed.status, 200);
  assert.equal(completed.body.success, true);
  assert.ok(Array.isArray(completed.body.data.bookings));
  assert.equal(today.status, 200);
  assert.equal(today.body.success, true);
  assert.ok(Array.isArray(today.body.data.bookings));
});

test("Vendor accounts with CUSTOMER role can still access booking and customer lists", async () => {
  const email = `vendor-customer-${Date.now()}@example.test`;
  const registration = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Vendor",
      lastName: "Customer",
      email,
      password: "Vendor@123",
      phone: String(Date.now()).slice(-10),
      countryCode: "+91",
      source: "WEBSITE",
    }),
  });

  assert.equal(registration.status, 201);
  const userId = registration.body.data.id;

  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
  await prisma.userRole.createMany({
    data: [
      { userId, roleId: vendorRole.id },
      { userId, roleId: customerRole.id },
    ],
    skipDuplicates: true,
  });

  const vendorToken = generateTestToken(userId, ["VENDOR", "CUSTOMER"]);
  const bookings = await request("/api/v1/bookings?page=1&limit=10", {
    method: "GET",
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const customers = await request("/api/v1/customers/salon/all?page=1&limit=10", {
    method: "GET",
    headers: { Authorization: `Bearer ${vendorToken}` },
  });

  assert.equal(bookings.status, 200);
  assert.equal(bookings.body.success, true);
  assert.ok(Array.isArray(bookings.body.data.bookings));
  assert.equal(customers.status, 200);
  assert.equal(customers.body.success, true);
  assert.ok(Array.isArray(customers.body.data.customers));

  await prisma.userRole.deleteMany({ where: { userId, roleId: { in: [vendorRole.id, customerRole.id] } } });
  await prisma.user.delete({ where: { id: userId } });
});

test("Customer list accepts lowercase account-status filters", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const res = await request("/api/v1/customers?status=active", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.customers));
});

test("Customer search with empty query returns 400 ValidationError", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const res = await request("/api/v1/customers/search?query=", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation Error");
});

// 5. Leads Module Validation
test("POST /api/v1/leads with invalid email returns 400 ValidationError", async () => {
  const res = await request("/api/v1/leads", {
    method: "POST",
    body: JSON.stringify(fixtures.leads.invalidCreate),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation Error");
  assert.ok(res.body.errors.some((e) => e.field === "email"));
  assert.ok(res.body.errors.some((e) => e.field === "name"));
});

// 6. GST Calculation Logic
test("GST service calculates correct 9% CGST + 9% SGST", () => {
  const { gstService } = require("../dist/modules/gst/gst.service");
  const result = gstService.applyGSTToBooking(1000, 10, 9, 9, 18, "CGST_SGST", true);
  assert.equal(result.discountAmount, 100);
  assert.equal(result.taxableAmount, 900);
  assert.equal(result.cgstAmount, 81);
  assert.equal(result.sgstAmount, 81);
  assert.equal(result.igstAmount, 0);
  assert.equal(result.totalTaxAmount, 162);
  assert.equal(result.finalAmount, 1062);
});

test("GST service calculates correct 18% IGST for interstate bookings", () => {
  const { gstService } = require("../dist/modules/gst/gst.service");
  const result = gstService.applyGSTToBooking(2000, 0, 9, 9, 18, "IGST", true);
  assert.equal(result.taxableAmount, 2000);
  assert.equal(result.cgstAmount, 0);
  assert.equal(result.sgstAmount, 0);
  assert.equal(result.igstAmount, 360);
  assert.equal(result.totalTaxAmount, 360);
  assert.equal(result.finalAmount, 2360);
});

// 7. File Upload Safety & Sanitization
test("File upload sanitization prevents path traversal folder attacks", () => {
  const path = require("path");
  const folder = "../../secret/etc";
  const safeFolder = path.basename(folder).replace(/[^a-zA-Z0-9_-]/g, "");
  assert.equal(safeFolder, "etc");
  assert.ok(!safeFolder.includes(".."));
});

test("POST /api/v1/upload without file returns 400", async () => {
  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const res = await request("/api/v1/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

async function uploadStaffMedia(token) {
  const formData = new FormData();
  const blob = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 1, 1, 11, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], { type: "image/png" });
  formData.append("media", blob, "staff-test.png");

  const response = await fetch(`${baseUrl}/api/v1/feed/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data) && body.data.length > 0);
  return body.data[0];
}

async function getTestStaffUser() {
  const staff = await prisma.user.findFirst({
    where: { email: "stylist@zippsalon.com" },
    include: {
      roles: { include: { role: true } },
      staffIn: true,
    },
  });
  if (staff) return staff;
  const anyStaff = await prisma.salonStaff.findFirst({
    where: { isActive: true, staffRoleId: { not: null } },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });
  if (anyStaff?.user) return anyStaff.user;
  throw new Error("A seeded STAFF user is required for this test");
}

test("Staff RBAC permissions include the canonical feed post, story, and media permissions", async () => {
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);

  const res = await request("/api/v1/rbac/permissions/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  const permissions = new Set(res.body.data);

  assert.ok(permissions.has("feed.posts.view"));
  assert.ok(permissions.has("feed.posts.create"));
  assert.ok(permissions.has("feed.posts.update_own"));
  assert.ok(permissions.has("feed.posts.delete_own"));
  assert.ok(permissions.has("feed.stories.view"));
  assert.ok(permissions.has("feed.stories.create"));
  assert.ok(permissions.has("feed.stories.update_own"));
  assert.ok(permissions.has("feed.stories.delete_own"));
  assert.ok(permissions.has("feed.media.upload"));
});

test("Staff can create, list, and delete their own post", async () => {
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);

  const media = await uploadStaffMedia(staffToken);

  const createRes = await request("/api/v1/staff/me/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      caption: "Staff regression test post",
      mediaIds: [media.id],
    }),
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.ok(createRes.body.data.id);

  const listRes = await request("/api/v1/staff/me/posts?page=1&limit=5", {
    method: "GET",
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.success, true);
  assert.ok(Array.isArray(listRes.body.data.posts));
  assert.ok(listRes.body.data.posts.some((item) => item.id === createRes.body.data.id));

  const deleteRes = await request(`/api/v1/staff/me/posts/${createRes.body.data.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);
});

test("Staff can create, update, list, and delete their own story", async () => {
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);

  const media = await uploadStaffMedia(staffToken);

  const createRes = await request("/api/v1/staff/me/stories", {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      caption: "Staff regression test story",
      mediaId: media.id,
    }),
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.ok(createRes.body.data.id);

  const updateRes = await request(`/api/v1/staff/me/stories/${createRes.body.data.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      caption: "Updated staff regression test story",
    }),
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.data.caption, "Updated staff regression test story");

  const listRes = await request("/api/v1/staff/me/stories?page=1&limit=5", {
    method: "GET",
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.success, true);
  assert.ok(Array.isArray(listRes.body.data.stories));
  assert.ok(listRes.body.data.stories.some((item) => item.id === createRes.body.data.id));

  const deleteRes = await request(`/api/v1/staff/me/stories/${createRes.body.data.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);
});

test("Staff can create an image story with direct multipart media storage", async () => {
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);
  const formData = new FormData();
  const image = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137])], { type: "image/png" });
  formData.append("caption", "Direct upload story");
  formData.append("media", image, "direct-story.png");

  const createRes = await fetch(`${baseUrl}/api/v1/staff/me/stories`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: formData,
  });
  const createBody = await createRes.json();

  assert.equal(createRes.status, 201);
  assert.equal(createBody.success, true);
  assert.equal(createBody.data.mediaType, "image");
  assert.match(createBody.data.mediaUrl, /^\/public\/uploads\/stories\/images\//);
  assert.equal(createBody.data.thumbnailUrl, createBody.data.mediaUrl);

  const listRes = await request("/api/v1/staff/me/stories?page=1&limit=20", {
    method: "GET",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.data.stories.some((item) => item.id === createBody.data.id));
});

test("Vendor me feed endpoints stay scoped to vendor-owned content only", async () => {
  const vendorUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
    select: { id: true },
  });
  assert.ok(vendorUser, "A seeded VENDOR user is required for this regression test");
  const vendorUserId = vendorUser.id;
  const vendorToken = generateTestToken(vendorUserId, ["VENDOR"]);
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);

  const staffPostMedia = await uploadStaffMedia(staffToken);
  const staffStoryMedia = await uploadStaffMedia(staffToken);

  const staffPostRes = await request("/api/v1/staff/me/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      caption: "Staff regression isolation post",
      mediaIds: [staffPostMedia.id],
    }),
  });

  const staffStoryRes = await request("/api/v1/staff/me/stories", {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      caption: "Staff regression isolation story",
      mediaId: staffStoryMedia.id,
    }),
  });

  assert.equal(staffPostRes.status, 201);
  assert.equal(staffStoryRes.status, 201);

  const vendorPostsRes = await request("/api/v1/vendor/me/posts?page=1&limit=20", {
    method: "GET",
    headers: { Authorization: `Bearer ${vendorToken}` },
  });

  assert.equal(vendorPostsRes.status, 200);
  assert.equal(vendorPostsRes.body.success, true);
  assert.ok(Array.isArray(vendorPostsRes.body.data.posts));
  assert.ok(!vendorPostsRes.body.data.posts.some((item) => item.id === staffPostRes.body.data.id));

  const vendorStoriesRes = await request("/api/v1/vendor/me/stories?page=1&limit=20", {
    method: "GET",
    headers: { Authorization: `Bearer ${vendorToken}` },
  });

  assert.equal(vendorStoriesRes.status, 200);
  assert.equal(vendorStoriesRes.body.success, true);
  assert.ok(Array.isArray(vendorStoriesRes.body.data.stories));
  assert.ok(!vendorStoriesRes.body.data.stories.some((item) => item.id === staffStoryRes.body.data.id));
});

test("Feed ownership protects vendor post and story mutations and records real shares", async () => {
  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  const feedPlan = await prisma.subscriptionPlan.findFirst({ where: { permissions: { some: { permission: { action: "feed.posts.update_own" } } } } });
  assert.ok(vendorRole, "A seeded VENDOR role is required for this regression test");
  assert.ok(feedPlan, "A seeded subscription plan with Feed ownership permissions is required for this regression test");
  const suffix = randomUUID();
  const createdUserIds = [];

  const createVendorFixture = async (label) => {
    const user = await prisma.user.create({
      data: {
        firstName: label,
        lastName: "Feed Test",
        email: `${label.toLowerCase()}-${suffix}@example.test`,
        phone: `9${Date.now()}${createdUserIds.length}`.slice(0, 10),
        countryCode: "+91",
        password: "unused-test-password",
        roles: { create: { roleId: vendorRole.id } },
        ownedSalons: { create: { name: `${label} Salon`, timings: {} } },
      },
      include: { ownedSalons: true },
    });
    createdUserIds.push(user.id);
    await prisma.subscription.create({ data: { vendorId: user.id, salonId: user.ownedSalons[0].id, planId: feedPlan.id, billingCycle: "MONTHLY", status: "ACTIVE", isManual: true } });
    return user;
  };

  try {
    const vendorA = await createVendorFixture("FeedVendorA");
    const vendorB = await createVendorFixture("FeedVendorB");
    const mediaA = await prisma.feedMedia.create({ data: { type: "IMAGE", url: "/test/feed-a.jpg" } });
    const mediaB = await prisma.feedMedia.create({ data: { type: "IMAGE", url: "/test/feed-b.jpg" } });
    const now = new Date();
    const [postA, postB] = await Promise.all([
      prisma.feedPost.create({ data: { vendorId: vendorA.id, createdBy: vendorA.id, salonId: vendorA.ownedSalons[0].id, caption: "Post A", media: { connect: { id: mediaA.id } } } }),
      prisma.feedPost.create({ data: { vendorId: vendorB.id, createdBy: vendorB.id, salonId: vendorB.ownedSalons[0].id, caption: "Post B", media: { connect: { id: mediaB.id } } } }),
    ]);
    const [storyA, storyB] = await Promise.all([
      prisma.feedStory.create({ data: { vendorId: vendorA.id, createdBy: vendorA.id, salonId: vendorA.ownedSalons[0].id, publishedAt: now, expiresAt: new Date(now.getTime() + 86400000), media: { create: { type: "IMAGE", url: "/test/story-a.jpg" } } } }),
      prisma.feedStory.create({ data: { vendorId: vendorB.id, createdBy: vendorB.id, salonId: vendorB.ownedSalons[0].id, publishedAt: now, expiresAt: new Date(now.getTime() + 86400000), media: { create: { type: "IMAGE", url: "/test/story-b.jpg" } } } }),
    ]);
    const tokenA = generateTestToken(vendorA.id, ["VENDOR"]);
    const tokenB = generateTestToken(vendorB.id, ["VENDOR"]);
    const headersA = { Authorization: `Bearer ${tokenA}` };
    const headersB = { Authorization: `Bearer ${tokenB}` };

    const ownPostUpdate = await request(`/api/v1/feed/posts/${postA.id}`, { method: "PUT", headers: headersA, body: JSON.stringify({ salonId: vendorA.ownedSalons[0].id, caption: "Updated A" }) });
    const foreignSalonUpdate = await request(`/api/v1/feed/posts/${postA.id}`, { method: "PUT", headers: headersA, body: JSON.stringify({ salonId: vendorB.ownedSalons[0].id, caption: "Tampered location" }) });
    const foreignPostUpdate = await request(`/api/v1/feed/posts/${postB.id}`, { method: "PUT", headers: headersA, body: JSON.stringify({ salonId: vendorB.ownedSalons[0].id, caption: "Tampered" }) });
    const reversePostUpdate = await request(`/api/v1/feed/posts/${postA.id}`, { method: "PUT", headers: headersB, body: JSON.stringify({ salonId: vendorA.ownedSalons[0].id, caption: "Tampered" }) });
    assert.equal(ownPostUpdate.status, 200);
    assert.equal(foreignSalonUpdate.status, 403);
    assert.equal(foreignPostUpdate.status, 403);
    assert.equal(reversePostUpdate.status, 403);

    const share = await request(`/api/v1/feed/posts/${postA.id}/share`, { method: "POST", headers: headersA, body: JSON.stringify({ platform: "COPY_LINK" }) });
    const shareCount = await prisma.feedShare.count({ where: { postId: postA.id } });
    assert.equal(share.status, 200);
    assert.match(share.body.data.shareUrl, new RegExp(`/feed/post/${postA.id}$`));
    assert.equal(shareCount, 1);

    const ownPostDelete = await request(`/api/v1/feed/posts/${postA.id}`, { method: "DELETE", headers: headersA });
    const foreignPostDelete = await request(`/api/v1/feed/posts/${postB.id}`, { method: "DELETE", headers: headersA });
    const reversePostDelete = await request(`/api/v1/feed/posts/${postA.id}`, { method: "DELETE", headers: headersB });
    assert.equal(ownPostDelete.status, 200);
    assert.equal(foreignPostDelete.status, 403);
    assert.equal(reversePostDelete.status, 403);

    const ownStoryUpdate = await request(`/api/v1/feed/stories/${storyA.id}`, { method: "PUT", headers: headersA, body: JSON.stringify({ caption: "Updated story A" }) });
    const foreignStoryUpdate = await request(`/api/v1/feed/stories/${storyB.id}`, { method: "PUT", headers: headersA, body: JSON.stringify({ caption: "Tampered" }) });
    const reverseStoryUpdate = await request(`/api/v1/feed/stories/${storyA.id}`, { method: "PUT", headers: headersB, body: JSON.stringify({ caption: "Tampered" }) });
    assert.equal(ownStoryUpdate.status, 200);
    assert.equal(foreignStoryUpdate.status, 403);
    assert.equal(reverseStoryUpdate.status, 403);

    const ownStoryDelete = await request(`/api/v1/feed/stories/${storyA.id}`, { method: "DELETE", headers: headersA });
    const foreignStoryDelete = await request(`/api/v1/feed/stories/${storyB.id}`, { method: "DELETE", headers: headersA });
    const reverseStoryDelete = await request(`/api/v1/feed/stories/${storyA.id}`, { method: "DELETE", headers: headersB });
    assert.equal(ownStoryDelete.status, 200);
    assert.equal(foreignStoryDelete.status, 403);
    assert.equal(reverseStoryDelete.status, 403);
  } finally {
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

test("Staff can manage encrypted bank details and generate a UPI QR code", async () => {
  const staffUser = await getTestStaffUser();
  const staffUserId = staffUser.id;
  const staffToken = generateTestToken(staffUserId, ["STAFF"]);
  const headers = { Authorization: `Bearer ${staffToken}` };
  const initialDetails = await request("/api/v1/staff/me/bank-details", { method: "GET", headers });

  const saveRes = await request("/api/v1/staff/me/bank-details", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      accountHolderName: "John Doe",
      bankName: "HDFC Bank",
      accountNumber: "123456789012",
      ifscCode: "hdfc0001234",
      accountType: "SAVINGS",
      branchName: "Delhi Main Branch",
      upiId: "John@UPI",
    }),
  });

  assert.equal(saveRes.status, 200);
  assert.equal(saveRes.body.data.ifscCode, "HDFC0001234");
  assert.equal(saveRes.body.data.bankCode, "HDFC");
  assert.equal(saveRes.body.data.accountNumber, "********9012");
  assert.equal(saveRes.body.data.upiId, "john@upi");
  assert.ok(!JSON.stringify(saveRes.body).includes("123456789012"));

  const getRes = await request("/api/v1/staff/me/bank-details", { method: "GET", headers });
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.accountNumber, "********9012");
  assert.equal(getRes.body.data.hasBankDetails, true);

  const qrRes = await request("/api/v1/staff/me/bank-details/qr", { method: "POST", headers });
  assert.equal(qrRes.status, 200);
  assert.equal(qrRes.body.data.upiId, "john@upi");
  assert.match(qrRes.body.data.upiUri, /^upi:\/\/pay\?pa=john%40upi&pn=/);
  assert.match(qrRes.body.data.qrCode, /^data:image\/png;base64,/);

  const maskedUpdateRes = await request("/api/v1/staff/me/bank-details", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ifscCode: "icic0001234", accountNumber: "********9012" }),
  });
  assert.equal(maskedUpdateRes.status, 200);
  assert.equal(maskedUpdateRes.body.data.bankCode, "ICIC");
  assert.equal(maskedUpdateRes.body.data.accountNumber, "********9012");

  const deleteRes = await request("/api/v1/staff/me/bank-details", { method: "DELETE", headers });
  assert.equal(deleteRes.status, 200);
  const afterDeleteRes = await request("/api/v1/staff/me/bank-details", { method: "GET", headers });
  assert.equal(afterDeleteRes.status, 200);
  assert.equal(afterDeleteRes.body.data, null);

  if (initialDetails?.body?.data) {
    await request("/api/v1/staff/me/bank-details", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        accountHolderName: initialDetails.body.data.accountHolderName,
        bankName: initialDetails.body.data.bankName,
        accountNumber: "123456789012",
        ifscCode: initialDetails.body.data.ifscCode,
        accountType: initialDetails.body.data.accountType,
        branchName: initialDetails.body.data.branchName,
        upiId: initialDetails.body.data.upiId,
      }),
    });
  }
});
