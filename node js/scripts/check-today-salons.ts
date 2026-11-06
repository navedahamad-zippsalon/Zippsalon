import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const salons = await prisma.salon.findMany({
    where: {
      id: { in: ['d88ae273-efe8-4e9a-8d67-bb46fe30b453', '4771c3bd-d4d0-4245-a76e-edad8b91b239'] }
    },
    include: {
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      parent: { select: { id: true, name: true, ownerId: true } },
      address: true
    }
  });
  console.log("Salons for today bookings:", JSON.stringify(salons, null, 2));

  // Let's also check all bookings created today or on 2026-09-29
  const todayBookings = await prisma.booking.findMany({
    where: {
      bookingDate: {
        gte: new Date('2026-09-28T18:30:00.000Z'),
        lte: new Date('2026-09-29T18:29:59.999Z'),
      }
    },
    include: {
      salon: { select: { id: true, name: true, parentId: true, ownerId: true } },
      branch: { select: { id: true, name: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
    }
  });
  console.log("\nAll Bookings on 2026-09-29:", JSON.stringify(todayBookings, null, 2));
}

main().finally(() => prisma.$disconnect());
