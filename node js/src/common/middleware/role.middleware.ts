import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorizeRoles =
    (...allowedRoles: string[]) =>
        (req: AuthRequest, res: Response, next: NextFunction) => {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const hasRole = user.roles.some((role) =>
                allowedRoles.includes(role)
            );

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: "Forbidden: Insufficient permissions",
                });
            }

            next();
        };