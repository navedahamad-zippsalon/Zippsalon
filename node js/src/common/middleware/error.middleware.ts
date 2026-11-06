import { Request, Response, NextFunction } from "express";
import logger from "../../infrastructure/logger/logger";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
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
            message: "Validation Error",
            errors: err.issues.map((i: any) => ({
                field: i.path?.join(".") || i.path?.[0] || "unknown",
                message: i.message,
                code: i.code,
            })),
        });
    }

    if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: "Uploaded file exceeds the allowed size" });
    }

    if (err?.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ success: false, message: "Unexpected upload field" });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") return res.status(409).json({ success: false, message: "A record with the same value already exists" });
        if (err.code === "P2025") return res.status(404).json({ success: false, message: "Record not found" });
        if (err.code === "P2003") return res.status(400).json({ success: false, message: "Related record does not exist" });
    }

    const status = Number.isInteger(err?.status) ? err.status : 500;
    const isKnownProviderError = typeof err?.code === "string" && err.code.startsWith("AI_PROVIDER_");
    const isSafePayoutError = typeof err?.code === "string" && [
        "RAZORPAYX_NOT_CONFIGURED",
        "RAZORPAYX_CONTACT_FAILED",
        "RAZORPAYX_FUND_ACCOUNT_FAILED",
        "RAZORPAYX_REQUEST_FAILED",
        "PAYOUT_SOURCE_ACCOUNT_NOT_CONFIGURED",
    ].includes(err.code);
    const message = isKnownProviderError || isSafePayoutError
        ? err.message
        : (status >= 500 ? "Internal Server Error" : (err?.message || "Request failed"));

    res.status(status).json({
        success: false,
        ...(status === 403 ? { statusCode: 403 } : {}),
        ...(err?.code ? { code: err.code } : {}),
        message,
    });
};