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

test("Vendor, salon, branch, and attendance filters remain scoped and paginated", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const created = { users: [], salons: [], staff: [], attendance: [] };
  const roles = {};
  for (const name of ["VENDOR", "STAFF"]) {
    roles[name] = await prisma.role.findUnique({ where: { name }, select: { id: true } });
    assert.ok(roles[name], `seeded ${name} role is required`);
  }
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  assert.ok(admin, "a seeded admin is required");

  const createUser = async (firstName, emailPrefix, phonePrefix, roleName) => {
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: "AttendanceFilter",
        email: `${emailPrefix}-${suffix}@example.test`,
        phone: `${phonePrefix}${String(Date.now()).slice(-9)}`,
        countryCode: "+91",
        password: "unused-test-password",
        roles: { create: { roleId: roles[roleName].id } },
      },
    });
    created.users.push(user.id);
    return user;
  };

  try {
    const vendorA = await createUser("Zipp Filter Vendor", "attendance-vendor-a", "9", "VENDOR");
    const vendorB = await createUser("Other Filter Vendor", "attendance-vendor-b", "8", "VENDOR");
    const staffUserA = await createUser("Amit", "attendance-staff-a", "7", "STAFF");
    const staffUserB = await createUser("Neha", "attendance-staff-b", "6", "STAFF");
    const salonA = await prisma.salon.create({ data: { name: "Zipp Beauty Salon", ownerId: vendorA.id, timings: {} } });
    const salonB = await prisma.salon.create({ data: { name: "Other Beauty Salon", ownerId: vendorB.id, timings: {} } });
    const branchA = await prisma.salon.create({ data: { name: "Main Branch", ownerId: vendorA.id, parentId: salonA.id, timings: {} } });
    const branchB = await prisma.salon.create({ data: { name: "Other Branch", ownerId: vendorB.id, parentId: salonB.id, timings: {} } });
    created.salons.push(salonA.id, salonB.id, branchA.id, branchB.id);
    const [staffA, staffB, staffAtSalon] = await Promise.all([
      prisma.salonStaff.create({ data: { userId: staffUserA.id, salonId: branchA.id } }),
      prisma.salonStaff.create({ data: { userId: staffUserB.id, salonId: branchB.id } }),
      prisma.salonStaff.create({ data: { userId: staffUserA.id, salonId: salonA.id } }),
    ]);
    created.staff.push(staffA.id, staffB.id, staffAtSalon.id);
    const dates = ["2026-09-05", "2026-09-15", "2026-10-01"];
    const [attendanceA, attendanceSalon, attendanceB] = await Promise.all([
      prisma.attendance.create({ data: { staffId: staffA.id, date: new Date(`${dates[0]}T00:00:00.000Z`), status: "PRESENT", markedById: admin.id } }),
      prisma.attendance.create({ data: { staffId: staffAtSalon.id, date: new Date(`${dates[1]}T00:00:00.000Z`), status: "ABSENT", markedById: admin.id } }),
      prisma.attendance.create({ data: { staffId: staffB.id, date: new Date(`${dates[2]}T00:00:00.000Z`), status: "HALF_DAY", markedById: admin.id } }),
    ]);
    created.attendance.push(attendanceA.id, attendanceSalon.id, attendanceB.id);

    const tokenFor = (userId, userRoles) => jwt.sign({ userId, roles: userRoles }, process.env.JWT_SECRET || "your-jwt-secret");
    const request = async (path, userId = admin.id, userRoles = ["ADMIN"]) => {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${tokenFor(userId, userRoles)}` },
      });
      return { status: response.status, body: await response.json() };
    };
    const attendanceIds = (result) => result.body.data.map((item) => item.id);

    const vendors = await request(`/api/v1/vendors?search=Zipp%20Filter&page=1&limit=1`);
    assert.equal(vendors.status, 200);
    assert.equal(vendors.body.data.length, 1);
    assert.equal(vendors.body.data[0].id, vendorA.id);
    assert.equal(vendors.body.pagination.limit, 1);
    const ownVendors = await request("/api/v1/vendors?page=1&limit=10", vendorA.id, ["VENDOR"]);
    assert.deepEqual(ownVendors.body.data.map((item) => item.id), [vendorA.id]);

    const salons = await request(`/api/v1/salons?vendorId=${vendorA.id}&search=Zipp%20Beauty&page=1&limit=10`);
    assert.equal(salons.status, 200);
    assert.deepEqual(salons.body.data.salons.map((item) => item.id), [salonA.id]);
    const ownSalons = await request(`/api/v1/salons?vendorId=${vendorB.id}&page=1&limit=20`, vendorA.id, ["VENDOR"]);
    assert.ok(!ownSalons.body.data.salons.some((item) => item.ownerId === vendorB.id));

    const branches = await request(`/api/v1/branches?vendorId=${vendorA.id}&salonId=${salonA.id}&search=main&page=1&limit=10`);
    assert.equal(branches.status, 200);
    assert.deepEqual(branches.body.data.map((item) => item.id), [branchA.id]);
    const invalidBranchVendor = await request(`/api/v1/branches?vendorId=${vendorB.id}&salonId=${salonA.id}`);
    assert.equal(invalidBranchVendor.status, 400);

    const base = "/api/v1/staff/attendance";
    const getAttendance = (query, userId = admin.id, userRoles = ["ADMIN"]) =>
      request(`${base}?${new URLSearchParams(query)}`, userId, userRoles);
    const vendorResult = await getAttendance({ vendorId: vendorA.id, page: "1", limit: "20" });
    assert.deepEqual(new Set(attendanceIds(vendorResult)), new Set([attendanceA.id, attendanceSalon.id]));
    const salonResult = await getAttendance({ salonId: salonA.id });
    assert.deepEqual(new Set(attendanceIds(salonResult)), new Set([attendanceA.id, attendanceSalon.id]));
    const branchResult = await getAttendance({ branchId: branchA.id });
    assert.deepEqual(attendanceIds(branchResult), [attendanceA.id]);
    const vendorSalonResult = await getAttendance({ vendorId: vendorA.id, salonId: salonA.id });
    assert.deepEqual(new Set(attendanceIds(vendorSalonResult)), new Set([attendanceA.id, attendanceSalon.id]));
    const salonBranchResult = await getAttendance({ salonId: salonA.id, branchId: branchA.id });
    assert.deepEqual(attendanceIds(salonBranchResult), [attendanceA.id]);
    const vendorBranchResult = await getAttendance({ vendorId: vendorA.id, branchId: branchA.id });
    assert.deepEqual(attendanceIds(vendorBranchResult), [attendanceA.id]);
    const fullChain = await getAttendance({ vendorId: vendorA.id, salonId: salonA.id, branchId: branchA.id });
    assert.deepEqual(attendanceIds(fullChain), [attendanceA.id]);
    const vendorMonth = await getAttendance({ vendorId: vendorA.id, month: "2026-09" });
    assert.deepEqual(new Set(attendanceIds(vendorMonth)), new Set([attendanceA.id, attendanceSalon.id]));
    const salonMonth = await getAttendance({ salonId: salonA.id, month: "2026-09" });
    assert.equal(salonMonth.body.data.length, 2);
    const branchMonth = await getAttendance({ branchId: branchA.id, month: "2026-09" });
    assert.deepEqual(attendanceIds(branchMonth), [attendanceA.id]);
    const staffResult = await getAttendance({ staffId: staffAtSalon.id });
    assert.deepEqual(attendanceIds(staffResult), [attendanceSalon.id]);
    const statusResult = await getAttendance({ salonId: salonA.id, status: "absent" });
    assert.deepEqual(attendanceIds(statusResult), [attendanceSalon.id]);
    const searchResult = await getAttendance({ branchId: branchA.id, search: "Amit" });
    assert.deepEqual(attendanceIds(searchResult), [attendanceA.id]);
    const dateResult = await getAttendance({ branchId: branchA.id, date: dates[0] });
    assert.deepEqual(attendanceIds(dateResult), [attendanceA.id]);
    const rangeResult = await getAttendance({ vendorId: vendorA.id, startDate: dates[0], endDate: dates[1] });
    assert.deepEqual(new Set(attendanceIds(rangeResult)), new Set([attendanceA.id, attendanceSalon.id]));
    const paginated = await getAttendance({ vendorId: vendorA.id, page: "1", limit: "1" });
    assert.equal(paginated.body.pagination.total, 2);
    assert.equal(paginated.body.pagination.hasNextPage, true);
    const empty = await getAttendance({ search: "no-attendance-match" });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.data, []);

    const invalidSalonVendor = await getAttendance({ vendorId: vendorB.id, salonId: salonA.id });
    const invalidSalonBranch = await getAttendance({ salonId: salonA.id, branchId: branchB.id });
    const invalidVendorBranch = await getAttendance({ vendorId: vendorB.id, branchId: branchA.id });
    const invalidBranchStaff = await getAttendance({ branchId: branchA.id, staffId: staffB.id });
    for (const invalid of [invalidSalonVendor, invalidSalonBranch, invalidVendorBranch, invalidBranchStaff]) {
      assert.equal(invalid.status, 400);
    }
    const spoofedVendor = await getAttendance({ vendorId: vendorB.id }, vendorA.id, ["VENDOR"]);
    assert.equal(spoofedVendor.status, 403);
    const ownAttendance = await getAttendance({}, vendorA.id, ["VENDOR"]);
    assert.deepEqual(new Set(attendanceIds(ownAttendance)), new Set([attendanceA.id, attendanceSalon.id]));
  } finally {
    if (created.attendance.length) await prisma.attendance.deleteMany({ where: { id: { in: created.attendance } } });
    if (created.staff.length) await prisma.salonStaff.deleteMany({ where: { id: { in: created.staff } } });
    if (created.salons.length) await prisma.salon.deleteMany({ where: { id: { in: created.salons } } });
    if (created.users.length) await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  }
});
