import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { CreateStaffRoleDto, UpdateStaffRoleDto } from "./rbac.validation";
import { cacheGetOrSet, cacheInvalidate } from "../../infrastructure/redis/cache";
import { getSubscriptionPermissionActions } from "../subscription/subscription.service";

async function planPermissionActions(vendorId: string, userType: "VENDOR" | "STAFF" = "VENDOR", roleIds: string[] = []) {
    const now = new Date();
    const subscription = await prisma.subscription.findFirst({
        where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        orderBy: { createdAt: "desc" },
        include: { plan: { include: { permissions: { where: { userType }, include: { permission: true } }, features: { where: { enabled: true }, include: { feature: { include: { permissions: { include: { permission: true } } } } } }, menuEntitlements: { where: { userType, enabled: true }, include: { menu: { include: { menuPermissions: { include: { permission: true } } } } } } } } },
    });
    let plan = subscription?.plan ?? await prisma.subscriptionPlan.findUnique({ where: { slug: "FREE" }, include: { permissions: { where: { userType }, include: { permission: true } }, features: { where: { enabled: true }, include: { feature: { include: { permissions: { include: { permission: true } } } } } }, menuEntitlements: { where: { userType, enabled: true }, include: { menu: { include: { menuPermissions: { include: { permission: true } } } } } } } });
    if (!plan) return [];
    let effectiveUserType = userType;
    if (userType === "STAFF" && plan.permissions.length === 0 && plan.menuEntitlements.length === 0) {
        effectiveUserType = "VENDOR";
        plan = subscription
            ? await prisma.subscriptionPlan.findUnique({ where: { id: subscription.planId }, include: { permissions: { where: { userType: "VENDOR" }, include: { permission: true } }, features: { where: { enabled: true }, include: { feature: { include: { permissions: { include: { permission: true } } } } } }, menuEntitlements: { where: { userType: "VENDOR", enabled: true }, include: { menu: { include: { menuPermissions: { include: { permission: true } } } } } } } })
            : await prisma.subscriptionPlan.findUnique({ where: { slug: "FREE" }, include: { permissions: { where: { userType: "VENDOR" }, include: { permission: true } }, features: { where: { enabled: true }, include: { feature: { include: { permissions: { include: { permission: true } } } } } }, menuEntitlements: { where: { userType: "VENDOR", enabled: true }, include: { menu: { include: { menuPermissions: { include: { permission: true } } } } } } } });
    }
    if (!plan) return [];
    const planActions = new Set([
        ...plan.permissions.map(({ permission }) => permission.action),
        ...(effectiveUserType === "VENDOR" ? plan.features.flatMap(({ feature }) => feature.permissions.map(({ permission }) => permission.action)) : []),
    ]);
    const menuActions = new Set(plan.menuEntitlements.flatMap(({ menu }) => menu.menuPermissions.map(({ permission }) => permission.action)));
    const allMenuActions = new Set((await prisma.menuPermission.findMany({ include: { permission: true } })).map(({ permission }) => permission.action));
    const menuFiltered = [...planActions].filter((action) => !allMenuActions.has(action) || menuActions.has(action));
    if (!roleIds.length) return menuFiltered;
    const scoped = await prisma.subscriptionPlanRolePermission.findMany({ where: { planId: plan.id, OR: [ { roleId: { in: roleIds } }, { staffRoleId: { in: roleIds } } ] }, include: { permission: true } });
    if (scoped.length) {
        return scoped.filter((row) => row.enabled).map((row) => row.permission.action);
    }
    return menuFiltered;
}

export const getMenus = async (userRoles: string[], userPermissions: string[], fetchAll: boolean = false, sidebarOnly: boolean = false, subscriptionPermissions?: string[], subscriptionMenuIds?: string[]) => {
    const canFetchAll = fetchAll && userRoles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
    const permissionKey = [...userPermissions].sort().join(",");
    const subscriptionPermissionKey = subscriptionPermissions ? [...subscriptionPermissions].sort().join(",") : "none";
    const subscriptionMenuKey = subscriptionMenuIds ? [...subscriptionMenuIds].sort().join(",") : "none";
    const cacheKey = `menus:v10:${[...userRoles].sort().join(",")}:${permissionKey}:${subscriptionPermissionKey}:${subscriptionMenuKey}:${canFetchAll}:${sidebarOnly}`;
    const menus = await cacheGetOrSet(cacheKey, async () => {
        const menuRows = await prisma.menu.findMany({
            where: { 
                parentId: null,
                ...(sidebarOnly ? { showInSidebar: true } : {})
            },
            orderBy: { order: 'asc' },
            include: {
                menuPermissions: {
                    include: { permission: true }
                },
                children: {
                    where: sidebarOnly ? { showInSidebar: true } : {},
                    orderBy: { order: 'asc' },
                    include: {
                        menuPermissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });
        const menuIds = menuRows.flatMap((menu) => [menu.id, ...menu.children.map((child) => child.id)]);
        const audienceRows = menuIds.length
            ? await prisma.$queryRaw<Array<{ id: string; audience: string }>>`
                SELECT "id", "audience" FROM "Menu" WHERE "id" IN (${Prisma.join(menuIds)})
            `
            : [];
        const audiences = new Map(audienceRows.map(({ id, audience }) => [id, audience]));
        return menuRows.map((menu) => ({
            ...menu,
            audience: audiences.get(menu.id) ?? "ALL",
            children: menu.children.map((child) => ({
                ...child,
                audience: audiences.get(child.id) ?? "ALL",
            })),
        }));
    }, 86400);

    return filterMenuTree(menus, userRoles, userPermissions, canFetchAll, subscriptionPermissions, subscriptionMenuIds);
};

export const filterMenuTree = (
    menus: any[],
    userRoles: string[],
    userPermissions: string[],
    canFetchAll: boolean = false,
    subscriptionPermissions?: string[],
    subscriptionMenuIds?: string[],
) => {
    const adminFetchAll = canFetchAll && userRoles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
    if (adminFetchAll) return menus;
    const allowedPermissions = new Set(userPermissions);
    const planPermissions = subscriptionPermissions ? new Set(subscriptionPermissions) : undefined;
    const hasExplicitMenuGate = Array.isArray(subscriptionMenuIds);
    const isAdmin = userRoles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
    const vendorOnlyAccess = userRoles.includes("VENDOR")
        && !isAdmin;
    const isTrackingMenu = (menu: any) => {
        const path = typeof menu.path === "string" ? menu.path.replace(/\/+$/, "").toLowerCase() : "";
        return menu.label?.trim().toLowerCase() === "tracking"
            || path === "/tracking"
            || path.startsWith("/tracking/")
            || path === "/admin/tracking"
            || path.startsWith("/admin/tracking/")
            || menu.menuPermissions?.some((mp: any) => mp.permission.action.startsWith("tracking."));
    };
    const audienceAllowed = (menu: any) => menu.audience !== "VENDOR" || vendorOnlyAccess;
    const allowsAction = (permissions: Set<string>, action: string) =>
        permissions.has(action) || (action.endsWith(".navbar") && permissions.has(action.replace(/\.navbar$/, ".view")));
    const visibleMenu = (menu: any) => ({
        ...menu,
        menuPermissions: menu.menuPermissions.filter((mp: any) => {
            const action = mp.permission.action;
            return allowsAction(allowedPermissions, action) && (!planPermissions || allowsAction(planPermissions, action));
        }),
    });
    const canSee = (menu: any) => {
        if (!isAdmin && isTrackingMenu(menu)) return false;
        if (!audienceAllowed(menu)) return false;
        if (hasExplicitMenuGate && !subscriptionMenuIds!.includes(menu.id)) return false;
        if (!menu.menuPermissions.length) return !planPermissions || hasExplicitMenuGate;
        return menu.menuPermissions.some((mp: any) => {
            const action = mp.permission.action;
            return allowsAction(allowedPermissions, action) && (!planPermissions || allowsAction(planPermissions, action));
        });
    };

    return menus
        .map((menu) => ({
            menu,
            parentAllowed: canSee(menu) && (isAdmin || !menu.children.some(isTrackingMenu)),
            children: menu.children.filter(canSee).map(visibleMenu),
        }))
        .filter(({ parentAllowed, children }) => parentAllowed || children.length > 0)
        .map(({ menu, children }) => ({ ...visibleMenu(menu), children }));
};

export const createMenu = async (data: any) => {
    // Basic implementation for menu and auto-generating its permissions
    const basePath = data.path?.replace('/', '') || data.label.toLowerCase().replace(/\s+/g, '-');
    
    // Create base permissions for the menu
    const actions = ['view', 'create', 'edit', 'delete', 'navbar'];
    const createdPermissions = await Promise.all(
        actions.map(action => prisma.permission.upsert({
            where: { action: `${basePath}.${action}` },
            update: {},
            create: { action: `${basePath}.${action}` }
        }))
    );

    const menu = await prisma.menu.create({
        data: {
            label: data.label,
            path: data.path,
            icon: data.icon,
            parentId: data.parentId || null,
            order: 99, // default last
            menuPermissions: {
                create: createdPermissions.filter(p => p.action.endsWith('.view')).map(p => ({
                    permission: { connect: { id: p.id } }
                }))
            }
        }
    });

    await cacheInvalidate("menus:*");
    return menu;
};

export const updateMenu = async (id: string, data: any) => {
    const menu = await prisma.menu.update({
        where: { id },
        data: {
            label: data.label,
            path: data.path,
            icon: data.icon,
            parentId: data.parentId !== undefined ? data.parentId : undefined,
            showInSidebar: data.showInSidebar
        }
    });
    await cacheInvalidate("menus:*");
    return menu;
};

export const reorderMenus = async (items: { id: string, order: number }[]) => {
    // using a transaction to update all orders
    await prisma.$transaction(
        items.map(item => prisma.menu.update({
            where: { id: item.id },
            data: { order: item.order }
        }))
    );
    await cacheInvalidate("menus:*");
};

export const deleteMenu = async (id: string) => {
    // Delete all children first to avoid foreign key constraints
    await prisma.menu.deleteMany({
        where: { parentId: id }
    });

    const menu = await prisma.menu.delete({
        where: { id }
    });
    await cacheInvalidate("menus:*");
    return menu;
};

export const getPermissions = async () => {
    return prisma.permission.findMany();
};
export const getPermissionTree = async () => {
    const permissions = await prisma.permission.findMany({ orderBy: { action: "asc" } });
    const roots = new Map<string, any>();
    for (const permission of permissions) {
        const parts = permission.action.split(".");
        const module = parts[0];
        const node = roots.get(module) ?? { key: module, label: module, permissions: [], children: [] };
        if (parts.length === 2) node.permissions.push(permission);
        else node.children.push(permission);
        roots.set(module, node);
    }
    return [...roots.values()];
};

export const getUserPermissions = async (userId: string, salonId?: string, userType?: "VENDOR" | "STAFF") => {
    const [userRoles, staffRoles, directPermissions] = await Promise.all([
        prisma.userRole.findMany({
            where: { userId },
            select: { roleId: true },
        }),
        prisma.salonStaff.findMany({
            where: {
                userId,
                isActive: true,
                ...(salonId ? { salonId } : {}),
            },
            select: { staffRoleId: true },
        }),
        prisma.userPermission.findMany({
            where: { userId },
            select: { isAllowed: true, permission: { select: { action: true } } },
        }),
    ]);
    const assignedRoles = await prisma.userRole.findMany({ where: { userId, role: { isActive: true } }, include: { role: true } });
    const staffMembership = await prisma.salonStaff.findFirst({ where: { userId, isActive: true, ...(salonId ? { salonId } : {}) }, select: { salon: { select: { ownerId: true, owner: { select: { roles: { select: { role: { select: { name: true } } } } } } } } } });
    const isSuperAdmin = assignedRoles.some(({ role }) => role.name === "SUPER_ADMIN");
    const vendorId = assignedRoles.some(({ role }) => role.name === "VENDOR")
        ? userId
        : staffMembership?.salon.owner.roles.some(({ role }) => role.name === "VENDOR")
            ? staffMembership.salon.ownerId
            : undefined;
    const effectiveUserType = assignedRoles.some(({ role }) => role.name === "VENDOR") ? "VENDOR" : userType ?? (vendorId ? "STAFF" : undefined);
    const roleIds = effectiveUserType === "VENDOR" ? assignedRoles.filter(({ role }) => role.name.toUpperCase().includes("VENDOR")).map(({ roleId }) => roleId) : staffRoles.map(({ staffRoleId }) => staffRoleId).filter(Boolean) as string[];
    const roleFingerprint = userRoles.map(({ roleId }) => roleId).sort().join(",");
    const staffRoleFingerprint = staffRoles.map(({ staffRoleId }) => staffRoleId || "none").sort().join(",");
    const directPermissionFingerprint = directPermissions
        .map(({ permission, isAllowed }) => `${permission.action}:${isAllowed}`)
        .sort()
        .join(",");
    // Resolve RBAC from role/staff-role assignments only.  Subscription feature
    // gates are evaluated separately by requireFeature/permission middleware.
    const cacheKey = `rbac:perms:v9:${userId}:${roleFingerprint}:${staffRoleFingerprint}:${directPermissionFingerprint}${salonId ? `:${salonId}` : ""}`;
    return cacheGetOrSet(cacheKey, async () => {
        // Determine the permissions based on UserRole or StaffRole
        if (isSuperAdmin) {
            const allPermissions = await prisma.permission.findMany({ select: { action: true } });
            return allPermissions.map(({ action }) => action);
        }

        // Add permissions from System Roles
        const systemRolePerms = await prisma.rolePermission.findMany({
            where: { roleId: { in: assignedRoles.map(ur => ur.roleId) } },
            include: { permission: true }
        });

        const perms = new Set<string>();
        systemRolePerms.forEach(rp => perms.add(rp.permission.action));

        const assignedStaffRoles = await prisma.salonStaff.findMany({
            where: {
                userId,
                isActive: true,
                ...(salonId ? { salonId } : {})
            },
            include: {
                staffRole: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        assignedStaffRoles.forEach(staff => {
            if (staff.staffRole) {
                staff.staffRole.permissions.forEach(p => {
                    perms.add(p.permission.action);
                });
            }
        });

        for (const { permission, isAllowed } of directPermissions) {
            if (isAllowed) perms.add(permission.action);
            else perms.delete(permission.action);
        }

        return Array.from(perms);
    }, 3600);
};

export const getEffectivePermissions = async (userId: string, salonId?: string, userType?: "VENDOR" | "STAFF") => {
    const [roles, memberships] = await Promise.all([
        prisma.userRole.findMany({ where: { userId, role: { isActive: true } }, select: { roleId: true, role: { select: { name: true } } } }),
        prisma.salonStaff.findMany({
            where: { userId, isActive: true, ...(salonId ? { salonId } : {}) },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { staffRoleId: true, salon: { select: { ownerId: true } } },
        }),
    ]);
    const roleNames = roles.map(({ role }) => role.name);
    const basePermissions = await getUserPermissions(userId, salonId, userType);
    if (roleNames.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) return basePermissions;

    const vendor = roleNames.includes("VENDOR");
    const membership = memberships[0];
    const effectiveUserType = vendor ? "VENDOR" : membership ? "STAFF" : undefined;
    const ownerId = vendor ? userId : membership?.salon.ownerId;
    if (!ownerId || !effectiveUserType) return basePermissions;

    const roleId = vendor
        ? roles.find(({ role }) => role.name === "VENDOR")?.roleId
        : membership?.staffRoleId ?? roles.find(({ role }) => !["ADMIN", "SUPER_ADMIN", "CUSTOMER", "VENDOR"].includes(role.name))?.roleId;
    const subscriptionPermissions = await getSubscriptionPermissionActions(ownerId, effectiveUserType, roleId);
    const allowed = new Set(subscriptionPermissions);
    return basePermissions.filter((permission) => allowed.has(permission));
};

export const getRolePermissions = async (roleId: string) => {
    // Accept both the role UUID used by the matrix UI and the legacy role name.
    const systemRole = await prisma.role.findFirst({ where: { OR: [{ id: roleId }, { name: roleId }] } });
    if (systemRole) {
        const perms = await prisma.rolePermission.findMany({
            where: { roleId: systemRole.id },
            include: { permission: true }
        });
        return perms.map(p => p.permission.action);
    }

    // Otherwise treat as staff role
    const staffRole = await prisma.staffRole.findUnique({ where: { id: roleId } });
    if (staffRole) {
        const perms = await prisma.staffRolePermission.findMany({
            where: { staffRoleId: staffRole.id },
            include: { permission: true }
        });
        return perms.map(p => p.permission.action);
    }

    return [];
};

export const toggleRolePermission = async (roleId: string, action: string, active: boolean) => {
    // Ensure permission exists
    let permission = await prisma.permission.findUnique({ where: { action } });
    if (!permission) {
        permission = await prisma.permission.create({ data: { action } });
    }

    // Check if it's a system role
    const systemRole = await prisma.role.findFirst({ where: { OR: [{ id: roleId }, { name: roleId }] } });
    if (systemRole) {
        if (active) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: systemRole.id, permissionId: permission.id } },
                update: {},
                create: { roleId: systemRole.id, permissionId: permission.id }
            });
        } else {
            await prisma.rolePermission.deleteMany({
                where: { roleId: systemRole.id, permissionId: permission.id }
            });
        }
        await cacheInvalidate("rbac:perms:*");
        await cacheInvalidate("menus:*");
        return;
    }

    // Check if it's a staff role
    const staffRole = await prisma.staffRole.findUnique({ where: { id: roleId } });
    if (staffRole) {
        if (active) {
            await prisma.staffRolePermission.upsert({
                where: { staffRoleId_permissionId: { staffRoleId: staffRole.id, permissionId: permission.id } },
                update: {},
                create: { staffRoleId: staffRole.id, permissionId: permission.id }
            });
        } else {
            await prisma.staffRolePermission.deleteMany({
                where: { staffRoleId: staffRole.id, permissionId: permission.id }
            });
        }
        await cacheInvalidate("rbac:perms:*");
        await cacheInvalidate("menus:*");
    }
};

type RbacActor = { userId: string; roles: string[] };

async function assertStaffRoleAccess(actor: RbacActor, salonId?: string, permissionIds: string[] = []) {
    if (actor.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) return;
    if (!actor.roles.includes("VENDOR") || !salonId) throw { status: 403, message: "You may only manage roles in your own salons" };
    const salon = await prisma.salon.findFirst({
        where: { id: salonId, OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] },
        select: { id: true },
    });
    if (!salon) throw { status: 403, message: "You may only manage roles in your own salons" };
    const [ownPermissions, subscriptionPermissions, rolePermissions] = await Promise.all([
        getUserPermissions(actor.userId, salonId),
        getSubscriptionPermissionActions(actor.userId, "VENDOR"),
        permissionIds.length
            ? prisma.permission.findMany({ where: { id: { in: permissionIds } }, select: { id: true, action: true } })
            : Promise.resolve([]),
    ]);
    if (rolePermissions.length !== permissionIds.length) throw { status: 400, message: "One or more permissions do not exist" };
    const allowed = new Set(ownPermissions.filter((action) => subscriptionPermissions.includes(action)));
    if (rolePermissions.some(({ action }) => !allowed.has(action))) {
        throw { status: 403, code: "PERMISSION_DENIED", message: "You cannot assign permissions that you do not have" };
    }
}

export const createStaffRole = async (data: CreateStaffRoleDto, actor: RbacActor) => {
    await assertStaffRoleAccess(actor, data.salonId, data.permissions);
    const role = await prisma.$transaction(async (tx) => tx.staffRole.create({
        data: {
            name: data.name,
            description: data.description,
            salonId: data.salonId,
            permissions: {
                create: data.permissions?.map(permissionId => ({
                    permission: { connect: { id: permissionId } }
                })) || []
            }
        },
        include: { permissions: { include: { permission: true } } }
    }));
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return role;
};

export const getStaffRoles = async (salonId: string | undefined, actor: RbacActor) => {
    if (actor.roles.includes("VENDOR")) {
        if (salonId) await assertStaffRoleAccess(actor, salonId);
        const scope = await prisma.salon.findMany({
            where: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] },
            select: { id: true },
        });
        const salonIds = scope.map(({ id }) => id);
        return prisma.staffRole.findMany({
            where: salonId ? { salonId } : { OR: [{ salonId: { in: salonIds } }, { salonId: null }] },
            include: { permissions: { include: { permission: true } } },
        });
    }
    return prisma.staffRole.findMany({
        where: salonId ? { salonId } : {},
        include: { permissions: { include: { permission: true } } }
    });
};

export const updateStaffRole = async (id: string, data: UpdateStaffRoleDto, actor: RbacActor) => {
    const current = await prisma.staffRole.findUnique({ where: { id }, select: { id: true, salonId: true } });
    if (!current) throw { status: 404, message: "Staff role not found" };
    await assertStaffRoleAccess(actor, current.salonId ?? undefined, data.permissions);
    const role = await prisma.$transaction(async (tx) => {
        if (data.permissions) {
            await tx.staffRolePermission.deleteMany({
                where: { staffRoleId: id }
            });
        }

        return tx.staffRole.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                ...(data.permissions && {
                    permissions: {
                        create: data.permissions.map(permissionId => ({
                            permission: { connect: { id: permissionId } }
                        }))
                    }
                })
            },
            include: { permissions: { include: { permission: true } } }
        });
    });

    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return role;
};

export const replaceRolePermissions = async (roleId: string, actions: string[]) => {
    const uniqueActions = [...new Set(actions)];
    const permissions = await prisma.permission.findMany({ where: { action: { in: uniqueActions } } });
    if (permissions.length !== uniqueActions.length) {
        throw { status: 400, message: "One or more permissions do not exist" };
    }

    const systemRole = await prisma.role.findUnique({ where: { id: roleId } });
    const staffRole = systemRole ? null : await prisma.staffRole.findUnique({ where: { id: roleId } });
    if (!systemRole && !staffRole) throw { status: 404, message: "Role not found" };
    await validatePermissions(uniqueActions);

    await prisma.$transaction(async (tx) => {
        if (systemRole) {
            await tx.rolePermission.deleteMany({ where: { roleId } });
            if (permissions.length) await tx.rolePermission.createMany({ data: permissions.map(permission => ({ roleId, permissionId: permission.id })), skipDuplicates: true });
        } else {
            await tx.staffRolePermission.deleteMany({ where: { staffRoleId: roleId } });
            if (permissions.length) await tx.staffRolePermission.createMany({ data: permissions.map(permission => ({ staffRoleId: roleId, permissionId: permission.id })), skipDuplicates: true });
        }
    });

    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return { roleId, permissions: uniqueActions };
};

export const deleteStaffRole = async (id: string, actor: RbacActor) => {
    const current = await prisma.staffRole.findUnique({ where: { id }, select: { id: true, salonId: true } });
    if (!current) throw { status: 404, message: "Staff role not found" };
    await assertStaffRoleAccess(actor, current.salonId ?? undefined);
    const role = await prisma.staffRole.delete({ where: { id } });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return role;
};

async function assertPlanPermissions(planId: string, actions: string[]) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!plan) throw { status: 404, message: "Subscription plan not found" };
    const unique = [...new Set(actions)];
    const permissions = await prisma.permission.findMany({ where: { action: { in: unique } }, select: { id: true, action: true } });
    if (permissions.length !== unique.length) throw { status: 400, message: "One or more permissions do not exist" };
    const allowed = new Set(await planPermissionActionsForPlan(planId));
    const invalid = unique.filter((action) => !allowed.has(action));
    if (invalid.length) throw { status: 403, message: "One or more permissions are not available on this subscription plan" };
    return permissions;
}

async function validatePermissions(actions: string[]) {
    const unique = [...new Set(actions)];
    const permissions = await prisma.permission.findMany({ where: { action: { in: unique } }, select: { id: true, action: true } });
    if (permissions.length !== unique.length) throw { status: 400, message: "One or more permissions do not exist" };
    return permissions;
}

async function planPermissionActionsForPlan(planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId }, include: { permissions: { include: { permission: true } }, features: { where: { enabled: true }, include: { feature: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!plan) return [];
    const direct = plan.permissions.map(({ permission }) => permission.action);
    return direct.length ? [...new Set(direct)] : [...new Set(plan.features.flatMap(({ feature }) => feature.permissions.map(({ permission }) => permission.action)))];
}

export const getPlanPermissions = async (planId: string) => planPermissionActionsForPlan(planId);
export const replacePlanPermissions = async (planId: string, actions: string[]) => {
    const permissions = await assertPlanPermissions(planId, actions);
    await prisma.$transaction(async (tx) => {
        await tx.subscriptionPlanPermission.deleteMany({ where: { planId } });
        if (permissions.length) await tx.subscriptionPlanPermission.createMany({ data: permissions.map(({ id: permissionId }) => ({ planId, permissionId })), skipDuplicates: true });
    });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return { planId, permissions: permissions.map(({ action }) => action) };
};

export const listSystemRoles = async (planId?: string) => prisma.role.findMany({ where: planId ? { subscriptionPlanId: planId } : {}, include: { subscriptionPlan: { select: { id: true, slug: true, name: true } }, permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
export const createSystemRole = async (data: { name: string; subscriptionPlanId: string; permissions: string[]; isActive?: boolean }) => {
    const permissions = await validatePermissions(data.permissions);
    const role = await prisma.role.create({ data: { name: data.name, subscriptionPlanId: data.subscriptionPlanId, isActive: data.isActive ?? true, permissions: { create: permissions.map(({ id: permissionId }) => ({ permission: { connect: { id: permissionId } } })) } }, include: { permissions: { include: { permission: true } }, subscriptionPlan: true } });
    await cacheInvalidate("rbac:perms:*");
    return role;
};
export const updateSystemRole = async (id: string, data: { name?: string; subscriptionPlanId?: string; permissions?: string[]; isActive?: boolean }) => {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: "Role not found" };
    const planId = data.subscriptionPlanId ?? existing.subscriptionPlanId;
    if (!planId && data.permissions?.length) throw { status: 400, message: "A subscription plan is required for role permissions" };
    const permissions = data.permissions ? await validatePermissions(data.permissions) : undefined;
    const role = await prisma.$transaction(async (tx) => {
        if (data.permissions) await tx.rolePermission.deleteMany({ where: { roleId: id } });
        return tx.role.update({ where: { id }, data: { name: data.name, subscriptionPlanId: planId, isActive: data.isActive, ...(permissions ? { permissions: { create: permissions.map(({ id: permissionId }) => ({ permission: { connect: { id: permissionId } } })) } } : {}) }, include: { permissions: { include: { permission: true } }, subscriptionPlan: true } });
    });
    await cacheInvalidate("rbac:perms:*");
    await cacheInvalidate("menus:*");
    return role;
};
export const deleteSystemRole = async (id: string) => updateSystemRole(id, { isActive: false });
export const cloneSystemRole = async (id: string, name: string) => { const source = await prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } }); if (!source || !source.subscriptionPlanId) throw { status: 404, message: "Plan-bound role not found" }; return createSystemRole({ name, subscriptionPlanId: source.subscriptionPlanId, permissions: source.permissions.map(({ permission }) => permission.action) }); };
export const assignVendorRole = async (vendorId: string, roleId: string) => {
    const [vendor, role] = await Promise.all([
        prisma.user.findUnique({ where: { id: vendorId }, select: { id: true, roles: { include: { role: true } } } }),
        prisma.role.findUnique({ where: { id: roleId }, include: { subscriptionPlan: true } }),
    ]);
    if (!vendor || !vendor.roles.some(({ role }) => role.name === "VENDOR")) throw { status: 404, message: "Vendor not found" };
    if (!role || !role.subscriptionPlanId) throw { status: 400, message: "Role is not associated with a subscription plan" };
    const active = await prisma.subscription.findFirst({ where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, select: { planId: true } });
    if (!active || active.planId !== role.subscriptionPlanId) throw { status: 403, message: "Role is not compatible with the vendor's active subscription" };
    await prisma.userRole.deleteMany({ where: { userId: vendorId, role: { name: "VENDOR" } } });
    await prisma.userRole.create({ data: { userId: vendorId, roleId } });
    await cacheInvalidate(`rbac:perms:*`);
    return { vendorId, roleId };
};
export const getVendorRoles = async (vendorId: string) => {
    const active = await prisma.subscription.findFirst({ where: { vendorId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, select: { planId: true } });
    return listSystemRoles(active?.planId);
};
export const getVendorRole = async (vendorId: string) => prisma.userRole.findFirst({ where: { userId: vendorId, role: { name: "VENDOR", isActive: true } }, include: { role: { include: { subscriptionPlan: true, permissions: { include: { permission: true } } } } } });
