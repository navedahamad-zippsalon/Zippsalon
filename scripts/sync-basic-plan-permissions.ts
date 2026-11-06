import { prisma } from "../src/infrastructure/database/prisma";
import { DEFAULT_PLAN_ENABLED_FEATURE_KEYS, SUBSCRIPTION_FEATURE_DEFINITIONS } from "../src/modules/subscription/subscription-features";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";

async function main() {
  console.log("=== SYNCING BASIC PLAN PERMISSIONS ===");
  const basicPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "BASIC" } });
  if (!basicPlan) {
    throw new Error("Basic plan not found");
  }

  const basicEnabledKeys = new Set(DEFAULT_PLAN_ENABLED_FEATURE_KEYS.BASIC);

  const enabledFeatures = new Map<string, string>();
  for (const [sortOrder, definition] of SUBSCRIPTION_FEATURE_DEFINITIONS.entries()) {
    if (definition.key !== "reports" && definition.key !== "expenses_management") continue;
    const description = "description" in definition && typeof definition.description === "string"
      ? definition.description
      : undefined;
    const feature = await prisma.subscriptionFeature.upsert({
      where: { key: definition.key },
      update: {
        displayName: definition.displayName,
        description,
        featureText: definition.displayName,
        isActive: true,
        sortOrder,
      },
      create: {
        key: definition.key,
        displayName: definition.displayName,
        description,
        featureText: definition.displayName,
        isActive: true,
        sortOrder,
      },
    });
    enabledFeatures.set(definition.key, feature.id);
    await prisma.subscriptionPlanFeature.upsert({
      where: { planId_featureId: { planId: basicPlan.id, featureId: feature.id } },
      update: { enabled: basicEnabledKeys.has(definition.key), sortOrder },
      create: {
        planId: basicPlan.id,
        featureId: feature.id,
        enabled: basicEnabledKeys.has(definition.key),
        sortOrder,
      },
    });
    for (const action of definition.permissions) {
      const permission = await prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Access ${action}` },
      });
      await prisma.subscriptionFeaturePermission.upsert({
        where: { featureId_permissionId: { featureId: feature.id, permissionId: permission.id } },
        update: {},
        create: { featureId: feature.id, permissionId: permission.id },
      });
    }
  }
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "FREE" } });
  const reportsFeatureId = enabledFeatures.get("reports");
  const expensesFeatureId = enabledFeatures.get("expenses_management");
  if (freePlan) {
    for (const featureId of [reportsFeatureId, expensesFeatureId]) {
      if (!featureId) continue;
      await prisma.subscriptionPlanFeature.upsert({
        where: { planId_featureId: { planId: freePlan.id, featureId } },
        update: { enabled: false },
        create: { planId: freePlan.id, featureId, enabled: false },
      });
    }
  }

  const featurePlans = await prisma.subscriptionPlan.findMany({
    where: { slug: { in: Object.keys(DEFAULT_PLAN_ENABLED_FEATURE_KEYS) } },
    select: { id: true, slug: true },
  });
  for (const plan of featurePlans) {
    const tier = DEFAULT_PLAN_ENABLED_FEATURE_KEYS[plan.slug as keyof typeof DEFAULT_PLAN_ENABLED_FEATURE_KEYS];
    const enabledFeatureKeys = new Set<string>(tier);
    for (const featureKey of ["reports", "expenses_management"] as const) {
      const featureId = enabledFeatures.get(featureKey);
      if (!featureId) continue;
      const enabled = enabledFeatureKeys.has(featureKey);
      await prisma.subscriptionPlanFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId } },
        update: { enabled },
        create: { planId: plan.id, featureId, enabled },
      });
      if (!enabled) continue;

      const definition = SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === featureKey);
      if (!definition) continue;
      for (const action of definition.permissions) {
        const permission = await prisma.permission.findUniqueOrThrow({ where: { action }, select: { id: true } });
        await prisma.subscriptionPlanPermission.upsert({
          where: {
            planId_permissionId_userType: {
              planId: plan.id,
              permissionId: permission.id,
              userType: "VENDOR",
            },
          },
          update: {},
          create: { planId: plan.id, permissionId: permission.id, userType: "VENDOR" },
        });
      }
    }
  }

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

  await Promise.all([
    cacheInvalidate("rbac:perms:*"),
    cacheInvalidate("menus:*"),
  ]);
  console.log(`Synced ${createdCount} new permissions and ${enabledFeatures.size} feature definitions into the Basic plan and aligned Reports and Expenses feature entitlements for all standard tiers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
