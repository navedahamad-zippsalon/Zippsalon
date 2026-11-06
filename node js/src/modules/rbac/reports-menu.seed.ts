import { prisma } from "../../infrastructure/database/prisma";
import { cacheInvalidate } from "../../infrastructure/redis/cache";

export const reportsPermissions = [
  { action: "reports.view", description: "View Reports & Analytics" },
  { action: "reports.overview", description: "View Overview" },
  { action: "reports.revenue", description: "View Revenue" },
  { action: "reports.customers", description: "View Customers" },
  { action: "reports.services", description: "View Services" },
  { action: "reports.staff", description: "View Staff Performance" },
  { action: "reports.bookings", description: "View Bookings" },
  { action: "reports.reviews", description: "View Reviews" },
  { action: "reports.export", description: "Export Reports" },
  { action: "reports.revenue.view", description: "View Revenue Reports" },
  { action: "reports.customers.view", description: "View Customer Reports" },
  { action: "reports.services.view", description: "View Service Reports" },
  { action: "reports.staff.view", description: "View Staff Reports" },
  { action: "reports.bookings.view", description: "View Booking Reports" },
  { action: "reports.reviews.view", description: "View Review Reports" },
];

export const reportsSubmenus: never[] = [];

export async function seedReportsMenuAndPermissions() {
  const permissionMap = new Map<string, string>();
  for (const item of reportsPermissions) {
    const permission = await prisma.permission.upsert({
      where: { action: item.action },
      update: { description: item.description },
      create: { action: item.action, description: item.description },
    });
    permissionMap.set(item.action, permission.id);
  }

  const roles = await prisma.role.findMany({ where: { name: { in: ["ADMIN", "VENDOR", "SUPER_ADMIN"] } } });
  for (const role of roles) {
    for (const [, permissionId] of permissionMap) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const reportFeatures = await prisma.subscriptionFeature.findMany({ where: { key: { in: ["reports", "advanced_reports"] } } });
  for (const feature of reportFeatures) {
    for (const [, permissionId] of permissionMap) {
      await prisma.subscriptionFeaturePermission.upsert({
        where: { featureId_permissionId: { featureId: feature.id, permissionId } },
        update: {},
        create: { featureId: feature.id, permissionId },
      });
    }
  }

  const plans = await prisma.subscriptionPlan.findMany();
  for (const plan of plans) {
    for (const feature of reportFeatures) {
      if (feature.key === "reports") {
        await prisma.subscriptionPlanFeature.upsert({
          where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
          update: { enabled: true },
          create: { planId: plan.id, featureId: feature.id, enabled: true },
        });
      }
    }
    for (const [, permissionId] of permissionMap) {
      await prisma.subscriptionPlanPermission.upsert({
        where: { planId_permissionId_userType: { planId: plan.id, permissionId, userType: "VENDOR" } },
        update: {},
        create: { planId: plan.id, permissionId, userType: "VENDOR" },
      });
    }
  }

  let parentMenu = await prisma.menu.findFirst({
    where: { parentId: null, OR: [{ label: "Reports & Analytics" }, { path: "/reports-analytics" }, { path: "/reports" }] },
  });
  if (parentMenu) {
    parentMenu = await prisma.menu.update({
      where: { id: parentMenu.id },
      data: { label: "Reports & Analytics", path: "/reports-analytics", icon: "BarChart3", order: 14, showInSidebar: true },
    });
  } else {
    parentMenu = await prisma.menu.create({
      data: { label: "Reports & Analytics", path: "/reports-analytics", icon: "BarChart3", order: 14, showInSidebar: true },
    });
  }

  const reportsViewPermId = permissionMap.get("reports.view");
  if (reportsViewPermId) {
    await prisma.menuPermission.upsert({
      where: { menuId_permissionId: { menuId: parentMenu.id, permissionId: reportsViewPermId } },
      update: {},
      create: { menuId: parentMenu.id, permissionId: reportsViewPermId },
    });
  }

  await prisma.menu.deleteMany({ where: { parentId: parentMenu.id } });
  await cacheInvalidate("menus:*");
  await cacheInvalidate("rbac:perms:*");
}
