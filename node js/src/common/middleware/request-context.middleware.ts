import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import logger from "../../infrastructure/logger/logger";

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
    const requestId = typeof req.header("X-Request-ID") === "string" && req.header("X-Request-ID")
        ? req.header("X-Request-ID")!
        : randomUUID();
    res.setHeader("X-Request-ID", requestId);
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        logger.info("http_request", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
        });
    });
    next();
};
