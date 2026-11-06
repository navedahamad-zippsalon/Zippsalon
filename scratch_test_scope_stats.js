const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

async function getStatsForScope(scopeWhere) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [todayBookings, pending, completed, pendingPaymentsRaw] = await Promise.all([
    prisma.booking.count({
      where: { ...scopeWhere, bookingDate: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.booking.count({
      where: { ...scopeWhere, status: "PENDING" }
    }),
    prisma.booking.count({
      where: { ...scopeWhere, status: "DONE" }
    }),
    prisma.booking.findMany({
      where: {
        ...scopeWhere,
        status: { notIn: ["CANCELLED"] }
      },
      select: { finalAmount: true, totalPaid: true }
    })
  ]);

  const pendingPayment = Number(
    pendingPaymentsRaw.reduce((acc, b) => acc + Math.max(Number(b.finalAmount) - Number(b.totalPaid), 0), 0).toFixed(2)
  );

  return {
    todayBookings,
    pending,
    completed,
    pendingPayment
  };
}

async function main() {
  const t0 = Date.now();
  const statsAll = await getStatsForScope({});
  console.log("Global stats in", Date.now() - t0, "ms:", statsAll);

  // Scoped to a vendor
  const vendorUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } }
  });
  if (vendorUser) {
    const t1 = Date.now();
    const vendorScope = { salon: { OR: [{ ownerId: vendorUser.id }, { parent: { ownerId: vendorUser.id } }] } };
    const statsVendor = await getStatsForScope(vendorScope);
    console.log("Vendor stats in", Date.now() - t1, "ms:", statsVendor);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
