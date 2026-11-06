import { NextFunction, Request, Response } from "express";
import {
    createTranslator,
    isSupportedLanguage,
    SupportedLanguage,
    TranslationVariables,
} from "./i18n.translations";

declare global {
    namespace Express {
        interface Request {
            language?: SupportedLanguage;
            explicitLanguage?: SupportedLanguage;
            t?: (key: string, fallback?: string, variables?: TranslationVariables) => string;
        }
    }
}

const queryLanguage = (req: Request): unknown =>
    typeof req.query.language === "string"
        ? req.query.language
        : typeof req.query.lang === "string"
            ? req.query.lang
            : undefined;

const cookieLanguage = (req: Request): unknown => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;
    const languageCookie = cookieHeader.split(";").map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("language="));
    if (!languageCookie) return undefined;
    const value = languageCookie.slice("language=".length);
    try {
        return decodeURIComponent(value);
    } catch {
        return undefined;
    }
};

const acceptedLanguage = (req: Request): SupportedLanguage | undefined => {
    const header = req.headers["accept-language"];
    if (typeof header !== "string") return undefined;
    const preferences = header.split(",").map((entry) => {
        const [tag, quality = "q=1"] = entry.trim().split(";");
        const parsedQuality = Number(quality.trim().replace(/^q=/, ""));
        return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(parsedQuality) ? parsedQuality : 0 };
    }).sort((left, right) => right.quality - left.quality);

    for (const { tag } of preferences) {
        if (isSupportedLanguage(tag)) return tag;
        if (tag === "hi-in" || tag.startsWith("hi-")) return "hi";
        if (tag === "en-in" || tag.startsWith("en-")) return "en";
    }
    return undefined;
};

const explicitRequestLanguage = (req: Request): unknown =>
    req.headers["x-language"] ?? queryLanguage(req);

const normalizeLanguage = (language: unknown): SupportedLanguage | undefined => {
    if (typeof language !== "string") return undefined;
    const normalized = language.trim().toLowerCase();
    return isSupportedLanguage(normalized) ? normalized : undefined;
};

export const applyRequestLanguage = (
    req: Request,
    preferredLanguage?: string | null,
): void => {
    const requestedLanguage = req.explicitLanguage ?? explicitRequestLanguage(req);
    const explicit = normalizeLanguage(requestedLanguage);
    const invalidExplicit = requestedLanguage !== undefined && explicit === undefined;
    const cookie = cookieLanguage(req);
    const resolved = explicit
        ?? (invalidExplicit ? "en" : undefined)
        ?? normalizeLanguage(preferredLanguage)
        ?? normalizeLanguage(cookie)
        ?? acceptedLanguage(req)
        ?? "en";
    req.language = resolved;
    req.t = createTranslator(resolved);
};

export const languageMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
    const explicit = explicitRequestLanguage(req);
    req.explicitLanguage = normalizeLanguage(explicit);
    applyRequestLanguage(req);
    next();
};
