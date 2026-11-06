import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const branches = await prisma.salon.findMany({
    where: { parentId: { not: null } },
    select: { id: true, name: true, parentId: true }
  });
  const branchIds = branches.map(b => b.id);
  console.log("Total branch salons in DB:", branchIds.length);

  const bookingsWithBranchAsSalonId = await prisma.booking.count({
    where: { salonId: { in: branchIds } }
  });
  console.log("Bookings where salonId is a branch salon:", bookingsWithBranchAsSalonId);

  const bookingsWithBranchId = await prisma.booking.count({
    where: { branchId: { not: null } }
  });
  console.log("Bookings where branchId is NOT null:", bookingsWithBranchId);

  const bookingsWithBoth = await prisma.booking.count({
    where: { salonId: { in: branchIds }, branchId: { not: null } }
  });
  console.log("Bookings where salonId is branch AND branchId is not null:", bookingsWithBoth);

  const bookingsWithBranchOnly = await prisma.booking.count({
    where: { salonId: { in: branchIds }, branchId: null }
  });
  console.log("Bookings where salonId is branch AND branchId is NULL:", bookingsWithBranchOnly);
}

main().finally(() => prisma.$disconnect());
