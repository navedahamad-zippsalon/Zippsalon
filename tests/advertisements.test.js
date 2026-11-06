const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const app = require("../dist/app").default;
const { calculateAdvertisementEndAt } = require("../dist/modules/customer/customer-commerce.service");

const prisma = new PrismaClient();
let server;
let baseUrl;
const secret = process.env.JWT_SECRET || "your-jwt-secret";

const token = (userId, roles) => jwt.sign({ userId, roles }, secret, { expiresIn: "1h" });
async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function findUser(role) {
  return prisma.user.findFirst({ where: { roles: { some: { role: { name: role } } } }, select: { id: true } });
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

test("advertisement management enforces admin CRUD and audience-aware visibility", async () => {
  const admin = await findUser("ADMIN");
  const customer = await findUser("CUSTOMER");
  const vendor = await findUser("VENDOR");
  assert.ok(admin && customer && vendor, "Seeded admin, customer, and vendor users are required");

  const adminHeaders = { Authorization: `Bearer ${token(admin.id, ["ADMIN"])}` };
  const customerHeaders = { Authorization: `Bearer ${token(customer.id, ["CUSTOMER"])}` };
  const vendorHeaders = { Authorization: `Bearer ${token(vendor.id, ["VENDOR"])}` };
  const createdIds = [];
  let temporaryAddressId;
  let previousDefaultIds = [];
  let vendorSalonAddressId;
  let previousVendorSalonPincode;

  const create = async (payload) => {
    const response = await request("/api/v1/admin/advertisements", { method: "POST", headers: adminHeaders, body: JSON.stringify(payload) });
    assert.equal(response.status, 201);
    createdIds.push(response.body.data.id);
    return response.body.data;
  };

  try {
  const formStyleAd = await create({
    title: "Form input normalization",
    mediaType: "",
    mediaUrl: "",
    thumbnailUrl: "",
    actionEnabled: "false",
    actionButtonName: "",
    actionUrl: "",
    targetAudience: "all",
    targetType: "selected_pincodes",
    targetPincodes: [" 110001 ", "110001", 400001],
    durationValue: "7",
    durationUnit: "day",
    startAt: "2026-10-06T10:00:00+05:30",
    endAt: "",
    status: "active",
  });
  assert.equal(formStyleAd.mediaType, "TEXT");
  assert.equal(formStyleAd.targetAudience, "BOTH");
  assert.equal(formStyleAd.targetType, "PINCODE");
  assert.deepEqual(formStyleAd.pincodes.map((item) => item.pincode), ["110001", "400001"]);
  assert.deepEqual(formStyleAd.targetPincodes, ["110001", "400001"]);
  assert.equal(formStyleAd.durationValue, 7);
  assert.equal(formStyleAd.durationUnit, "DAYS");
  assert.equal(new Date(formStyleAd.endAt).toISOString(), "2026-10-13T04:30:00.000Z");

  const allLocationsAd = await create({
    title: "All locations image alias",
    advertisementType: "image",
    mediaUrl: "",
    image: "/public/uploads/feed/demo-image.png",
    targetType: "all_locations",
    targetAudience: "all_locations",
    targetPincodes: null,
    durationValue: "1",
    durationUnit: "month",
    startDate: "2026-10-06T10:00:00+05:30",
    status: "scheduled",
  });
  assert.equal(allLocationsAd.mediaType, "IMAGE");
  assert.equal(allLocationsAd.targetType, "ALL");
  assert.equal(allLocationsAd.targetAudience, "BOTH");
  assert.deepEqual(allLocationsAd.pincodes, []);
  assert.deepEqual(allLocationsAd.targetPincodes, []);
  assert.equal(new Date(allLocationsAd.endAt).toISOString(), "2026-11-06T04:30:00.000Z");

  const customerAd = await create({ title: "Customer Image", mediaType: "IMAGE", mediaUrl: "/public/advertisements/customer.jpg", targetAudience: "CUSTOMER", status: "ACTIVE" });
    const vendorAd = await create({ title: "Vendor Video", mediaType: "VIDEO", mediaUrl: "/public/advertisements/vendor.mp4", targetAudience: "VENDOR", status: "ACTIVE" });
    const bothAd = await create({ title: "Everyone Text", description: "Welcome", mediaType: "TEXT", targetAudience: "BOTH", status: "ACTIVE", actionEnabled: true, actionButtonName: "Book Now", actionType: "DEEP_LINK", actionUrl: "/salons" });
    const lifecycleAd = await create({
      title: "Admin CRUD lifecycle",
      mediaType: "TEXT",
      targetType: "PINCODE",
      pincodes: ["110001"],
      durationValue: 7,
      durationUnit: "DAYS",
      status: "DRAFT",
    });
    const lifecycleList = await request("/api/v1/admin/advertisements?sortBy=createdAt&sortOrder=desc", { headers: adminHeaders });
    assert.equal(lifecycleList.status, 200);
    assert.ok(lifecycleList.body.data.some((item) => item.id === lifecycleAd.id));
    assert.deepEqual(lifecycleList.body.pagination, lifecycleList.body.meta);
    const lifecycleDetail = await request(`/api/v1/admin/advertisements/${lifecycleAd.id}`, { headers: adminHeaders });
    assert.equal(lifecycleDetail.status, 200);
    assert.deepEqual(lifecycleDetail.body.data.pincodes.map((item) => item.pincode), ["110001"]);
    assert.deepEqual(lifecycleDetail.body.data.targetPincodes, ["110001"]);
    const lifecycleUpdate = await request(`/api/v1/admin/advertisements/${lifecycleAd.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Admin CRUD lifecycle updated", targetPincodes: ["400001", " 560001 ", "400001"], durationValue: 2, durationUnit: "MONTHS" }),
    });
    assert.equal(lifecycleUpdate.status, 200);
    assert.equal(lifecycleUpdate.body.data.title, "Admin CRUD lifecycle updated");
    assert.deepEqual(lifecycleUpdate.body.data.pincodes.map((item) => item.pincode), ["400001", "560001"]);
    assert.deepEqual(lifecycleUpdate.body.data.targetPincodes, ["400001", "560001"]);
    const lifecyclePincodeFilter = await request("/api/v1/admin/advertisements?pincode=560001", { headers: adminHeaders });
    assert.ok(lifecyclePincodeFilter.body.data.some((item) => item.id === lifecycleAd.id));
    const lifecycleSearch = await request(`/api/v1/admin/advertisements?search=${lifecycleAd.id}`, { headers: adminHeaders });
    assert.ok(lifecycleSearch.body.data.some((item) => item.id === lifecycleAd.id));
    const lifecycleDelete = await request(`/api/v1/admin/advertisements/${lifecycleAd.id}`, { method: "DELETE", headers: adminHeaders });
    assert.equal(lifecycleDelete.status, 200);
    const lifecycleDeletedList = await request(`/api/v1/admin/advertisements?search=${lifecycleAd.id}`, { headers: adminHeaders });
    assert.equal(lifecycleDeletedList.body.data.some((item) => item.id === lifecycleAd.id), false);
    const futureAd = await create({ title: "Future", mediaType: "TEXT", targetAudience: "BOTH", status: "ACTIVE", startAt: new Date(Date.now() + 86400000).toISOString() });
    const expiredAd = await create({ title: "Expired", mediaType: "TEXT", targetAudience: "BOTH", status: "ACTIVE", endAt: new Date(Date.now() - 86400000).toISOString() });
    const inactiveAd = await create({ title: "Inactive", mediaType: "TEXT", targetAudience: "BOTH", status: "INACTIVE" });
    const monthEndAd = await create({
      title: "Pincode month-end",
      mediaType: "TEXT",
      targetAudience: "CUSTOMER",
      targetType: "PINCODE",
      pincodes: ["110001", "110001", "400001"],
      durationValue: 1,
      durationUnit: "MONTHS",
      status: "ACTIVE",
    });
    assert.equal(new Date(monthEndAd.endAt).toISOString(), calculateAdvertisementEndAt(new Date(monthEndAd.startAt), 1, "MONTHS").toISOString());
    assert.equal(monthEndAd.targetType, "PINCODE");
    assert.deepEqual(monthEndAd.pincodes.map((item) => item.pincode), ["110001", "400001"]);
    const secondDelhiPincodeAd = await create({
      title: "Delhi pincode search companion",
      mediaType: "TEXT",
      targetAudience: "CUSTOMER",
      targetType: "PINCODE",
      pincodes: ["110001"],
      durationValue: 30,
      durationUnit: "DAYS",
      status: "ACTIVE",
    });
    const vendorPincodeAd = await create({
      title: "Vendor pincode",
      mediaType: "TEXT",
      targetAudience: "VENDOR",
      targetingMode: "PINCODE",
      pincodes: ["400001"],
      durationValue: 7,
      durationUnit: "DAYS",
      status: "ACTIVE",
    });

    previousDefaultIds = (await prisma.customerAddress.findMany({ where: { customerId: customer.id, isDefault: true }, select: { id: true } })).map((item) => item.id);
    await prisma.customerAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
    const temporaryAddress = await prisma.customerAddress.create({
      data: { customerId: customer.id, label: "Test targeting", addressLine1: "1 Test Street", city: "Delhi", state: "Delhi", country: "India", postalCode: "110001", isDefault: true },
    });
    temporaryAddressId = temporaryAddress.id;
    const vendorSalonAddress = await prisma.address.findFirst({ where: { salon: { ownerId: vendor.id, parentId: null } }, select: { id: true, pincode: true } });
    assert.ok(vendorSalonAddress, "Seeded vendor salon address is required");
    vendorSalonAddressId = vendorSalonAddress.id;
    previousVendorSalonPincode = vendorSalonAddress.pincode;
    await prisma.address.update({ where: { id: vendorSalonAddress.id }, data: { pincode: "400001" } });

    const customerList = await request("/api/v1/advertisements", { headers: customerHeaders });
    assert.equal(customerList.status, 200);
    const customerIds = customerList.body.data.map((item) => item.id);
    assert.ok(customerIds.includes(customerAd.id));
    assert.ok(customerIds.includes(bothAd.id));
    assert.ok(!customerIds.includes(vendorAd.id));
    assert.ok(!customerIds.includes(futureAd.id));
    assert.ok(!customerIds.includes(expiredAd.id));
    assert.ok(!customerIds.includes(inactiveAd.id));
    assert.ok(customerIds.includes(monthEndAd.id));

    const customerHome = await request("/api/v1/customer/home", { headers: customerHeaders });
    assert.equal(customerHome.status, 200);
    assert.ok(customerHome.body.data.advertisements.some((item) => item.id === monthEndAd.id));

    await prisma.customerAddress.update({ where: { id: temporaryAddressId }, data: { isDefault: false } });
    const missingPincodeList = await request("/api/v1/customer/advertisements", { headers: customerHeaders });
    assert.ok(!missingPincodeList.body.data.some((item) => item.id === monthEndAd.id));
    await prisma.customerAddress.update({ where: { id: temporaryAddressId }, data: { isDefault: true } });
    await prisma.customerAddress.update({ where: { id: temporaryAddressId }, data: { postalCode: "999999" } });
    const nonMatchingPincodeList = await request("/api/v1/customer/advertisements", { headers: customerHeaders });
    assert.ok(!nonMatchingPincodeList.body.data.some((item) => item.id === monthEndAd.id));
    await prisma.customerAddress.update({ where: { id: temporaryAddressId }, data: { postalCode: "110001" } });

    const vendorList = await request("/api/v1/advertisements", { headers: vendorHeaders });
    assert.equal(vendorList.status, 200);
    const vendorIds = vendorList.body.data.map((item) => item.id);
    assert.ok(vendorIds.includes(vendorAd.id));
    assert.ok(vendorIds.includes(bothAd.id));
    assert.ok(vendorIds.includes(vendorPincodeAd.id));
    assert.ok(!vendorIds.includes(customerAd.id));

    await prisma.address.update({ where: { id: vendorSalonAddressId }, data: { pincode: "560001" } });
    const vendorNonMatchingPincodeList = await request("/api/v1/advertisements", { headers: vendorHeaders });
    assert.ok(!vendorNonMatchingPincodeList.body.data.some((item) => item.id === vendorPincodeAd.id));
    await prisma.address.update({ where: { id: vendorSalonAddressId }, data: { pincode: "400001" } });

    const filteredPage = await request("/api/v1/admin/advertisements?search=110001&targetType=PINCODE&targetAudience=CUSTOMER&page=1&pageSize=1", { headers: adminHeaders });
    assert.equal(filteredPage.status, 200);
    assert.equal(filteredPage.body.meta.total, 2);
    assert.equal(filteredPage.body.meta.limit, 1);
    assert.equal(filteredPage.body.meta.hasNextPage, true);
    assert.equal(filteredPage.body.meta.hasPreviousPage, false);
    assert.equal(filteredPage.body.data[0].targetType, "PINCODE");
    const filteredPageTwo = await request("/api/v1/admin/advertisements?search=110001&targetType=PINCODE&targetAudience=CUSTOMER&page=2&pageSize=1", { headers: adminHeaders });
    assert.equal(filteredPageTwo.status, 200);
    assert.equal(filteredPageTwo.body.meta.total, 2);
    assert.equal(filteredPageTwo.body.meta.hasNextPage, false);
    assert.equal(filteredPageTwo.body.meta.hasPreviousPage, true);
    assert.notEqual(filteredPageTwo.body.data[0].id, filteredPage.body.data[0].id);
    assert.ok([monthEndAd.id, secondDelhiPincodeAd.id].includes(filteredPageTwo.body.data[0].id));

    const scheduledPage = await request("/api/v1/admin/advertisements?status=SCHEDULED&search=Future", { headers: adminHeaders });
    assert.equal(scheduledPage.status, 200);
    assert.ok(scheduledPage.body.data.some((item) => item.id === futureAd.id && item.status === "SCHEDULED"));

    const clearPincodes = await request(`/api/v1/admin/advertisements/${monthEndAd.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ targetType: "ALL" }),
    });
    assert.equal(clearPincodes.status, 200);
    assert.equal(clearPincodes.body.data.targetType, "ALL");
    assert.deepEqual(clearPincodes.body.data.pincodes, []);

    const detail = await request(`/api/v1/admin/advertisements/${bothAd.id}`, { headers: adminHeaders });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.actionUrl, "/salons");

    const update = await request(`/api/v1/admin/advertisements/${bothAd.id}`, { method: "PUT", headers: adminHeaders, body: JSON.stringify({ title: "Everyone Updated", mediaType: "TEXT", targetAudience: "BOTH" }) });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.title, "Everyone Updated");

    const updatePincodes = await request(`/api/v1/admin/advertisements/${monthEndAd.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ targetType: "PINCODE", pincodes: ["560001"], durationValue: 2 }),
    });
    assert.equal(updatePincodes.status, 200);
    assert.equal(new Date(updatePincodes.body.data.endAt).toISOString(), calculateAdvertisementEndAt(new Date(monthEndAd.startAt), 2, "MONTHS").toISOString());
    assert.deepEqual(updatePincodes.body.data.pincodes.map((item) => item.pincode), ["560001"]);
    const updateStartDate = await request(`/api/v1/admin/advertisements/${monthEndAd.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ startAt: "2024-01-31T12:34:56.000Z", durationUnit: "YEARS" }),
    });
    assert.equal(updateStartDate.status, 200);
    assert.equal(new Date(updateStartDate.body.data.endAt).toISOString(), "2026-01-31T12:34:56.000Z");

    const invalidPincode = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Invalid pincode", mediaType: "TEXT", targetingMode: "PINCODE", pincodes: ["11000"] }),
    });
    assert.equal(invalidPincode.status, 400);
    assert.ok(invalidPincode.body.errors.some((error) => error.field === "pincodes.0"));
    const missingPincodes = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Missing pincode", mediaType: "TEXT", targetType: "SELECTED_PINCODES" }),
    });
    assert.equal(missingPincodes.status, 400);
    assert.ok(missingPincodes.body.errors.some((error) => error.field === "pincodes"));

    const badDate = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Invalid date", mediaType: "TEXT", startAt: "not-a-date" }),
    });
    assert.equal(badDate.status, 400);
    assert.ok(badDate.body.errors.some((error) => error.field === "startAt"));

    const badDuration = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Zero duration", mediaType: "TEXT", durationValue: 0, durationUnit: "DAYS" }),
    });
    assert.equal(badDuration.status, 400);
    assert.ok(badDuration.body.errors.some((error) => error.field === "durationValue"));

    const missingImage = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Missing image", mediaType: "IMAGE", targetType: "ALL_LOCATIONS" }),
    });
    assert.equal(missingImage.status, 400);
    assert.ok(missingImage.body.errors.some((error) => error.field === "mediaUrl"));

    const invalidMediaType = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Invalid media", mediaType: "AUDIO" }),
    });
    assert.equal(invalidMediaType.status, 400);
    assert.ok(invalidMediaType.body.errors.some((error) => error.field === "mediaType"));

    const invalidDateRange = await request("/api/v1/admin/advertisements", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "Invalid date range", mediaType: "TEXT", startAt: "2026-10-07T00:00:00Z", endAt: "2026-10-06T00:00:00Z" }),
    });
    assert.equal(invalidDateRange.status, 400);
    assert.ok(invalidDateRange.body.errors.some((error) => error.field === "endAt"));

    const expiredAdminList = await request("/api/v1/admin/advertisements?status=EXPIRED", { headers: adminHeaders });
    const representedExpiredAd = expiredAdminList.body.data.find((item) => item.id === expiredAd.id);
    assert.equal(representedExpiredAd.status, "EXPIRED");
    const activeAdminList = await request("/api/v1/admin/advertisements?status=ACTIVE", { headers: adminHeaders });
    assert.ok(!activeAdminList.body.data.some((item) => item.id === expiredAd.id));

    const status = await request(`/api/v1/admin/advertisements/${inactiveAd.id}/status`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "ACTIVE" }) });
    assert.equal(status.status, 200);
    const deactivate = await request(`/api/v1/admin/advertisements/${inactiveAd.id}/status`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "INACTIVE" }) });
    assert.equal(deactivate.status, 200);
    const afterDeactivate = await request("/api/v1/advertisements", { headers: customerHeaders });
    assert.ok(!afterDeactivate.body.data.some((item) => item.id === inactiveAd.id));

    const reorder = await request("/api/v1/admin/advertisements/reorder", { method: "PUT", headers: adminHeaders, body: JSON.stringify({ items: [{ id: customerAd.id, displayOrder: 10 }, { id: vendorAd.id, displayOrder: 1 }] }) });
    assert.equal(reorder.status, 200);

    const customerDenied = await request("/api/v1/admin/advertisements", { method: "POST", headers: customerHeaders, body: JSON.stringify({ title: "Denied", mediaType: "TEXT" }) });
    const vendorDenied = await request("/api/v1/admin/advertisements", { method: "POST", headers: vendorHeaders, body: JSON.stringify({ title: "Denied", mediaType: "TEXT" }) });
    assert.equal(customerDenied.status, 403);
    assert.equal(vendorDenied.status, 403);

    const deleted = await request(`/api/v1/admin/advertisements/${customerAd.id}`, { method: "DELETE", headers: adminHeaders });
    assert.equal(deleted.status, 200);
    const afterDelete = await request("/api/v1/advertisements", { headers: customerHeaders });
    assert.ok(!afterDelete.body.data.some((item) => item.id === customerAd.id));
  } finally {
    if (temporaryAddressId) await prisma.customerAddress.deleteMany({ where: { id: temporaryAddressId } });
    if (previousDefaultIds.length) await prisma.customerAddress.updateMany({ where: { id: { in: previousDefaultIds } }, data: { isDefault: true } });
    if (vendorSalonAddressId && previousVendorSalonPincode !== undefined) await prisma.address.update({ where: { id: vendorSalonAddressId }, data: { pincode: previousVendorSalonPincode } });
    if (createdIds.length) await prisma.advertisement.deleteMany({ where: { id: { in: createdIds } } });
  }
});

test("advertisement durations use UTC calendar arithmetic and clamp month/year ends", () => {
  const start = new Date("2024-01-31T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 7, "DAYS").toISOString(), "2024-02-07T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 30, "DAYS").toISOString(), "2024-03-01T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 1, "MONTHS").toISOString(), "2024-02-29T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 3, "MONTHS").toISOString(), "2024-04-30T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 1, "YEARS").toISOString(), "2025-01-31T12:34:56.000Z");
  assert.equal(calculateAdvertisementEndAt(start, 2, "YEARS").toISOString(), "2026-01-31T12:34:56.000Z");
});
