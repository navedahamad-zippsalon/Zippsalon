const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const t0 = Date.now();
  const [stats] = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE "bookingDate" >= ${todayStart} AND "bookingDate" <= ${todayEnd})::int AS "todayBookings",
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS "pending",
      COUNT(*) FILTER (WHERE status = 'DONE')::int AS "completed",
      COALESCE(SUM(GREATEST("finalAmount" - "totalPaid", 0)), 0)::float AS "pendingPayment"
    FROM "Booking"
  `;
  console.log("SQL query took:", Date.now() - t0, "ms");
  console.log("Stats result:", stats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
