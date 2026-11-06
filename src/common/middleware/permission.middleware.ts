import { Request, Response, NextFunction } from "express";
import { getEffectivePermissions } from "../../modules/rbac/rbac.service";
import logger from "../../infrastructure/logger/logger";

const requestedSalonId = (req: Request, user: { salonId?: string }) =>
    String(req.params.branchId ?? req.params.salonId ?? req.query.branchId ?? req.query.salonId
        ?? req.body?.branchId ?? req.body?.salonId ?? user.salonId ?? "") || undefined;

const permissionDenied = (req: Request, res: Response, permission: string) => {
    const [module = "UNKNOWN", action = "VIEW"] = permission.split(".");
    logger.warn("permission_denied", {
        requestId: req.header("X-Request-ID"),
        userId: (req as any).user?.userId,
        method: req.method,
        route: req.originalUrl.split("?")[0],
        category: "RBAC_PERMISSION",
        module,
        action,
    });
    return res.status(403).json({
        success: false,
        statusCode: 403,
        code: "PERMISSION_DENIED",
        message: req.t?.("errors.forbidden") ?? "You do not have permission to perform this action.",
        messageKey: "errors.forbidden",
        module: module.toUpperCase(),
        action: action.toUpperCase(),
    });
};

export const requirePermission = (requiredPermission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ success: false, message: req.t?.("errors.unauthorized") ?? "Unauthorized", messageKey: "errors.unauthorized" });
            }

            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (permissions.includes(requiredPermission)) {
                return next();
            }

            return permissionDenied(req, res, requiredPermission);
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
                return res.status(401).json({ success: false, message: req.t?.("errors.unauthorized") ?? "Unauthorized", messageKey: "errors.unauthorized" });
            }

            const roles = Array.isArray(user.roles) ? user.roles : [];
            const roleAllowed = roles.some((role: string) => allowedRoles.includes(role));
            if (roleAllowed && roles.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) return next();
            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (permissions.includes(requiredPermission)) {
                return next();
            }

            return permissionDenied(req, res, requiredPermission);
        } catch (error) {
            return next(error);
        }
    };
};

export const requireAnyPermissionOrRoles = (requiredPermissions: string[], ...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ success: false, message: req.t?.("errors.unauthorized") ?? "Unauthorized", messageKey: "errors.unauthorized" });
            const roles = Array.isArray(user.roles) ? user.roles : [];
            const roleAllowed = roles.some((role: string) => allowedRoles.includes(role));
            if (roleAllowed && roles.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) return next();
            const permissions = await getEffectivePermissions(user.userId, requestedSalonId(req, user));
            if (requiredPermissions.some((permission) => permissions.includes(permission))) return next();
            return permissionDenied(req, res, requiredPermissions[0] ?? "UNKNOWN.VIEW");
        } catch (error) {
            next(error);
        }
    };
};
