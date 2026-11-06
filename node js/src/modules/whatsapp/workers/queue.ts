import redis, { redisReady } from "../../../infrastructure/redis/redis";

export type WhatsAppJob = { type: "message" | "campaign" | "webhook"; id: string; attempts?: number; runAt?: number };
const queueUnavailable = () => Object.assign(new Error("WhatsApp queue is unavailable"), { status: 503, code: "WHATSAPP_QUEUE_UNAVAILABLE" });
const ensureRedis = async () => {
  if (redisReady()) return;
  try {
    if (redis.status === "wait") await redis.connect();
    else if (redis.status === "connecting" || redis.status === "reconnecting") {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => finish(queueUnavailable()), 1500);
        const onReady = () => finish();
        const onError = () => finish(queueUnavailable());
        const finish = (error?: Error) => {
          clearTimeout(timeout);
          redis.off("ready", onReady);
          redis.off("error", onError);
          error ? reject(error) : resolve();
        };
        redis.once("ready", onReady);
        redis.once("error", onError);
      });
    }
  } catch {
    throw queueUnavailable();
  }
  if (!redisReady()) throw queueUnavailable();
};
export const enqueue = async (queue: string, job: WhatsAppJob, delayMs = 0) => {
  await ensureRedis();
  const payload = JSON.stringify({ ...job, runAt: Date.now() + delayMs });
  await redis.zadd(`whatsapp:${queue}`, Date.now() + delayMs, payload);
  return job;
};
export const dequeue = async (queue: string, limit = 20): Promise<WhatsAppJob[]> => {
  if (!redisReady()) return [];
  const payloads = await redis.eval(
    "local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2]); for _, job in ipairs(jobs) do redis.call('ZREM', KEYS[1], job); end; return jobs",
    1,
    `whatsapp:${queue}`,
    Date.now(),
    limit,
  ) as string[];
  return payloads.map((payload) => JSON.parse(payload) as WhatsAppJob);
};
export const retryDelay = (attempt: number) => [5000, 30000, 120000, 600000][Math.min(attempt, 3)];
