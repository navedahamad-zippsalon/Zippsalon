import { Request, Response, NextFunction } from "express";
import redis, { redisReady } from "../../infrastructure/redis/redis";

export const generateImageRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!redisReady()) return next();
        // Authenticated users only, assuming this runs after authenticate middleware
        const userId = (req as any).user?.userId || req.ip;

        const key = `rate_limit:generate_image:${userId}`;
        const limit = 50;
        const windowDuration = 86400; // 24 hours in seconds

        const requests = await redis.incr(key);

        if (requests === 1) {
            await redis.expire(key, windowDuration);
        }

        if (requests > limit) {
            return res.status(429).json({
                success: false,
                message: req.t?.("errors.ai_image_rate_limit", undefined, { limit }) ?? `You have reached the daily limit of ${limit} AI image generations. Please try again tomorrow.`,
                messageKey: "errors.ai_image_rate_limit",
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};
