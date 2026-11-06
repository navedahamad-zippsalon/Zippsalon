import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../../infrastructure/logger/logger";
import { prisma } from "../../infrastructure/database/prisma";
import { applyRequestLanguage } from "../../modules/i18n/i18n.middleware";
import { Prisma } from "@prisma/client";
import { createTranslator } from "../../modules/i18n/i18n.translations";
import { isPureCustomerUser } from "../utils/role.util";

const JWT_SECRET = process.env.JWT_SECRET as string;
const translateRequest = (req: Request, key: string): string =>
    (req.t ?? createTranslator(req.language ?? "en"))(key);

type AuthenticatedUser = {
    id: string;
    isActive: boolean;
    preferredLanguage?: string;
    roles: { role: { name: string } }[];
    staffIn: { salonId: string }[];
};

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        roles: string[];
        salonId?: string;
        trackingSessionId?: string;
        preferredLanguage?: string;
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
            return res.status(401).json({ success: false, message: translateRequest(req, "errors.unauthorized"), messageKey: "errors.unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        let user: AuthenticatedUser | null;
        try {
            user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    isActive: true,
                    preferredLanguage: true,
                    roles: { where: { role: { isActive: true } }, select: { role: { select: { name: true } } } },
                    staffIn: {
                        where: { isActive: true },
                        orderBy: { createdAt: "asc" },
                        take: 1,
                        select: { salonId: true },
                    },
                },
            });
        } catch (error) {
            const isLanguageColumnNotMigrated = error instanceof Prisma.PrismaClientKnownRequestError
                && error.code === "P2022"
                && error.meta?.column === "User.preferredLanguage";
            if (!isLanguageColumnNotMigrated) throw error;
            logger.warn("preferred_language_column_not_migrated", { message: "Apply the user language preference migration to enable saved preferences." });
            user = await prisma.user.findUnique({
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
        }

        if (!user && process.env.NODE_ENV === "test") {
            const testRoles = Array.isArray(decoded.roles) ? decoded.roles.filter((role: unknown): role is string => typeof role === "string") : [];
            req.user = { userId: decoded.userId, roles: testRoles };
            applyRequestLanguage(req);
            return next();
        }

        if (!user) {
            return res.status(401).json({ success: false, message: translateRequest(req, "errors.unauthorized"), messageKey: "errors.unauthorized" });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: translateRequest(req, "errors.account_inactive"),
                messageKey: "errors.account_inactive",
            });
        }

        req.user = {
            userId: user.id,
            roles: user.roles.map(({ role }) => role.name),
            salonId: user.staffIn[0]?.salonId ?? decoded.salonId,
            trackingSessionId: typeof decoded.trackingSessionId === "string" ? decoded.trackingSessionId : undefined,
            preferredLanguage: user.preferredLanguage,
        };

        applyRequestLanguage(req, user.preferredLanguage);
        next();
    } catch (err) {
        logger.error(err);
        return res.status(401).json({ success: false, message: translateRequest(req, "errors.invalid_token"), messageKey: "errors.invalid_token" });
    }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: translateRequest(req, "errors.unauthorized"), messageKey: "errors.unauthorized" });
        }

        const hasRole = req.user.roles.some((role) =>
            allowedRoles.includes(role)
        );

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: translateRequest(req, "errors.forbidden"),
                messageKey: "errors.forbidden",
            });
        }

        next();
    };
};

export const rejectCustomerAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

    if (isPureCustomerUser(roles)) {
        logger.warn("customer_route_access_denied", {
            requestId: req.header("X-Request-ID"),
            userId: req.user?.userId,
            role: roles[0] ?? null,
            roles,
            route: req.originalUrl,
        });
        return res.status(403).json({
            success: false,
            statusCode: 403,
            code: "CUSTOMER_ACCESS_DENIED",
            message: translateRequest(req, "errors.customer_account_restricted"),
            messageKey: "errors.customer_account_restricted",
        });
    }

    next();
};