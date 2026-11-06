import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorizeRoles =
    (...allowedRoles: string[]) =>
        (req: AuthRequest, res: Response, next: NextFunction) => {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: req.t?.("errors.unauthorized") ?? "Unauthorized",
                    messageKey: "errors.unauthorized",
                });
            }

            const hasRole = user.roles.some((role) =>
                allowedRoles.includes(role)
            );

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: req.t?.("errors.forbidden") ?? "You do not have permission to perform this action.",
                    messageKey: "errors.forbidden",
                });
            }

            next();
        };