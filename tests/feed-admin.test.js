const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = require("../dist/app").default;
const { prisma } = require("../dist/infrastructure/database/prisma");

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test("Admin Feed filtering validates ownership hierarchy for posts, stories, and filter options", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const phone = (digit) => `${digit}${String(Date.now()).slice(-9)}`;
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  assert.ok(admin, "a seeded admin is required");

  const created = { users: [], salons: [], addresses: [], staff: [], posts: [], stories: [] };
  const createUser = async (firstName, lastName, email, digit) => {
    const user = await prisma.user.create({
      data: { firstName, lastName, email, phone: phone(digit), countryCode: "+91", password: "unused-test-password" },
    });
    created.users.push(user.id);
    return user;
  };

  try {
    const vendorA = await createUser("FeedFilterVendorA", "Test", `feed-filter-a-${suffix}@example.test`, "9");
    const vendorB = await createUser("FeedFilterVendorB", "Test", `feed-filter-b-${suffix}@example.test`, "8");
    const staffAUser = await createUser("Ravi", "Kumar", `feed-filter-ravi-${suffix}@example.test`, "7");
    const staffBUser = await createUser("Other", "Staff", `feed-filter-other-${suffix}@example.test`, "6");
    const salonA = await prisma.salon.create({ data: { name: "Zipp Beauty Studio", ownerId: vendorA.id, timings: {} } });
    const salonB = await prisma.salon.create({ data: { name: "Other Beauty Studio", ownerId: vendorB.id, timings: {} } });
    created.salons.push(salonA.id, salonB.id);
    const addressA = await prisma.address.create({ data: { salonId: salonA.id, line1: "1 Test Road", city: "Delhi", state: "Delhi", pincode: "110001", country: "India" } });
    const addressB = await prisma.address.create({ data: { salonId: salonB.id, line1: "2 Test Road", city: "Mumbai", state: "Maharashtra", pincode: "400001", country: "India" } });
    created.addresses.push(addressA.id, addressB.id);
    const branchA = await prisma.salon.create({ data: { name: "Main Branch", ownerId: vendorA.id, parentId: salonA.id, timings: {} } });
    const branchB = await prisma.salon.create({ data: { name: "Other Branch", ownerId: vendorB.id, parentId: salonB.id, timings: {} } });
    created.salons.push(branchA.id, branchB.id);
    const [staffA, staffB] = await Promise.all([
      prisma.salonStaff.create({ data: { userId: staffAUser.id, salonId: branchA.id } }),
      prisma.salonStaff.create({ data: { userId: staffBUser.id, salonId: branchB.id } }),
    ]);
    created.staff.push(staffA.id, staffB.id);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const postA = await prisma.feedPost.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Weekend Hair Offer", status: "PUBLISHED", createdAt: now } });
    const postB = await prisma.feedPost.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Hair treatment update", status: "PUBLISHED", createdAt: yesterday } });
    const inactivePost = await prisma.feedPost.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Inactive post", status: "ARCHIVED" } });
    const unrelatedPost = await prisma.feedPost.create({ data: { vendorId: vendorB.id, staffId: staffB.id, salonId: salonB.id, branchId: branchB.id, createdBy: staffBUser.id, caption: "Hair elsewhere", status: "PUBLISHED" } });
    created.posts.push(postA.id, postB.id, inactivePost.id, unrelatedPost.id);

    const story = await prisma.feedStory.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Hair story", status: "PUBLISHED", publishedAt: now, expiresAt: new Date(now.getTime() + 86400000) } });
    const inactiveStory = await prisma.feedStory.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Inactive story", status: "ARCHIVED", publishedAt: now, expiresAt: new Date(now.getTime() + 86400000) } });
    const expiredStory = await prisma.feedStory.create({ data: { vendorId: vendorA.id, staffId: staffA.id, salonId: salonA.id, branchId: branchA.id, createdBy: staffAUser.id, caption: "Expired story", status: "PUBLISHED", publishedAt: yesterday, expiresAt: yesterday } });
    const unrelatedStory = await prisma.feedStory.create({ data: { vendorId: vendorB.id, staffId: staffB.id, salonId: salonB.id, branchId: branchB.id, createdBy: staffBUser.id, caption: "Hair elsewhere", status: "PUBLISHED", publishedAt: now, expiresAt: new Date(now.getTime() + 86400000) } });
    created.stories.push(story.id, inactiveStory.id, expiredStory.id, unrelatedStory.id);

    const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET);
    const request = async (path, options = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
      });
      return { status: response.status, body: await response.json() };
    };
    const hierarchy = new URLSearchParams({
      countryId: "India",
      cityId: "Delhi",
      vendorId: vendorA.id,
      salonId: salonA.id,
      branchId: branchA.id,
      staffId: staffA.id,
      status: "ACTIVE",
      page: "1",
      limit: "10",
    });

    const defaultPosts = await request("/api/v1/admin/feed/posts");
    const unfilteredPosts = await request("/api/v1/admin/feed/posts?page=1&limit=100");
    const unfilteredStories = await request("/api/v1/admin/feed/stories?page=1&limit=100");
    assert.equal(defaultPosts.body.pagination.page, 1);
    assert.equal(defaultPosts.body.pagination.limit, 10);
    assert.equal(unfilteredPosts.status, 200);
    assert.equal(unfilteredStories.status, 200);
    assert.ok(unfilteredPosts.body.data.some((item) => item.id === postA.id));
    assert.ok(unfilteredStories.body.data.some((item) => item.id === story.id));

    const filteredPosts = await request(`/api/v1/admin/feed/posts?${hierarchy}&search=hair`);
    const filteredStories = await request(`/api/v1/admin/feed/stories?${hierarchy}&search=Ravi%20Kumar`);
    assert.equal(filteredPosts.status, 200);
    assert.deepEqual(new Set(filteredPosts.body.data.map((item) => item.id)), new Set([postA.id, postB.id]));
    assert.equal(filteredStories.status, 200);
    assert.deepEqual(filteredStories.body.data.map((item) => item.id), [story.id]);
    assert.equal(filteredStories.body.data[0].vendor.id, vendorA.id);
    assert.equal(filteredStories.body.data[0].staff.id, staffA.id);

    const inactivePosts = await request(`/api/v1/admin/feed/posts?${new URLSearchParams({ salonId: salonA.id, status: "INACTIVE" })}`);
    const inactiveStories = await request(`/api/v1/admin/feed/stories?${new URLSearchParams({ salonId: salonA.id, status: "INACTIVE" })}`);
    const expiredStories = await request(`/api/v1/admin/feed/stories?${new URLSearchParams({ salonId: salonA.id, status: "EXPIRED" })}`);
    assert.ok(inactivePosts.body.data.some((item) => item.id === inactivePost.id));
    assert.ok(inactiveStories.body.data.some((item) => item.id === inactiveStory.id));
    assert.ok(expiredStories.body.data.some((item) => item.id === expiredStory.id));

    const pageOne = await request(`/api/v1/admin/feed/posts?${new URLSearchParams({ salonId: salonA.id, status: "ACTIVE", search: "hair", limit: "1", page: "1" })}`);
    const pageTwo = await request(`/api/v1/admin/feed/posts?${new URLSearchParams({ salonId: salonA.id, status: "ACTIVE", search: "hair", limit: "1", page: "2" })}`);
    assert.equal(pageOne.body.pagination.total, 2);
    assert.equal(pageOne.body.pagination.limit, 1);
    assert.equal(pageOne.body.pagination.hasNextPage, true);
    assert.equal(pageTwo.body.pagination.hasPreviousPage, true);
    const empty = await request(`/api/v1/admin/feed/posts?${new URLSearchParams({ salonId: salonA.id, search: "no-match" })}`);
    assert.equal(empty.body.data.length, 0);
    const dateRange = await request(`/api/v1/admin/feed/posts?${new URLSearchParams({ salonId: salonA.id, fromDate: yesterday.toISOString(), toDate: yesterday.toISOString() })}`);
    assert.deepEqual(dateRange.body.data.map((item) => item.id), [postB.id]);

    const cities = await request("/api/v1/admin/feed/filters/cities?countryId=India&search=del&page=1&limit=20");
    const filterMetadata = await request(`/api/v1/admin/feed/filters?${new URLSearchParams({ countryId: "India", cityId: "Delhi", vendorId: vendorA.id, salonId: salonA.id, branchId: branchA.id })}`);
    const vendors = await request("/api/v1/admin/feed/filters/vendors?cityId=Delhi&search=FeedFilterVendorA&page=1&limit=20");
    const salons = await request(`/api/v1/admin/feed/filters/salons?vendorId=${vendorA.id}&cityId=Delhi&search=Zipp&page=1&limit=20`);
    const branches = await request(`/api/v1/admin/feed/filters/branches?salonId=${salonA.id}&search=main&page=1&limit=20`);
    const staffOptions = await request(`/api/v1/admin/feed/filters/staff?branchId=${branchA.id}&search=Ravi%20Kumar&page=1&limit=20`);
    assert.ok(cities.body.data.data.some((item) => item.id === "Delhi"));
    assert.deepEqual(filterMetadata.body.data.statuses, [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]);
    assert.ok(filterMetadata.body.data.branches.some((item) => item.id === branchA.id));
    assert.ok(vendors.body.data.data.some((item) => item.id === vendorA.id));
    assert.ok(salons.body.data.data.some((item) => item.id === salonA.id && item.cityId === "Delhi"));
    assert.ok(branches.body.data.data.some((item) => item.id === branchA.id));
    assert.ok(staffOptions.body.data.data.some((item) => item.id === staffA.id));

    const invalidCountryCity = await request("/api/v1/admin/feed/posts?countryId=India&cityId=MissingCity");
    const invalidSalonBranch = await request(`/api/v1/admin/feed/posts?salonId=${salonA.id}&branchId=${branchB.id}`);
    const invalidVendorSalon = await request(`/api/v1/admin/feed/posts?vendorId=${vendorB.id}&salonId=${salonA.id}`);
    const invalidBranchStaff = await request(`/api/v1/admin/feed/posts?branchId=${branchA.id}&staffId=${staffB.id}`);
    assert.equal(invalidCountryCity.status, 400);
    assert.equal(invalidSalonBranch.status, 400);
    assert.equal(invalidVendorSalon.status, 400);
    assert.equal(invalidBranchStaff.status, 400);

    const updatedPost = await request(`/api/v1/admin/feed/posts/${postA.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: "Admin updated post" }) });
    const updatedStory = await request(`/api/v1/admin/feed/stories/${story.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: "Admin updated story" }) });
    assert.equal(updatedPost.status, 200);
    assert.equal(updatedStory.status, 200);
    assert.equal((await request(`/api/v1/admin/feed/posts/${postA.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await request(`/api/v1/admin/feed/stories/${story.id}`, { method: "DELETE" })).status, 200);
  } finally {
    await prisma.feedPost.deleteMany({ where: { id: { in: created.posts } } });
    await prisma.feedStory.deleteMany({ where: { id: { in: created.stories } } });
    await prisma.salonStaff.deleteMany({ where: { id: { in: created.staff } } });
    await prisma.address.deleteMany({ where: { id: { in: created.addresses } } });
    await prisma.salon.deleteMany({ where: { id: { in: created.salons } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  }
});
