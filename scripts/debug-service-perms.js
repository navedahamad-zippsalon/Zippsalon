const http = require("http");
const app = require("../dist/app").default;
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

async function run() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const membership = await prisma.salonStaff.findFirst({ where: { isActive: true }, select: { userId: true, salonId: true } });
  const otherSalon = await prisma.salon.findFirst({ where: membership ? { id: { not: membership.salonId } } : {}, select: { id: true } });

  console.log("membership:", membership);
  console.log("otherSalon:", otherSalon);

  const staffToken = jwt.sign({ userId: membership.userId, roles: ["STAFF"] }, process.env.JWT_SECRET || "your-jwt-secret");

  const res1 = await fetch(`${baseUrl}/api/v1/services/salon/${membership.salonId}`, { headers: { Authorization: `Bearer ${staffToken}` } });
  console.log("res1 (own salon) status:", res1.status);

  const res2 = await fetch(`${baseUrl}/api/v1/services/salon/${otherSalon.id}`, { headers: { Authorization: `Bearer ${staffToken}` } });
  console.log("res2 (other salon) status:", res2.status);

  server.close();
}

run().catch(console.error).finally(() => prisma.$disconnect());

