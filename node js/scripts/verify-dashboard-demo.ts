import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const vendorEmails = [
    "glowstudio.demo@zippsalon.test",
    "urbancuts.demo@zippsalon.test",
    "zippbeauty.demo@zippsalon.test",
  ];

  const vendors = await prisma.user.findMany({
    where: { email: { in: vendorEmails } },
    include: { roles: { include: { role: true } } },
  });

  console.log("vendors", vendors.map((vendor) => ({ email: vendor.email, roles: vendor.roles.map((r) => r.role.name) })));

  const salons = await prisma.salon.findMany({
    where: { owner: { email: { in: vendorEmails } } },
    include: { address: true, branches: true },
  });

  console.log("salons", salons.length);

  const bookings = await prisma.booking.findMany({
    where: { salon: { owner: { email: { in: vendorEmails } } } },
    include: { payments: true, services: true, reviews: true },
  });

  console.log("bookings", bookings.length, "payments", bookings.reduce((sum, b) => sum + b.payments.length, 0), "reviews", bookings.reduce((sum, b) => sum + b.reviews.length, 0));

  const stats = await prisma.booking.groupBy({
    by: ["salonId"],
    where: { salon: { owner: { email: { in: vendorEmails } } } },
    _count: { id: true },
  });

  console.log("salonStats", stats.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
