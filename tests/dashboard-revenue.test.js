const test = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { dashboardService } = require("../dist/modules/dashboard/dashboard.service");

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test("dashboard yearly revenue, service revenue, and review summary use scoped live records", async (t) => {
  const vendor = await prisma.user.findUnique({
    where: { email: "glowstudio.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });
  if (!vendor) return t.skip("Demo vendor is not present in this database");

  const user = { userId: vendor.id, roles: vendor.roles.map(({ role }) => role.name) };
  const result = await dashboardService.getDashboard({ period: "year" }, user);
  const todayResult = await dashboardService.getDashboard({ range: "today" }, user);
  const todayPeriodResult = await dashboardService.getDashboard({ period: "today" }, user);
  const serviceRevenueTotal = result.serviceRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const overviewRevenueTotal = result.revenueOverview.reduce((sum, item) => sum + item.revenue, 0);
  const reviewDistributionTotal = Object.values(result.reviewSummary.distribution).reduce((sum, count) => sum + count, 0);

  assert.ok(Math.abs(serviceRevenueTotal - result.summary.revenue) < 0.01);
  assert.ok(Math.abs(overviewRevenueTotal - result.summary.revenue) < 0.01);
  assert.equal(reviewDistributionTotal, result.reviewSummary.totalReviews);
  assert.ok(result.revenueOverview.every(({ date }) => /^\d{4}-\d{2}$/.test(date)));
  assert.ok(result.bookingTrend.every(({ date }) => /^\d{4}-\d{2}$/.test(date)));
  assert.ok(result.serviceRevenue.every(({ percentage }) => Number.isFinite(percentage)));
  assert.ok(result.recentReviews.every(({ review }) => typeof review === "string" || review === null));
  assert.equal(todayResult.dashboardSummary.today.salesAmount, todayResult.kpis.todayRevenue);
  assert.equal(todayResult.dashboardSummary.today.appointmentCount, todayResult.kpis.todayAppointments);
  assert.equal(todayResult.dashboardSummary.today.completedAppointmentCount, todayResult.kpis.completedAppointments);
  assert.equal(todayResult.dashboardSummary.today.billCount, null);
  assert.equal(todayPeriodResult.dashboardSummary.month.salesAmount, todayPeriodResult.kpis.todayRevenue);
  assert.ok(Number.isFinite(result.dashboardSummary.month.salesAmount));
  assert.ok(Number.isFinite(result.dashboardSummary.month.expenseAmount));
  assert.ok(Number.isFinite(result.dashboardSummary.month.customerCount));
  assert.ok(Number.isFinite(result.dashboardSummary.month.inactiveCustomerCount));
});

test("dashboard rejects a branch outside the vendor's salon scope", async (t) => {
  const vendor = await prisma.user.findUnique({
    where: { email: "glowstudio.demo@zippsalon.test" },
    include: { roles: { include: { role: true } } },
  });
  if (!vendor) return t.skip("Demo vendor is not present in this database");

  const foreignBranch = await prisma.salon.findFirst({
    where: { parentId: { not: null }, ownerId: { not: vendor.id } },
    select: { id: true },
  });
  if (!foreignBranch) return t.skip("No foreign branch is present in this database");

  await assert.rejects(
    () => dashboardService.getDashboard(
      { period: "year", branchId: foreignBranch.id },
      { userId: vendor.id, roles: vendor.roles.map(({ role }) => role.name) },
    ),
    (error) => error.status === 403,
  );
  await assert.rejects(
    () => dashboardService.getDashboard(
      { period: "year", vendorId: foreignBranch.id },
      { userId: vendor.id, roles: vendor.roles.map(({ role }) => role.name) },
    ),
    (error) => error.status === 403,
  );
});
