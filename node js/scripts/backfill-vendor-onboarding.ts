import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureDefaultVendorSubscription } from "../src/modules/subscription/subscription.service";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";

const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: "VENDOR" } } } },
    select: { id: true, email: true, ownedSalons: { where: { isActive: true }, select: { id: true }, take: 1 } },
  });

  let repaired = 0;
  for (const vendor of vendors) {
    await ensureDefaultVendorSubscription(vendor.id, vendor.ownedSalons[0]?.id);
    repaired += 1;
  }
  await cacheInvalidate("rbac:perms:v3:*");
  console.log(JSON.stringify({ vendorsProcessed: vendors.length, subscriptionsEnsured: repaired }, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
