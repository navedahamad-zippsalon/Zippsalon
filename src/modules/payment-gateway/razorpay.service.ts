import Razorpay from "razorpay";
import { prisma } from "../../infrastructure/database/prisma";
import { env } from "../../config/env";
import { decrypt, encrypt } from "../whatsapp/utils/encryption";

export type RazorpayMode = "TEST" | "LIVE";
export type RazorpayScope = "PLATFORM" | "VENDOR";
export type RazorpayConfigInput = { environment: RazorpayMode; keyId: string; keySecret?: string; webhookSecret?: string; enabled: boolean };
export type RazorpayTestInput = { environment: RazorpayMode; keyId: string; keySecret: string };

const keyPrefix = (environment: RazorpayMode) => environment === "TEST" ? "rzp_test_" : "rzp_live_";
const validateKey = (environment: RazorpayMode, keyId: string, enabled: boolean) => {
  if (enabled && !keyId.trim()) throw { status: 400, code: "RAZORPAY_KEY_ID_REQUIRED", message: "Razorpay Key ID is required" };
  if (keyId && !keyId.startsWith(keyPrefix(environment))) throw { status: 400, code: "RAZORPAY_MODE_KEY_MISMATCH", message: `A ${environment} Razorpay key is required for ${environment} mode` };
};

const validateCredentials = (environment: RazorpayMode, keyId: string, keySecret: string) => {
  if (!keyId.trim()) throw { status: 400, code: "RAZORPAY_KEY_ID_REQUIRED", message: "Razorpay Key ID is required" };
  if (!keySecret.trim()) throw { status: 400, code: "RAZORPAY_KEY_SECRET_REQUIRED", message: "Razorpay Key Secret is required" };
  validateKey(environment, keyId, true);
};

export async function getConfiguration(scope: RazorpayScope = "PLATFORM", ownerId?: string) {
  if (scope === "VENDOR" && !ownerId) throw { status: 400, message: "Vendor owner is required" };
  const stored = await prisma.razorpayConfiguration.findFirst({ where: { provider: "RAZORPAY", scope, ownerId: scope === "VENDOR" ? ownerId : null, environment: { in: ["TEST", "LIVE"] } }, orderBy: { updatedAt: "desc" } });
  if (stored) return { ...stored, keySecret: decrypt(stored.encryptedKeySecret), webhookSecret: stored.encryptedWebhookSecret ? decrypt(stored.encryptedWebhookSecret) : undefined, source: "database" as const };
  if (scope === "PLATFORM" && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) return { provider: "RAZORPAY", scope, ownerId: null, environment: (env.RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "LIVE" : "TEST") as RazorpayMode, keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? "", enabled: true, source: "environment" as const };
  return null;
}

export async function publicConfiguration(scope: RazorpayScope = "PLATFORM", ownerId?: string) {
  const config = await getConfiguration(scope, ownerId);
  if (!config) return { provider: "RAZORPAY", environment: null, enabled: false, keyId: null, keySecretConfigured: false, webhookSecretConfigured: false };
  return { provider: "RAZORPAY", scope: config.scope, ownerId: config.ownerId ?? null, environment: config.environment, enabled: config.enabled, keyId: config.keyId, keySecretConfigured: Boolean(config.keySecret), webhookSecretConfigured: Boolean(config.webhookSecret) };
}

export async function updateConfiguration(actorId: string, input: RazorpayConfigInput, scope: RazorpayScope = "PLATFORM", ownerId?: string) {
  if (scope === "VENDOR" && (!ownerId || ownerId !== actorId)) throw { status: 403, message: "Vendor configuration ownership mismatch" };
  validateKey(input.environment, input.keyId, input.enabled);
  const current = await prisma.razorpayConfiguration.findFirst({ where: { provider: "RAZORPAY", scope, ownerId: scope === "VENDOR" ? ownerId : null, environment: input.environment } });
  const keySecret = input.keySecret?.trim() || (current ? decrypt(current.encryptedKeySecret) : "");
  if (input.enabled && !keySecret) throw { status: 400, code: "RAZORPAY_KEY_SECRET_REQUIRED", message: "Razorpay Key Secret is required" };
  const webhookSecret = input.webhookSecret === undefined
    ? (current?.encryptedWebhookSecret ? decrypt(current.encryptedWebhookSecret) : null)
    : (input.webhookSecret.trim() ? input.webhookSecret.trim() : null);
  const saved = current
    ? await prisma.razorpayConfiguration.update({ where: { id: current.id }, data: { keyId: input.keyId, encryptedKeySecret: encrypt(keySecret), encryptedWebhookSecret: webhookSecret ? encrypt(webhookSecret) : null, enabled: input.enabled, updatedBy: actorId } })
    : await prisma.razorpayConfiguration.create({ data: { provider: "RAZORPAY", scope, ownerId: scope === "VENDOR" ? ownerId : null, environment: input.environment, keyId: input.keyId, encryptedKeySecret: encrypt(keySecret), encryptedWebhookSecret: webhookSecret ? encrypt(webhookSecret) : null, enabled: input.enabled, createdBy: actorId } });
  await prisma.subscriptionAuditLog.create({ data: { actorId, vendorId: scope === "VENDOR" ? ownerId : null, action: "RAZORPAY_CONFIGURATION_UPDATED", targetType: "RAZORPAY_CONFIGURATION", targetId: saved.id, details: { scope, environment: saved.environment, keyIdChanged: true, keySecretUpdated: Boolean(input.keySecret?.trim()), webhookSecretUpdated: Boolean(input.webhookSecret?.trim()) } } });
  return saved;
}

export async function requireConfiguration(scope: RazorpayScope = "PLATFORM", ownerId?: string) {
  const config = await getConfiguration(scope, ownerId);
  if (!config || !config.enabled || !config.keyId || !config.keySecret) throw { status: 503, code: "PAYMENT_GATEWAY_UNAVAILABLE", message: "Payment gateway is currently unavailable. Please contact the administrator." };
  return config;
}

export async function createClient(scope: RazorpayScope = "PLATFORM", ownerId?: string) {
  const config = await requireConfiguration(scope, ownerId);
  return { client: new Razorpay({ key_id: config.keyId, key_secret: config.keySecret }), config };
}

export async function testConnection(scope: RazorpayScope = "PLATFORM", ownerId?: string, input?: RazorpayTestInput) {
  const stored = input ? undefined : await requireConfiguration(scope, ownerId);
  const credentials = input ?? { environment: stored!.environment, keyId: stored!.keyId, keySecret: stored!.keySecret };
  validateCredentials(credentials.environment, credentials.keyId, credentials.keySecret);
  const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
  try {
    await client.orders.all({ count: 1 });
    return { success: true, environment: credentials.environment, message: "Razorpay connection successful" };
  } catch (_error) {
    return { success: false, code: "RAZORPAY_CONNECTION_FAILED", environment: credentials.environment, message: "Razorpay credentials are invalid" };
  }
}

export async function webhookSecret() {
  const config = await getConfiguration("PLATFORM");
  return config?.enabled ? config.webhookSecret : undefined;
}
