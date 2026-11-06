import { prisma } from "../src/infrastructure/database/prisma";

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: "db6b37d5-96ff-4932-8497-79368b6fe603" },
    include: {
      roles: { include: { role: true } },
      ownedSalons: true,
      staffIn: true,
    }
  });
  console.log("Naved user:", JSON.stringify(user, null, 2));

  // Also check recent users or logins
  const recentUsers = await prisma.user.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, email: true, firstName: true, lastName: true, updatedAt: true, roles: { select: { role: { select: { name: true } } } } }
  });
  console.log("Recently updated users:", JSON.stringify(recentUsers, null, 2));
}

main().finally(() => prisma.$disconnect());
