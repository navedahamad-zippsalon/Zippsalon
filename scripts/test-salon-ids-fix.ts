import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "zippbeauty.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });
  const roles = user!.roles.map(r => r.role.name);

  // All salons owned by this vendor
  const all = await prisma.salon.findMany({
    where: {
      OR: [{ ownerId: user!.id }, { parent: { ownerId: user!.id } }],
      address: { country: { equals: 'India', mode: 'insensitive' } }
    },
    select: { id: true, name: true, parentId: true }
  });
  console.log("Total salons in 'all':", all.length);
  console.log("Root salons:", all.filter(s => !s.parentId).length);
  console.log("Branch salons:", all.filter(s => s.parentId).length);

  const rootOnlyIds = all.filter(s => !s.parentId).map(s => s.id);
  const allIds = all.map(s => s.id);

  // Today bounds: 2026-09-28T18:30:00.000Z to 2026-09-29T18:29:59.999Z
  const todayStart = new Date('2026-09-28T18:30:00.000Z');
  const todayEnd = new Date('2026-09-29T18:29:59.999Z');

  const countWithRootOnly = await prisma.booking.count({
    where: {
      salonId: { in: rootOnlyIds },
      bookingDate: { gte: todayStart, lte: todayEnd }
    }
  });
  console.log("Bookings today with rootOnlyIds:", countWithRootOnly);

  const countWithAllIds = await prisma.booking.count({
    where: {
      OR: [
        { salonId: { in: allIds } },
        { branchId: { in: allIds } },
      ],
      bookingDate: { gte: todayStart, lte: todayEnd }
    }
  });
  console.log("Bookings today with allIds (including branches):", countWithAllIds);
}

main().finally(() => prisma.$disconnect());
