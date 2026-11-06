import { z } from "zod";

const smtpFields = z.object({
  provider: z.string().trim().min(1).max(100).optional(), host: z.string().trim().min(1).max(255), port: z.coerce.number().int().min(1).max(65535), username: z.string().trim().min(1).max(320), password: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).max(2048).optional()), encryption: z.enum(["none", "ssl", "tls"]).optional(), secure: z.boolean().optional(), requireTLS: z.boolean().optional(), fromEmail: z.string().trim().email(), fromName: z.string().trim().min(1).max(200), replyTo: z.string().trim().email().optional().or(z.literal("")), connectionTimeout: z.coerce.number().int().min(1000).max(120000).optional(), enabled: z.boolean().optional(), isActive: z.boolean().optional(),
});
const normalizeSmtp = (schema: typeof smtpFields) => schema.superRefine((data, ctx) => {
  if (data.secure && data.requireTLS) ctx.addIssue({ code: "custom", path: ["requireTLS"], message: "SSL and STARTTLS cannot both be enabled." });
  if (data.enabled === undefined && data.isActive === undefined) ctx.addIssue({ code: "custom", path: ["isActive"], message: "isActive is required." });
}).transform((data) => {
  const encryption = data.encryption ?? (data.secure ? "ssl" : data.requireTLS ? "tls" : "none");
  return { ...data, encryption, secure: encryption === "ssl", requireTLS: encryption === "tls", enabled: data.isActive ?? data.enabled ?? false };
});

export const smtpCreateSchema = normalizeSmtp(smtpFields.extend({ password: z.string().min(1).max(2048) }) as unknown as typeof smtpFields);
export const smtpUpdateSchema = normalizeSmtp(smtpFields);
export const smtpConfigSchema = smtpUpdateSchema;

export const smtpTestEmailSchema = z.object({ email: z.string().trim().email().optional(), to: z.string().trim().email().optional() }).transform((data, ctx) => {
  const email = data.email ?? data.to;
  if (!email) { ctx.addIssue({ code: "custom", message: "email is required." }); return z.NEVER; }
  return { email };
});
export const whatsappConfigSchema = z.object({ provider: z.literal("META_WHATSAPP_CLOUD_API").optional(), accessToken: z.string().trim().min(1).max(4096).optional(), phoneNumberId: z.string().trim().min(1).max(100), businessAccountId: z.string().trim().min(1).max(100), metaAppId: z.string().trim().min(1).max(100).optional(), webhookVerifyToken: z.string().trim().min(1).max(4096).optional(), webhookUrl: z.string().trim().url().optional(), apiVersion: z.string().trim().regex(/^v\d+(?:\.\d+)?$/).optional(), otpTemplateName: z.string().trim().regex(/^[a-z0-9_]+$/).max(512).default("authentication"), templateLanguage: z.string().trim().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/).default("en_US"), enabled: z.boolean().optional(), isActive: z.boolean().optional(), }).superRefine((data, ctx) => { if (data.enabled === undefined && data.isActive === undefined) ctx.addIssue({ code: "custom", path: ["isActive"], message: "isActive is required." }); }).transform((data) => ({ ...data, enabled: data.isActive ?? data.enabled ?? false }));
export const whatsappTestMessageSchema = z.object({ phoneNumber: z.string().trim().min(8).max(30).optional(), phone: z.string().trim().min(8).max(30).optional(), message: z.string().trim().min(1).max(4096).default("ZippSalon WhatsApp configuration test message.") }).transform((data, ctx) => { const phoneNumber = data.phoneNumber ?? data.phone; if (!phoneNumber) { ctx.addIssue({ code: "custom", message: "phoneNumber is required." }); return z.NEVER; } return { phoneNumber, message: data.message }; });
