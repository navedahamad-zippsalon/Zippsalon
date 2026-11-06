import crypto from "crypto";
import { prisma } from "../../infrastructure/database/prisma";
import { env } from "../../config/env";
import { Prisma } from "@prisma/client";
import { createClient as createRazorpayClient, webhookSecret as getWebhookSecret } from "../payment-gateway/razorpay.service";
import { cacheInvalidate } from "../../infrastructure/redis/cache";
import { SUBSCRIPTION_FEATURE_DEFINITIONS } from "./subscription-features";
import type { SubscriptionAccessUserType } from "@prisma/client";

const planInclude = { permissions: { include: { permission: true } }, features: { include: { feature: { include: { permissions: { include: { permission: true } } } } }, orderBy: { sortOrder: "asc" as const } } };
const safeUser = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;
const admin = (roles: string[]) => roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
const fail = (status: number, message: string, code?: string): never => { throw { status, message, ...(code ? { code } : {}) }; };

const FREE_PLAN_SLUG = "FREE";
const DEFAULT_FREE_SUBSCRIPTION_NOTE = "system:default-free-subscription";
const DUMMY_PLAN_SLUGS = new Set(["FREE", "BASIC", "ADVANCE", "ENTERPRISE"]);
const FREE_FEATURE_KEYS = new Set(["customer_management", "booking_management", "dashboard", "service_management", "staff_management", "posts", "billing", "payment_wallet"]);
async function ensureVendorRolePermissions(tx: Prisma.TransactionClient) {
  // Creating a subscription must never grant product permissions.  This only
  // ensures the system role exists; the administrator remains responsible for
  // its RBAC assignments.
  return tx.role.upsert({ where: { name: "VENDOR" }, update: {}, create: { name: "VENDOR" } });
}

async function ensureFreePlan(tx: Prisma.TransactionClient) {
  const plan = await tx.subscriptionPlan.upsert({
    where: { slug: FREE_PLAN_SLUG },
    update: {
      name: "Free", monthlyPrice: 0, annualPrice: 0, currency: "INR",
      monthlyEnabled: true, annualEnabled: true, isActive: true, displayOrder: 1,
      ctaText: "Start Free", monthlyDescription: "Free", annualDescription: "Free",
    },
    create: {
      name: "Free", slug: FREE_PLAN_SLUG, description: "Free plan for every new vendor.",
      shortDescription: "Essential salon management features.", monthlyPrice: 0, annualPrice: 0,
      currency: "INR", monthlyEnabled: true, annualEnabled: true, isActive: true, displayOrder: 1,
      ctaText: "Start Free", monthlyDescription: "Free", annualDescription: "Free",
    },
  });

  const [paymentWalletFeature, legacyPaymentsFeature] = await Promise.all([
    tx.subscriptionFeature.findUnique({ where: { key: "payment_wallet" } }),
    tx.subscriptionFeature.findUnique({ where: { key: "payments" } }),
  ]);
  if (!paymentWalletFeature && legacyPaymentsFeature) {
    await tx.subscriptionFeature.update({
      where: { id: legacyPaymentsFeature.id },
      data: {
        key: "payment_wallet",
        displayName: "Payment & Wallet",
        description: "Payment processing, customer/vendor wallets, booking commissions, settlements, refunds and financial reporting.",
        featureText: "Payment & Wallet",
        isActive: true,
      },
    });
  } else if (paymentWalletFeature && legacyPaymentsFeature) {
    const legacyPlanFeatures = await tx.subscriptionPlanFeature.findMany({ where: { featureId: legacyPaymentsFeature.id } });
    for (const item of legacyPlanFeatures) {
      await tx.subscriptionPlanFeature.upsert({
        where: { planId_featureId: { planId: item.planId, featureId: paymentWalletFeature.id } },
        update: item.enabled ? { enabled: true } : {},
        create: {
          planId: item.planId,
          featureId: paymentWalletFeature.id,
          enabled: item.enabled,
          limits: item.limits === null ? Prisma.JsonNull : item.limits ?? undefined,
          sortOrder: item.sortOrder,
        },
      });
    }
    const legacyPermissions = await tx.subscriptionFeaturePermission.findMany({ where: { featureId: legacyPaymentsFeature.id } });
    for (const item of legacyPermissions) {
      await tx.subscriptionFeaturePermission.upsert({
        where: { featureId_permissionId: { featureId: paymentWalletFeature.id, permissionId: item.permissionId } },
        update: {},
        create: { featureId: paymentWalletFeature.id, permissionId: item.permissionId },
      });
    }
    await tx.subscriptionFeature.delete({ where: { id: legacyPaymentsFeature.id } });
  }

  for (let sortOrder = 0; sortOrder < SUBSCRIPTION_FEATURE_DEFINITIONS.length; sortOrder += 1) {
    const featureDefinition = SUBSCRIPTION_FEATURE_DEFINITIONS[sortOrder];
    const { key, displayName, permissions: permissionActions } = featureDefinition;
    const description = "description" in featureDefinition ? featureDefinition.description : undefined;
    const feature = await tx.subscriptionFeature.upsert({
      where: { key },
      update: { displayName, description, featureText: displayName, isActive: true, sortOrder },
      create: { key, displayName, description, featureText: displayName, isActive: true, sortOrder },
    });
    await tx.subscriptionPlanFeature.upsert({
      where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
      update: { enabled: FREE_FEATURE_KEYS.has(key), sortOrder },
      create: { planId: plan.id, featureId: feature.id, enabled: FREE_FEATURE_KEYS.has(key), sortOrder },
    });
    for (const action of permissionActions) {
      const permission = await tx.permission.upsert({ where: { action }, update: {}, create: { action, description: `Access ${action}` } });
      await tx.subscriptionFeaturePermission.upsert({ where: { featureId_permissionId: { featureId: feature.id, permissionId: permission.id } }, update: {}, create: { featureId: feature.id, permissionId: permission.id } });
      if (FREE_FEATURE_KEYS.has(key)) {
        await tx.subscriptionPlanPermission.upsert({ where: { planId_permissionId_userType: { planId: plan.id, permissionId: permission.id, userType: "VENDOR" } }, update: {}, create: { planId: plan.id, permissionId: permission.id, userType: "VENDOR" } });
      }
    }
  }

  return plan;
}

async function ensureDefaultVendorSubscriptionInTransaction(
  tx: Prisma.TransactionClient,
  vendorId: string,
  salonId?: string,
) {
  await ensureVendorRolePermissions(tx);
  const plan = await ensureFreePlan(tx);
  const now = new Date();
  // Make expired records historical before resolving a current subscription.
  // This preserves history while ensuring an expired plan cannot block FREE.
  await tx.subscription.updateMany({
    where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  const current = await tx.subscription.findFirst({
    where: {
      vendorId,
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  // A paid or otherwise valid current subscription is always preserved.
  if (current) {
    // A vendor can complete salon onboarding after the default subscription
    // was created. Link that existing current subscription once a salon exists
    // without replacing a paid plan or modifying its billing state.
    if (salonId && !current.salonId) {
      return tx.subscription.update({ where: { id: current.id }, data: { salonId } });
    }
    return current;
  }

  return tx.subscription.create({
    data: {
      vendorId, salonId, planId: plan.id, billingCycle: "MONTHLY", status: "ACTIVE",
      amount: 0, currency: plan.currency, startsAt: now, expiresAt: null,
      notes: DEFAULT_FREE_SUBSCRIPTION_NOTE,
    },
  });
}

/**
 * Idempotently repairs vendor RBAC and guarantees one usable FREE subscription.
 * Existing active subscriptions are returned unchanged.
 */
export async function ensureDefaultVendorSubscription(vendorId: string, salonId?: string, transaction?: Prisma.TransactionClient) {
  if (transaction) return ensureDefaultVendorSubscriptionInTransaction(transaction, vendorId, salonId);

  const now = new Date();
  const existing = await prisma.subscription.findFirst({
    where: {
      vendorId,
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (salonId && !existing.salonId) {
      return prisma.subscription.update({ where: { id: existing.id }, data: { salonId } });
    }
    return existing;
  }

  // Serializable retries make concurrent login/registration calls safe while
  // retaining the existing historical-subscription data model.
  let result: Awaited<ReturnType<typeof ensureDefaultVendorSubscriptionInTransaction>> | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      result = await prisma.$transaction(
        (tx) => ensureDefaultVendorSubscriptionInTransaction(tx, vendorId, salonId),
        { isolationLevel: "Serializable" },
      );
      break;
    } catch (error: any) {
      if (error?.code !== "P2034" || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1) + Math.floor(Math.random() * 50)));
    }
  }
  if (!transaction) {
    await invalidateSubscriptionAccess(vendorId);
  }
  return result!;
}

function amountInPaise(amount: number) { return Math.round(amount * 100); }
function invoiceNumber() { return `INV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
async function invalidateSubscriptionAccess(vendorId: string) {
  await Promise.all([
    cacheInvalidate("rbac:perms:*") ,
    cacheInvalidate("menus:*") ,
    cacheInvalidate(`subscription:${vendorId}:*`),
  ]);
}

export async function listPlans(includeInactive = false) {
  const where: Prisma.SubscriptionPlanWhereInput = includeInactive
    ? { NOT: { slug: { in: ["free", "Free"] } } }
    : { isActive: true, slug: { in: ["FREE", "BASIC", "ADVANCE", "ENTERPRISE"] } };
  return prisma.subscriptionPlan.findMany({ where, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], include: planInclude });
}
export async function getPlan(id: string) { const plan = await prisma.subscriptionPlan.findUnique({ where: { id }, include: planInclude }); if (!plan) fail(404, "Plan not found", "PLAN_NOT_FOUND"); return plan!; }
export async function createPlan(input: any) {
  const { features, ...data } = input;
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.subscriptionPlan.create({ data });
    if (features?.length) await tx.subscriptionPlanFeature.createMany({ data: features.map((item: any) => ({ ...item, planId: created.id })) });
    return tx.subscriptionPlan.findUnique({ where: { id: created.id }, include: planInclude });
  });
  await invalidateSubscriptionAccess("*");
  return plan;
}
export async function updatePlan(id: string, input: any) {
  const { features, ...data } = input;
  const plan = await prisma.$transaction(async (tx) => {
    await tx.subscriptionPlan.update({ where: { id }, data });
    if (features) {
      await tx.subscriptionPlanFeature.deleteMany({ where: { planId: id } });
      if (features.length) await tx.subscriptionPlanFeature.createMany({ data: features.map((item: any) => ({ ...item, planId: id })) });
    }
    return tx.subscriptionPlan.findUnique({ where: { id }, include: planInclude });
  });
  await invalidateSubscriptionAccess("*");
  return plan;
}
export async function setPlanStatus(id: string, isActive: boolean) {
  const plan = await prisma.subscriptionPlan.update({ where: { id }, data: { isActive }, include: planInclude });
  await invalidateSubscriptionAccess("*");
  return plan;
}
export async function deletePlan(id: string) {
  const used = await prisma.subscription.count({ where: { planId: id } });
  if (used) fail(409, "Plans used by subscriptions cannot be deleted; deactivate the plan instead");
  return prisma.subscriptionPlan.delete({ where: { id } });
}
export async function listFeatures(includeInactive = false) { return prisma.subscriptionFeature.findMany({ where: includeInactive ? undefined : { isActive: true }, orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] }); }
export async function createFeature(input: any, actorId: string) {
  const feature = await prisma.subscriptionFeature.create({ data: { ...input, createdById: actorId } });
  await invalidateSubscriptionAccess("*");
  return feature;
}
export async function updateFeature(id: string, input: any) {
  const feature = await prisma.subscriptionFeature.update({ where: { id }, data: input });
  await invalidateSubscriptionAccess("*");
  return feature;
}

export async function subscriptionMenuIds(vendorId: string, userType: SubscriptionAccessUserType = "VENDOR") {
  const subscription = await currentSubscription(vendorId);
  if (!subscription) return [];
  const rows = await prisma.subscriptionPlanMenu.findMany({ where: { planId: subscription.planId, userType }, select: { menuId: true, enabled: true } });
  let effectiveRows = rows;
  if (userType === "STAFF") {
    if (rows.length === 0) {
      effectiveRows = await prisma.subscriptionPlanMenu.findMany({ where: { planId: subscription.planId, userType: "VENDOR" }, select: { menuId: true, enabled: true } });
    }
  }
  const hasExplicitMenuAssignments = effectiveRows.length > 0;
  const enabledMenuIds = new Set(effectiveRows.filter(({ enabled }) => enabled).map(({ menuId }) => menuId));
  const paymentWalletEnabled = subscription.plan.features.some(
    ({ enabled, feature }) => enabled && feature.isActive && feature.key === "payment_wallet",
  );
  if (paymentWalletEnabled) {
    const featurePermissions = await prisma.subscriptionFeaturePermission.findMany({
      where: { feature: { key: "payment_wallet", isActive: true } },
      select: { permissionId: true },
    });
    const menuLinks = featurePermissions.length
      ? await prisma.menuPermission.findMany({
        where: { permissionId: { in: featurePermissions.map(({ permissionId }) => permissionId) } },
        select: { menuId: true, menu: { select: { parentId: true } } },
      })
      : [];
    for (const { menuId, menu } of menuLinks) {
      enabledMenuIds.add(menuId);
      if (menu.parentId) enabledMenuIds.add(menu.parentId);
    }
  }
  return hasExplicitMenuAssignments ? [...enabledMenuIds] : undefined;
}

export async function subscriptionOwnerIdForUser(userId: string, userType: SubscriptionAccessUserType = "VENDOR", salonId?: string) {
  if (userType === "VENDOR") return userId;
  const membership = await prisma.salonStaff.findFirst({ where: { userId, isActive: true, ...(salonId ? { salonId } : {}) }, orderBy: { createdAt: "asc" }, select: { salon: { select: { ownerId: true } } } });
  return membership?.salon.ownerId;
}

export async function subscriptionRoleIdForUser(userId: string, userType: SubscriptionAccessUserType = "VENDOR", salonId?: string) {
  if (userType === "VENDOR") {
    const role = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          OR: [
            { name: "VENDOR" },
            { name: { contains: "Vendor", mode: "insensitive" } },
          ],
        },
      },
      select: { roleId: true },
    });
    return role?.roleId;
  }
  const staff = await prisma.salonStaff.findFirst({ where: { userId, isActive: true, ...(salonId ? { salonId } : {}) }, orderBy: { createdAt: "asc" }, select: { staffRoleId: true } });
  return staff?.staffRoleId ?? (await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        OR: [
          { name: "STAFF" },
          { name: { contains: "Staff", mode: "insensitive" } },
          { name: { contains: "Stylist", mode: "insensitive" } },
        ],
      },
    },
    select: { roleId: true },
  }))?.roleId;
}

async function requirePlan(planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true, name: true } });
  if (!plan) fail(404, "Subscription plan not found", "PLAN_NOT_FOUND");
  return plan;
}

export async function listPlanMenus(planId: string, userType: SubscriptionAccessUserType = "VENDOR") {
  const plan = await requirePlan(planId);
  const [menus, assignments] = await Promise.all([
    prisma.menu.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }, { label: "asc" }], select: { id: true, label: true, path: true, icon: true, parentId: true, order: true } }),
    prisma.subscriptionPlanMenu.findMany({ where: { planId, userType }, select: { menuId: true, enabled: true } }),
  ]);
  const enabled = new Map(assignments.map((item) => [item.menuId, item.enabled]));
  return { plan, menus: menus.map((menu) => ({ ...menu, name: menu.label, enabled: enabled.get(menu.id) ?? false })) };
}

export async function listPlanModules(planId: string, userType: SubscriptionAccessUserType = "VENDOR") {
  const result = await listPlanMenus(planId, userType);
  const menuById = new Map(result.menus.map((menu) => [menu.id, menu]));
  return { plan: result.plan, modules: result.menus.filter((menu) => menu.parentId).map((module) => ({ menuId: module.parentId, moduleId: module.id, menuName: menuById.get(module.parentId!)?.label, moduleName: module.label, enabled: module.enabled })) };
}

export async function getPlanAccess(planId: string) {
  const plan = await requirePlan(planId);
  const [menus, permissions, menuLinks, permissionLinks] = await Promise.all([
    prisma.menu.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }, { label: "asc" }], select: { id: true, label: true, path: true, icon: true, parentId: true, order: true, menuPermissions: { select: { permissionId: true, permission: { select: { id: true, action: true, description: true } } } } } }),
    prisma.permission.findMany({ orderBy: { action: "asc" }, select: { id: true, action: true, description: true } }),
    prisma.subscriptionPlanMenu.findMany({ where: { planId }, select: { menuId: true, userType: true, enabled: true } }),
    prisma.subscriptionPlanPermission.findMany({ where: { planId }, select: { permissionId: true, userType: true } }),
  ]);
  const menuState = (userType: SubscriptionAccessUserType) => {
    const states = new Map(menuLinks.filter((item) => item.userType === userType).map((item) => [item.menuId, item.enabled]));
    const nodes = menus.map((menu) => ({ menuId: menu.id, name: menu.label, path: menu.path, parentId: menu.parentId, enabled: states.get(menu.id) ?? false, modules: [] as any[], permissions: menu.menuPermissions.map(({ permission }) => ({ ...permission, enabled: permissionLinks.some((item) => item.userType === userType && item.permissionId === permission.id) })) }));
    const byId = new Map(nodes.map((node) => [node.menuId, node]));
    for (const node of nodes) if (node.parentId) byId.get(node.parentId)?.modules.push({ moduleId: node.menuId, name: node.name, enabled: node.enabled, permissions: node.permissions });
    return nodes.filter((node) => !node.parentId).map((node) => ({ ...node, enabled: node.enabled || node.modules.some((module) => module.enabled) }));
  };
  return { plan, access: { vendor: menuState("VENDOR"), staff: menuState("STAFF") }, permissions: { vendor: permissions.map((permission) => ({ ...permission, enabled: permissionLinks.some((item) => item.userType === "VENDOR" && item.permissionId === permission.id) })), staff: permissions.map((permission) => ({ ...permission, enabled: permissionLinks.some((item) => item.userType === "STAFF" && item.permissionId === permission.id) })) } };
}

type AccessRole = { id: string; name: string; kind: "ROLE" | "STAFF_ROLE"; userType: SubscriptionAccessUserType };
async function resolveAccessRole(roleId: string): Promise<AccessRole> {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } });
  if (role) return { ...role, kind: "ROLE", userType: role.name.toUpperCase().includes("VENDOR") ? "VENDOR" : "STAFF" };
  const staffRole = await prisma.staffRole.findUnique({ where: { id: roleId }, select: { id: true, name: true } });
  if (staffRole) return { ...staffRole, kind: "STAFF_ROLE", userType: "STAFF" };
  fail(404, "Role not found", "ROLE_NOT_FOUND");
  throw new Error("Unreachable role resolution");
}

export async function getPlanRolePermissionActions(planId: string, roleId: string) {
  const role = await resolveAccessRole(roleId);
  const rows = await prisma.subscriptionPlanRolePermission.findMany({ where: { planId, ...(role.kind === "ROLE" ? { roleId } : { staffRoleId: roleId }) }, include: { permission: true } });
  if (rows.length) return { role, configured: true, actions: new Set(rows.filter((row) => row.enabled).map((row) => row.permission.action)) };
  const planRows = await prisma.subscriptionPlanPermission.findMany({ where: { planId, userType: role.userType }, include: { permission: true } });
  return { role, configured: false, actions: new Set(planRows.map((row) => row.permission.action)) };
}

const actionSuffix = (action: string) => action.toLowerCase().replace(/_/g, "");
const actionPermission = (permissions: Array<{ id: string; action: string }>, action: string) => permissions.find((permission) => actionSuffix(permission.action.split(".").pop() ?? "") === actionSuffix(action));

function requireMatchingAccessUserType(role: AccessRole, userType?: SubscriptionAccessUserType) {
  if (userType && role.userType !== userType) {
    fail(422, "The selected role is not valid for this user type", "INVALID_ROLE_USER_TYPE");
  }
}

export async function getAccessControl(planId: string, roleId: string, userType?: SubscriptionAccessUserType) {
  const plan = await requirePlan(planId);
  const { role } = await getPlanRolePermissionActions(planId, roleId);
  requireMatchingAccessUserType(role, userType);
  const rolePermissions = role.kind === "ROLE"
    ? await prisma.rolePermission.findMany({ where: { roleId }, include: { permission: true } })
    : await prisma.staffRolePermission.findMany({ where: { staffRoleId: roleId }, include: { permission: true } });
  const rolePermissionLinks = await prisma.subscriptionPlanRolePermission.findMany({
    where: { planId, ...(role.kind === "ROLE" ? { roleId } : { staffRoleId: roleId }) },
    select: { permissionId: true, enabled: true },
  });
  const rolePermissionStates = new Map(rolePermissionLinks.map(({ permissionId, enabled }) => [permissionId, enabled]));
  const roleActions = new Set(rolePermissions.map(({ permission }) => permission.action));
  const menus = await prisma.menu.findMany({ where: { parentId: null }, orderBy: { order: "asc" }, include: { menuPermissions: { include: { permission: { select: { id: true, action: true, description: true } } } }, children: { orderBy: { order: "asc" }, include: { menuPermissions: { include: { permission: { select: { id: true, action: true, description: true } } } } } } } });
  const mapNode = (node: any) => {
    const permissions = node.menuPermissions.map(({ permission }: any) => ({
      id: permission.id,
      action: permission.action,
      enabled: rolePermissionStates.has(permission.id)
        ? rolePermissionStates.get(permission.id)
        : roleActions.has(permission.action),
    }));
    const children: any[] = (node.children ?? []).map(mapNode);
    const anyChildOrPermEnabled = permissions.some((p: any) => p.enabled) || children.some((c: any) => c.enabled);
    return {
      id: node.id,
      name: node.label,
      path: node.path,
      enabled: anyChildOrPermEnabled,
      permissions,
      children,
    };
  };
  return { plan, userType: role.userType, role, menus: menus.map(mapNode) };
}

export async function replaceAccessControl(actorId: string, planId: string, roleId: string, entries: any[], userType?: SubscriptionAccessUserType) {
  const role = await resolveAccessRole(roleId);
  requireMatchingAccessUserType(role, userType);
  await requirePlan(planId);
  const requested = new Set<string>();
  const scopedPermissionIds = new Set<string>();
  for (const entry of entries) {
    const targetId = entry.moduleId ?? entry.submenuId ?? entry.menuId;
    const target = await prisma.menu.findUnique({ where: { id: targetId }, include: { menuPermissions: { select: { permissionId: true, permission: { select: { id: true, action: true } } } } } });
    if (!target) fail(422, "Invalid menu or module", "INVALID_PERMISSION");
    for (const [action, enabled] of Object.entries(entry.actions ?? {})) {
      const permission = actionPermission(target!.menuPermissions.map(({ permission }) => permission), action);
      if (!permission) fail(422, `Permission action ${action} is not defined for this menu`, "INVALID_PERMISSION");
      const permissionId = permission?.id;
      if (permissionId) scopedPermissionIds.add(permissionId);
      if (enabled && permissionId) requested.add(permissionId);
    }
  }
  await prisma.$transaction(async (tx) => {
    const roleWhere = { planId, ...(role.kind === "ROLE" ? { roleId } : { staffRoleId: roleId }) };
    const existing = await tx.subscriptionPlanRolePermission.findMany({
      where: roleWhere,
      select: { permissionId: true, enabled: true },
    });
    const existingState = new Map(existing.map(({ permissionId, enabled }) => [permissionId, enabled]));
    await tx.subscriptionPlanRolePermission.deleteMany({ where: roleWhere });
    if (scopedPermissionIds.size) {
      await tx.subscriptionPlanRolePermission.createMany({
        data: [...scopedPermissionIds].map((permissionId) => ({
          planId,
          ...(role.kind === "ROLE" ? { roleId } : { staffRoleId: roleId }),
          permissionId,
          accessKey: `${planId}:${roleId}:${permissionId}`,
          enabled: requested.has(permissionId),
        })),
      });
    }
    const enabledPermissionIds = [...requested];
    const previousEnabledPermissionIds = [...existingState].filter(([, enabled]) => enabled).map(([permissionId]) => permissionId);
    if (existingState.size !== scopedPermissionIds.size
      || [...scopedPermissionIds].some((permissionId) => existingState.get(permissionId) !== requested.has(permissionId))) {
      await tx.subscriptionAuditLog.create({ data: { actorId, action: "UPDATE_SUBSCRIPTION_PLAN_ROLE_ACCESS", targetType: role.kind, targetId: roleId, details: { planId, roleId, previousEnabledPermissionIds, enabledPermissionIds } } });
    }
  });
  await invalidateSubscriptionAccess("*");
  await cacheInvalidate("rbac:perms:*");
  await cacheInvalidate("menus:*");
  return getAccessControl(planId, roleId, userType);
}

async function replacePlanPermissionsForAccess(tx: Prisma.TransactionClient, planId: string, userType: SubscriptionAccessUserType, assignments: Array<{ permissionId: string; enabled: boolean }>, actorId: string) {
  const ids = [...new Set(assignments.map((item) => item.permissionId))];
  const valid = await tx.permission.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (valid.length !== ids.length) fail(400, "One or more permissions do not exist", "PERMISSION_NOT_FOUND");
  const requested = new Map(assignments.map((item) => [item.permissionId, item.enabled]));
  const existing = await tx.subscriptionPlanPermission.findMany({ where: { planId, userType }, select: { permissionId: true } });
  const existingIds = new Set(existing.map((item) => item.permissionId));
  await tx.subscriptionPlanPermission.deleteMany({ where: { planId, userType } });
  const enabled = ids.filter((id) => requested.get(id));
  if (enabled.length) await tx.subscriptionPlanPermission.createMany({ data: enabled.map((permissionId) => ({ planId, permissionId, userType })), skipDuplicates: true });
  if (existingIds.size !== new Set(enabled).size || [...existingIds].some((id) => !enabled.includes(id))) await tx.subscriptionAuditLog.create({ data: { actorId, action: "UPDATE_SUBSCRIPTION_PLAN_PERMISSIONS", targetType: "SUBSCRIPTION_PLAN", targetId: planId, details: { planId, userType, oldPermissionIds: [...existingIds], newPermissionIds: enabled } } });
}

export async function replacePlanAccess(actorId: string, planId: string, input: any) {
  await requirePlan(planId);
  await prisma.$transaction(async (tx) => {
    for (const userType of ["VENDOR", "STAFF"] as const) {
      const group = input[userType.toLowerCase()];
      await replacePlanPermissionsForAccess(tx, planId, userType, group.permissions, actorId);
      const menuValues = new Map(group.menus.map((item: any) => [item.menuId, item.enabled]));
      for (const item of group.modules) menuValues.set(item.moduleId, item.enabled);
      const allMenus = await tx.menu.findMany({ select: { id: true, parentId: true } });
      const requested = new Set([...group.menus.map((item: any) => item.menuId), ...group.modules.map((item: any) => item.moduleId)]);
      for (const item of group.modules) {
        const module = allMenus.find((menu) => menu.id === item.moduleId);
        if (!module || module.parentId !== item.menuId) fail(400, "Module is not a child of the selected menu", "MODULE_NOT_FOUND");
      }
      for (const menu of allMenus) {
        if (!requested.has(menu.id) && group.menus.length) menuValues.set(menu.id, false);
        const enabled = Boolean(menuValues.get(menu.id) ?? false);
        const previous = await tx.subscriptionPlanMenu.findUnique({ where: { planId_menuId_userType: { planId, menuId: menu.id, userType } }, select: { enabled: true } });
        if ((previous?.enabled ?? false) !== enabled) await tx.subscriptionAuditLog.create({ data: { actorId, action: "UPDATE_SUBSCRIPTION_PLAN_ACCESS", targetType: "SUBSCRIPTION_PLAN_MENU", targetId: menu.id, details: { planId, menuId: menu.id, userType, oldEnabled: previous?.enabled ?? false, newEnabled: enabled } } });
        await tx.subscriptionPlanMenu.upsert({ where: { planId_menuId_userType: { planId, menuId: menu.id, userType } }, update: { enabled }, create: { planId, menuId: menu.id, userType, enabled } });
      }
      for (const child of allMenus.filter((menu) => menu.parentId)) {
        if (menuValues.get(child.id)) await tx.subscriptionPlanMenu.update({ where: { planId_menuId_userType: { planId, menuId: child.parentId!, userType } }, data: { enabled: true } });
      }
    }
  });
  await invalidateSubscriptionAccess("*");
  return getPlanAccess(planId);
}

async function replacePlanMenuAssignments(actorId: string, planId: string, assignments: Array<{ menuId: string; enabled: boolean }>, action: string, userType: SubscriptionAccessUserType = "VENDOR") {
  await requirePlan(planId);
  const ids = [...new Set(assignments.map(({ menuId }) => menuId))];
  const menus = await prisma.menu.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (menus.length !== ids.length) fail(400, "One or more menus do not exist", "MENU_NOT_FOUND");
  const values = new Map(assignments.map((item) => [item.menuId, item.enabled]));
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.subscriptionPlanMenu.findMany({ where: { planId, userType }, select: { menuId: true, enabled: true } });
    const existingMap = new Map(existing.map((item) => [item.menuId, item.enabled]));
    const allMenus = await tx.menu.findMany({ select: { id: true } });
    for (const menu of allMenus) {
      const enabled = values.get(menu.id) ?? false;
      if (existingMap.get(menu.id) !== enabled) {
        await tx.subscriptionAuditLog.create({ data: { actorId, action, targetType: "SUBSCRIPTION_PLAN_MENU", targetId: menu.id, details: { planId, menuId: menu.id, userType, oldEnabled: existingMap.get(menu.id) ?? false, newEnabled: enabled } } });
      }
      await tx.subscriptionPlanMenu.upsert({ where: { planId_menuId_userType: { planId, menuId: menu.id, userType } }, update: { enabled }, create: { planId, menuId: menu.id, userType, enabled } });
    }
    return tx.subscriptionPlanMenu.findMany({ where: { planId, userType }, orderBy: { createdAt: "asc" } });
  });
  await invalidateSubscriptionAccess("*");
  return result;
}

export async function replacePlanMenus(actorId: string, planId: string, assignments: Array<{ menuId: string; enabled: boolean }>, userType: SubscriptionAccessUserType = "VENDOR") {
  return replacePlanMenuAssignments(actorId, planId, assignments, "UPDATE_SUBSCRIPTION_PLAN_MENU_ENTITLEMENTS", userType);
}

export async function replacePlanModules(actorId: string, planId: string, assignments: Array<{ menuId: string; moduleId: string; enabled: boolean }>, userType: SubscriptionAccessUserType = "VENDOR") {
  await requirePlan(planId);
  const modules = await Promise.all(assignments.map(async ({ menuId, moduleId, enabled }) => {
    const module = await prisma.menu.findUnique({ where: { id: moduleId }, select: { id: true, parentId: true } });
    if (!module || module.parentId !== menuId) fail(400, "Module is not a child of the selected menu", "MODULE_NOT_FOUND");
    return { menuId: moduleId, enabled };
  }));
  await prisma.$transaction(async (tx) => {
    for (const assignment of modules) {
      const previous = await tx.subscriptionPlanMenu.findUnique({ where: { planId_menuId_userType: { planId, menuId: assignment.menuId, userType } }, select: { enabled: true } });
      if ((previous?.enabled ?? false) !== assignment.enabled) {
        await tx.subscriptionAuditLog.create({ data: { actorId, action: "UPDATE_SUBSCRIPTION_PLAN_MODULE_ENTITLEMENTS", targetType: "SUBSCRIPTION_PLAN_MENU", targetId: assignment.menuId, details: { planId, menuId: assignment.menuId, userType, oldEnabled: previous?.enabled ?? false, newEnabled: assignment.enabled } } });
      }
      await tx.subscriptionPlanMenu.upsert({ where: { planId_menuId_userType: { planId, menuId: assignment.menuId, userType } }, update: { enabled: assignment.enabled }, create: { planId, menuId: assignment.menuId, userType, enabled: assignment.enabled } });
    }
  });
  await invalidateSubscriptionAccess("*");
  return listPlanModules(planId, userType);
}

export async function currentSubscription(vendorId: string) {
  const now = new Date();
  // Expired subscriptions cannot shadow an older valid paid subscription.
  // `ensureDefaultVendorSubscription` uses the same definition of current,
  // which keeps retries idempotent and never downgrades a valid plan.
  return prisma.subscription.findFirst({
    where: {
      vendorId,
      plan: { isActive: true },
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    include: { plan: { include: planInclude }, vendor: { select: safeUser }, salon: { select: { id: true, name: true, parentId: true } } },
  });
}

export async function getSubscriptionPermissionActions(vendorId: string, userType: SubscriptionAccessUserType = "VENDOR", roleId?: string) {
  const subscription = await currentSubscription(vendorId);
  if (!subscription) return [];
  let permissionUserType = userType;
  const targetRoleId = roleId ?? (await subscriptionRoleIdForUser(vendorId, userType));
  let direct = await prisma.subscriptionPlanPermission.findMany({ where: { planId: subscription.planId, userType: permissionUserType }, include: { permission: true } });
  if (userType === "STAFF" && direct.length === 0) {
    permissionUserType = "VENDOR";
    direct = await prisma.subscriptionPlanPermission.findMany({ where: { planId: subscription.planId, userType: "VENDOR" }, include: { permission: true } });
  }
  let menuUserType = userType;
  const [allFeaturePermissions, initialPlanMenus] = await Promise.all([
    prisma.subscriptionFeaturePermission.findMany({
      where: { feature: { isActive: true } },
      select: { permission: { select: { action: true } } },
    }),
    prisma.subscriptionPlanMenu.findMany({
      where: { planId: subscription.planId, userType: menuUserType },
      select: {
        menuId: true,
        enabled: true,
        menu: { select: { menuPermissions: { select: { permission: { select: { action: true } } } } } },
      },
    }),
  ]);
  let effectivePlanMenus = initialPlanMenus;
  if (userType === "STAFF" && initialPlanMenus.length === 0) {
    menuUserType = "VENDOR";
    effectivePlanMenus = await prisma.subscriptionPlanMenu.findMany({
      where: { planId: subscription.planId, userType: "VENDOR" },
      select: {
        menuId: true,
        enabled: true,
        menu: { select: { menuPermissions: { select: { permission: { select: { action: true } } } } } },
      },
    });
  }

  const featureControlledActions = new Set(allFeaturePermissions.map(({ permission }) => permission.action));
  const enabledFeatureActions = new Set(subscription.plan.features
    .filter((item) => item.enabled && item.feature.isActive)
    .flatMap((item) => item.feature.permissions.map(({ permission }) => permission.action)));
  const menuControlledActions = new Set(effectivePlanMenus.flatMap(({ menu }) => menu.menuPermissions.map(({ permission }) => permission.action)));
  const enabledMenuActions = new Set(effectivePlanMenus
    .filter(({ enabled }) => enabled)
    .flatMap(({ menu }) => menu.menuPermissions.map(({ permission }) => permission.action)));
  const directActions = new Set(direct.map(({ permission }) => permission.action));
  const hasConfiguredPermissionAllowList = direct.length > 0;
  const actions = new Set(hasConfiguredPermissionAllowList
    ? directActions
    : [...enabledFeatureActions, ...enabledMenuActions]);
  const enabledPaymentWalletActions = subscription.plan.features
    .filter((item) => item.enabled && item.feature.isActive && item.feature.key === "payment_wallet")
    .flatMap((item) => item.feature.permissions.map(({ permission }) => permission.action));
  for (const action of enabledPaymentWalletActions) actions.add(action);

  for (const action of actions) {
    if (featureControlledActions.has(action) && !enabledFeatureActions.has(action)) actions.delete(action);
    if (menuControlledActions.has(action) && !enabledMenuActions.has(action) && !enabledPaymentWalletActions.includes(action)) actions.delete(action);
  }
  if (targetRoleId) {
    const scoped = await getPlanRolePermissionActions(subscription.planId, targetRoleId);
    if (scoped.role.userType === userType && scoped.configured) {
      for (const action of actions) {
        if (!scoped.actions.has(action)) actions.delete(action);
      }
    }
  }
  return [...actions];
}
export async function hasFeature(vendorId: string, key: string) {
  const subscription = await currentSubscription(vendorId);
  const feature = subscription?.plan.features.find((item) => item.feature.key === key);
  return Boolean(feature?.enabled && feature.feature.isActive);
}
export async function featureAccess(vendorId: string) {
  const subscription = await currentSubscription(vendorId);
  return {
    subscription,
    features: subscription?.plan.features.filter((item) => item.enabled && item.feature.isActive) ?? [],
  };
}

export async function ensureAiImageGenerationPermission() {
  const definition = SUBSCRIPTION_FEATURE_DEFINITIONS.find(({ key }) => key === "service_ai_images");
  if (!definition) fail(503, "AI image generation feature is not configured", "AI_IMAGE_PERMISSION_NOT_CONFIGURED");
  const action = "services.ai-image.generate";
  const permission = await prisma.permission.upsert({
    where: { action },
    update: { description: "Generate service and combo images with AI" },
    create: { action, description: "Generate service and combo images with AI" },
  });
  const feature = await prisma.subscriptionFeature.upsert({
    where: { key: definition!.key },
    update: {
      displayName: definition!.displayName,
      description: "description" in definition! ? definition!.description : undefined,
      featureText: definition!.displayName,
      isActive: true,
    },
    create: {
      key: definition!.key,
      displayName: definition!.displayName,
      description: "description" in definition! ? definition!.description : undefined,
      featureText: definition!.displayName,
      isActive: true,
    },
  });
  await prisma.subscriptionFeaturePermission.upsert({
    where: { featureId_permissionId: { featureId: feature.id, permissionId: permission.id } },
    update: {},
    create: { featureId: feature.id, permissionId: permission.id },
  });
  const adminRoles = await prisma.role.findMany({
    where: { name: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true },
  });
  for (const role of adminRoles) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  await cacheInvalidate("rbac:perms:*");
  return permission.id;
}

async function activateFreeInTransaction(tx: Prisma.TransactionClient, vendorId: string, plan: any, billingCycle: "MONTHLY" | "ANNUAL", salonId?: string) {
  const now = new Date();
  const existingFree = await tx.subscription.findFirst({
    where: { vendorId, plan: { slug: FREE_PLAN_SLUG }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (existingFree) return tx.subscription.update({ where: { id: existingFree.id }, data: { amount: 0, expiresAt: null, salonId: salonId ?? existingFree.salonId, billingCycle, cancelledAt: null, cancellationReason: null }, include: { plan: { include: planInclude } } });

  const subscription = await tx.subscription.create({ data: { vendorId, salonId, planId: plan.id, billingCycle, amount: 0, currency: plan.currency, startsAt: now, expiresAt: null, status: "ACTIVE", notes: DEFAULT_FREE_SUBSCRIPTION_NOTE } });
  const payment = await tx.subscriptionPayment.create({ data: { subscriptionId: subscription.id, vendorId, planId: plan.id, amount: 0, currency: plan.currency, status: "SUCCESS", providerReference: "FREE / NO_PAYMENT", paidAt: now } });
  await tx.subscriptionInvoice.create({ data: { invoiceNumber: invoiceNumber(), subscriptionId: subscription.id, paymentId: payment.id, vendorId, amount: 0, currency: plan.currency, status: "PAID", issuedAt: now, paidAt: now } });
  return tx.subscription.findUnique({ where: { id: subscription.id }, include: { plan: { include: planInclude } } });
}
async function activateFree(vendorId: string, plan: any, billingCycle: "MONTHLY" | "ANNUAL", salonId?: string) {
  return prisma.$transaction((tx) => activateFreeInTransaction(tx, vendorId, plan, billingCycle, salonId), { isolationLevel: "Serializable" });
}
export async function checkout(vendorId: string, planId: string, billingCycle: "MONTHLY" | "ANNUAL") {
  const selectedPlan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true }, include: planInclude });
  if (!selectedPlan) fail(404, "Active plan not found", "PLAN_NOT_FOUND");
  const plan = selectedPlan!;
  if (billingCycle === "MONTHLY" && !plan.monthlyEnabled) fail(400, "Monthly billing is unavailable for this plan");
  if (billingCycle === "ANNUAL" && !plan.annualEnabled) fail(400, "Annual billing is unavailable for this plan");
  const amount = billingCycle === "MONTHLY" ? plan.monthlyPrice : plan.annualPrice;
  const existing = await currentSubscription(vendorId);
  if (plan.slug === FREE_PLAN_SLUG || amount === 0) {
    const salonId = existing?.salonId ?? undefined;
    if (existing?.plan.slug === FREE_PLAN_SLUG) return { free: true, message: "Free plan activated", subscription: existing };
    if (existing?.plan.slug && existing.plan.slug !== FREE_PLAN_SLUG) {
      const subscription = await prisma.$transaction(async (tx) => {
        await tx.subscription.update({ where: { id: existing.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Changed to Free plan" } });
        return activateFreeInTransaction(tx, vendorId, plan, billingCycle, salonId);
      }, { isolationLevel: "Serializable" });
      await invalidateSubscriptionAccess(vendorId);
      return { free: true, message: "Free plan activated", subscription };
    }
    return { free: true, message: "Free plan activated", subscription: await activateFree(vendorId, plan, billingCycle, salonId) };
  }
  if (existing?.plan.slug === plan.slug && existing.status === "ACTIVE") fail(409, "Vendor already has this active subscription", "DUPLICATE_ACTIVE_SUBSCRIPTION");
  const { client, config } = await createRazorpayClient("PLATFORM");
  const pending = await prisma.subscription.findFirst({
    where: {
      vendorId,
      planId: plan.id,
      billingCycle,
      status: "INACTIVE",
      payments: { some: { status: { in: ["CREATED", "PENDING"] } } },
    },
    orderBy: { createdAt: "desc" },
    include: { payments: { where: { status: { in: ["CREATED", "PENDING"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const pendingPayment = pending?.payments[0];
  if (pending && pendingPayment?.razorpayOrderId) {
    return {
      free: false,
      keyId: config.keyId,
      orderId: pendingPayment.razorpayOrderId,
      amount: amountInPaise(pending.amount),
      currency: pending.currency,
      paymentId: pendingPayment.id,
      subscriptionId: pending.id,
      plan: { id: plan.id, name: plan.name, slug: plan.slug },
    };
  }
  const subscription = await prisma.subscription.create({ data: { vendorId, planId: plan.id, billingCycle, amount, currency: plan.currency, status: "INACTIVE" } });
  try {
    const order = await client.orders.create({ amount: amountInPaise(amount), currency: plan.currency, receipt: subscription.id, notes: { subscriptionId: subscription.id, planId: plan.id, vendorId, environment: config.environment } });
    const payment = await prisma.subscriptionPayment.create({ data: { subscriptionId: subscription.id, vendorId, planId: plan.id, amount, currency: plan.currency, status: "CREATED", razorpayOrderId: order.id } });
    return { free: false, keyId: config.keyId, orderId: order.id, amount: order.amount, currency: order.currency, paymentId: payment.id, subscriptionId: subscription.id, plan: { id: plan.id, name: plan.name, slug: plan.slug } };
  } catch (error) {
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "INACTIVE" } });
    throw error;
  }
}

/**
 * Switches between the local dummy plans without invoking Razorpay. It only
 * replaces a system-created dummy subscription; paid subscriptions continue
 * through the payment workflow and are never silently cancelled.
 */
export async function changeDummyPlan(vendorId: string, planId: string, billingCycle: "MONTHLY" | "ANNUAL") {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findFirst({ where: { id: planId, isActive: true }, include: planInclude });
    if (!plan) fail(404, "Active plan not found", "PLAN_NOT_FOUND");
    if (!DUMMY_PLAN_SLUGS.has(plan!.slug)) fail(400, "This plan must be changed through checkout.", "CHECKOUT_REQUIRED");
    if (billingCycle === "MONTHLY" && !plan!.monthlyEnabled) fail(400, "Monthly billing is unavailable for this plan");
    if (billingCycle === "ANNUAL" && !plan!.annualEnabled) fail(400, "Annual billing is unavailable for this plan");

    const existing = await tx.subscription.findFirst({
      where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" }, include: { plan: { select: { slug: true } } },
    });
    if (existing?.planId === plan!.id && existing.billingCycle === billingCycle) return currentSubscription(vendorId);
    const isSystemDummy = Boolean(existing?.notes?.startsWith("system:default-") && existing?.plan && (DUMMY_PLAN_SLUGS.has(existing.plan.slug) || existing.plan.slug === "free"));
    if (existing && !isSystemDummy) fail(409, "Your active paid subscription is unchanged. Use checkout to change plans.", "CHECKOUT_REQUIRED");

    if (existing) await tx.subscription.update({ where: { id: existing.id }, data: { status: "CANCELLED", cancelledAt: now, cancellationReason: `Changed to ${plan!.name}` } });
    const subscription = await tx.subscription.create({
      data: {
        vendorId, salonId: existing?.salonId ?? null, planId: plan!.id, billingCycle, status: "ACTIVE",
        amount: billingCycle === "ANNUAL" ? plan!.annualPrice : plan!.monthlyPrice, currency: plan!.currency,
        startsAt: now, expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), isManual: true,
        notes: `system:default-${plan!.slug.toLowerCase()}-subscription`,
      }, include: { plan: { include: planInclude }, vendor: { select: safeUser }, salon: { select: { id: true, name: true, parentId: true } } },
    });
    await tx.subscriptionAuditLog.create({ data: { vendorId, subscriptionId: subscription.id, action: "CHANGE_DUMMY_SUBSCRIPTION_PLAN", targetType: "SUBSCRIPTION", targetId: subscription.id, details: { previousSubscriptionId: existing?.id ?? null, planId: plan!.id, billingCycle } } });
    return subscription;
  }, { isolationLevel: "Serializable" });
}
export async function verifyPayment(vendorId: string, input: any) {
  const selectedPayment = await prisma.subscriptionPayment.findFirst({
    where: { razorpayOrderId: input.razorpayOrderId, vendorId },
    include: { subscription: { include: { plan: { include: planInclude } } } },
  });
  if (!selectedPayment) fail(404, "Payment transaction not found", "INVALID_PAYMENT");
  const payment = selectedPayment!;
  if (payment.status === "SUCCESS") {
    const existingActive = await currentSubscription(vendorId);
    return {
      ...payment,
      payment,
      subscription: existingActive,
    };
  }

  const config = await createRazorpayClient("PLATFORM");
  const expected = crypto.createHmac("sha256", config.config.keySecret).update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest("hex");
  const supplied = Buffer.from(input.razorpaySignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), supplied)) {
    fail(400, "Payment signature verification failed", "PAYMENT_VERIFICATION_FAILED");
  }

  let order: any;
  try {
    order = await config.client.orders.fetch(input.razorpayOrderId);
  } catch (_err: any) {
    console.error("[verifyPayment error fetching order]", _err);
    fail(502, "Unable to verify order with payment gateway", "PAYMENT_GATEWAY_UNAVAILABLE");
  }
  if (Number(order.amount) !== amountInPaise(payment.amount) || String(order.currency) !== payment.currency) {
    fail(400, "Razorpay order does not match the subscription amount", "PAYMENT_AMOUNT_MISMATCH");
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.subscriptionPayment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        paidAt: new Date(),
      },
    });
    if (!claimed.count) {
      return tx.subscriptionPayment.findUnique({
        where: { id: payment.id },
        include: { subscription: { include: { plan: { include: planInclude } } } },
      });
    }

    const now = new Date();
    // 1. Deactivate older active/trialing/past_due subscriptions for this vendor
    await tx.subscription.updateMany({
      where: {
        vendorId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        id: { not: payment.subscriptionId },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: "Replaced after successful payment",
      },
    });

    // 2. Compute proper billing start and end dates
    const startsAt = now;
    const isAnnual = payment.subscription.billingCycle === "ANNUAL";
    const expiresAt = isAnnual
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const renewsAt = expiresAt;

    // 3. Attach vendor's salon if not already assigned
    const vendorSalon = await tx.salon.findFirst({
      where: { ownerId: vendorId, isActive: true },
      select: { id: true },
    });
    const salonId = payment.subscription.salonId ?? vendorSalon?.id ?? null;

    // 4. Activate the newly purchased subscription
    await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: "ACTIVE",
        startsAt,
        expiresAt,
        renewsAt,
        salonId,
        cancelledAt: null,
        cancellationReason: null,
      },
    });

    // 5. Upsert paid invoice
    await tx.subscriptionInvoice.upsert({
      where: { paymentId: payment.id },
      update: { status: "PAID", paidAt: now },
      create: {
        invoiceNumber: invoiceNumber(),
        subscriptionId: payment.subscriptionId,
        paymentId: payment.id,
        vendorId,
        amount: payment.amount,
        currency: payment.currency,
        status: "PAID",
        issuedAt: now,
        paidAt: now,
      },
    });

    // 6. Audit log
    await audit(tx, vendorId, payment.subscriptionId, vendorId, "ACTIVATE_SUBSCRIPTION_AFTER_PAYMENT", {
      planId: payment.planId,
      amount: payment.amount,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      billingCycle: payment.subscription.billingCycle,
      startsAt,
      expiresAt,
    });

    return tx.subscriptionPayment.findUnique({
      where: { id: payment.id },
      include: { subscription: { include: { plan: { include: planInclude } } } },
    });
  });

  await invalidateSubscriptionAccess(vendorId);
  const activeSubscription = await currentSubscription(vendorId);

  // Debug logging during development (as requested in Section 29)
  console.log("[Subscription Activated]", {
    vendorId,
    paidPlanId: payment.planId,
    activatedPlanId: activeSubscription?.planId,
    planName: activeSubscription?.plan?.name,
    subscriptionStatus: activeSubscription?.status,
  });

  return {
    ...result,
    payment: result,
    subscription: activeSubscription,
  };
}

export async function cancel(vendorId: string, reason?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const activeSubscription = await tx.subscription.findFirst({
      where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" }, include: { plan: true },
    });
    const freePlan = await tx.subscriptionPlan.findUnique({ where: { slug: FREE_PLAN_SLUG } });
    if (!freePlan) fail(503, "Free plan is not configured", "FREE_PLAN_NOT_CONFIGURED");
    if (activeSubscription?.plan.slug === FREE_PLAN_SLUG) return tx.subscription.update({ where: { id: activeSubscription.id }, data: { amount: 0, expiresAt: null, cancelledAt: null, cancellationReason: null }, include: { plan: { include: planInclude } } });
    if (activeSubscription) await tx.subscription.update({ where: { id: activeSubscription.id }, data: { status: "CANCELLED", cancelledAt: now, cancellationReason: reason } });
    return activateFreeInTransaction(tx, vendorId, freePlan, "MONTHLY", activeSubscription?.salonId ?? undefined);
  }, { isolationLevel: "Serializable" });
  await invalidateSubscriptionAccess(vendorId);
  return result;
}
export async function listPayments(vendorId: string) { return prisma.subscriptionPayment.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, include: { plan: { select: { id: true, name: true } }, subscription: { select: { billingCycle: true } }, invoice: true } }); }
export async function listInvoices(vendorId: string) { return prisma.subscriptionInvoice.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, include: { subscription: { include: { plan: { select: { id: true, name: true } } } } } }); }

export async function listSubscribers(query: any) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.SubscriptionWhereInput = { ...(query.planId ? { planId: query.planId } : {}), ...(query.billingCycle ? { billingCycle: query.billingCycle } : {}), ...(query.status ? { status: query.status } : {}), ...(query.search ? { vendor: { OR: [{ email: { contains: query.search, mode: "insensitive" } }, { firstName: { contains: query.search, mode: "insensitive" } }, { lastName: { contains: query.search, mode: "insensitive" } }] } } : {}) };
  const [items, total] = await Promise.all([prisma.subscription.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { vendor: { select: safeUser }, plan: { select: { id: true, name: true, slug: true } }, salon: { select: { id: true, name: true } }, _count: { select: { payments: true, invoices: true } } } }), prisma.subscription.count({ where })]);
  return { page, limit, total, items };
}
export async function adminSubscription(id: string) { const value = await prisma.subscription.findUnique({ where: { id }, include: { vendor: { select: safeUser }, plan: { include: planInclude }, salon: true, payments: true, invoices: true, auditLogs: { orderBy: { createdAt: "desc" } } } }); if (!value) fail(404, "Subscription not found"); return value!; }
async function audit(tx: Prisma.TransactionClient, actorId: string, subscriptionId: string, vendorId: string, action: string, details?: any) { await tx.subscriptionAuditLog.create({ data: { actorId, subscriptionId, vendorId, action, targetType: "SUBSCRIPTION", targetId: subscriptionId, details } }); }
export async function assign(actorId: string, vendorId: string, input: any) {
  const plan = await getPlan(input.planId);
  return prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    const value = await tx.subscription.create({ data: { vendorId, planId: plan.id, billingCycle: input.billingCycle, amount: input.amount, startsAt: input.startsAt ?? new Date(), expiresAt: input.expiresAt ?? null, isManual: true, notes: input.notes, status: "ACTIVE" } });
    await audit(tx, actorId, value.id, vendorId, "ASSIGN_MANUAL_SUBSCRIPTION", { planId: plan.id, amount: input.amount, notes: input.notes });
    return value;
  });
}
export async function assignToSubscriber(actorId: string, subscriptionId: string, input: any) {
  const existing = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { vendorId: true } });
  if (!existing) fail(404, "Subscriber subscription not found");
  return assign(actorId, existing!.vendorId, input);
}
export async function adminCancel(actorId: string, id: string, reason?: string) { return prisma.$transaction(async (tx) => { const value = await tx.subscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason } }); await audit(tx, actorId, id, value.vendorId, "CANCEL_SUBSCRIPTION", { reason }); return value; }); }
export async function extend(actorId: string, id: string, expiresAt: Date) { return prisma.$transaction(async (tx) => { const value = await tx.subscription.update({ where: { id }, data: { expiresAt, status: "ACTIVE" } }); await audit(tx, actorId, id, value.vendorId, "EXTEND_SUBSCRIPTION", { expiresAt }); return value; }); }
export async function dashboard() {
  const [totalVendors, active, expired, cancelled, monthly, annual, successfulPayments, failedPayments, mrr, arr] = await Promise.all([
    prisma.subscription.findMany({ distinct: ["vendorId"], select: { vendorId: true } }).then((rows) => rows.length),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }), prisma.subscription.count({ where: { status: "EXPIRED" } }), prisma.subscription.count({ where: { status: "CANCELLED" } }),
    prisma.subscription.count({ where: { billingCycle: "MONTHLY", status: { in: ["ACTIVE", "TRIALING"] } } }), prisma.subscription.count({ where: { billingCycle: "ANNUAL", status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.subscriptionPayment.count({ where: { status: "SUCCESS" } }), prisma.subscriptionPayment.count({ where: { status: "FAILED" } }),
    prisma.subscription.aggregate({ where: { billingCycle: "MONTHLY", status: { in: ["ACTIVE", "TRIALING"] } }, _sum: { amount: true } }), prisma.subscription.aggregate({ where: { billingCycle: "ANNUAL", status: { in: ["ACTIVE", "TRIALING"] } }, _sum: { amount: true } }),
  ]);
  return { totalVendors, activeSubscriptions: active, expiredSubscriptions: expired, cancelledSubscriptions: cancelled, monthlySubscribers: monthly, annualSubscribers: annual, successfulPayments, failedPayments, mrr: mrr._sum.amount ?? 0, arr: (arr._sum.amount ?? 0) };
}
export async function adminPayments(query: any) { return prisma.subscriptionPayment.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(100, Number(query.limit) || 50), include: { vendor: { select: safeUser }, plan: { select: { name: true } }, subscription: { select: { billingCycle: true, salon: { select: { id: true, name: true } } } } } }); }
export async function adminInvoices(query: any) { return prisma.subscriptionInvoice.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(100, Number(query.limit) || 50), include: { subscription: { include: { vendor: { select: safeUser }, plan: { select: { name: true } } } } } }); }
export async function auditLogs(query: any) { return prisma.subscriptionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(100, Number(query.limit) || 100), include: { actor: { select: safeUser } } }); }

export async function processWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined) {
  const webhookSecret = await getWebhookSecret();
  if (!webhookSecret) fail(503, "Razorpay webhook processing is not configured", "RAZORPAY_WEBHOOK_NOT_CONFIGURED");
  if (!signature) fail(401, "Invalid webhook signature");
  const expected = crypto.createHmac("sha256", webhookSecret!).update(rawBody).digest("hex");
  const supplied = Buffer.from(signature!);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), supplied)) fail(401, "Invalid webhook signature");
  const payload: any = JSON.parse(rawBody.toString("utf8")); const id = eventId ?? payload.id;
  if (!id) fail(400, "Webhook event ID is required");
  let webhookEvent;
  try { webhookEvent = await prisma.subscriptionWebhookEvent.create({ data: { eventId: id, eventType: payload.event, payload } }); } catch (error: any) {
    if (error?.code !== "P2002") throw error;
    webhookEvent = await prisma.subscriptionWebhookEvent.findUnique({ where: { eventId: id } });
    if (webhookEvent?.processed) return { duplicate: true };
  }
  const paymentEntity = payload.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;
  if (orderId) {
    const payment = await prisma.subscriptionPayment.findUnique({ where: { razorpayOrderId: orderId } });
    if (payment && payload.event === "payment.captured" && payment.status !== "SUCCESS") { const config = await createRazorpayClient("PLATFORM"); await verifyPayment(payment.vendorId, { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: crypto.createHmac("sha256", config.config.keySecret).update(`${orderId}|${paymentId}`).digest("hex") }); }
    if (payment && payload.event === "payment.failed") await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: paymentEntity?.error_description ?? "Payment failed" } });
  }
  await prisma.subscriptionWebhookEvent.update({ where: { eventId: id }, data: { processed: true, processedAt: new Date(), error: null } });
  return { processed: true, eventId: id };
}
