const { PrismaClient } = require("C:/zippsalon/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function run() {
  // Check menus in database
  const allCouponMenus = await prisma.menu.findMany({
    where: {
      OR: [
        { path: { startsWith: "/coupons" } },
        { label: { contains: "coupon", mode: "insensitive" } }
      ]
    },
    include: {
      parent: true,
      children: true,
      menuPermissions: { include: { permission: true } }
    }
  });

  console.log("=== ALL COUPON MENUS IN DB ===");
  console.log(JSON.stringify(allCouponMenus, null, 2));

  // Invalidate redis cache if redis is running
  try {
    const { cacheInvalidate } = require("../dist/infrastructure/redis/cache");
    await cacheInvalidate("menus:*");
    console.log("Redis menu cache invalidated!");
  } catch (err) {
    console.log("Cache invalidation note:", err.message);
  }
}

run().catch(console.error).finally(async () => {
  await prisma['\x24disconnect']();
});

