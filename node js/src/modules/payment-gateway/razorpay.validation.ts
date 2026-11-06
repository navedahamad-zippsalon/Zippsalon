import { z } from "zod";

export const razorpayConfigSchema = z.object({
  environment: z.enum(["TEST", "LIVE"]),
  keyId: z.string().trim(),
  keySecret: z.string().trim().optional(),
  webhookSecret: z.string().trim().optional(),
  enabled: z.boolean(),
});

export const razorpayTestSchema = z.object({
  environment: z.enum(["TEST", "LIVE"]),
  keyId: z.string().trim(),
  keySecret: z.string().trim(),
});
