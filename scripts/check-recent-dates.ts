import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      bookingDate: {
        gte: new Date('2026-09-28T00:00:00.000Z'),
        lte: new Date('2026-10-01T23:59:59.999Z'),
      }
    },
    select: {
      id: true,
      bookingDate: true,
      status: true,
      salonId: true,
      branchId: true,
      salon: { select: { name: true, ownerId: true, owner: { select: { email: true } } } },
      customer: { select: { firstName: true, lastName: true } }
    },
    orderBy: { bookingDate: 'asc' }
  });
  console.log("Bookings between Sep 28 and Oct 1:", JSON.stringify(bookings, null, 2));
}

main().finally(() => prisma.$disconnect());
