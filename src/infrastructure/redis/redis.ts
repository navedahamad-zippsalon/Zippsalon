import Redis from "ioredis";

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        connectTimeout: 1000,
        retryStrategy: () => null,
    })
    : new Redis({ lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: false });

export const redisReady = () => redis.status === "ready";

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (err) => {
    if (process.env.REDIS_LOG_ERRORS === "true") console.error("Redis error:", err);
});

export default redis;