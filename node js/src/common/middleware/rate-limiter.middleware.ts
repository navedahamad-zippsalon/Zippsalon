import { Request, Response, NextFunction } from "express";
import redis, { redisReady } from "../../infrastructure/redis/redis";

export const generateImageRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!redisReady()) return next();
        // Authenticated users only, assuming this runs after authenticate middleware
        const userId = (req as any).user?.userId || req.ip;

        const key = `rate_limit:generate_image:${userId}`;
        const limit = 50; // 5 images per day limit
        const windowDuration = 86400; // 24 hours in seconds

        const requests = await redis.incr(key);

        if (requests === 1) {
            await redis.expire(key, windowDuration);
        }

        if (requests > limit) {
            return res.status(429).json({
                success: false,
                message: "You have exceeded your daily limit of 5 AI image generations. Please try again tomorrow.",
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};
