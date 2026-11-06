import { Request, Response, NextFunction } from "express";
import * as rbacService from "./rbac.service";
import { createStaffRoleSchema, updateStaffRoleSchema, planPermissionSchema, systemRoleSchema, systemRoleUpdateSchema } from "./rbac.validation";
import { prisma } from "../../infrastructure/database/prisma";
import { ensureDefaultVendorSubscription, getSubscriptionPermissionActions, subscriptionMenuIds, subscriptionOwnerIdForUser } from "../subscription/subscription.service";
import type { SubscriptionAccessUserType } from "@prisma/client";
import { addMenuTranslations } from "../i18n/i18n.translations";
import { isVendorUser } from "../../common/utils/role.util";

export const getSidebarMenus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        // Keep this canonical menu endpoint self-sufficient for vendors.  The
        // authenticated database identity remains authoritative; this does not
        // accept stale JWT claims as a substitute for a real user.
        const isVendor = isVendorUser(user.roles ?? []);
        if (isVendor) {
            const salon = await prisma.salon.findFirst({
                where: { ownerId: user.userId, isActive: true },
                select: { id: true },
            });
            await ensureDefaultVendorSubscription(user.userId, salon?.id);
        }
        const salonId = isVendor
            ? (await prisma.salon.findFirst({ where: { ownerId: user.userId, isActive: true }, select: { id: true } }))?.id
            : undefined;
        const permissions = await rbacService.getEffectivePermissions(user.userId, salonId);
        const sidebarOnly = req.query.sidebarOnly !== 'false';
        const fetchAll = req.query.fetchAll === 'true'; // For access control matrix
        if (fetchAll && !user.roles?.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
            return res.status(403).json({
                success: false,
                message: req.t?.("errors.forbidden") ?? "You do not have permission to perform this action.",
                messageKey: "errors.forbidden",
            });
        }

        const userType = isVendor ? "VENDOR" : user.roles?.includes("STAFF") ? "STAFF" : undefined;
        const ownerId = userType ? await subscriptionOwnerIdForUser(user.userId, userType, salonId ?? user.salonId) : undefined;
        const subscriptionPermissions = ownerId && userType ? await getSubscriptionPermissionActions(ownerId, userType) : undefined;
        const planMenuIds = ownerId && userType ? await subscriptionMenuIds(ownerId, userType) : undefined;
        const menus = await rbacService.getMenus(user.roles || [], permissions, fetchAll, sidebarOnly, subscriptionPermissions, planMenuIds);
        const localizedMenus = menus.map((menu) => addMenuTranslations(menu, req.language ?? "en"));

        res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
        res.setHeader("Vary", "Authorization, X-Language, Accept-Language, Cookie");
        res.status(200).json({
            success: true,
            message: req.t?.("navigation.menus_fetched") ?? "Menus fetched successfully.",
            messageKey: "navigation.menus_fetched",
            data: localizedMenus,
        });
    } catch (err) {
        next(err);
    }
};

export const createMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const menu = await rbacService.createMenu(data);

        res.status(201).json({
            success: true,
            message: "Menu created successfully",
            data: menu,
        });
    } catch (err) {
        next(err);
    }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const data = req.body;
        const menu = await rbacService.updateMenu(id, data);

        res.status(200).json({
            success: true,
            message: "Menu updated successfully",
            data: menu,
        });
    } catch (err) {
        next(err);
    }
};

export const reorderMenus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { items } = req.body; // Array of { id, order }
        await rbacService.reorderMenus(items);

        res.status(200).json({
            success: true,
            message: "Menus reordered successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        await rbacService.deleteMenu(id);

        res.status(200).json({
            success: true,
            message: "Menu deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const getMyPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const { permissions } = await accessEntitlements(
            user.userId,
            user.roles ?? [],
            req.query.salonId as string | undefined,
        );

        res.status(200).json({
            success: true,
            message: "Permissions fetched successfully",
            data: permissions,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await rbacService.getPermissions();

        res.status(200).json({
            success: true,
            message: "All permissions fetched successfully",
            data: permissions,
        });
    } catch (err) {
        next(err);
    }
};
export const getPermissionTree = async (_req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, message: "Permission tree fetched successfully", data: await rbacService.getPermissionTree() }); } catch (err) { next(err); } };

export const getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roleId = req.params.id as string;
        const permissions = await rbacService.getRolePermissions(roleId);

        res.status(200).json({
            success: true,
            message: "Role permissions fetched successfully",
            data: permissions,
        });
    } catch (err) {
        next(err);
    }
};

export const toggleRolePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roleId = req.params.id as string;
        const { action, active } = req.body;
        
        await rbacService.toggleRolePermission(roleId, action, active);
        const permissions = await rbacService.getRolePermissions(roleId);

        res.status(200).json({
            success: true,
            message: "Role permission toggled successfully",
            data: { roleId, permissions },
        });
    } catch (err) {
        next(err);
    }
};

export const replaceRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await rbacService.replaceRolePermissions(req.params.id as string, req.body.permissions);
        res.status(200).json({ success: true, message: "Role permissions updated successfully", data: result });
    } catch (err) {
        next(err);
    }
};

export const createStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createStaffRoleSchema.parse(req.body);
        const role = await rbacService.createStaffRole(data, (req as any).user);

        res.status(201).json({
            success: true,
            message: "Staff role created successfully",
            data: role,
        });
    } catch (err) {
        next(err);
    }
};

export const getStaffRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const salonId = req.query.salonId as string | undefined;
        const roles = await rbacService.getStaffRoles(salonId, (req as any).user);

        res.status(200).json({
            success: true,
            message: "Staff roles fetched successfully",
            data: roles,
        });
    } catch (err) {
        next(err);
    }
};

export const updateStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const data = updateStaffRoleSchema.parse(req.body);
        const role = await rbacService.updateStaffRole(id, data, (req as any).user);

        res.status(200).json({
            success: true,
            message: "Staff role updated successfully",
            data: role,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        await rbacService.deleteStaffRole(id, (req as any).user);

        res.status(200).json({
            success: true,
            message: "Staff role deleted successfully",
            data: null,
        });
    } catch (err) {
        next(err);
    }
};

const permissionMatrix = (permissions: string[]) => permissions.reduce<Record<string, Record<string, boolean>>>((matrix, permission) => {
    const [module, action] = permission.split('.');
    if (!module || !action) return matrix;
    matrix[module.toLowerCase()] ??= {};
    matrix[module.toLowerCase()][action.toLowerCase()] = true;
    return matrix;
}, {});
const resolveAccessScope = async (userId: string, roles: string[], requestedSalonId?: string) => {
    const isAdmin = roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
    const isVendor = isVendorUser(roles);
    let salons: Array<{ id: string; name: string; parentId: string | null }> = [];

    if (isAdmin) {
        if (requestedSalonId) {
            const requested = await prisma.salon.findFirst({
                where: { id: requestedSalonId, isActive: true },
                select: { id: true, name: true, parentId: true },
            });
            if (!requested) throw { status: 404, message: "Salon not found" };
            salons = [requested];
        }
    } else if (isVendor) {
        salons = await prisma.salon.findMany({
            where: { isActive: true, OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] },
            select: { id: true, name: true, parentId: true },
            orderBy: [{ parentId: "asc" }, { name: "asc" }],
        });
    } else {
        const memberships = await prisma.salonStaff.findMany({
            where: { userId, isActive: true, salon: { isActive: true } },
            select: { salon: { select: { id: true, name: true, parentId: true } } },
            orderBy: { createdAt: "asc" },
        });
        salons = memberships.map(({ salon }) => salon);
    }

    const uniqueSalons = [...new Map(salons.map((salon) => [salon.id, salon])).values()];
    if (!isAdmin && requestedSalonId && !uniqueSalons.some(({ id }) => id === requestedSalonId)) {
        throw {
            status: 403,
            code: "PERMISSION_DENIED",
            message: "You do not have permission to access this salon.",
        };
    }
    const salonId = requestedSalonId
        ?? uniqueSalons.find(({ parentId }) => parentId === null)?.id
        ?? uniqueSalons[0]?.id;
    const ownerId = isVendor
        ? userId
        : roles.includes("STAFF") || roles.includes("MANAGER")
            ? await subscriptionOwnerIdForUser(userId, "STAFF", salonId)
            : undefined;
    const userType: SubscriptionAccessUserType | undefined = isVendor ? "VENDOR" : ownerId ? "STAFF" : undefined;
    return {
        salonId,
        salons: uniqueSalons.filter(({ parentId }) => parentId === null),
        branches: uniqueSalons.filter(({ parentId }) => parentId !== null),
        ownerId,
        userType,
    };
};

const accessEntitlements = async (userId: string, roles: string[], salonId?: string) => {
    const scope = await resolveAccessScope(userId, roles, salonId);
    if (isVendorUser(roles)) await ensureDefaultVendorSubscription(userId, scope.salonId);
    const assignedPermissions = await rbacService.getEffectivePermissions(userId, scope.salonId);
    const [subscriptionPermissions, allowedMenuIds] = scope.ownerId && scope.userType
        ? await Promise.all([
            getSubscriptionPermissionActions(scope.ownerId, scope.userType),
            subscriptionMenuIds(scope.ownerId, scope.userType),
        ])
        : [undefined, undefined];
    const permissions = subscriptionPermissions
        ? assignedPermissions.filter((permission) => subscriptionPermissions.includes(permission))
        : assignedPermissions;
    const menus = await rbacService.getMenus(
        roles,
        permissions,
        false,
        true,
        subscriptionPermissions,
        allowedMenuIds,
    );
    return { scope, permissions, menus };
};

export const getMyAccessControl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUser = (req as any).user;
        const user = await prisma.user.findUnique({
            where: { id: authUser.userId },
            select: { id: true, firstName: true, lastName: true },
        });
        if (!user) return res.status(401).json({ success: false, message: "Invalid user" });
        const roles: string[] = authUser.roles ?? [];
        const { scope, permissions, menus } = await accessEntitlements(
            user.id,
            roles,
            req.query.salonId as string | undefined,
        );
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
                    roles,
                },
                salons: scope.salons,
                branches: scope.branches,
                permissions,
                menus,
                matrix: permissionMatrix(permissions),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getMyMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const { menus } = await accessEntitlements(
            user.userId,
            user.roles ?? [],
            req.query.salonId as string | undefined,
        );
        res.status(200).json({ success: true, data: menus });
    } catch (err) {
        next(err);
    }
};
export const getPlanPermissions = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.getPlanPermissions(String(req.params.planId)) }); } catch (err) { next(err); } };
export const updatePlanPermissions = async (req: Request, res: Response, next: NextFunction) => { try { const body = planPermissionSchema.parse(req.body); res.json({ success: true, data: await rbacService.replacePlanPermissions(String(req.params.planId), body.permissions) }); } catch (err) { next(err); } };
export const listSystemRoles = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.listSystemRoles(req.query.planId as string | undefined) }); } catch (err) { next(err); } };
export const createSystemRole = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await rbacService.createSystemRole(systemRoleSchema.parse(req.body)) }); } catch (err) { next(err); } };
export const updateSystemRole = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.updateSystemRole(String(req.params.id), systemRoleUpdateSchema.parse(req.body)) }); } catch (err) { next(err); } };
export const deleteSystemRole = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.deleteSystemRole(String(req.params.id)) }); } catch (err) { next(err); } };
export const cloneSystemRole = async (req: Request, res: Response, next: NextFunction) => { try { const body = systemRoleSchema.pick({ name: true }).parse(req.body); res.status(201).json({ success: true, data: await rbacService.cloneSystemRole(String(req.params.id), body.name) }); } catch (err) { next(err); } };
export const getSystemRolePermissions = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.getRolePermissions(String(req.params.id)) }); } catch (err) { next(err); } };
export const updateSystemRolePermissions = async (req: Request, res: Response, next: NextFunction) => { try { const body = planPermissionSchema.parse(req.body); res.json({ success: true, data: await rbacService.replaceRolePermissions(String(req.params.id), body.permissions) }); } catch (err) { next(err); } };
export const assignVendorRole = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.assignVendorRole(String(req.params.vendorId), String(req.body.roleId)) }); } catch (err) { next(err); } };
export const getVendorRoles = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.getVendorRoles(String(req.params.vendorId)) }); } catch (err) { next(err); } };
export const getVendorRole = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await rbacService.getVendorRole(String(req.params.vendorId)) }); } catch (err) { next(err); } };
