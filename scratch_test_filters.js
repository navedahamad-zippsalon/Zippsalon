const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { bookingService } = require("./dist/modules/booking/booking.service");
const { customerService } = require("./dist/modules/customer/customer.service");

async function main() {
  console.log("--- Testing bookingService.getAllBookings ---");
  const t0 = Date.now();
  const bookingsAll = await bookingService.getAllBookings(undefined, {});
  console.log(`getAllBookings (no filter): ${Date.now() - t0}ms, count: ${bookingsAll.bookings.length}, total: ${bookingsAll.meta.total}`);

  // Test with status filter
  const t1 = Date.now();
  const bookingsPending = await bookingService.getAllBookings(undefined, { status: "PENDING" });
  console.log(`getAllBookings (status=PENDING): ${Date.now() - t1}ms, count: ${bookingsPending.bookings.length}, total: ${bookingsPending.meta.total}`);

  const bookingsDone = await bookingService.getAllBookings(undefined, { status: "DONE" });
  console.log(`getAllBookings (status=DONE): count: ${bookingsDone.bookings.length}, total: ${bookingsDone.meta.total}`);

  // Test with a salonId
  const firstSalon = await prisma.salon.findFirst();
  console.log("First salon:", firstSalon?.id, firstSalon?.name);
  if (firstSalon) {
    const t2 = Date.now();
    const bookingsSalon = await bookingService.getAllBookings(firstSalon.id, {});
    console.log(`getAllBookings (salonId=${firstSalon.id}): ${Date.now() - t2}ms, count: ${bookingsSalon.bookings.length}, total: ${bookingsSalon.meta.total}`);

    // Test with branch filter
    const firstBranch = await prisma.salon.findFirst({ where: { parentId: firstSalon.id } });
    console.log("First branch for salon:", firstBranch?.id, firstBranch?.name);
    if (firstBranch) {
      const t3 = Date.now();
      const bookingsBranch = await bookingService.getAllBookings(firstSalon.id, { branchId: firstBranch.id });
      console.log(`getAllBookings (salonId + branchId): ${Date.now() - t3}ms, count: ${bookingsBranch.bookings.length}, total: ${bookingsBranch.meta.total}`);
    }
  }

  // Test with ownerId (vendor)
  const vendorUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } }
  });
  console.log("Vendor user:", vendorUser?.id, vendorUser?.email);
  if (vendorUser) {
    const t4 = Date.now();
    const bookingsVendor = await bookingService.getAllBookings(undefined, {}, vendorUser.id);
    console.log(`getAllBookings (ownerId=${vendorUser.id}): ${Date.now() - t4}ms, count: ${bookingsVendor.bookings.length}, total: ${bookingsVendor.meta.total}`);
  }

  console.log("\n--- Testing customerService.getAllCustomers ---");
  const tc0 = Date.now();
  const customersAll = await customerService.getAllCustomers(undefined, {});
  console.log(`getAllCustomers (no filter): ${Date.now() - tc0}ms, count: ${customersAll.customers.length}, total: ${customersAll.meta.total}`);

  if (firstSalon) {
    const tc1 = Date.now();
    const customersSalon = await customerService.getAllCustomers(firstSalon.id, {});
    console.log(`getAllCustomers (salonId=${firstSalon.id}): ${Date.now() - tc1}ms, count: ${customersSalon.customers.length}, total: ${customersSalon.meta.total}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
