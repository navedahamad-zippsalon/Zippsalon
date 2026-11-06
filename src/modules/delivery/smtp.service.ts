import nodemailer from "nodemailer";
import { prisma } from "../../infrastructure/database/prisma";
import { decryptDeliverySecret, encryptDeliverySecret, maskSecret } from "./configuration-crypto";

export type SmtpInput = { provider?: string; host: string; port: number; username: string; password?: string; encryption?: "none" | "ssl" | "tls"; secure: boolean; requireTLS: boolean; fromEmail: string; fromName: string; replyTo?: string | null; connectionTimeout?: number; enabled: boolean };
export type ConfigurationScope = { vendorId?: string; salonId?: string };

const publicConfig = (config: any) => config ? ({ id: config.id, provider: config.provider, host: config.host, port: config.port, username: config.username, passwordConfigured: Boolean(config.encryptedPassword), fromEmail: config.fromEmail, fromName: config.fromName, replyTo: config.replyTo, encryption: config.encryption, isActive: config.enabled, isVerified: config.isVerified, lastTestedAt: config.lastTestedAt, lastTestStatus: config.lastTestStatus, createdAt: config.createdAt, updatedAt: config.updatedAt }) : { configured: false, isActive: false, passwordConfigured: false };

const whereFor = (scope: ConfigurationScope = {}) => ({ vendorId: scope.vendorId ?? null, salonId: scope.salonId ?? null });
async function stored(scope: ConfigurationScope = {}) { return prisma.smtpConfiguration.findFirst({ where: whereFor(scope), orderBy: { updatedAt: "desc" } }); }

export async function getPublicConfiguration(scope: ConfigurationScope = {}) { return publicConfig(await stored(scope)); }

export async function saveConfiguration(actorId: string, input: SmtpInput, scope: ConfigurationScope = {}) {
  const current = await stored(scope);
  const password = input.password?.trim() || (current ? decryptDeliverySecret(current.encryptedPassword) : "");
  if (!password) throw { status: 400, code: "SMTP_CONFIGURATION_INVALID", message: "SMTP password is required when creating a configuration." };
  const data = { ...whereFor(scope), provider: input.provider?.trim() || "SMTP", host: input.host.trim(), port: input.port, username: input.username.trim(), encryptedPassword: encryptDeliverySecret(password), secure: input.secure, requireTLS: input.requireTLS, encryption: input.encryption ?? (input.secure ? "ssl" : input.requireTLS ? "tls" : "none"), fromEmail: input.fromEmail.trim().toLowerCase(), fromName: input.fromName.trim(), replyTo: input.replyTo?.trim().toLowerCase() || null, connectionTimeout: input.connectionTimeout ?? 10000, enabled: input.enabled, isVerified: false, lastTestStatus: null };
  if (current) return prisma.smtpConfiguration.update({ where: { id: current.id }, data: { ...data, updatedBy: actorId } });
  return prisma.smtpConfiguration.create({ data: { ...data, createdBy: actorId } });
}

export async function getActiveSmtpConfig(scope: ConfigurationScope = {}) {
  const config = (await stored(scope))?.enabled ? await stored(scope) : (scope.vendorId || scope.salonId ? await stored() : null);
  if (!config || !config.enabled) throw { status: 503, code: "SMTP_CONFIGURATION_NOT_FOUND", message: "Email delivery is not configured." };
  return { ...config, password: decryptDeliverySecret(config.encryptedPassword) };
}

async function transporter(scope: ConfigurationScope = {}) {
  const config = await getActiveSmtpConfig(scope);
  return { config, transporter: nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, requireTLS: config.requireTLS, connectionTimeout: config.connectionTimeout, auth: { user: config.username, pass: config.password } }) };
}

export async function verifyConnection(scope: ConfigurationScope = {}) {
  try { const { config, transporter: client } = await transporter(scope); await client.verify(); await prisma.smtpConfiguration.update({ where: { id: config.id }, data: { isVerified: true, lastTestedAt: new Date(), lastTestStatus: "SUCCESS" } }); return { success: true, message: "SMTP connection successful" }; }
  catch (error: any) {
    if (error?.code === "SMTP_CONFIGURATION_NOT_FOUND" || error?.code === "CONFIGURATION_ENCRYPTION_UNAVAILABLE") throw error;
    const current = await stored(scope); if (current) await prisma.smtpConfiguration.update({ where: { id: current.id }, data: { isVerified: false, lastTestedAt: new Date(), lastTestStatus: "FAILED" } });
    return { success: false, code: error?.code === "EAUTH" ? "SMTP_AUTH_FAILED" : "SMTP_CONNECTION_FAILED", message: "Unable to connect to the SMTP server." };
  }
}

export async function sendMail(message: { to: string; subject: string; text: string; html?: string }, scope: ConfigurationScope = {}) {
  try {
    const { config, transporter: client } = await transporter(scope);
    await client.sendMail({ from: { address: config.fromEmail, name: config.fromName }, replyTo: config.replyTo || undefined, ...message });
  } catch (error: any) {
    if (error?.code === "SMTP_CONFIGURATION_NOT_FOUND" || error?.code === "CONFIGURATION_ENCRYPTION_UNAVAILABLE") throw error;
    throw { status: 503, code: error?.code === "EAUTH" ? "SMTP_AUTH_FAILED" : "SMTP_SEND_FAILED", message: "Email delivery is temporarily unavailable." };
  }
}

export async function deleteConfiguration(scope: ConfigurationScope = {}) { const current = await stored(scope); if (current) await prisma.smtpConfiguration.delete({ where: { id: current.id } }); }
export async function setSmtpStatus(enabled: boolean, scope: ConfigurationScope = {}) { const current = await stored(scope); if (!current) throw { status: 404, code: "SMTP_CONFIGURATION_NOT_FOUND", message: "SMTP configuration was not found." }; return prisma.smtpConfiguration.update({ where: { id: current.id }, data: { enabled } }); }
