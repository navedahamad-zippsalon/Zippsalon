import "dotenv/config";
import { prisma } from "../src/infrastructure/database/prisma";
import { seedReportsMenuAndPermissions } from "../src/modules/rbac/reports-menu.seed";

async function main() {
  console.log("Seeding Reports & Analytics menu and permissions...");
  await seedReportsMenuAndPermissions();
  console.log("Reports & Analytics menu and permissions successfully seeded!");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Failed to seed Reports & Analytics:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
