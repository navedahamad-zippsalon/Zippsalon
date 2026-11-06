import { Request, Response, NextFunction } from "express";
import { getEffectivePermissions } from "../../modules/rbac/rbac.service";

const requestedSalonId = (req: Request, user: { salonId?: string }) =>
    String(req.params.branchId ?? req.params.salonId ?? req.query.branchId ?? req.query.salonId
        ?? req.body?.branchId ?? req.body?.salonId ?? user.salonId ?? "") || undefined;

const permissionDenied = (res: Response, permission: string) => {
    const [module = "UNKNOWN", action = "VIEW"] = permission.split(".");
    return res.status(403).json({
        success: false,
        statusCode: 403,
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action.",
        module: module.toUpperCase(),
        action: action.toUpperCase(),
    });
};

export const requirePermission = (requiredPermission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (permissions.includes(requiredPermission)) {
                return next();
            }

            return permissionDenied(res, requiredPermission);
        } catch (error) {
            next(error);
        }
    };
};

export const requirePermissionOrRoles = (
    requiredPermission: string,
    ...allowedRoles: string[]
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const roles = Array.isArray(user.roles) ? user.roles : [];
            const roleAllowed = roles.some((role: string) => allowedRoles.includes(role));
            if (roleAllowed && roles.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) return next();
            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (permissions.includes(requiredPermission)) {
                return next();
            }

            return permissionDenied(res, requiredPermission);
        } catch (error) {
            return next(error);
        }
    };
};

export const requireAnyPermissionOrRoles = (requiredPermissions: string[], ...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
            const roles = Array.isArray(user.roles) ? user.roles : [];
            const roleAllowed = roles.some((role: string) => allowedRoles.includes(role));
            if (roleAllowed && roles.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) return next();
            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (requiredPermissions.some((permission) => permissions.includes(permission))) return next();
            return permissionDenied(res, requiredPermissions[0] ?? "UNKNOWN.VIEW");
        } catch (error) {
            next(error);
        }
    };
};
