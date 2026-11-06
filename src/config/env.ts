import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    CORS_ORIGIN: z.string().optional(),
    JSON_BODY_LIMIT: z.string().default("100kb"),
    REDIS_URL: z.string().optional(),
    TRUSTED_PROXY_IPS: z.string().optional(),
    TRACKING_ACTIVE_WINDOW_SECONDS: z.coerce.number().int().positive().default(120),
    TRACKING_SESSION_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(1800),
    TRACKING_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
    TRACKING_GEOLOCATION_URL: z.string().optional(),
    WHATSAPP_PROVIDER: z.string().default("meta"),
    WHATSAPP_API_VERSION: z.string().default("v20.0"),
    WHATSAPP_API_BASE_URL: z.string().default("https://graph.facebook.com"),
    WHATSAPP_ENCRYPTION_KEY: z.string().optional(),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_WEBHOOK_SECRET: z.string().optional(),
    APP_PUBLIC_URL: z.string().default("http://localhost:4000"),
    APP_BASE_URL: z.string().optional(),
    STABILITY_API_URL: z.string().url().default("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"),
    STABILITY_API_KEY: z.string().optional(),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    PAYMENT_ENCRYPTION_KEY: z.string().optional(),
    SMTP_CONFIG_ENCRYPTION_KEY: z.string().optional(),
});

const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const missing = result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
        if (process.env.NODE_ENV === "production") {
            throw new Error(`Invalid environment configuration: ${missing}`);
        } else {
            console.warn(`[WARN] Environment validation warnings: ${missing}`);
        }
        return process.env as unknown as z.infer<typeof envSchema>;
    }
    return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
