const { prisma } = require("../dist/infrastructure/database/prisma");

async function run() {
  const allServices = await prisma.service.findMany({
    include: {
      salon: {
        include: {
          parent: true,
          owner: true,
        },
      },
      category: true,
    },
  });
  console.log("Total services in database:", allServices.length);

  const withoutSalon = allServices.filter((s) => !s.salon);
  console.log("Services without salon:", withoutSalon.length);

  const withoutOwner = allServices.filter((s) => !s.salon?.owner && !s.salon?.parent?.owner);
  console.log("Services without vendor/owner:", withoutOwner.length);

  const demoVendors = await prisma.user.findMany({
    where: {
      email: { endsWith: ".demo@zippsalon.test" },
      roles: { some: { role: { name: "VENDOR" } } },
    },
    select: {
      id: true,
      email: true,
      ownedSalons: {
        where: { parentId: null },
        select: {
          id: true,
          name: true,
          _count: { select: { services: true } },
          branches: {
            select: {
              id: true,
              name: true,
              _count: { select: { services: true } },
            },
          },
        },
      },
    },
    orderBy: { email: "asc" },
  });

  console.log(`\nDiagnostic Vendor Service Counts (${demoVendors.length} demo vendors):`);
  for (const v of demoVendors) {
    const main = v.ownedSalons[0];
    const mainServices = main ? main._count.services : 0;
    const branches = main?.branches || [];
    const branchServices = branches.reduce((sum, b) => sum + b._count.services, 0);
    console.log(`${v.email} -> Main: "${main?.name}" (${mainServices} services), Branches: ${branches.length} (${branchServices} direct services)`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
