import { Request, Response, NextFunction } from "express";
import logger from "../../infrastructure/logger/logger";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { createTranslator } from "../../modules/i18n/i18n.translations";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const t = req.t ?? createTranslator(req.language ?? "en");
    logger.error("request_error", {
        requestId: res.getHeader("X-Request-ID"),
        path: req.path,
        method: req.method,
        errorName: err?.name,
        errorMessage: err?.message,
    });

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: t("errors.validation_failed"),
            messageKey: "errors.validation_failed",
            errors: err.issues.map((issue) => {
                const details = issue as typeof issue & {
                    input?: unknown;
                    format?: string;
                    origin?: string;
                    minimum?: number;
                    maximum?: number;
                };
                let messageKey = "validation.invalid_value";
                let variables: Record<string, string | number> | undefined;
                const field = issue.path.join(".") || "unknown";
                if (issue.code === "invalid_type" && details.input === undefined) {
                    messageKey = "validation.required";
                } else if (issue.code === "invalid_format" && details.format === "email") {
                    messageKey = "validation.invalid_email";
                } else if (field.toLowerCase().includes("phone") && (issue.code === "invalid_format" || issue.code === "custom")) {
                    messageKey = "validation.invalid_phone";
                } else if (field === "amount") {
                    messageKey = "expenses.invalid_amount";
                } else if (field === "expenseDate") {
                    messageKey = "expenses.date_invalid";
                } else if (field === "categoryId") {
                    messageKey = "expenses.category_required";
                } else if (field === "paymentMethod") {
                    messageKey = "expenses.payment_method_required";
                } else if (field === "salonId") {
                    messageKey = "expenses.salon_required";
                } else if (issue.code === "too_small" && details.origin === "string" && typeof details.minimum === "number") {
                    messageKey = "validation.min_length";
                    variables = { field, min: details.minimum };
                } else if (issue.code === "too_big" && details.origin === "string" && typeof details.maximum === "number") {
                    messageKey = "validation.max_length";
                    variables = { field, max: details.maximum };
                }
                return {
                    field,
                    message: t(messageKey, undefined, variables),
                    messageKey,
                    code: issue.code,
                };
            }),
        });
    }

    if (err instanceof TokenExpiredError) {
        return res.status(401).json({ success: false, message: t("errors.session_expired"), messageKey: "errors.session_expired" });
    }
    if (err instanceof JsonWebTokenError) {
        return res.status(401).json({ success: false, message: t("errors.invalid_token"), messageKey: "errors.invalid_token" });
    }

    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: t("errors.upload_too_large"), messageKey: "errors.upload_too_large" });
    }

    if (err?.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ success: false, message: t("errors.unexpected_upload_field"), messageKey: "errors.unexpected_upload_field" });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") return res.status(409).json({ success: false, message: t("errors.record_conflict"), messageKey: "errors.record_conflict" });
        if (err.code === "P2025") return res.status(404).json({ success: false, message: t("errors.not_found"), messageKey: "errors.not_found" });
        if (err.code === "P2003") return res.status(400).json({ success: false, message: t("errors.invalid_related_record"), messageKey: "errors.invalid_related_record" });
        return res.status(500).json({ success: false, message: t("errors.database_error"), messageKey: "errors.database_error" });
    }

    const status = Number.isInteger(err?.status) ? err.status : 500;
    const messageKey = typeof err?.messageKey === "string" && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(err.messageKey)
        ? err.messageKey
        : status === 401
            ? "errors.unauthorized"
            : status === 403
                ? "errors.forbidden"
                : status === 404
                    ? "errors.not_found"
                    : status >= 500
                        ? "errors.server_error"
                        : "errors.request_failed";

    res.status(status).json({
        success: false,
        ...(status === 403 ? { statusCode: 403 } : {}),
        ...(err?.code ? { code: err.code } : {}),
        message: t(messageKey),
        messageKey,
    });
};