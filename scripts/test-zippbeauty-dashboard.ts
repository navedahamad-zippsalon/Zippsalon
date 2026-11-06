import { prisma } from "../src/infrastructure/database/prisma";
import { dashboardService } from "../src/modules/dashboard/dashboard.service";

async function main() {
  const zippBeautyVendor = await prisma.user.findUnique({
    where: { email: "zippbeauty.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });
  if (!zippBeautyVendor) {
    console.log("No zipp beauty vendor found");
    return;
  }
  const roles = zippBeautyVendor.roles.map(r => r.role.name);
  console.log("Testing vendor:", zippBeautyVendor.email, "roles:", roles);

  const res = await dashboardService.getDashboard({ country: "India" }, { userId: zippBeautyVendor.id, roles });
  console.log("KPIs:", res.kpis);
  console.log("Summary:", res.summary);
  console.log("Today Schedule:", res.todaySchedule);

  // Also test with empty params
  const resEmpty = await dashboardService.getDashboard({}, { userId: zippBeautyVendor.id, roles });
  console.log("\nWith empty query params:");
  console.log("KPIs:", resEmpty.kpis);
  console.log("Today Schedule count:", resEmpty.todaySchedule.length);
}

main().finally(() => prisma.$disconnect());
