import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const vendors = await prisma.user.findMany({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  console.log("All Vendors in DB:", vendors);
}

main().finally(() => prisma.$disconnect());
