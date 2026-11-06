import bcrypt from "bcrypt";
import { prisma } from "../../infrastructure/database/prisma";
import { cacheInvalidate } from "../../infrastructure/redis/cache";
import { getUserPermissions } from "../rbac/rbac.service";
import { ensureAiImageGenerationPermission, getSubscriptionPermissionActions } from "../subscription/subscription.service";

type Actor = { userId: string; roles: string[] };
type CreateUserInput = {
    firstName: string;
    lastName?: string | null;
    email: string;
    phone: string;
    countryCode: string;
    password: string;
    roleId?: string;
    roleName?: "MANAGER" | "STAFF";
    salonId: string;
    branchIds: string[];
    permissions: string[];
    isActive: boolean;
};
type AccessInput = { salonId: string; branchIds: string[] };

const protectedRoleNames = new Set(["ADMIN", "SUPER_ADMIN", "VENDOR", "CUSTOMER"]);
const safeUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    countryCode: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    roles: { select: { role: { select: { id: true, name: true } } } },
    staffIn: {
        where: { isActive: true },
        select: {
            id: true,
            salonId: true,
            role: true,
            staffRoleId: true,
            salon: { select: { id: true, name: true, parentId: true } },
            staffRole: { select: { id: true, name: true } },
        },
    },
} as const;

const fail = (status: number, message: string, code?: string): never => {
    throw { status, message, ...(code ? { code } : {}) };
};

const invalidateUserAccess = async (userId: string) => {
    await cacheInvalidate(`rbac:perms:*:${userId}:*`);
    await cacheInvalidate(`menus:*`);
};

const normalizeRoleName = (name: string) => name.trim().toUpperCase();

async function validateUniqueContact(
    db: typeof prisma,
    input: { email?: string; phone?: string; countryCode?: string },
    exceptUserId?: string,
) {
    const conditions = [
        ...(input.email ? [{ email: { equals: input.email, mode: "insensitive" as const } }] : []),
        ...(input.phone && input.countryCode ? [{ phone: input.phone, countryCode: input.countryCode }] : []),
    ];
    if (!conditions.length) return;
    const duplicate = await db.user.findFirst({
        where: { OR: conditions, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
        select: { id: true },
    });
    if (duplicate) fail(409, "A user with this email or phone number already exists", "DUPLICATE_USER");
}

async function ownedSalonIds(ownerId: string): Promise<string[]> {
    const salons = await prisma.salon.findMany({
        where: { OR: [{ ownerId }, { parent: { ownerId } }] },
        select: { id: true },
    });
    return salons.map(({ id }) => id);
}

async function assertVendorManagesUser(actor: Actor, targetUserId: string) {
    const memberships = await prisma.salonStaff.findMany({
        where: { userId: targetUserId, isActive: true },
        select: { salon: { select: { ownerId: true, parent: { select: { ownerId: true } } } } },
    });
    if (!memberships.some(({ salon }) => salon.ownerId === actor.userId || salon.parent?.ownerId === actor.userId)) {
        fail(404, "User not found in your salon scope");
    }
    if (memberships.some(({ salon }) => salon.ownerId !== actor.userId && salon.parent?.ownerId !== actor.userId)) {
        fail(403, "This user is assigned to another salon and cannot be managed from this vendor account");
    }
}

async function getRoleForAssignment(roleId: string | undefined, roleName: string | undefined, salonIds: string[]) {
    if (roleId) {
        const systemRole = await prisma.role.findUnique({ where: { id: roleId } });
        if (systemRole) {
            if (!systemRole.isActive || protectedRoleNames.has(normalizeRoleName(systemRole.name))) {
                fail(400, "This role cannot be assigned to a salon user");
            }
            return { kind: "SYSTEM" as const, id: systemRole.id, name: systemRole.name };
        }
        const staffRole = await prisma.staffRole.findUnique({ where: { id: roleId } });
        if (!staffRole) return fail(400, "Role not found for the selected salon");
        if (staffRole.salonId && !salonIds.includes(staffRole.salonId)) return fail(400, "Role not found for the selected salon");
        if (protectedRoleNames.has(normalizeRoleName(staffRole.name))) {
            fail(400, "This role cannot be assigned to a salon user");
        }
        return { kind: "STAFF" as const, id: staffRole.id, name: staffRole.name, salonId: staffRole.salonId };
    }

    const name = normalizeRoleName(roleName ?? "");
    if (name !== "MANAGER" && name !== "STAFF") fail(400, "Only MANAGER or STAFF roles can be created by name");
    const role = await prisma.role.upsert({
        where: { name },
        update: { isActive: true },
        create: { name },
        select: { id: true, name: true },
    });
    return { kind: "SYSTEM" as const, id: role.id, name: role.name };
}

async function validateSalonAssignment(salonId: string, branchIds: string[], actor?: Actor) {
    const salon = await prisma.salon.findFirst({ where: { id: salonId, isActive: true }, select: { id: true, ownerId: true, parentId: true } });
    if (!salon) return fail(404, "Salon not found");
    if (actor && !actor.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
        const inScope = await ownedSalonIds(actor.userId);
        if (!inScope.includes(salonId)) fail(403, "You do not have access to the selected salon");
    }
    if (!branchIds.length) return;
    const branches = await prisma.salon.findMany({
        where: { id: { in: branchIds }, parentId: salonId, isActive: true },
        select: { id: true },
    });
    if (branches.length !== new Set(branchIds).size) fail(400, "One or more branches do not belong to the selected salon");
    if (actor && !actor.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
        const allowed = await ownedSalonIds(actor.userId);
        if (branchIds.some((id) => !allowed.includes(id))) fail(403, "You do not have access to one or more selected branches");
    }
}

async function allowedVendorPermissions(actor: Actor, salonId: string) {
    const [roleActions, subscriptionActions] = await Promise.all([
        getUserPermissions(actor.userId, salonId),
        getSubscriptionPermissionActions(actor.userId, "VENDOR"),
    ]);
    return new Set(roleActions.filter((action) => subscriptionActions.includes(action)));
}

async function assertVendorCanAssignRole(
    actor: Actor,
    role: { kind: "SYSTEM" | "STAFF"; id: string; name: string },
    salonId: string,
    requestedPermissions: string[],
) {
    const allowed = await allowedVendorPermissions(actor, salonId);
    let rolePermissions: string[] = [];
    if (role.kind === "SYSTEM") {
        const rows = await prisma.rolePermission.findMany({ where: { roleId: role.id }, include: { permission: { select: { action: true } } } });
        rolePermissions = rows.map(({ permission }) => permission.action);
    } else {
        const rows = await prisma.staffRolePermission.findMany({ where: { staffRoleId: role.id }, include: { permission: { select: { action: true } } } });
        rolePermissions = rows.map(({ permission }) => permission.action);
    }
    if ([...rolePermissions, ...requestedPermissions].some((action) => !allowed.has(action))) {
        fail(403, "You cannot assign permissions that you do not have", "PERMISSION_DENIED");
    }
    return allowed;
}

async function ensurePermissionsExist(actions: string[]) {
    if (!actions.length) return [];
    const permissions = await prisma.permission.findMany({ where: { action: { in: actions } }, select: { id: true, action: true } });
    if (permissions.length !== actions.length) fail(400, "One or more permissions do not exist");
    return permissions;
}

export async function listUsers(actor: Actor, query: { search?: string; role?: string; isActive?: "true" | "false"; page: number; limit: number }, vendorScoped = false) {
    const search = query.search?.trim();
    let vendorUserIds: string[] | undefined;
    if (vendorScoped) {
        const ownMemberships = await prisma.salonStaff.findMany({
            where: {
                isActive: true,
                salon: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] },
            },
            select: { userId: true },
            distinct: ["userId"],
        });
        const candidateIds = ownMemberships.map(({ userId }) => userId);
        const sharedMemberships = candidateIds.length
            ? await prisma.salonStaff.findMany({
                where: {
                    userId: { in: candidateIds },
                    isActive: true,
                    NOT: { salon: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] } },
                },
                select: { userId: true },
                distinct: ["userId"],
            })
            : [];
        const sharedIds = new Set(sharedMemberships.map(({ userId }) => userId));
        vendorUserIds = candidateIds.filter((userId) => !sharedIds.has(userId));
    }
    const where = {
        ...(vendorScoped ? { id: { in: vendorUserIds ?? [] } } : {}),
        ...(query.isActive ? { isActive: query.isActive === "true" } : {}),
        ...(query.role ? { roles: { some: { role: { name: query.role } } } } : {}),
        ...(search ? {
            OR: [
                { firstName: { contains: search, mode: "insensitive" as const } },
                { lastName: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
            ],
        } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: safeUserSelect,
            orderBy: [{ createdAt: "desc" }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
        prisma.user.count({ where }),
    ]);
    return {
        items,
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: total ? Math.ceil(total / query.limit) : 0,
        },
    };
}

export async function getUser(userId: string, actor: Actor, vendorScoped = false) {
    if (vendorScoped) await assertVendorManagesUser(actor, userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
    if (!user) return fail(404, "User not found");
    return user;
}

export async function createUser(actor: Actor, input: CreateUserInput, vendorScoped = false) {
    await validateUniqueContact(prisma, input);
    await validateSalonAssignment(input.salonId, input.branchIds, vendorScoped ? actor : undefined);
    const memberships = [input.salonId, ...input.branchIds];
    const role = await getRoleForAssignment(input.roleId, input.roleName, memberships);
    const permissions = await ensurePermissionsExist(input.permissions);
    if (vendorScoped) await assertVendorCanAssignRole(actor, role, input.salonId, input.permissions);
    const password = await bcrypt.hash(input.password, 10);

    const userId = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                phone: input.phone,
                countryCode: input.countryCode,
                password,
                isActive: input.isActive,
                source: "ADMIN",
            },
            select: { id: true },
        });
        await tx.userRole.create({ data: { userId: user.id, roleId: role.kind === "SYSTEM" ? role.id : (await tx.role.upsert({ where: { name: "STAFF" }, update: {}, create: { name: "STAFF" } })).id } });
        await tx.salonStaff.createMany({
            data: memberships.map((salonId) => ({
                userId: user.id,
                salonId,
                role: role.name,
                staffRoleId: role.kind === "STAFF" && (!role.salonId || role.salonId === salonId) ? role.id : null,
                isActive: input.isActive,
                createdById: actor.userId,
            })),
        });
        if (permissions.length) {
            await tx.userPermission.createMany({
                data: permissions.map(({ id: permissionId }) => ({ userId: user.id, permissionId, isAllowed: true })),
                skipDuplicates: true,
            });
        }
        return user.id;
    });

    await invalidateUserAccess(userId);
    return getUser(userId, actor, false);
}

export async function updateUser(userId: string, actor: Actor, data: {
    firstName?: string;
    lastName?: string | null;
    email?: string;
    phone?: string;
    countryCode?: string;
    isActive?: boolean;
}, vendorScoped = false) {
    await getUser(userId, actor, vendorScoped);
    const existing = data.phone && !data.countryCode
        ? await prisma.user.findUnique({ where: { id: userId }, select: { countryCode: true } })
        : undefined;
    await validateUniqueContact(prisma, {
        ...data,
        ...(existing ? { countryCode: existing.countryCode } : {}),
    }, userId);
    const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true },
    }).catch((error: unknown) => {
        if (error && typeof error === "object" && "code" in error && error.code === "P2025") fail(404, "User not found");
        throw error;
    });
    await invalidateUserAccess(updated.id);
    return getUser(updated.id, actor, vendorScoped);
}

export async function setUserStatus(userId: string, actor: Actor, isActive: boolean, vendorScoped = false) {
    return updateUser(userId, actor, { isActive }, vendorScoped);
}

export async function deleteUser(userId: string, actor: Actor, vendorScoped = false) {
    return setUserStatus(userId, actor, false, vendorScoped);
}

export async function getUserRoles(userId: string, actor: Actor, vendorScoped = false) {
    const user = await getUser(userId, actor, vendorScoped);
    return {
        systemRoles: user.roles.map(({ role }) => role),
        salonRoles: user.staffIn.map(({ staffRole, role }) => staffRole ?? (role ? { name: role } : null)).filter(Boolean),
    };
}

export async function replaceUserRoles(userId: string, actor: Actor, roleIds: string[], vendorScoped = false) {
    await getUser(userId, actor, vendorScoped);
    const roles = roleIds.length ? await prisma.role.findMany({ where: { id: { in: roleIds }, isActive: true }, select: { id: true, name: true } }) : [];
    const staffRoles = roleIds.length ? await prisma.staffRole.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true, salonId: true, permissions: { select: { permission: { select: { action: true } } } } } }) : [];
    if (roles.length + staffRoles.length !== roleIds.length || roles.some(({ name }) => protectedRoleNames.has(normalizeRoleName(name)))) {
        fail(400, "One or more roles are invalid or cannot be assigned");
    }
    if (staffRoles.length > 1) fail(400, "Only one custom salon role can be assigned at a time");
    const memberships = await prisma.salonStaff.findMany({
        where: {
            userId,
            isActive: true,
            ...(vendorScoped ? { salon: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] } } : {}),
        },
        select: { id: true, salonId: true },
    });
    if (vendorScoped && (staffRoles.length || roles.length)) {
        const scope = await ownedSalonIds(actor.userId);
        const relevantSalonIds = memberships.map(({ salonId }) => salonId);
        if (!relevantSalonIds.length) fail(404, "User not found in your salon scope");
        const allowedPermissions = new Set<string>();
        for (const salonId of relevantSalonIds) {
            for (const action of await allowedVendorPermissions(actor, salonId)) allowedPermissions.add(action);
        }
        const assignedSystemPermissions = roles.length
            ? await prisma.rolePermission.findMany({
                where: { roleId: { in: roles.map(({ id }) => id) } },
                include: { permission: { select: { action: true } } },
            })
            : [];
        if (assignedSystemPermissions.some(({ permission }) => !allowedPermissions.has(permission.action))) {
            fail(403, "You cannot assign permissions that you do not have", "PERMISSION_DENIED");
        }
        if (staffRoles.length) {
        const role = staffRoles[0];
        if (role.salonId && !scope.includes(role.salonId)) fail(403, "You cannot assign a role from another salon");
        if (role.salonId && !relevantSalonIds.includes(role.salonId)) fail(400, "The custom role does not belong to a salon assigned to this user");
        if (role.permissions.some(({ permission }) => !allowedPermissions.has(permission.action))) {
            fail(403, "You cannot assign permissions that you do not have", "PERMISSION_DENIED");
        }
        }
    }
    if (staffRoles[0]?.salonId && !memberships.some(({ salonId }) => salonId === staffRoles[0].salonId)) {
        fail(400, "The custom role does not belong to any salon assigned to this user");
    }
    await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId } });
        const rolesToAssign = [...roles];
        if (staffRoles.length && !rolesToAssign.some(({ name }) => name === "STAFF")) {
            rolesToAssign.push(await tx.role.upsert({
                where: { name: "STAFF" },
                update: {},
                create: { name: "STAFF" },
                select: { id: true, name: true },
            }));
        }
        if (rolesToAssign.length) {
            await tx.userRole.createMany({ data: rolesToAssign.map(({ id: roleId }) => ({ userId, roleId })), skipDuplicates: true });
        }
        const salonRole = staffRoles[0];
        for (const membership of memberships) {
            const applies = Boolean(salonRole && (!salonRole.salonId || salonRole.salonId === membership.salonId));
            await tx.salonStaff.update({
                where: { id: membership.id },
                data: {
                    role: applies ? salonRole!.name : (rolesToAssign[0]?.name ?? null),
                    staffRoleId: applies ? salonRole!.id : null,
                    updatedById: actor.userId,
                },
            });
        }
    });
    await invalidateUserAccess(userId);
    return getUserRoles(userId, actor, vendorScoped);
}

export async function getUserPermissionsForManagement(userId: string, actor: Actor, vendorScoped = false) {
    await getUser(userId, actor, vendorScoped);
    const [effective, direct] = await Promise.all([
        getUserPermissions(userId),
        prisma.userPermission.findMany({
            where: { userId },
            include: { permission: { select: { action: true } } },
            orderBy: { permission: { action: "asc" } },
        }),
    ]);
    return {
        effective,
        direct: direct.map(({ permission, isAllowed }) => ({ action: permission.action, isAllowed })),
    };
}

export async function replaceUserPermissions(userId: string, actor: Actor, actions: string[], vendorScoped = false) {
    await getUser(userId, actor, vendorScoped);
    if (vendorScoped) {
        const memberships = await prisma.salonStaff.findMany({
            where: { userId, isActive: true, salon: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] } },
            select: { salonId: true },
        });
        const scopedPermissions = new Set<string>();
        for (const membership of memberships) {
            for (const action of await allowedVendorPermissions(actor, membership.salonId)) scopedPermissions.add(action);
        }
        if (actions.some((action) => !scopedPermissions.has(action))) {
            fail(403, "You cannot assign permissions that you do not have", "PERMISSION_DENIED");
        }
    }
    const permissions = await ensurePermissionsExist(actions);
    await prisma.$transaction(async (tx) => {
        await tx.userPermission.deleteMany({ where: { userId } });
        if (permissions.length) {
            await tx.userPermission.createMany({
                data: permissions.map(({ id: permissionId }) => ({ userId, permissionId, isAllowed: true })),
                skipDuplicates: true,
            });
        }
    });
    await invalidateUserAccess(userId);
    return getUserPermissionsForManagement(userId, actor, vendorScoped);
}

export async function getUserAccess(userId: string, actor: Actor, vendorScoped = false) {
    const user = await getUser(userId, actor, vendorScoped);
    return {
        salonIds: user.staffIn.filter(({ salon }) => salon.parentId === null).map(({ salonId }) => salonId),
        branchIds: user.staffIn.filter(({ salon }) => salon.parentId !== null).map(({ salonId }) => salonId),
        memberships: user.staffIn,
    };
}

const AI_IMAGE_PERMISSION = "services.ai-image.generate";

async function requireActiveVendor(vendorId: string) {
    const vendor = await prisma.user.findFirst({
        where: {
            id: vendorId,
            isActive: true,
            roles: { some: { role: { name: "VENDOR", isActive: true } } },
        },
        select: { id: true },
    });
    if (!vendor) fail(404, "Active Vendor not found", "VENDOR_NOT_FOUND");
    return { vendorId: vendor!.id };
}

export async function getVendorAiImageAccess(vendorId: string) {
    const vendor = await requireActiveVendor(vendorId);
    const permission = await prisma.permission.findUnique({ where: { action: AI_IMAGE_PERMISSION }, select: { id: true } });
    if (!permission) return { vendorId: vendor.vendorId, feature: "AI_IMAGE_GENERATION", enabled: false };
    const assignment = await prisma.userPermission.findUnique({
        where: { userId_permissionId: { userId: vendor.vendorId, permissionId: permission.id } },
        select: { isAllowed: true },
    });
    return {
        vendorId: vendor.vendorId,
        feature: "AI_IMAGE_GENERATION",
        enabled: assignment?.isAllowed ?? false,
    };
}

export async function setVendorAiImageAccess(vendorId: string, actorId: string, enabled: boolean) {
    const vendor = await requireActiveVendor(vendorId);
    const permissionId = await ensureAiImageGenerationPermission();
    const prior = await prisma.userPermission.findUnique({
        where: { userId_permissionId: { userId: vendor.vendorId, permissionId } },
        select: { isAllowed: true },
    });
    const oldEnabled = prior?.isAllowed ?? false;

    await prisma.$transaction(async (tx) => {
        await tx.userPermission.upsert({
            where: { userId_permissionId: { userId: vendor.vendorId, permissionId } },
            update: { isAllowed: enabled },
            create: { userId: vendor.vendorId, permissionId, isAllowed: enabled },
        });
        if (oldEnabled !== enabled) {
            await tx.subscriptionAuditLog.create({
                data: {
                    actorId,
                    vendorId: vendor.vendorId,
                    action: enabled ? "ENABLE_AI_IMAGE_GENERATION" : "DISABLE_AI_IMAGE_GENERATION",
                    targetType: "VENDOR_FEATURE_ACCESS",
                    targetId: vendor.vendorId,
                    details: {
                        feature: "AI_IMAGE_GENERATION",
                        permission: AI_IMAGE_PERMISSION,
                        oldEnabled,
                        newEnabled: enabled,
                    },
                },
            });
        }
    });

    await invalidateUserAccess(vendor.vendorId);
    return {
        vendorId: vendor.vendorId,
        feature: "AI_IMAGE_GENERATION",
        enabled,
    };
}

export async function replaceUserAccess(userId: string, actor: Actor, input: AccessInput, vendorScoped = false) {
    if (vendorScoped) await assertVendorManagesUser(actor, userId);
    await validateSalonAssignment(input.salonId, input.branchIds, vendorScoped ? actor : undefined);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            isActive: true,
            roles: { where: { role: { isActive: true } }, select: { role: { select: { name: true } } } },
            staffIn: {
                where: { isActive: true },
                select: { salonId: true, role: true, staffRoleId: true, staffRole: { select: { id: true, salonId: true, name: true } } },
            },
        },
    });
    if (!user) return fail(404, "User not found");
    const fallbackRole = user.roles[0]?.role.name ?? "STAFF";
    const globalStaffRole = user.staffIn.find(({ staffRole }) => staffRole?.salonId === null)?.staffRole;
    const previousMemberships = new Map(user.staffIn.map((membership) => [membership.salonId, membership]));
    const requestedSalonIds = new Set([input.salonId, ...input.branchIds]);

    await prisma.$transaction(async (tx) => {
        const existing = await tx.salonStaff.findMany({
            where: {
                userId,
                ...(vendorScoped ? { salon: { OR: [{ ownerId: actor.userId }, { parent: { ownerId: actor.userId } }] } } : {}),
            },
            select: { id: true, salonId: true },
        });
        for (const membership of existing) {
            if (!requestedSalonIds.has(membership.salonId)) {
                await tx.salonStaff.update({ where: { id: membership.id }, data: { isActive: false, updatedById: actor.userId } });
            }
        }
        for (const salonId of requestedSalonIds) {
            const previous = previousMemberships.get(salonId);
            const applicableStaffRole = previous?.staffRole
                ?? (globalStaffRole?.salonId === null ? globalStaffRole : null);
            const role = applicableStaffRole?.name ?? previous?.role ?? fallbackRole;
            await tx.salonStaff.upsert({
                where: { userId_salonId: { userId, salonId } },
                update: {
                    isActive: user.isActive,
                    role,
                    staffRoleId: applicableStaffRole ? (previous?.staffRoleId ?? globalStaffRole?.id ?? null) : null,
                    updatedById: actor.userId,
                },
                create: {
                    userId,
                    salonId,
                    isActive: user.isActive,
                    role,
                    staffRoleId: applicableStaffRole ? (previous?.staffRoleId ?? globalStaffRole?.id ?? null) : null,
                    createdById: actor.userId,
                },
            });
        }
    });

    await invalidateUserAccess(userId);
    return getUserAccess(userId, actor, vendorScoped);
}
