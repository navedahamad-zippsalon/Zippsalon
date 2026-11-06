const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    include: { roles: { include: { role: true } } },
  });

  const vendorUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
    include: { roles: { include: { role: true } } },
  });

  const jwtSecret = process.env.JWT_SECRET || "your-jwt-secret";
  const adminToken = jwt.sign(
    { userId: adminUser.id, roles: adminUser.roles.map((r) => r.role.name) },
    jwtSecret
  );
  const vendorToken = jwt.sign(
    { userId: vendorUser.id, roles: vendorUser.roles.map((r) => r.role.name) },
    jwtSecret
  );

  console.log("Testing with Admin token...");
  await testRequests(adminToken, "ADMIN");

  console.log("\nTesting with Vendor token...");
  await testRequests(vendorToken, "VENDOR");
}

async function testRequests(token, role) {
  const urls = [
    // Default bookings call from BookingManagement
    "/api/v1/bookings?page=1&limit=10",
    // With status filter
    "/api/v1/bookings?page=1&limit=10&status=PENDING",
    "/api/v1/bookings?page=1&limit=10&status=DONE",
    // Default customers call
    "/api/v1/customers/salon/all?page=1&limit=10",
    "/api/v1/customers?page=1&limit=10",
    "/api/v1/admin/customers?page=1&limit=10",
  ];

  for (const path of urls) {
    const start = Date.now();
    try {
      const res = await fetch(`http://localhost:4000${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log(`[${role}] ${path} -> ${res.status} (${Date.now() - start}ms), success: ${data.success}`);
      if (!data.success) {
        console.log(`   Error message: ${data.message}`);
      }
    } catch (e) {
      console.log(`[${role}] ${path} -> ERROR: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
