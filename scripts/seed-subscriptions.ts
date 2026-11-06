import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_PLAN_ENABLED_FEATURE_KEYS, SUBSCRIPTION_FEATURE_DEFINITIONS } from "../src/modules/subscription/subscription-features";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_NOTE = "system:default-enterprise-subscription";
const CUSTOMER_PERMISSIONS = ["customer.profile.view", "customer.profile.update", "customer.services.view", "customer.products.view", "customer.bookings.view", "customer.bookings.create", "customer.bookings.cancel", "customer.feed.view", "customer.stories.view"] as const;
const features = SUBSCRIPTION_FEATURE_DEFINITIONS.map(({ key, displayName }) => [key, displayName] as const);
const plans = [
  { name: "Free", slug: "FREE", monthlyPrice: 0, annualPrice: 0, displayOrder: 1, maxCustomers: 50, maxStaff: 2, maxBranches: 1, enabled: DEFAULT_PLAN_ENABLED_FEATURE_KEYS.FREE },
  { name: "Basic", slug: "BASIC", monthlyPrice: 999, annualPrice: 9990, displayOrder: 2, maxCustomers: 500, maxStaff: 5, maxBranches: 2, enabled: DEFAULT_PLAN_ENABLED_FEATURE_KEYS.BASIC },
  { name: "Advance", slug: "ADVANCE", monthlyPrice: 2499, annualPrice: 24990, displayOrder: 3, maxCustomers: 2500, maxStaff: 20, maxBranches: 5, enabled: DEFAULT_PLAN_ENABLED_FEATURE_KEYS.ADVANCE },
  { name: "Enterprise", slug: "ENTERPRISE", monthlyPrice: 4999, annualPrice: 49990, displayOrder: 4, maxCustomers: 10000, maxStaff: 100, maxBranches: 20, enabled: DEFAULT_PLAN_ENABLED_FEATURE_KEYS.ENTERPRISE },
] as const;

async function main() {
  const environment = (globalThis as any).process?.env ?? {};
  if (environment.NODE_ENV === "production" && environment.ALLOW_SUBSCRIPTION_DUMMY_SEED !== "true") throw new Error("Refusing dummy subscription seed in production. Set ALLOW_SUBSCRIPTION_DUMMY_SEED=true explicitly if required.");
  const result = await prisma.$transaction(async (tx) => {
    const featureIds = new Map<string, string>();
    const customerRole = await tx.role.upsert({ where: { name: "CUSTOMER" }, update: { isActive: true }, create: { name: "CUSTOMER" } });
    const customerPermissions = [];
    for (const action of CUSTOMER_PERMISSIONS) customerPermissions.push(await tx.permission.upsert({ where: { action }, update: {}, create: { action, description: `Customer access: ${action}` } }));
    await tx.rolePermission.createMany({ data: customerPermissions.map(({ id: permissionId }) => ({ roleId: customerRole.id, permissionId })), skipDuplicates: true });
    for (const [sortOrder, [key, displayName]] of features.entries()) {
      const feature = await tx.subscriptionFeature.upsert({ where: { key }, update: { displayName, featureText: displayName, sortOrder, isActive: true }, create: { key, displayName, featureText: displayName, sortOrder, isActive: true } });
      featureIds.set(key, feature.id);
    }
    for (const definition of SUBSCRIPTION_FEATURE_DEFINITIONS) {
      for (const action of definition.permissions) {
        await tx.permission.upsert({ where: { action }, update: {}, create: { action, description: `Access ${action}` } });
      }
    }
    for (const definition of plans) {
      const planData = { name: definition.name, description: `Dummy ${definition.name} plan for testing.`, shortDescription: `${definition.name} salon subscription.`, monthlyPrice: definition.monthlyPrice, annualPrice: definition.annualPrice, currency: "INR", monthlyEnabled: true, annualEnabled: true, isActive: true, displayOrder: definition.displayOrder, maxCustomers: definition.maxCustomers, maxStaff: definition.maxStaff, maxBranches: definition.maxBranches, maxStorage: definition.slug === "ENTERPRISE" ? 102400 : 5120, maxBookings: definition.slug === "ENTERPRISE" ? 25000 : 1000, maxBookingsPerMonth: definition.slug === "ENTERPRISE" ? 25000 : 1000, ctaText: `Choose ${definition.name}` };
      const plan = await tx.subscriptionPlan.upsert({ where: { slug: definition.slug }, update: planData, create: { ...planData, slug: definition.slug } });
      const enabled = new Set(definition.enabled);
      for (const [sortOrder, [key]] of features.entries()) {
        const featureId = featureIds.get(key)!;
        await tx.subscriptionPlanFeature.upsert({ where: { planId_featureId: { planId: plan.id, featureId } }, update: { enabled: enabled.has(key), sortOrder }, create: { planId: plan.id, featureId, enabled: enabled.has(key), sortOrder } });
      }
      const allowedActions = SUBSCRIPTION_FEATURE_DEFINITIONS.filter(({ key }) => enabled.has(key)).flatMap(({ permissions }) => [...permissions]);
      const allowedPermissions = await tx.permission.findMany({ where: { action: { in: allowedActions } }, select: { id: true } });
      if (allowedPermissions.length) await tx.subscriptionPlanPermission.createMany({ data: allowedPermissions.map(({ id: permissionId }) => ({ planId: plan.id, permissionId })), skipDuplicates: true });
    }
    const canonicalFree = await tx.subscriptionPlan.findUniqueOrThrow({ where: { slug: "FREE" } });
    const duplicateFree = await tx.subscriptionPlan.findMany({ where: { slug: { in: ["free", "Free"] }, id: { not: canonicalFree.id } }, select: { id: true } });
    if (duplicateFree.length) {
      await tx.subscription.updateMany({ where: { planId: { in: duplicateFree.map(({ id }) => id) }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }, data: { planId: canonicalFree.id } });
      await tx.subscriptionPlan.updateMany({ where: { id: { in: duplicateFree.map(({ id }) => id) } }, data: { isActive: false } });
    }
    for (const definition of SUBSCRIPTION_FEATURE_DEFINITIONS) {
      const featureId = featureIds.get(definition.key)!;
      const permissions = await tx.permission.findMany({ where: { action: { in: [...definition.permissions] } }, select: { id: true } });
      if (permissions.length) {
        await tx.subscriptionFeaturePermission.createMany({ data: permissions.map(({ id: permissionId }) => ({ featureId, permissionId })), skipDuplicates: true });
      }
    }
    const staffRole = await tx.role.findUnique({ where: { name: "STAFF" } });
    if (staffRole) {
      const staffActions: string[] = [...SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === "staff_management")!.permissions, ...SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === "posts")!.permissions];
      const staffPermissions = await tx.permission.findMany({ where: { action: { in: [...staffActions] } }, select: { id: true } });
      if (staffPermissions.length) await tx.rolePermission.createMany({ data: staffPermissions.map(({ id: permissionId }) => ({ roleId: staffRole.id, permissionId })), skipDuplicates: true });
    }
    const enterprise = await tx.subscriptionPlan.findUniqueOrThrow({ where: { slug: "ENTERPRISE" } });
    const vendorRole = await tx.role.findUnique({ where: { name: "VENDOR" } });
    if (vendorRole) {
      const financePermissions = await tx.permission.findMany({
        where: { action: { in: ["booking-finance.wallet.view", "booking-finance.payout-account.view", "booking-finance.payout-account.manage"] } },
        select: { id: true },
      });
      if (financePermissions.length) {
        await tx.rolePermission.createMany({
          data: financePermissions.map(({ id: permissionId }) => ({ roleId: vendorRole.id, permissionId })),
          skipDuplicates: true,
        });
      }
      const configuredPlans = await tx.subscriptionPlanRolePermission.findMany({
        where: { roleId: vendorRole.id },
        select: { planId: true },
        distinct: ["planId"],
      });
      for (const { planId } of configuredPlans) {
        for (const { id: permissionId } of financePermissions) {
          const accessKey = `${planId}:${vendorRole.id}:${permissionId}`;
          await tx.subscriptionPlanRolePermission.upsert({
            where: { accessKey },
            update: { enabled: true },
            create: { planId, roleId: vendorRole.id, permissionId, accessKey, enabled: true },
          });
        }
      }
    }
    const vendors = vendorRole ? await tx.user.findMany({ where: { roles: { some: { roleId: vendorRole.id } } }, select: { id: true, ownedSalons: { where: { isActive: true }, take: 1, select: { id: true } } } }) : [];
    const now = new Date(); let assigned = 0;
    for (const vendor of vendors) {
      await tx.subscription.updateMany({ where: { vendorId: vendor.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      const current = await tx.subscription.findFirst({ where: { vendorId: vendor.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true } });
      if (current) continue;
      await tx.subscription.create({ data: { vendorId: vendor.id, salonId: vendor.ownedSalons[0]?.id, planId: enterprise.id, billingCycle: "MONTHLY", status: "ACTIVE", amount: enterprise.monthlyPrice, currency: enterprise.currency, startsAt: now, expiresAt: new Date(now.getTime() + 365 * DAY), notes: DEFAULT_NOTE } }); assigned += 1;
    }
    return { planCount: plans.length, featureCount: features.length, vendorCount: vendors.length, enterpriseAssigned: assigned };
  }, { isolationLevel: "Serializable" });
  const verification = await prisma.subscriptionPlan.findMany({ where: { slug: { in: plans.map((plan) => plan.slug) } }, select: { slug: true, name: true, isActive: true }, orderBy: { displayOrder: "asc" } });
  if (verification.length !== plans.length) throw new Error(`Expected ${plans.length} dummy plans, found ${verification.length}.`);
  console.log(JSON.stringify({ ...result, plans: verification }, null, 2));
}
main().catch((error) => { console.error(error); (globalThis as any).process.exitCode = 1; }).finally(() => prisma.$disconnect());
