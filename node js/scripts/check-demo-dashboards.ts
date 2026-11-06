import { prisma } from "../src/infrastructure/database/prisma";
import { dashboardService } from "../src/modules/dashboard/dashboard.service";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { in: ['admin@zippsalon.com', 'owner@zippsalon.com', 'suraj@zippsalon.com', 'zippbeauty.demo@zippsalon.test', 'saket_admin@example.com'] }
    },
    include: {
      roles: { include: { role: true } },
      ownedSalons: true,
      staffIn: { include: { salon: true } },
    }
  });

  for (const u of users) {
    const roles = u.roles.map(r => r.role.name);
    console.log(`\n=== User: ${u.email} (${roles.join(', ')}) ===`);
    console.log(`Owned salons: ${u.ownedSalons.map(s => `${s.name} (${s.id})`).join(', ') || 'None'}`);
    console.log(`Staff in: ${u.staffIn.map(s => `${s.salon.name} (${s.salonId})`).join(', ') || 'None'}`);
    const dash = await dashboardService.getDashboard({ country: 'India' }, { userId: u.id, roles });
    console.log('todayAppointments KPI:', dash.kpis.todayAppointments);
    console.log('todaySchedule length:', dash.todaySchedule.length);
  }
}

main().finally(() => prisma.$disconnect());
