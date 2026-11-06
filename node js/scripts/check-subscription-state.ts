import { prisma } from "../src/infrastructure/database/prisma";
import { getConfiguration } from "../src/modules/payment-gateway/razorpay.service";

async function main() {
  const config = await getConfiguration("PLATFORM");
  console.log("=== RAZORPAY PLATFORM CONFIG ===");
  console.log({
    source: config?.source,
    environment: config?.environment,
    keyId: config?.keyId,
    hasKeySecret: Boolean(config?.keySecret),
    enabled: config?.enabled,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

