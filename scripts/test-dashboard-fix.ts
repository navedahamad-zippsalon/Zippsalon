import { prisma } from "../src/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

function indiaDayBounds(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(reference);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const start = new Date(Date.UTC(value('year'), value('month') - 1, value('day'), -5, -30));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

async function testFix() {
  const today = indiaDayBounds();

  // Test with all salons in India
  const allSalons = await prisma.salon.findMany({
    where: {
      address: { country: { equals: 'India', mode: 'insensitive' } }
    },
    select: { id: true, parentId: true }
  });

  const allSalonIds = allSalons.map(s => s.id);
  const rootOnlyIds = allSalons.filter(s => !s.parentId).map(s => s.id);

  console.log("Total salons:", allSalonIds.length);
  console.log("Root salons:", rootOnlyIds.length);

  // Before fix (root only):
  const beforeCounts = await prisma.booking.groupBy({
    by: ['status'],
    where: {
      salonId: { in: rootOnlyIds },
      bookingDate: { gte: today.start, lte: today.end }
    },
    _count: { _all: true }
  });
  console.log("BEFORE (root only) today appointments count:", beforeCounts.reduce((s, r) => s + r._count._all, 0));

  // After fix (all salons + branchId check):
  const afterCounts = await prisma.booking.groupBy({
    by: ['status'],
    where: {
      OR: [
        { salonId: { in: allSalonIds } },
        { branchId: { in: allSalonIds } }
      ],
      bookingDate: { gte: today.start, lte: today.end }
    },
    _count: { _all: true }
  });
  console.log("AFTER (all salons + branch check) today appointments count:", afterCounts.reduce((s, r) => s + r._count._all, 0));

  // Today Schedule items:
  const scheduleItems = await prisma.booking.findMany({
    where: {
      OR: [
        { salonId: { in: allSalonIds } },
        { branchId: { in: allSalonIds } }
      ],
      bookingDate: { gte: today.start, lte: today.end },
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'DONE'] }
    },
    orderBy: { bookingDate: 'asc' },
    select: {
      id: true,
      bookingDate: true,
      status: true,
      finalAmount: true,
      customer: { select: { firstName: true, lastName: true } },
      salon: { select: { name: true } },
      branch: { select: { name: true } }
    }
  });

  console.log("Today Schedule items count:", scheduleItems.length);
  console.log("Today Schedule items:", JSON.stringify(scheduleItems, null, 2));
}

testFix().finally(() => prisma.$disconnect());
