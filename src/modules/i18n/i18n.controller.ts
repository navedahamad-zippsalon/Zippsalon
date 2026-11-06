import { NextFunction, Request, Response } from "express";
import { prisma } from "../../infrastructure/database/prisma";
import {
    createTranslator,
    languageFromDatabase,
    languageToDatabase,
    getTranslationReport,
    supportedLanguages,
} from "./i18n.translations";

type AuthenticatedRequest = Request & { user?: { userId: string } };

const currentUserId = (req: AuthenticatedRequest): string => {
    if (!req.user?.userId) throw new Error("Authenticated user context is unavailable");
    return req.user.userId;
};

export const listLanguages = (_req: Request, res: Response): void => {
    res.status(200).json({ success: true, data: supportedLanguages });
};

export const getLanguageCoverage = (_req: Request, res: Response): void => {
    res.status(200).json({ success: true, data: getTranslationReport() });
};

export const getMyLanguage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: currentUserId(req) },
            select: { preferredLanguage: true },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: req.t?.("errors.user_not_found") ?? "User not found.",
                messageKey: "errors.user_not_found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: req.t?.("language.current") ?? "Your language preference.",
            messageKey: "language.current",
            data: { language: languageFromDatabase(user.preferredLanguage) },
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyLanguage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const updated = await prisma.user.update({
            where: { id: currentUserId(req) },
            data: { preferredLanguage: languageToDatabase(req.body.language) },
            select: { preferredLanguage: true },
        });
        const language = languageFromDatabase(updated.preferredLanguage);
        req.language = language;
        req.t = createTranslator(language);
        res.status(200).json({
            success: true,
            message: req.t("language.updated"),
            messageKey: "language.updated",
            data: { language },
        });
    } catch (error) {
        next(error);
    }
};
