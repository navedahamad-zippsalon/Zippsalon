import { prisma } from "../src/infrastructure/database/prisma";
import { dashboardService } from "../src/modules/dashboard/dashboard.service";

async function main() {
  const count = await prisma.booking.count();
  console.log("Total bookings in DB:", count);

  const sample = await prisma.booking.findMany({
    take: 10,
    orderBy: { bookingDate: "desc" },
    select: {
      id: true,
      bookingDate: true,
      status: true,
      salonId: true,
      branchId: true,
      createdAt: true,
    },
  });
  console.log("Recent bookings sample:", sample);

  // Check what getDashboard returns for admin user
  const adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    include: { roles: { include: { role: true } } },
  });
  console.log("Admin user:", adminUser?.email);

  if (adminUser) {
    const roles = adminUser.roles.map((r) => r.role.name);
    const dashboardData = await dashboardService.getDashboard(
      { country: "India" },
      { userId: adminUser.id, roles }
    );
    console.log("Dashboard kpis:", dashboardData.kpis);
    console.log("Dashboard summary:", dashboardData.summary);
    console.log("Dashboard todaySchedule length:", dashboardData.todaySchedule?.length);
    console.log("Dashboard todaySchedule:", dashboardData.todaySchedule);
  }

  // Also check for vendor user (e.g. suraj@zippsalon.com)
  const vendorUser = await prisma.user.findFirst({
    where: { email: "suraj@zippsalon.com" },
    include: { roles: { include: { role: true } } },
  });
  if (vendorUser) {
    const roles = vendorUser.roles.map((r) => r.role.name);
    const vendorDashboard = await dashboardService.getDashboard(
      { country: "India" },
      { userId: vendorUser.id, roles }
    );
    console.log("\nVendor Dashboard kpis:", vendorDashboard.kpis);
    console.log("Vendor Dashboard summary:", vendorDashboard.summary);
    console.log("Vendor Dashboard todaySchedule length:", vendorDashboard.todaySchedule?.length);
    console.log("Vendor Dashboard todaySchedule:", vendorDashboard.todaySchedule);
  }
}

main().finally(() => prisma.$disconnect());
