import redis, { redisReady } from "./redis";

export const cacheGetOrSet = async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 1800
): Promise<T> => {
    if (!redisReady()) return fetchFn();
    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (_err) {}

    const data = await fetchFn();

    try {
        await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (_err) {}

    return data;
};

export const cacheInvalidate = async (pattern: string) => {
    if (!redisReady()) return;
    try {
        if (pattern.includes("*")) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } else {
            await redis.del(pattern);
        }
    } catch (_err) {}
};

export const acquireLock = async (lockKey: string, ttlMs: number = 10000): Promise<boolean> => {
    if (!redisReady()) {
        return true;
    }

    try {
        const result = await redis.set(lockKey, "locked", "PX" as any, ttlMs as any, "NX" as any);
        return result === "OK";
    } catch (_err) {
        return true;
    }
};

export const releaseLock = async (lockKey: string): Promise<void> => {
    if (!redisReady()) return;
    try {
        await redis.del(lockKey);
    } catch (_err) {}
};
