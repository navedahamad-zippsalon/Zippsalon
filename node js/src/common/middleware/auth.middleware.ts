import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../../infrastructure/logger/logger";
import { prisma } from "../../infrastructure/database/prisma";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        roles: string[];
        salonId?: string;
        trackingSessionId?: string;
    };
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    void authenticateRequest(req, res, next);
};

const authenticateRequest = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                isActive: true,
                roles: { where: { role: { isActive: true } }, select: { role: { select: { name: true } } } },
                staffIn: {
                    where: { isActive: true },
                    orderBy: { createdAt: "asc" },
                    take: 1,
                    select: { salonId: true },
                },
            },
        });

        if (!user && process.env.NODE_ENV === "test") {
            const testRoles = Array.isArray(decoded.roles) ? decoded.roles.filter((role: unknown): role is string => typeof role === "string") : [];
            req.user = { userId: decoded.userId, roles: testRoles };
            return next();
        }

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid user" });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: "Your account is inactive. Please contact an administrator.",
            });
        }

        req.user = {
            userId: user.id,
            roles: user.roles.map(({ role }) => role.name),
            salonId: user.staffIn[0]?.salonId ?? decoded.salonId,
            trackingSessionId: typeof decoded.trackingSessionId === "string" ? decoded.trackingSessionId : undefined,
        };

        next();
    } catch (err) {
        logger.error(err);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const hasRole = req.user.roles.some((role) =>
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
};

export const rejectCustomerAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isPureCustomer = roles.includes("CUSTOMER") && !roles.some((role) => ["ADMIN", "SUPER_ADMIN", "VENDOR", "STAFF"].includes(role));

    if (isPureCustomer) {
        logger.warn("customer_route_access_denied", {
            requestId: req.header("X-Request-ID"),
            userId: req.user?.userId,
            role: roles[0] ?? null,
            roles,
            route: req.originalUrl,
        });
        return res.status(403).json({ success: false, statusCode: 403, code: "CUSTOMER_ACCESS_DENIED", message: "Customer accounts cannot access this endpoint" });
    }

    next();
};