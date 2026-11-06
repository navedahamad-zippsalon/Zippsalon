import { prisma } from "../src/infrastructure/database/prisma";
import { SUBSCRIPTION_FEATURE_DEFINITIONS } from "../src/modules/subscription/subscription-features";

async function main() {
  console.log("=== SYNCING BASIC PLAN PERMISSIONS ===");
  const basicPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "BASIC" } });
  if (!basicPlan) {
    console.error("Basic plan not found!");
    return;
  }

  const basicEnabledKeys = new Set(
    SUBSCRIPTION_FEATURE_DEFINITIONS.map((f) => f.key).filter(
      (key) => !["advanced_reports", "multi_branch", "priority_support"].includes(key)
    )
  );

  const allowedActions = SUBSCRIPTION_FEATURE_DEFINITIONS
    .filter(({ key }) => basicEnabledKeys.has(key))
    .flatMap(({ permissions }) => [...permissions]);

  // Also include general basic vendor permissions
  const additionalActions = [
    "dashboard.view",
    "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.manage",
    "services.view", "services.create", "services.edit", "services.delete", "services.manage",
    "categories.view", "categories.create", "categories.edit", "categories.delete",
    "bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.manage",
    "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.manage",
    "staff.view", "staff.create", "staff.edit", "staff.delete",
    "attendance.view", "attendance.create", "attendance.edit",
    "feed.view", "feed.create", "feed.edit", "feed.delete",
    "coupons.view", "coupons.create", "coupons.edit",
    "reports.view", "reports.overview", "reports.revenue", "reports.customers", "reports.services", "reports.bookings", "reports.reviews", "reports.export"
  ];

  const allActions = [...new Set([...allowedActions, ...additionalActions])];
  const permissions = await prisma.permission.findMany({
    where: { action: { in: allActions } },
    select: { id: true, action: true },
  });

  console.log(`Found ${permissions.length} matching permissions for Basic plan.`);

  let createdCount = 0;
  for (const perm of permissions) {
    const existing = await prisma.subscriptionPlanPermission.findUnique({
      where: {
        planId_permissionId_userType: {
          planId: basicPlan.id,
          permissionId: perm.id,
          userType: "VENDOR",
        },
      },
    });
    if (!existing) {
      await prisma.subscriptionPlanPermission.create({
        data: {
          planId: basicPlan.id,
          permissionId: perm.id,
          userType: "VENDOR",
        },
      });
      createdCount++;
    }
  }

  console.log(`Synced ${createdCount} new permissions into SubscriptionPlanPermission for Basic plan.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

