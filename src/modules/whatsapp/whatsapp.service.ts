import crypto from "crypto";
import { prisma } from "../../infrastructure/database/prisma";
import { decrypt, encrypt } from "./utils/encryption";
import { normalizePhone } from "./utils/phone";
import { calculateWhatsAppFinancials, currentPricing, pricingRates } from "./utils/pricing";
import { calculateWhatsAppCharge } from "./utils/billing";
import { categoryFor, isAdmin } from "./whatsapp.types";
import { providerFor } from "./providers";
import { enqueue } from "./workers/queue";
import { Prisma, WhatsAppMessageType, WhatsAppTemplateCategory } from "@prisma/client";

const fail = (status: number, code: string): never => { throw Object.assign(new Error(code), { status, code }); };
const clean = (value: any) => { if (!value) return value; const { encryptedAccessToken, encryptedMetaAppSecret, encryptedWebhookSecret, webhookVerifyToken, ...safe } = value; return safe; };
const providerTemplateStatus = (status: unknown) => {
  switch (String(status ?? "").toUpperCase()) {
    case "APPROVED": return "APPROVED" as const;
    case "REJECTED": return "REJECTED" as const;
    case "PAUSED": return "PAUSED" as const;
    case "DISABLED": return "DISABLED" as const;
    default: return "PENDING" as const;
  }
};
const providerTemplateCategory = (category: unknown): WhatsAppTemplateCategory => {
  const value = String(category ?? "").toUpperCase();
  if (value === "MARKETING" || value === "AUTHENTICATION") return value;
  return "UTILITY";
};
const providerTemplateComponents = (components: any[] = []) => {
  const header = components.find((component) => component.type === "HEADER");
  const body = components.find((component) => component.type === "BODY");
  const footer = components.find((component) => component.type === "FOOTER");
  const buttons = components.find((component) => component.type === "BUTTONS");
  return {
    body: typeof body?.text === "string" ? body.text : "",
    headerType: header?.format ?? null,
    headerText: typeof header?.text === "string" ? header.text : null,
    footerText: typeof footer?.text === "string" ? footer.text : null,
    buttons: buttons?.buttons ?? null,
    variables: [...new Set([...(body?.text?.matchAll?.(/{{(\d+)}}/g) ?? [])].map((match: RegExpMatchArray) => Number(match[1])))],
  };
};
const webhookDate = (value: unknown) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
};
const webhookMessageType = (value: unknown): WhatsAppMessageType => {
  switch (String(value ?? "").toLowerCase()) {
    case "image": return "IMAGE";
    case "video": return "VIDEO";
    case "document": return "DOCUMENT";
    case "audio":
    case "voice": return "AUDIO";
    case "interactive": return "INTERACTIVE";
    case "text": return "TEXT";
    default: return "TEXT";
  }
};
const webhookStatus = (value: unknown): "SENT" | "DELIVERED" | "READ" | "FAILED" | null => {
  const status = String(value ?? "").toUpperCase();
  return status === "SENT" || status === "DELIVERED" || status === "READ" || status === "FAILED" ? status : null;
};
const webhookMessageBody = (message: any) => {
  if (typeof message.text?.body === "string") return message.text.body;
  const reply = message.interactive?.button_reply ?? message.interactive?.list_reply ?? message.button;
  return typeof reply?.title === "string" ? reply.title : null;
};
const missingTemplateVariables = (body: string, supplied: any) => {
  const indexes = [...body.matchAll(/{{(\d+)}}/g)].map((match) => Number(match[1]));
  if (!indexes.length) return [];
  const values = Array.isArray(supplied)
    ? supplied
    : Array.isArray(supplied?.body)
      ? supplied.body
      : supplied && typeof supplied === "object"
        ? indexes.map((index) => supplied[String(index)] ?? supplied[`{{${index}}}`])
        : [];
  return [...new Set(indexes)].filter((index) => values[index - 1] === undefined || values[index - 1] === null || values[index - 1] === "");
};
const maskPhone = (phone: string) => phone.length < 7 ? "******" : `${phone.slice(0, 3)}${"*".repeat(Math.max(4, phone.length - 7))}${phone.slice(-4)}`;
const vendorSafeSnapshot = (snapshot: any) => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;
  const { providerCostPerMessage, providerCostTotal, adminMarginTotal, ...safe } = snapshot;
  return safe;
};
const vendorSafeCampaign = (campaign: any) => {
  if (!campaign) return campaign;
  const { providerCostEstimate, estimatedAdminMargin, providerCostTotal, adminMarginTotal, ...safe } = campaign;
  const billing = safe.billing ? {
    ...safe.billing,
    pricingSnapshot: vendorSafeSnapshot(safe.billing.pricingSnapshot),
  } : safe.billing;
  if (billing) {
    delete billing.providerCostTotal;
    delete billing.adminMarginTotal;
  }
  return { ...safe, pricingSnapshot: vendorSafeSnapshot(safe.pricingSnapshot), ...(safe.billing ? { billing } : {}) };
};
const vendorSafeMessage = (message: any) => {
  if (!message) return message;
  const { providerCostSnapshot, providerCost, adminMargin, unitCost, usage, ...safe } = message;
  return {
    ...safe,
    unitCost: message.vendorCharge ?? message.vendorPriceSnapshot ?? 0,
    usage: Array.isArray(usage) ? usage.map(({ unitCost, totalCost, ...item }: any) => item) : usage,
  };
};
const scope = async (userId: string, roles: string[], salonId?: string, branchId?: string) => {
  if (isAdmin(roles)) return { ...(salonId ? { salonId } : {}), ...(branchId ? { branchId } : {}) };
  const salons = await prisma.salon.findMany({ where: { OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] }, select: { id: true } });
  const ids = salons.map((salon) => salon.id);
  if (salonId && !ids.includes(salonId)) fail(403, "Forbidden");
  return { salonId: salonId ? salonId : { in: ids }, ...(branchId ? { branchId } : {}), vendorId: userId };
};
const audit = (userId: string, roles: string[], action: string, entityType: string, entityId?: string, metadata?: unknown) => prisma.whatsAppAuditLog.create({ data: { userId, role: roles[0], action, entityType, entityId, metadata: metadata as any } });

export const whatsappService = {
  async getConfig() { const config = await prisma.whatsAppConfiguration.findFirst({ orderBy: { createdAt: "desc" } }); return clean(config); },
  async saveConfig(userId: string, roles: string[], data: any, id?: string) {
    const current = id ? await prisma.whatsAppConfiguration.findUnique({ where: { id } }) : null;
    if (id && !current) fail(404, "WHATSAPP_CONFIGURATION_NOT_FOUND");
    const payload = {
      provider: data.provider ?? current?.provider ?? "meta",
      metaAppId: data.metaAppId ?? current?.metaAppId,
      encryptedMetaAppSecret: data.metaAppSecret ? encrypt(data.metaAppSecret) : current?.encryptedMetaAppSecret,
      encryptedAccessToken: data.accessToken ? encrypt(data.accessToken) : current?.encryptedAccessToken,
      businessAccountId: data.businessAccountId ?? current?.businessAccountId,
      apiVersion: data.apiVersion ?? current?.apiVersion ?? process.env.WHATSAPP_API_VERSION ?? "v20.0",
      webhookVerifyToken: data.webhookVerifyToken ?? current?.webhookVerifyToken,
      encryptedWebhookSecret: data.webhookSecret ? encrypt(data.webhookSecret) : current?.encryptedWebhookSecret,
      publicWebhookUrl: data.publicWebhookUrl ?? current?.publicWebhookUrl ?? `${process.env.APP_PUBLIC_URL}/api/v1/whatsapp/webhook`,
      environment: data.environment ?? current?.environment ?? "PRODUCTION",
      status: data.status ?? "ACTIVE",
      createdBy: current?.createdBy ?? userId,
    };
    if (!payload.metaAppId || !payload.encryptedAccessToken || !payload.businessAccountId || !payload.webhookVerifyToken || !payload.encryptedWebhookSecret) fail(400, "WHATSAPP_CONFIGURATION_INCOMPLETE");
    const result = current ? await prisma.whatsAppConfiguration.update({ where: { id: current.id }, data: payload }) : await prisma.whatsAppConfiguration.create({ data: payload as any });
    await audit(userId, roles, "CONFIG_UPDATED", "WhatsAppConfiguration", result.id); return clean(result);
  },
  async testConfig() {
    const config = await prisma.whatsAppConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
    if (!config) return { valid: false, status: "NOT_CONFIGURED", reason: "WhatsApp Business configuration is missing or inactive." };
    try {
      const { MetaWhatsAppProvider } = await import("./providers/meta-whatsapp.provider");
      const provider = new MetaWhatsAppProvider(decrypt(config.encryptedAccessToken), "", config.businessAccountId, config.apiVersion);
      const valid = await provider.verifyCredentials();
      const phoneNumbers = valid ? await provider.getPhoneNumbers() : [];
      return {
        valid,
        status: valid ? "CONNECTED" : "ERROR",
        businessAccount: valid ? "accessible" : "unavailable",
        phoneNumbers: phoneNumbers.length,
        reason: valid ? undefined : "Meta rejected the business account credentials.",
      };
    } catch {
      return { valid: false, status: "ERROR", reason: "The WhatsApp provider could not be reached or rejected the credentials." };
    }
  },
  async configurationStatus() {
    const config = await prisma.whatsAppConfiguration.findFirst({ orderBy: { createdAt: "desc" } });
    const [connections, templates, webhookVerification, price] = await Promise.all([
      prisma.whatsAppConnection.findMany({ select: { status: true } }),
      prisma.whatsAppTemplate.groupBy({ by: ["status"], _count: true }),
      prisma.whatsAppAuditLog.findFirst({ where: { action: "WEBHOOK_VERIFIED" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      currentPricing("MARKETING"),
    ]);
    const phoneConnected = connections.some((connection) => connection.status === "CONNECTED");
    const webhookConfigured = Boolean(config?.webhookVerifyToken && config.encryptedWebhookSecret && config.publicWebhookUrl);
    const templateCounts = Object.fromEntries(templates.map(({ status, _count }) => [status.toLowerCase(), _count]));
    const activeConfig = Boolean(config && config.status === "ACTIVE" && config.encryptedAccessToken && config.businessAccountId);
    const ready = activeConfig && phoneConnected && webhookConfigured && Boolean(webhookVerification) && Number(templateCounts.approved ?? 0) > 0 && Boolean(price);
    return {
      whatsapp: { configured: activeConfig, status: activeConfig ? "CONNECTED" : config ? "ERROR" : "NOT_CONFIGURED" },
      phoneNumber: { configured: phoneConnected, status: phoneConnected ? "CONNECTED" : connections.length ? "ERROR" : "NOT_CONFIGURED" },
      webhook: { configured: webhookConfigured, verified: Boolean(webhookVerification), status: !webhookConfigured ? "NOT_CONFIGURED" : webhookVerification ? "VERIFIED" : "NOT_VERIFIED" },
      templates: {
        total: Object.values(templateCounts).reduce((sum: number, count: any) => sum + count, 0),
        approved: templateCounts.approved ?? 0,
        pending: templateCounts.pending ?? 0,
        rejected: templateCounts.rejected ?? 0,
      },
      provider: { available: activeConfig, status: activeConfig ? "AVAILABLE" : "UNAVAILABLE" },
      campaignSending: { ready: Boolean(ready) },
    };
  },
  async vendorReadiness(userId: string, roles: string[], salonId?: string) {
    const own = await scope(userId, roles, salonId);
    const [connectionCount, approvedTemplates, eligibleCustomers, price] = await Promise.all([
      prisma.whatsAppConnection.count({ where: { ...own, status: "CONNECTED" } as any }),
      prisma.whatsAppTemplate.count({ where: { status: "APPROVED", providerStatus: "APPROVED", OR: [{ vendorId: userId }, { vendorId: null }] } }),
      prisma.whatsAppContact.count({ where: { ...own, status: "ACTIVE", optInStatus: "OPTED_IN" } as any }),
      currentPricing("MARKETING"),
    ]);
    const { vendorPricePerMessage } = pricingRates(price);
    const checks = [
      { key: "whatsapp", ready: connectionCount > 0, action: connectionCount ? undefined : "Connect a WhatsApp phone number for this salon." },
      { key: "templates", ready: approvedTemplates > 0, action: approvedTemplates ? undefined : "Sync or select an approved WhatsApp template." },
      { key: "audience", ready: eligibleCustomers > 0, action: eligibleCustomers ? undefined : "Add active customers with marketing opt-in." },
      { key: "pricing", ready: Boolean(price), action: price ? undefined : "Ask an administrator to configure WhatsApp pricing." },
      { key: "campaignAccess", ready: roles.includes("VENDOR") || isAdmin(roles), action: "Your account does not have vendor campaign access." },
    ];
    return {
      checks,
      ready: checks.every((check) => check.ready),
      eligibleCustomers,
      approvedTemplates,
      pricingConfigured: Boolean(price),
      vendorPricePerMessage: price ? vendorPricePerMessage : null,
      currency: price?.currency ?? null,
    };
  },
  async configurationStatusFor(userId: string, roles: string[], salonId?: string) {
    return isAdmin(roles) ? this.configurationStatus() : this.vendorReadiness(userId, roles, salonId);
  },
  async syncTemplates(userId: string, roles: string[]) {
    if (!isAdmin(roles)) fail(403, "WHATSAPP_PERMISSION_DENIED");
    const config = await prisma.whatsAppConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
    const verifiedConfig = config ?? fail(400, "WHATSAPP_NOT_CONFIGURED");
    const { MetaWhatsAppProvider } = await import("./providers/meta-whatsapp.provider");
    const provider = new MetaWhatsAppProvider(decrypt(verifiedConfig.encryptedAccessToken), "", verifiedConfig.businessAccountId, verifiedConfig.apiVersion);
    const externalTemplates = await provider.getTemplates() as any[];
    let created = 0;
    let updated = 0;
    const providerIds: string[] = [];
    for (const external of externalTemplates) {
      if (!external?.id || !external?.name || !external?.language) continue;
      providerIds.push(String(external.id));
      const components = providerTemplateComponents(external.components);
      const values = {
        providerTemplateId: String(external.id),
        name: String(external.name),
        language: String(external.language),
        category: providerTemplateCategory(external.category),
        body: components.body || String(external.name),
        headerType: components.headerType,
        headerText: components.headerText,
        footerText: components.footerText,
        buttons: components.buttons,
        variables: components.variables,
        providerStatus: String(external.status ?? "PENDING").toUpperCase(),
        status: providerTemplateStatus(external.status),
        rejectionReason: external.rejected_reason ?? null,
      };
      const existing = await prisma.whatsAppTemplate.findFirst({ where: { providerTemplateId: values.providerTemplateId, vendorId: null } });
      if (existing) {
        await prisma.whatsAppTemplate.update({ where: { id: existing.id }, data: values });
        updated += 1;
      } else {
        await prisma.whatsAppTemplate.create({ data: { ...values, createdBy: userId } });
        created += 1;
      }
    }
    const removed = providerIds.length
      ? await prisma.whatsAppTemplate.updateMany({ where: { vendorId: null, providerTemplateId: { notIn: providerIds }, status: { not: "DISABLED" } }, data: { status: "DISABLED", providerStatus: "DELETED" } })
      : { count: 0 };
    await audit(userId, roles, "TEMPLATES_SYNCED", "WhatsAppTemplate", undefined, { received: externalTemplates.length, created, updated, disabled: removed.count });
    return { received: externalTemplates.length, created, updated, disabled: removed.count };
  },
  async listConnections(userId: string, roles: string[], query: any) { const where = await scope(userId, roles, query.salonId, query.branchId); return prisma.whatsAppConnection.findMany({ where: where as any, orderBy: { createdAt: "desc" } }).then((rows) => rows.map(clean)); },
  async connection(userId: string, roles: string[], id: string) { const where = await scope(userId, roles); const item = await prisma.whatsAppConnection.findFirst({ where: { id, ...where } as any }); if (!item) fail(404, "WHATSAPP_CONNECTION_NOT_FOUND"); return clean(item); },
  async saveConnection(userId: string, roles: string[], data: any, id?: string) {
    if (id) await this.connection(userId, roles, id);
    const own = await scope(userId, roles, data.salonId, data.branchId);
    if (!isAdmin(roles) && (own as any).vendorId !== userId) fail(403, "WHATSAPP_PERMISSION_DENIED");
    const salon = await prisma.salon.findFirst({ where: { id: data.salonId, ...(isAdmin(roles) ? {} : { OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] }) } });
    if (!salon) fail(403, "WHATSAPP_PERMISSION_DENIED");
    const verifiedSalon = salon!;
    const branch = data.branchId ? await prisma.salon.findFirst({ where: { id: data.branchId, parentId: data.salonId } }) : null;
    if (data.branchId && !branch) fail(400, "WHATSAPP_BRANCH_SALON_MISMATCH");
    const payload: any = {
      vendorId: isAdmin(roles) ? data.vendorId ?? verifiedSalon.ownerId : userId,
      salonId: data.salonId,
      branchId: data.branchId,
      provider: data.provider ?? "meta",
      businessAccountId: data.businessAccountId,
      phoneNumberId: data.phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber,
      verifiedName: data.verifiedName,
      encryptedAccessToken: encrypt(data.accessToken),
      apiVersion: data.apiVersion ?? process.env.WHATSAPP_API_VERSION ?? "v20.0",
      status: "PENDING",
    };
    if (!payload.vendorId || (isAdmin(roles) && data.vendorId && verifiedSalon.ownerId !== data.vendorId && verifiedSalon.id !== data.vendorId)) fail(400, "WHATSAPP_VENDOR_SALON_MISMATCH");
    const result = id ? await prisma.whatsAppConnection.update({ where: { id }, data: payload }) : await prisma.whatsAppConnection.create({ data: payload });
    await audit(userId, roles, id ? "CONNECTION_UPDATED" : "CONNECTION_CREATED", "WhatsAppConnection", result.id);
    return clean(result);
  },
  async deleteConnection(userId: string, roles: string[], id: string) { const item = await this.connection(userId, roles, id); await prisma.whatsAppConnection.delete({ where: { id: item.id } }); await audit(userId, roles, "CONNECTION_DELETED", "WhatsAppConnection", id); return { id }; },
  async listContacts(userId: string, roles: string[], query: any) { const where: any = await scope(userId, roles, query.salonId, query.branchId); if (query.optInStatus) where.optInStatus = query.optInStatus; if (query.search) where.OR = [{ name: { contains: query.search, mode: "insensitive" } }, { normalizedPhoneNumber: { contains: query.search } }]; const page = Math.max(1, Number(query.page ?? 1)); const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20))); const [data, total] = await Promise.all([prisma.whatsAppContact.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }), prisma.whatsAppContact.count({ where })]); return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }; },
  async saveContact(userId: string, roles: string[], data: any, id?: string) {
    if (id) {
      const existing = await this.contactById(userId, roles, id) ?? fail(404, "WHATSAPP_CONTACT_NOT_FOUND");
      if (!isAdmin(roles) && (existing.vendorId !== userId || existing.salonId !== data.salonId)) fail(403, "WHATSAPP_PERMISSION_DENIED");
    }
    const owner = await scope(userId, roles, data.salonId, data.branchId);
    if (!isAdmin(roles) && (owner as any).vendorId !== userId) fail(403, "WHATSAPP_PERMISSION_DENIED");
    const salon = await prisma.salon.findFirst({
      where: { id: data.salonId, ...(isAdmin(roles) ? {} : { OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] }) },
      select: { id: true, ownerId: true },
    });
    const verifiedSalon = salon ?? fail(403, "WHATSAPP_PERMISSION_DENIED");
    if (data.branchId) {
      const branch = await prisma.salon.findFirst({ where: { id: data.branchId, parentId: data.salonId }, select: { id: true } });
      if (!branch) fail(400, "WHATSAPP_BRANCH_SALON_MISMATCH");
    }
    const vendorId = isAdmin(roles) ? data.vendorId ?? verifiedSalon.ownerId : userId;
    if (!vendorId || (isAdmin(roles) && data.vendorId && data.vendorId !== verifiedSalon.ownerId && data.vendorId !== verifiedSalon.id)) fail(400, "WHATSAPP_VENDOR_SALON_MISMATCH");
    const normalized = normalizePhone(data.phoneNumber, data.countryCode);
    if (data.customerId) {
      const customerHasSalonHistory = await prisma.booking.findFirst({ where: { customerId: data.customerId, salonId: data.salonId }, select: { id: true } });
      if (!customerHasSalonHistory) fail(400, "WHATSAPP_CUSTOMER_SALON_MISMATCH");
    }
    const payload: any = { vendorId, salonId: data.salonId, branchId: data.branchId, customerId: data.customerId, name: data.name, phoneNumber: data.phoneNumber, normalizedPhoneNumber: normalized, countryCode: data.countryCode, tags: data.tags, metadata: data.metadata };
    return id ? prisma.whatsAppContact.update({ where: { id }, data: payload }) : prisma.whatsAppContact.create({ data: payload });
  },
  async optContact(userId: string, roles: string[], id: string, optedIn: boolean) { await this.contactById(userId, roles, id); const result = await prisma.whatsAppContact.update({ where: { id }, data: optedIn ? { optInStatus: "OPTED_IN", optInAt: new Date(), optOutAt: null, consentSource: "MANUAL" } : { optInStatus: "OPTED_OUT", optOutAt: new Date(), consentSource: "MANUAL" } }); await audit(userId, roles, optedIn ? "CONTACT_OPT_IN" : "CONTACT_OPT_OUT", "WhatsAppContact", id, { source: "MANUAL" }); return result; },
  async contactById(userId: string, roles: string[], id: string) { const where = await scope(userId, roles); const item = await prisma.whatsAppContact.findFirst({ where: { id, ...where } as any }); if (!item) fail(404, "WHATSAPP_CONTACT_NOT_FOUND"); return item; },
  async deleteContact(userId: string, roles: string[], id: string) { await this.contactById(userId, roles, id); await prisma.whatsAppContact.delete({ where: { id } }); return { id }; },
  async listTemplates(userId: string, roles: string[], query: any) {
    await scope(userId, roles, query.salonId, query.branchId);
    const where: any = {
      AND: [
        isAdmin(roles) ? {} : { OR: [{ vendorId: userId }, { vendorId: null }] },
        ...(query.salonId ? [{ OR: [{ salonId: null }, { salonId: query.salonId }] }] : []),
        ...(query.branchId ? [{ OR: [{ branchId: null }, { branchId: query.branchId }] }] : []),
        ...(query.vendorId && isAdmin(roles) ? [{ vendorId: query.vendorId }] : []),
      ],
    };
    return prisma.whatsAppTemplate.findMany({ where, orderBy: { createdAt: "desc" } });
  },
  async saveTemplate(userId: string, roles: string[], data: any, id?: string) {
    if (id) {
      const current = await this.getTemplate(userId, roles, id) ?? fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
      if (!isAdmin(roles) && (current.vendorId !== userId || current.providerTemplateId)) fail(403, "WHATSAPP_PERMISSION_DENIED");
      const result = await prisma.whatsAppTemplate.update({ where: { id }, data: { ...data, vendorId: current.vendorId, createdBy: current.createdBy } });
      await audit(userId, roles, "TEMPLATE_UPDATED", "WhatsAppTemplate", result.id);
      return result;
    }
    const templateSalonId = data.salonId;
    if (templateSalonId) {
      const allowed = await scope(userId, roles, templateSalonId, data.branchId);
      if (!isAdmin(roles) && (allowed as any).vendorId !== userId) fail(403, "WHATSAPP_PERMISSION_DENIED");
    }
    const result = await prisma.whatsAppTemplate.create({ data: { ...data, status: "DRAFT", providerStatus: null, vendorId: isAdmin(roles) ? data.vendorId ?? null : userId, createdBy: userId } });
    await audit(userId, roles, "TEMPLATE_CREATED", "WhatsAppTemplate", result.id);
    return result;
  },
  async submitTemplate(userId: string, roles: string[], id: string) {
    const template = await this.getTemplate(userId, roles, id) ?? fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
    if (!isAdmin(roles) && template.vendorId !== userId) fail(403, "WHATSAPP_PERMISSION_DENIED");
    if (!template.salonId && !isAdmin(roles)) fail(400, "WHATSAPP_TEMPLATE_SALON_REQUIRED");
    if (template.status === "PENDING" || template.status === "APPROVED") fail(409, "WHATSAPP_TEMPLATE_ALREADY_SUBMITTED");
    const connection = !isAdmin(roles) && template.salonId
      ? await prisma.whatsAppConnection.findFirst({ where: { salonId: template.salonId, vendorId: userId, status: "CONNECTED" }, orderBy: { updatedAt: "desc" } })
      : null;
    if (!isAdmin(roles) && !connection) fail(400, "WHATSAPP_PHONE_NOT_CONFIGURED");
    let provider: Awaited<ReturnType<typeof providerFor>>;
    if (connection) provider = await providerFor(connection.id);
    else {
      const config = await prisma.whatsAppConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
        ?? fail(400, "WHATSAPP_NOT_CONFIGURED");
      const { MetaWhatsAppProvider } = await import("./providers/meta-whatsapp.provider");
      provider = new MetaWhatsAppProvider(decrypt(config.encryptedAccessToken), "", config.businessAccountId, config.apiVersion);
    }
    const components: Record<string, unknown>[] = [{ type: "BODY", text: template.body }];
    if (template.headerText) components.unshift({ type: "HEADER", format: template.headerType ?? "TEXT", text: template.headerText });
    if (template.footerText) components.push({ type: "FOOTER", text: template.footerText });
    const buttonList = Array.isArray(template.buttons) ? template.buttons : [];
    if (buttonList.length) components.push({ type: "BUTTONS", buttons: buttonList });
    const payload = {
      name: template.name,
      language: template.language,
      category: template.category === "AUTHENTICATION" ? "AUTHENTICATION" : template.category === "MARKETING" ? "MARKETING" : "UTILITY",
      components,
    };
    let result: any;
    try {
      result = await provider.createTemplate(payload);
    } catch {
      await audit(userId, roles, "TEMPLATE_SUBMISSION_FAILED", "WhatsAppTemplate", id, { provider: template.vendorId ? "connection" : "global" });
      fail(502, "WHATSAPP_PROVIDER_ERROR");
    }
    const providerTemplateId = String(result?.id ?? "");
    if (!providerTemplateId) fail(502, "WHATSAPP_PROVIDER_TEMPLATE_ID_MISSING");
    const providerStatus = String(result?.status ?? "PENDING").toUpperCase();
    const updated = await prisma.whatsAppTemplate.update({
      where: { id },
      data: { providerTemplateId, providerStatus, status: providerTemplateStatus(providerStatus) },
    });
    await audit(userId, roles, "TEMPLATE_SUBMITTED", "WhatsAppTemplate", id, { providerTemplateId, providerStatus });
    return updated;
  },
  async getTemplate(userId: string, roles: string[], id: string) { const templates = await this.listTemplates(userId, roles, {}); return templates.find((item) => item.id === id) ?? fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND"); },
  async deleteTemplate(userId: string, roles: string[], id: string) { const template = await this.getTemplate(userId, roles, id); if (!isAdmin(roles) && (template.vendorId !== userId || template.providerTemplateId)) fail(403, "WHATSAPP_PERMISSION_DENIED"); await prisma.whatsAppTemplate.delete({ where: { id } }); return { id }; },
  async previewCampaign(userId: string, roles: string[], data: any) {
    const own = await scope(userId, roles, data.salonId, data.branchId);
    const [connection, template] = await Promise.all([
      prisma.whatsAppConnection.findFirst({ where: { id: data.connectionId, salonId: data.salonId, ...(data.branchId ? { branchId: data.branchId } : {}), ...(!isAdmin(roles) ? { vendorId: userId } : {}) } }),
      prisma.whatsAppTemplate.findFirst({ where: { id: data.templateId, ...(isAdmin(roles) ? {} : { OR: [{ vendorId: userId }, { vendorId: null }] }) } }),
    ]);
    if (!connection) fail(404, "WHATSAPP_CONNECTION_NOT_FOUND");
    if (!template) fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
    if (template!.vendorId && template!.vendorId !== connection!.vendorId) fail(403, "WHATSAPP_TEMPLATE_VENDOR_MISMATCH");
    if (template!.status !== "APPROVED" || template!.providerStatus !== "APPROVED") fail(400, "WHATSAPP_TEMPLATE_NOT_APPROVED");
    const missingVariables = missingTemplateVariables(template!.body, data.variables);
    if (missingVariables.length) fail(400, `WHATSAPP_TEMPLATE_VARIABLES_MISSING:${missingVariables.join(",")}`);
    const baseWhere: any = { ...own, salonId: data.salonId, ...(data.branchId ? { branchId: data.branchId } : {}), status: "ACTIVE" };
    const selectedWhere = data.audienceType === "CUSTOM" || data.audienceType === "TAGGED" ? { id: { in: data.contactIds ?? [] } } : {};
    const [eligible, optedOut, notOptedIn] = await Promise.all([
      prisma.whatsAppContact.count({ where: { ...baseWhere, ...selectedWhere, optInStatus: "OPTED_IN" } }),
      prisma.whatsAppContact.count({ where: { ...baseWhere, ...selectedWhere, optInStatus: "OPTED_OUT" } }),
      prisma.whatsAppContact.count({ where: { ...baseWhere, ...selectedWhere, optInStatus: "UNKNOWN" } }),
    ]);
    const pricing = await currentPricing(template!.category);
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(pricing);
    const campaignCharge = pricing?.campaignCharge ?? 0;
    const financials = calculateWhatsAppFinancials(eligible, providerCostPerMessage, vendorPricePerMessage, eligible ? campaignCharge : 0);
    const preview = {
      eligible,
      excluded: optedOut + notOptedIn,
      optedOut,
      unknownConsent: notOptedIn,
      costPerMessage: vendorPricePerMessage,
      vendorPricePerMessage,
      providerCostPerMessage,
      campaignCharge: eligible ? campaignCharge : 0,
      estimatedCost: financials.vendorCharge,
      estimatedProviderCost: financials.providerCost,
      estimatedAdminMargin: financials.adminMargin,
      currency: pricing?.currency ?? "INR",
    };
    return isAdmin(roles) ? preview : {
      eligible: preview.eligible,
      excluded: preview.excluded,
      optedOut: preview.optedOut,
      unknownConsent: preview.unknownConsent,
      costPerMessage: preview.costPerMessage,
      campaignCharge: preview.campaignCharge,
      estimatedCost: preview.estimatedCost,
      currency: preview.currency,
    };
  },
  async createCampaign(userId: string, roles: string[], data: any, idempotencyKey?: string) {
    const { contactIds, variables, ...campaignInput } = data;
    const hash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    if (idempotencyKey) {
      const existing = await prisma.whatsAppIdempotencyKey.findUnique({ where: { key_userId: { key: idempotencyKey, userId } } });
      if (existing) {
        if (existing.requestHash !== hash || existing.resourceType !== "campaign") fail(409, "WHATSAPP_IDEMPOTENCY_KEY_REUSED");
        return prisma.whatsAppCampaign.findUnique({ where: { id: existing.resourceId } });
      }
    }

    const own = await scope(userId, roles, data.salonId, data.branchId);
    const [connection, template] = await Promise.all([
      prisma.whatsAppConnection.findFirst({ where: { id: data.connectionId, salonId: data.salonId, ...(data.branchId ? { branchId: data.branchId } : {}), ...(!isAdmin(roles) ? { vendorId: userId } : {}) } }),
      prisma.whatsAppTemplate.findFirst({ where: { id: data.templateId, ...(isAdmin(roles) ? {} : { OR: [{ vendorId: userId }, { vendorId: null }] }) } }),
    ]);
    if (!connection) fail(404, "WHATSAPP_CONNECTION_NOT_FOUND");
    if (!template) fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
    const verifiedConnection = connection ?? fail(404, "WHATSAPP_CONNECTION_NOT_FOUND");
    const verifiedTemplate = template ?? fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
    if (verifiedConnection.status !== "CONNECTED") fail(400, "WHATSAPP_PHONE_NOT_CONFIGURED");
    if (isAdmin(roles) && data.vendorId && data.vendorId !== verifiedConnection.vendorId) fail(400, "WHATSAPP_VENDOR_CONNECTION_MISMATCH");
    if (verifiedTemplate.vendorId && verifiedTemplate.vendorId !== verifiedConnection.vendorId) fail(403, "WHATSAPP_TEMPLATE_VENDOR_MISMATCH");
    if (verifiedTemplate.status !== "APPROVED" || verifiedTemplate.providerStatus !== "APPROVED") fail(400, "WHATSAPP_TEMPLATE_NOT_APPROVED");
    const missingVariables = missingTemplateVariables(verifiedTemplate.body, variables);
    if (missingVariables.length) fail(400, `WHATSAPP_TEMPLATE_VARIABLES_MISSING:${missingVariables.join(",")}`);

    const contactWhere: any = {
      ...own,
      salonId: data.salonId,
      ...(data.branchId ? { branchId: data.branchId } : {}),
      optInStatus: "OPTED_IN",
      status: "ACTIVE",
      ...(data.audienceType === "CUSTOM" || data.audienceType === "TAGGED" ? { AND: [{ id: { in: contactIds ?? [] } }] } : {}),
    };
    const [recipientCount, pricing] = await Promise.all([
      prisma.whatsAppContact.count({ where: contactWhere }),
      currentPricing(verifiedTemplate.category),
    ]);
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(pricing);
    const campaignCharge = pricing?.campaignCharge ?? 0;
    const currency = pricing?.currency ?? "INR";
    const financials = calculateWhatsAppFinancials(recipientCount, providerCostPerMessage, vendorPricePerMessage, campaignCharge);
    const pricingSnapshot = {
      pricingId: pricing?.id ?? null,
      messageCategory: verifiedTemplate.category,
      perMessageRate: vendorPricePerMessage,
      vendorPricePerMessage,
      providerCostPerMessage,
      campaignCharge,
      currency,
      effectiveFrom: pricing?.effectiveFrom?.toISOString() ?? null,
      snapshottedAt: new Date().toISOString(),
    };
    const estimatedCost = financials.vendorCharge;
    const providerCostEstimate = financials.providerCost;
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.whatsAppCampaign.create({
        data: {
          ...campaignInput,
          vendorId: verifiedConnection.vendorId,
          status: data.campaignType === "SCHEDULED" ? "SCHEDULED" : "DRAFT",
          totalRecipients: recipientCount,
          queuedCount: recipientCount,
          estimatedCost,
          providerCostEstimate,
          estimatedAdminMargin: financials.adminMargin,
          currency,
          pricingSnapshot,
          templatePayload: variables ?? Prisma.JsonNull,
          createdBy: userId,
        },
      });
      let cursor: string | undefined;
      while (true) {
        const contacts = await tx.whatsAppContact.findMany({
          where: { ...contactWhere, ...(cursor ? { id: { gt: cursor } } : {}) },
          orderBy: { id: "asc" },
          take: 500,
          select: { id: true, customerId: true, normalizedPhoneNumber: true, name: true },
        });
        if (!contacts.length) break;
        cursor = contacts[contacts.length - 1].id;
        await tx.whatsAppCampaignRecipient.createMany({
          data: contacts.map((contact) => ({
            campaignId: campaign.id,
            contactId: contact.id,
            customerId: contact.customerId,
            phoneNumberSnapshot: contact.normalizedPhoneNumber,
            nameSnapshot: contact.name,
            unitCost: providerCostPerMessage,
            currency,
          })),
        });
      }
      if (idempotencyKey) await tx.whatsAppIdempotencyKey.create({
        data: { key: idempotencyKey, userId, vendorId: campaign.vendorId, requestHash: hash, resourceType: "campaign", resourceId: campaign.id, expiresAt: new Date(Date.now() + 86400000) },
      });
      return campaign;
    });
    await audit(userId, roles, "CAMPAIGN_CREATED", "WhatsAppCampaign", result.id, { estimatedCost, currency, recipientCount });
    return isAdmin(roles) ? result : vendorSafeCampaign(result);
  },
  async updateCampaign(userId: string, roles: string[], id: string, data: any) {
    const current = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    if (current.status !== "DRAFT") fail(409, "WHATSAPP_CAMPAIGN_NOT_EDITABLE");
    if (data.salonId !== current.salonId || (data.branchId ?? null) !== current.branchId) fail(400, "WHATSAPP_CAMPAIGN_SCOPE_IMMUTABLE");
    const own = await scope(userId, roles, data.salonId, data.branchId);
    const [connection, template] = await Promise.all([
      prisma.whatsAppConnection.findFirst({ where: { id: data.connectionId, salonId: data.salonId, ...(data.branchId ? { branchId: data.branchId } : {}), ...(!isAdmin(roles) ? { vendorId: userId } : {}) } }),
      prisma.whatsAppTemplate.findFirst({ where: { id: data.templateId, ...(isAdmin(roles) ? {} : { OR: [{ vendorId: userId }, { vendorId: null }] }) } }),
    ]);
    const verifiedConnection = connection ?? fail(404, "WHATSAPP_CONNECTION_NOT_FOUND");
    const verifiedTemplate = template ?? fail(404, "WHATSAPP_TEMPLATE_NOT_FOUND");
    if (verifiedConnection.status !== "CONNECTED") fail(400, "WHATSAPP_PHONE_NOT_CONFIGURED");
    if (verifiedConnection.vendorId !== current.vendorId) fail(400, "WHATSAPP_VENDOR_CONNECTION_MISMATCH");
    if (verifiedTemplate.vendorId && verifiedTemplate.vendorId !== current.vendorId) fail(403, "WHATSAPP_TEMPLATE_VENDOR_MISMATCH");
    if (verifiedTemplate.status !== "APPROVED" || verifiedTemplate.providerStatus !== "APPROVED") fail(400, "WHATSAPP_TEMPLATE_NOT_APPROVED");
    const missingVariables = missingTemplateVariables(verifiedTemplate.body, data.variables);
    if (missingVariables.length) fail(400, `WHATSAPP_TEMPLATE_VARIABLES_MISSING:${missingVariables.join(",")}`);
    const contactWhere: any = {
      ...own,
      salonId: data.salonId,
      ...(data.branchId ? { branchId: data.branchId } : {}),
      optInStatus: "OPTED_IN",
      status: "ACTIVE",
      ...(data.audienceType === "CUSTOM" || data.audienceType === "TAGGED" ? { AND: [{ id: { in: data.contactIds ?? [] } }] } : {}),
    };
    const [recipientCount, pricing] = await Promise.all([
      prisma.whatsAppContact.count({ where: contactWhere }),
      currentPricing(verifiedTemplate.category),
    ]);
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(pricing);
    const campaignCharge = pricing?.campaignCharge ?? 0;
    const currency = pricing?.currency ?? "INR";
    const pricingSnapshot = {
      pricingId: pricing?.id ?? null,
      messageCategory: verifiedTemplate.category,
      perMessageRate: vendorPricePerMessage,
      vendorPricePerMessage,
      providerCostPerMessage,
      campaignCharge,
      currency,
      effectiveFrom: pricing?.effectiveFrom?.toISOString() ?? null,
      snapshottedAt: new Date().toISOString(),
    };
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.whatsAppCampaign.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          templateId: verifiedTemplate.id,
          connectionId: verifiedConnection.id,
          campaignType: data.campaignType,
          audienceType: data.audienceType,
          scheduledAt: data.scheduledAt ?? null,
          timezone: data.timezone,
          status: data.campaignType === "SCHEDULED" ? "SCHEDULED" : "DRAFT",
          totalRecipients: recipientCount,
          queuedCount: recipientCount,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          repliedCount: 0,
          failedCount: 0,
          estimatedCost: calculateWhatsAppCharge(recipientCount, vendorPricePerMessage, campaignCharge),
          providerCostEstimate: Number((recipientCount * providerCostPerMessage).toFixed(2)),
          estimatedAdminMargin: calculateWhatsAppFinancials(recipientCount, providerCostPerMessage, vendorPricePerMessage, campaignCharge).adminMargin,
          providerCostTotal: 0,
          adminMarginTotal: 0,
          actualCost: 0,
          pricingSnapshot,
          templatePayload: data.variables ?? null,
          currency,
          completedAt: null,
        },
      });
      await tx.whatsAppCampaignRecipient.deleteMany({ where: { campaignId: id } });
      let cursor: string | undefined;
      while (true) {
        const contacts = await tx.whatsAppContact.findMany({
          where: { ...contactWhere, ...(cursor ? { id: { gt: cursor } } : {}) },
          orderBy: { id: "asc" },
          take: 500,
          select: { id: true, customerId: true, normalizedPhoneNumber: true, name: true },
        });
        if (!contacts.length) break;
        cursor = contacts[contacts.length - 1].id;
        await tx.whatsAppCampaignRecipient.createMany({
          data: contacts.map((contact) => ({
            campaignId: id,
            contactId: contact.id,
            customerId: contact.customerId,
            phoneNumberSnapshot: contact.normalizedPhoneNumber,
            nameSnapshot: contact.name,
            unitCost: providerCostPerMessage,
            currency,
          })),
        });
      }
      return campaign;
    });
    await audit(userId, roles, "CAMPAIGN_UPDATED", "WhatsAppCampaign", id, { estimatedCost: result.estimatedCost, recipientCount });
    return isAdmin(roles) ? result : vendorSafeCampaign(result);
  },
  async duplicateCampaign(userId: string, roles: string[], id: string) {
    const source = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    if (source.template.status !== "APPROVED" || source.template.providerStatus !== "APPROVED") fail(400, "WHATSAPP_TEMPLATE_NOT_APPROVED");
    const pricing = await currentPricing(source.template.category);
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(pricing);
    const campaignCharge = pricing?.campaignCharge ?? 0;
    const currency = pricing?.currency ?? "INR";
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.whatsAppCampaign.create({
        data: {
          vendorId: source.vendorId,
          salonId: source.salonId,
          branchId: source.branchId,
          name: `${source.name} (Copy)`,
          description: source.description,
          templateId: source.templateId,
          connectionId: source.connectionId,
          campaignType: "SEND_NOW",
          audienceType: source.audienceType,
          status: "DRAFT",
          timezone: source.timezone,
          templatePayload: source.templatePayload ?? Prisma.JsonNull,
          pricingSnapshot: {
            pricingId: pricing?.id ?? null,
            messageCategory: source.template.category,
            perMessageRate: vendorPricePerMessage,
            vendorPricePerMessage,
            providerCostPerMessage,
            campaignCharge,
            currency,
            effectiveFrom: pricing?.effectiveFrom?.toISOString() ?? null,
            snapshottedAt: new Date().toISOString(),
          },
          currency,
          createdBy: userId,
        },
      });
      let cursor: string | undefined;
      let recipientCount = 0;
      while (true) {
        const recipients = await tx.whatsAppCampaignRecipient.findMany({
          where: {
            campaignId: source.id,
            ...(cursor ? { id: { gt: cursor } } : {}),
            contact: { optInStatus: "OPTED_IN", status: "ACTIVE" },
          },
          orderBy: { id: "asc" },
          take: 500,
          select: { id: true, contactId: true, customerId: true, phoneNumberSnapshot: true, nameSnapshot: true },
        });
        if (!recipients.length) break;
        cursor = recipients[recipients.length - 1].id;
        recipientCount += recipients.length;
        await tx.whatsAppCampaignRecipient.createMany({
          data: recipients.map((recipient) => ({
            campaignId: campaign.id,
            contactId: recipient.contactId,
            customerId: recipient.customerId,
            phoneNumberSnapshot: recipient.phoneNumberSnapshot,
            nameSnapshot: recipient.nameSnapshot,
            unitCost: providerCostPerMessage,
            currency,
          })),
        });
      }
      return tx.whatsAppCampaign.update({
        where: { id: campaign.id },
        data: {
          totalRecipients: recipientCount,
          queuedCount: recipientCount,
          estimatedCost: calculateWhatsAppCharge(recipientCount, vendorPricePerMessage, campaignCharge),
          providerCostEstimate: Number((recipientCount * providerCostPerMessage).toFixed(2)),
          estimatedAdminMargin: calculateWhatsAppFinancials(recipientCount, providerCostPerMessage, vendorPricePerMessage, campaignCharge).adminMargin,
          providerCostTotal: 0,
          adminMarginTotal: 0,
        },
      });
    });
    await audit(userId, roles, "CAMPAIGN_DUPLICATED", "WhatsAppCampaign", result.id, { sourceCampaignId: id });
    return isAdmin(roles) ? result : vendorSafeCampaign(result);
  },
  async sendMessage(userId: string, roles: string[], data: any, idempotencyKey?: string) {
    const contact = await this.contactById(userId, roles, data.contactId);
    if (contact!.optInStatus !== "OPTED_IN") fail(400, "WHATSAPP_CONTACT_NOT_OPTED_IN");
    const requestHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    if (idempotencyKey) {
      const existing = await prisma.whatsAppIdempotencyKey.findUnique({ where: { key_userId: { key: idempotencyKey, userId } } });
      if (existing) {
        if (existing.requestHash !== requestHash || existing.resourceType !== "message") fail(409, "WHATSAPP_IDEMPOTENCY_KEY_REUSED");
        const message = await prisma.whatsAppMessage.findUnique({ where: { id: existing.resourceId } });
        if (message?.status === "QUEUED") await enqueue("message", { type: "message", id: message.id });
            return isAdmin(roles) ? message : vendorSafeMessage(message);
      }
    }
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { id: data.connectionId, salonId: contact!.salonId, ...(isAdmin(roles) ? {} : { vendorId: userId }), status: "CONNECTED" },
    });
    if (!connection) fail(400, "WHATSAPP_CONNECTION_NOT_FOUND");
    const template = data.templateId ? await prisma.whatsAppTemplate.findFirst({
      where: { id: data.templateId, ...(isAdmin(roles) ? {} : { OR: [{ vendorId: userId }, { vendorId: null }] }) },
    }) : null;
    if (data.messageType === "TEMPLATE" && (!template || template.status !== "APPROVED" || template.providerStatus !== "APPROVED")) fail(400, "WHATSAPP_TEMPLATE_NOT_APPROVED");
    if (data.messageType === "TEMPLATE" && template) {
      const missingVariables = missingTemplateVariables(template.body, data.variables);
      if (missingVariables.length) fail(400, `WHATSAPP_TEMPLATE_VARIABLES_MISSING:${missingVariables.join(",")}`);
    }
    const verifiedContact = contact!;
    const verifiedConnection = connection!;
    const category = categoryFor(data.messageType as WhatsAppMessageType, template?.category);
    const pricing = await currentPricing(category);
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(pricing);
    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.whatsAppMessage.create({
        data: {
          vendorId: verifiedConnection.vendorId,
          salonId: verifiedContact.salonId,
          branchId: verifiedContact.branchId,
          contactId: verifiedContact.id,
          customerId: verifiedContact.customerId,
          connectionId: verifiedConnection.id,
          templateId: template?.id,
          direction: "OUTBOUND",
          messageType: data.messageType,
          phoneNumber: verifiedContact.normalizedPhoneNumber,
          messageBody: data.messageBody,
          templatePayload: data.variables,
          messageCategory: category,
          pricingId: pricing?.id,
          unitCost: providerCostPerMessage,
          providerCostSnapshot: providerCostPerMessage,
          vendorPriceSnapshot: vendorPricePerMessage,
          vendorCharge: vendorPricePerMessage,
          currency: pricing?.currency ?? "INR",
        },
      });
      if (idempotencyKey) await tx.whatsAppIdempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId,
          vendorId: verifiedConnection.vendorId,
          requestHash,
          resourceType: "message",
          resourceId: message.id,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return message;
    });
    await enqueue("message", { type: "message", id: created.id });
    return isAdmin(roles) ? created : vendorSafeMessage(created);
  },
  async webhook(payload: any, signature?: string) {
    const changes = Array.isArray(payload?.entry)
      ? payload.entry.flatMap((entry: any) => (entry.changes ?? []).map((change: any, index: number) => ({
        entryId: entry.id ?? "",
        index,
        value: change.value ?? {},
      })))
      : payload?.value
        ? [{ entryId: payload.entryId ?? "", index: payload.index ?? 0, value: payload.value }]
        : payload?.statuses || payload?.messages
          ? [{ entryId: "", index: 0, value: payload }]
          : [];
    let duplicate = true;
    for (const change of changes) {
      const eventPayload = { object: payload.object ?? "whatsapp_business_account", entryId: change.entryId, index: change.index, value: change.value };
      const eventId = crypto.createHash("sha256").update(JSON.stringify(eventPayload)).digest("hex");
      const eventType = change.value.statuses?.length ? "status" : change.value.messages?.length ? "message" : "unknown";
      let event = await prisma.whatsAppWebhookEvent.findUnique({ where: { eventId } });
      if (event?.processed) continue;
      if (!event) {
        try {
          event = await prisma.whatsAppWebhookEvent.create({
            data: { eventId, provider: "meta", eventType, payload: eventPayload, signature, processed: false },
          });
          duplicate = false;
        } catch (error: any) {
          if (error?.code !== "P2002") throw error;
          event = await prisma.whatsAppWebhookEvent.findUnique({ where: { eventId } });
          if (event?.processed) continue;
        }
      }
      duplicate = false;
      try {
        const phoneNumberId = change.value.metadata?.phone_number_id;
        const connection = phoneNumberId
          ? await prisma.whatsAppConnection.findFirst({ where: { phoneNumberId }, orderBy: { updatedAt: "desc" } })
          : null;
        for (const status of change.value.statuses ?? []) {
          if (!status.id) continue;
          const message = await prisma.whatsAppMessage.findFirst({ where: { providerMessageId: status.id } }) ?? fail(503, "WHATSAPP_WEBHOOK_MESSAGE_NOT_FOUND");
          const nextStatus = webhookStatus(status.status);
          if (!nextStatus) continue;
          const timestamp = webhookDate(status.timestamp);
          await prisma.$transaction(async (tx) => {
            const current = await tx.whatsAppMessage.findUnique({ where: { id: message.id } });
            if (!current || current.status === "FAILED" || current.status === "READ") return;
            const rank: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };
            if (nextStatus !== "FAILED" && (rank[nextStatus] ?? 0) <= (rank[current.status] ?? 0)) return;
            const errorDetail = status.errors?.[0];
            const update = await tx.whatsAppMessage.updateMany({
              where: { id: current.id, status: current.status },
              data: {
                status: nextStatus,
                ...(nextStatus === "SENT" ? { sentAt: timestamp } : {}),
                ...(nextStatus === "DELIVERED" ? { deliveredAt: timestamp } : {}),
                ...(nextStatus === "READ" ? { readAt: timestamp } : {}),
                ...(nextStatus === "FAILED" ? {
                  failedAt: timestamp,
                  failureCode: String(errorDetail?.code ?? "WHATSAPP_PROVIDER_ERROR"),
                  failureReason: String(errorDetail?.title ?? errorDetail?.message ?? "Message delivery failed").slice(0, 500),
                } : {}),
              },
            });
            if (!update.count || !current.campaignId) return;
            const recipientStatus = nextStatus;
            const previousRecipientStatuses: ("QUEUED" | "SUBMITTED" | "SENT" | "DELIVERED")[] = nextStatus === "SENT" ? ["QUEUED", "SUBMITTED"] : nextStatus === "DELIVERED" ? ["QUEUED", "SUBMITTED", "SENT"] : ["QUEUED", "SUBMITTED", "SENT", "DELIVERED"];
            const recipientUpdate = await tx.whatsAppCampaignRecipient.updateMany({
              where: { campaignId: current.campaignId, providerMessageId: status.id, status: { in: previousRecipientStatuses } },
              data: {
                status: recipientStatus,
                ...(nextStatus === "SENT" ? { sentAt: timestamp } : {}),
                ...(nextStatus === "DELIVERED" ? { deliveredAt: timestamp } : {}),
                ...(nextStatus === "READ" ? { readAt: timestamp } : {}),
                ...(nextStatus === "FAILED" ? { failedAt: timestamp, failureCode: String(errorDetail?.code ?? "WHATSAPP_PROVIDER_ERROR"), failureReason: String(errorDetail?.title ?? "Message delivery failed").slice(0, 500) } : {}),
              },
            });
            if (!recipientUpdate.count) return;
            await tx.whatsAppCampaign.update({
              where: { id: current.campaignId },
              data: nextStatus === "DELIVERED" ? { deliveredCount: { increment: 1 } }
                : nextStatus === "READ" ? { readCount: { increment: 1 } }
                  : nextStatus === "FAILED" ? { failedCount: { increment: 1 } } : {},
            });
          });
        }
        for (const incoming of change.value.messages ?? []) {
          const verifiedConnection = connection ?? fail(503, "WHATSAPP_WEBHOOK_CONNECTION_NOT_FOUND");
          if (!incoming.id || !incoming.from) continue;
          const from = normalizePhone(`+${String(incoming.from).replace(/^\+/, "")}`);
          const receivedAt = webhookDate(incoming.timestamp);
          await prisma.$transaction(async (tx) => {
            const existing = await tx.whatsAppMessage.findFirst({ where: { providerMessageId: incoming.id } });
            if (existing) return;
            const contact = await tx.whatsAppContact.findFirst({
              where: { salonId: verifiedConnection.salonId, vendorId: verifiedConnection.vendorId, normalizedPhoneNumber: from },
            });
            const text = webhookMessageBody(incoming);
            const command = text?.trim().toUpperCase();
            if (contact && ["STOP", "UNSUBSCRIBE", "CANCEL", "REMOVE"].includes(command ?? "")) {
              await tx.whatsAppContact.update({ where: { id: contact.id }, data: { optInStatus: "OPTED_OUT", optOutAt: receivedAt, consentSource: "WHATSAPP" } });
              await tx.whatsAppAuditLog.create({ data: { vendorId: verifiedConnection.vendorId, salonId: verifiedConnection.salonId, branchId: contact.branchId, action: "CONTACT_OPT_OUT", entityType: "WhatsAppContact", entityId: contact.id, metadata: { source: "WHATSAPP" } } });
            } else if (contact && command === "START") {
              await tx.whatsAppContact.update({ where: { id: contact.id }, data: { optInStatus: "OPTED_IN", optInAt: receivedAt, optOutAt: null, consentSource: "WHATSAPP" } });
            }
            const latestCampaignMessage = contact ? await tx.whatsAppMessage.findFirst({
              where: { connectionId: verifiedConnection.id, contactId: contact.id, direction: "OUTBOUND", campaignId: { not: null }, createdAt: { gte: new Date(receivedAt.getTime() - 30 * 86400000) } },
              orderBy: { createdAt: "desc" },
              select: { id: true, campaignId: true },
            }) : null;
            const hasPriorReply = latestCampaignMessage?.campaignId && contact ? await tx.whatsAppMessage.findFirst({
              where: { campaignId: latestCampaignMessage.campaignId, contactId: contact.id, direction: "INBOUND" },
              select: { id: true },
            }) : null;
            const messageType = webhookMessageType(incoming.type);
            await tx.whatsAppMessage.create({
              data: {
                vendorId: verifiedConnection.vendorId,
                salonId: verifiedConnection.salonId,
                branchId: contact?.branchId ?? verifiedConnection.branchId,
                campaignId: latestCampaignMessage?.campaignId,
                contactId: contact?.id,
                customerId: contact?.customerId,
                connectionId: verifiedConnection.id,
                direction: "INBOUND",
                messageType,
                providerMessageId: incoming.id,
                phoneNumber: from,
                messageBody: text,
                templatePayload: ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"].includes(messageType) ? incoming[messageType.toLowerCase()] ?? null : null,
                status: "DELIVERED",
                messageCategory: "SERVICE",
                currency: "INR",
                deliveredAt: receivedAt,
              },
            });
            if (latestCampaignMessage?.campaignId && contact && !hasPriorReply) {
              await tx.whatsAppMessage.updateMany({
                where: { id: latestCampaignMessage.id, respondedAt: null },
                data: { respondedAt: receivedAt },
              });
              await tx.whatsAppCampaign.update({ where: { id: latestCampaignMessage.campaignId }, data: { repliedCount: { increment: 1 } } });
            }
          });
        }
        await prisma.whatsAppWebhookEvent.update({ where: { eventId }, data: { processed: true, processedAt: new Date(), error: null } });
      } catch (error: any) {
        await prisma.whatsAppWebhookEvent.update({
          where: { eventId },
          data: { processed: false, error: String(error?.code ?? "WHATSAPP_WEBHOOK_PROCESSING_FAILED").slice(0, 200) },
        });
        throw error;
      }
    }
    return { received: true, duplicate };
  },
  async listMessages(userId: string, roles: string[], query: any) {
    const admin = isAdmin(roles);
    const own = await scope(userId, roles, query.salonId, query.branchId);
    const where: any = {
      ...own,
      ...(admin && query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.dateFrom || query.dateTo ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}),
      ...(query.search ? { OR: [
        { phoneNumber: { contains: String(query.search).replace(/\D/g, "") } },
        { contact: { name: { contains: String(query.search), mode: "insensitive" } } },
        { providerMessageId: { contains: String(query.search) } },
      ] } : {}),
    };
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const [rows, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          contact: { select: { id: true, name: true } },
          template: { select: { id: true, name: true, language: true } },
          campaign: { select: { id: true, name: true } },
          salon: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          usage: { select: { unitCost: true, totalCost: true, currency: true } },
        },
      }),
      prisma.whatsAppMessage.count({ where }),
    ]);
    const data = rows.map((row) => {
      const safe = { ...row, phoneNumber: maskPhone(row.phoneNumber) };
      return admin ? safe : vendorSafeMessage(safe);
    });
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  },
  async contactMessages(userId: string, roles: string[], contactId: string, query: any) {
    await this.contactById(userId, roles, contactId);
    return this.listMessages(userId, roles, { ...query, contactId });
  },
  async getMessage(userId: string, roles: string[], id: string) {
    const own = await scope(userId, roles);
    const message = await prisma.whatsAppMessage.findFirst({
      where: { id, ...own } as any,
      include: {
        contact: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        usage: { select: { unitCost: true, totalCost: true, currency: true } },
      },
    });
    const verifiedMessage = message ?? fail(404, "WHATSAPP_MESSAGE_NOT_FOUND");
    const safe = { ...verifiedMessage, phoneNumber: maskPhone(verifiedMessage.phoneNumber) };
    return isAdmin(roles) ? safe : vendorSafeMessage(safe);
  },
  async listWebhookEvents(query: any) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where = {
      ...(query.eventType ? { eventType: String(query.eventType) } : {}),
      ...(query.processed === undefined ? {} : { processed: query.processed === "true" }),
      ...(query.dateFrom || query.dateTo ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.whatsAppWebhookEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, eventId: true, provider: true, eventType: true, processed: true, processedAt: true, error: true, createdAt: true },
      }),
      prisma.whatsAppWebhookEvent.count({ where }),
    ]);
    return {
      data: rows.map((row) => ({ ...row, status: row.processed ? "PROCESSED" : row.error ? "FAILED" : "PENDING" })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },
  async webhookEvent(id: string) {
    const event = await prisma.whatsAppWebhookEvent.findUnique({ where: { id } });
    return event ?? fail(404, "WHATSAPP_WEBHOOK_EVENT_NOT_FOUND");
  },
  async retryWebhookEvent(userId: string, roles: string[], id: string) {
    if (!isAdmin(roles)) fail(403, "WHATSAPP_PERMISSION_DENIED");
    const event = await prisma.whatsAppWebhookEvent.findUnique({ where: { id } });
    const verifiedEvent = event ?? fail(404, "WHATSAPP_WEBHOOK_EVENT_NOT_FOUND");
    if (verifiedEvent.processed) return { received: true, duplicate: true };
    const result = await this.webhook(verifiedEvent.payload);
    await audit(userId, roles, "WEBHOOK_RETRIED", "WhatsAppWebhookEvent", id);
    return result;
  },
  async analytics(userId: string, roles: string[], query: any) {
    const admin = isAdmin(roles);
    const own = await scope(userId, roles, query.salonId, query.branchId);
    const to = query.dateTo ? new Date(query.dateTo) : new Date();
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(to.getTime() - 30 * 86400000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) fail(400, "WHATSAPP_ANALYTICS_INVALID_DATE_RANGE");
    const where: any = {
      ...own,
      direction: "OUTBOUND",
      ...(admin && query.vendorId ? { vendorId: query.vendorId } : {}),
      createdAt: { gte: from, lte: to },
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const campaignWhere: any = {
      ...own,
      archivedAt: null,
      ...(admin && query.vendorId ? { vendorId: query.vendorId } : {}),
      createdAt: { gte: from, lte: to },
    };
    const billingWhere: any = {
      ...(admin ? {} : { vendorId: userId }),
      ...(admin && query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      createdAt: { gte: from, lte: to },
    };
    const granularity = query.granularity === "week" || query.granularity === "month" ? query.granularity : "day";
    const sqlFilters: Prisma.Sql[] = [Prisma.sql`"direction" = 'OUTBOUND'`, Prisma.sql`"createdAt" >= ${from}`, Prisma.sql`"createdAt" <= ${to}`];
    if (!admin) sqlFilters.push(Prisma.sql`"vendorId" = ${userId}`);
    else if (query.vendorId) sqlFilters.push(Prisma.sql`"vendorId" = ${query.vendorId}`);
    if (query.salonId) sqlFilters.push(Prisma.sql`"salonId" = ${query.salonId}`);
    if (query.branchId) sqlFilters.push(Prisma.sql`"branchId" = ${query.branchId}`);
    if (query.campaignId) sqlFilters.push(Prisma.sql`"campaignId" = ${query.campaignId}`);
    const [messageStats, campaignStats, billing, campaignTotals, timeSeries] = await Promise.all([
      prisma.whatsAppMessage.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.whatsAppCampaign.groupBy({ by: ["status"], where: campaignWhere, _count: { _all: true } }),
      prisma.whatsAppCampaignBilling.aggregate({ where: billingWhere, _sum: { messageCount: true, billableMessageCount: true, totalCharge: true } }),
      prisma.whatsAppCampaign.aggregate({ where: campaignWhere, _sum: { estimatedCost: true, actualCost: true, repliedCount: true, providerCostTotal: true, adminMarginTotal: true } }),
      prisma.$queryRaw<Array<{ period: Date; messages: number; sent: number; delivered: number; read: number; failed: number }>>(Prisma.sql`
        SELECT date_trunc(${granularity}, "createdAt") AS period,
          COUNT(*)::int AS messages,
          COUNT(*) FILTER (WHERE "status" = 'SENT')::int AS sent,
          COUNT(*) FILTER (WHERE "status" = 'DELIVERED')::int AS delivered,
          COUNT(*) FILTER (WHERE "status" = 'READ')::int AS read,
          COUNT(*) FILTER (WHERE "status" = 'FAILED')::int AS failed
        FROM "WhatsAppMessage"
        WHERE ${Prisma.join(sqlFilters, " AND ")}
        GROUP BY period
        ORDER BY period
      `),
    ]);
    const statuses = Object.fromEntries(messageStats.map((row) => [row.status.toLowerCase(), row._count._all]));
    const sent = Number(statuses.sent ?? 0) + Number(statuses.delivered ?? 0) + Number(statuses.read ?? 0);
    const delivered = Number(statuses.delivered ?? 0) + Number(statuses.read ?? 0);
    const read = Number(statuses.read ?? 0);
    const campaigns = campaignStats.reduce((sum, row) => sum + row._count._all, 0);
    return {
      period: { from, to, granularity },
      campaigns,
      messages: Object.values(statuses).reduce((sum: number, count: any) => sum + count, 0),
      sent,
      delivered,
      read,
      failed: Number(statuses.failed ?? 0),
      responses: campaignTotals._sum.repliedCount ?? 0,
      deliveryRate: sent ? Number((delivered * 100 / sent).toFixed(2)) : 0,
      readRate: delivered ? Number((read * 100 / delivered).toFixed(2)) : 0,
      responseRate: delivered ? Number(((campaignTotals._sum.repliedCount ?? 0) * 100 / delivered).toFixed(2)) : 0,
      billableMessages: billing._sum.billableMessageCount ?? 0,
      estimatedCharge: campaignTotals._sum.estimatedCost ?? 0,
      actualCharge: campaignTotals._sum.actualCost ?? 0,
      ...(admin ? {
        providerCost: campaignTotals._sum.providerCostTotal ?? 0,
        adminMargin: campaignTotals._sum.adminMarginTotal ?? 0,
      } : {}),
      timeSeries,
      byCampaignStatus: campaignStats,
      byMessageStatus: messageStats,
    };
  },
  async dashboard(userId: string, roles: string[]) {
    const admin = isAdmin(roles);
    const own = await scope(userId, roles);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const where: any = { ...own, direction: "OUTBOUND" };
    const [messagesToday, messages, recentCampaigns, recentMessages, billing, connectedNumber] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { ...where, createdAt: { gte: since } } }),
      prisma.whatsAppMessage.groupBy({ by: ["status"], where, _count: true }),
      prisma.whatsAppCampaign.findMany({ where: { ...own, archivedAt: null } as any, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.whatsAppMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.whatsAppCampaignBilling.aggregate({ where: admin ? {} : { vendorId: userId }, _sum: { totalCharge: true, billableMessageCount: true } }),
      prisma.whatsAppConnection.count({ where: { ...own, status: "CONNECTED" } as any }),
    ]);
    return {
      connectedNumber,
      messagesToday,
      messages,
      recentCampaigns: admin ? recentCampaigns : recentCampaigns.map(vendorSafeCampaign),
      recentMessages: admin ? recentMessages : recentMessages.map(vendorSafeMessage),
      totalCost: billing._sum.totalCharge ?? 0,
      billableMessages: billing._sum.billableMessageCount ?? 0,
    };
  },
  async pricing(userId: string, roles: string[], query: any) {
    const category = query.category ?? "UTILITY";
    const recipients = Math.max(0, Math.min(1000000, Number(query.recipients ?? 0)));
    const price = await currentPricing(category, query.at ? new Date(query.at) : new Date());
    const { vendorPricePerMessage, providerCostPerMessage } = pricingRates(price);
    const campaignCharge = price?.campaignCharge ?? 0;
    const financials = calculateWhatsAppFinancials(recipients, providerCostPerMessage, vendorPricePerMessage, campaignCharge);
    const estimate = { category, recipients, costPerMessage: vendorPricePerMessage, vendorPricePerMessage, providerCostPerMessage, campaignCharge, estimatedCost: financials.vendorCharge, estimatedProviderCost: financials.providerCost, estimatedAdminMargin: financials.adminMargin, warning: financials.warning, currency: price?.currency ?? "INR" };
    return isAdmin(roles) ? estimate : {
      category: estimate.category,
      recipients: estimate.recipients,
      costPerMessage: estimate.costPerMessage,
      vendorPricePerMessage: estimate.vendorPricePerMessage,
      campaignCharge: estimate.campaignCharge,
      estimatedCost: estimate.estimatedCost,
      currency: estimate.currency,
    };
  },
  async listPricing(query: any) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where = { ...(query.category ? { messageCategory: query.category } : {}), ...(query.active === undefined ? {} : { active: query.active === "true" }) };
    const [data, total] = await Promise.all([
      prisma.whatsAppPricing.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { effectiveFrom: "desc" } }),
      prisma.whatsAppPricing.count({ where }),
    ]);
    const rows = data.map((pricing) => ({
      ...pricing,
      marginPerMessage: pricing.vendorPricePerMessage - pricing.providerCostPerMessage,
      warning: pricing.vendorPricePerMessage < pricing.providerCostPerMessage ? "Vendor price is lower than provider cost. This campaign may result in negative margin." : null,
    }));
    return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  },
  async listBilling(userId: string, roles: string[], query: any) {
    const admin = isAdmin(roles);
    const own = admin ? {} : { vendorId: userId };
    const dateFilter = query.dateFrom || query.dateTo ? {
      createdAt: {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      },
    } : {};
    const filters: any = {
      ...own,
      ...(query.vendorId && admin ? { vendorId: query.vendorId } : {}),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.billingStatus ? { billingStatus: query.billingStatus } : {}),
      ...(query.campaignType || query.status ? { campaign: { ...(query.campaignType ? { campaignType: query.campaignType } : {}), ...(query.status ? { status: query.status } : {}) } } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    };
    const where: any = { ...filters, ...dateFilter };
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const [data, total, totals] = await Promise.all([
      prisma.whatsAppCampaignBilling.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          campaign: { select: { id: true, name: true, campaignType: true, status: true } },
          salon: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          ...(admin ? { vendor: { select: { id: true, firstName: true, lastName: true } } } : {}),
        },
      }),
      prisma.whatsAppCampaignBilling.count({ where }),
      prisma.whatsAppCampaignBilling.aggregate({ where, _sum: { totalCharge: true, messageCount: true, billableMessageCount: true, providerCostTotal: true, adminMarginTotal: true } }),
    ]);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [today, month, lastMonth] = await Promise.all([
      prisma.whatsAppCampaignBilling.aggregate({ where: { ...filters, createdAt: { gte: startOfToday } }, _sum: { totalCharge: true } }),
      prisma.whatsAppCampaignBilling.aggregate({ where: { ...filters, createdAt: { gte: startOfMonth } }, _sum: { totalCharge: true } }),
      prisma.whatsAppCampaignBilling.aggregate({ where: { ...filters, createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { totalCharge: true } }),
    ]);
    const safeData = admin ? data : data.map((row) => {
      const { providerCostTotal, adminMarginTotal, pricingSnapshot, ...safe } = row;
      return { ...safe, pricingSnapshot: vendorSafeSnapshot(pricingSnapshot) };
    });
    return {
      data: safeData,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: {
        messages: totals._sum.messageCount ?? 0,
        billableMessages: totals._sum.billableMessageCount ?? 0,
        totalCharges: totals._sum.totalCharge ?? 0,
        ...(admin ? {
          providerCost: totals._sum.providerCostTotal ?? 0,
          adminMargin: totals._sum.adminMarginTotal ?? 0,
        } : {}),
        outstandingAmount: totals._sum.totalCharge ?? 0,
        todayCharges: today._sum.totalCharge ?? 0,
        thisMonthCharges: month._sum.totalCharge ?? 0,
        lastMonthCharges: lastMonth._sum.totalCharge ?? 0,
      },
    };
  },
  async adminUsage(query: any) { const page = Math.max(1, Number(query.page ?? 1)); const limit = Math.min(100, Number(query.limit ?? 50)); const where: any = { ...(query.vendorId ? { vendorId: query.vendorId } : {}), ...(query.category ? { messageCategory: query.category } : {}), ...(query.status ? { status: query.status } : {}), ...(query.dateFrom || query.dateTo ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}) }; const [data, total] = await Promise.all([prisma.whatsAppUsageLedger.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }), prisma.whatsAppUsageLedger.count({ where })]); return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }; },
  async listCampaigns(userId: string, roles: string[], query: any) {
    const own = await scope(userId, roles, query.salonId, query.branchId);
    const admin = isAdmin(roles);
    const where: any = {
      ...own,
      ...(!admin ? { archivedAt: null } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.campaignType ? { campaignType: query.campaignType } : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
      ...(query.vendorId && admin ? { vendorId: query.vendorId } : {}),
      ...(query.dateFrom || query.dateTo ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}),
    };
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const [campaigns, total] = await Promise.all([
      prisma.whatsAppCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          template: { select: { id: true, name: true, category: true } },
          billing: true,
          salon: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      prisma.whatsAppCampaign.count({ where }),
    ]);
    const vendors = admin && campaigns.length
      ? await prisma.user.findMany({ where: { id: { in: campaigns.map((campaign) => campaign.vendorId) } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    const data = campaigns.map((campaign) => {
      const item = { ...campaign, vendor: admin ? vendorById.get(campaign.vendorId) ?? null : undefined };
      return admin ? item : vendorSafeCampaign(item);
    });
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  },
  async getCampaign(userId: string, roles: string[], id: string) {
    const own = await scope(userId, roles);
    const campaign = await prisma.whatsAppCampaign.findFirst({ where: { id, ...(!isAdmin(roles) ? { archivedAt: null } : {}), ...own } as any, include: { template: true, billing: true } });
    if (!campaign) fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    return isAdmin(roles) ? campaign : vendorSafeCampaign(campaign);
  },
  async deleteCampaign(userId: string, roles: string[], id: string) {
    const campaign = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    const admin = isAdmin(roles);
    if (!admin && !["DRAFT", "SCHEDULED"].includes(campaign.status)) fail(409, "WHATSAPP_CAMPAIGN_NOT_DELETABLE");
    const [messageCount, billing] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { campaignId: id } }),
      prisma.whatsAppCampaignBilling.findUnique({ where: { campaignId: id }, select: { id: true } }),
    ]);
    let hardDeleted = false;
    if (campaign.status === "DRAFT" && !messageCount && !billing) {
      await prisma.whatsAppCampaign.delete({ where: { id } });
      hardDeleted = true;
    } else {
      await prisma.whatsAppCampaign.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          ...(campaign.status === "SCHEDULED" || campaign.status === "QUEUED" || campaign.status === "PROCESSING" ? { status: "CANCELLED", completedAt: new Date() } : {}),
        },
      });
    }
    await audit(userId, roles, "CAMPAIGN_DELETED", "WhatsAppCampaign", id, { hardDeleted, previousStatus: campaign.status });
    return { id, archived: !hardDeleted };
  },
  async createPricing(userId: string, roles: string[], data: any) {
    const vendorPricePerMessage = data.vendorPricePerMessage ?? data.costPerMessage;
    const result = await prisma.whatsAppPricing.create({
      data: { ...data, costPerMessage: vendorPricePerMessage, vendorPricePerMessage, createdBy: userId },
    });
    await audit(userId, roles, "PRICING_CREATED", "WhatsAppPricing", result.id, {
      messageCategory: result.messageCategory,
      providerCostPerMessage: result.providerCostPerMessage,
      vendorPricePerMessage: result.vendorPricePerMessage,
      campaignCharge: result.campaignCharge,
      currency: result.currency,
      belowProviderCost: result.vendorPricePerMessage < result.providerCostPerMessage,
    });
    return { ...result, marginPerMessage: result.vendorPricePerMessage - result.providerCostPerMessage, warning: result.vendorPricePerMessage < result.providerCostPerMessage ? "Vendor price is lower than provider cost. This campaign may result in negative margin." : null };
  },
  async updatePricing(userId: string, roles: string[], id: string, data: any) {
    const current = await prisma.whatsAppPricing.findUnique({ where: { id } })
      ?? fail(404, "WHATSAPP_PRICING_NOT_FOUND");
    if (data.active === false && Object.keys(data).every((key) => key === "active")) {
      const deactivated = await prisma.whatsAppPricing.update({ where: { id }, data: { active: false } });
      await audit(userId, roles, "PRICING_DEACTIVATED", "WhatsAppPricing", id);
      return deactivated;
    }
    const now = new Date();
    if (!current.active && current.effectiveFrom <= now) fail(409, "WHATSAPP_PRICING_HISTORY_IMMUTABLE");
    const vendorPricePerMessage = data.vendorPricePerMessage ?? data.costPerMessage;
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : now;
    if (Number.isNaN(effectiveFrom.getTime()) || effectiveFrom < now) fail(400, "WHATSAPP_PRICING_EFFECTIVE_DATE_INVALID");
    const revision = current.effectiveFrom > now
      ? await prisma.whatsAppPricing.update({
        where: { id },
        data: { ...data, ...(vendorPricePerMessage === undefined ? {} : { costPerMessage: vendorPricePerMessage, vendorPricePerMessage }) },
      })
      : await prisma.$transaction(async (tx) => {
        await tx.whatsAppPricing.update({
          where: { id },
          data: { active: false, effectiveTo: effectiveFrom },
        });
        return tx.whatsAppPricing.create({
          data: {
            provider: data.provider ?? current.provider,
            messageCategory: data.messageCategory ?? current.messageCategory,
            costPerMessage: vendorPricePerMessage ?? current.vendorPricePerMessage,
            vendorPricePerMessage: vendorPricePerMessage ?? current.vendorPricePerMessage,
            providerCostPerMessage: data.providerCostPerMessage ?? current.providerCostPerMessage,
            campaignCharge: data.campaignCharge ?? current.campaignCharge,
            currency: data.currency ?? current.currency,
            effectiveFrom,
            effectiveTo: data.effectiveTo ?? current.effectiveTo,
            active: data.active ?? true,
            notes: data.notes ?? current.notes,
            createdBy: userId,
          },
        });
      });
    await audit(userId, roles, "PRICING_UPDATED", "WhatsAppPricing", revision.id, {
      previousPricingId: current.id,
      messageCategory: revision.messageCategory,
      providerCostPerMessage: revision.providerCostPerMessage,
      vendorPricePerMessage: revision.vendorPricePerMessage,
      campaignCharge: revision.campaignCharge,
      currency: revision.currency,
      active: revision.active,
      belowProviderCost: revision.vendorPricePerMessage < revision.providerCostPerMessage,
    });
    return { ...revision, marginPerMessage: revision.vendorPricePerMessage - revision.providerCostPerMessage, warning: revision.vendorPricePerMessage < revision.providerCostPerMessage ? "Vendor price is lower than provider cost. This campaign may result in negative margin." : null };
  },
  async deletePricing(userId: string, roles: string[], id: string) { const result = await prisma.whatsAppPricing.update({ where: { id }, data: { active: false } }); await audit(userId, roles, "PRICING_DEACTIVATED", "WhatsAppPricing", id); return { id: result.id }; },
  async scheduleCampaign(userId: string, roles: string[], id: string, data: { scheduledAt?: string; timezone?: string }) {
    const campaign = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : new Date(NaN);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) fail(400, "WHATSAPP_SCHEDULE_TIME_INVALID");
    if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) fail(400, "WHATSAPP_CAMPAIGN_INVALID_TRANSITION");
    const result = await prisma.whatsAppCampaign.update({
      where: { id },
      data: { status: "SCHEDULED", campaignType: "SCHEDULED", scheduledAt, ...(data.timezone ? { timezone: data.timezone } : {}) },
    });
    await audit(userId, roles, "CAMPAIGN_SCHEDULED", "WhatsAppCampaign", id, { scheduledAt: scheduledAt.toISOString() });
    return isAdmin(roles) ? result : vendorSafeCampaign(result);
  },
  async campaignAction(userId: string, roles: string[], id: string, requestedAction: string) {
    const action = requestedAction === "retry-failed" ? "retry" : requestedAction;
    const campaign = await this.getCampaign(userId, roles, id);
    const verifiedCampaign = campaign ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    const transitions: Record<string, string[]> = {
      send: ["DRAFT", "SCHEDULED", "QUEUED"],
      pause: ["PROCESSING"],
      resume: ["PAUSED"],
      cancel: ["SCHEDULED", "QUEUED", "PROCESSING"],
      retry: ["FAILED", "PARTIALLY_COMPLETED"],
    };
    if (!transitions[action]?.includes(verifiedCampaign.status)) fail(400, "WHATSAPP_CAMPAIGN_INVALID_TRANSITION");
    if (action === "send" && verifiedCampaign.totalRecipients < 1) fail(400, "WHATSAPP_NO_ELIGIBLE_RECIPIENTS");
    if (action === "retry") {
      const failed = await prisma.whatsAppCampaignRecipient.count({ where: { campaignId: id, status: "FAILED", providerMessageId: null } });
      await prisma.$transaction(async (tx) => {
        await tx.whatsAppMessage.updateMany({
          where: { campaignId: id, status: "FAILED", providerMessageId: null },
          data: { status: "QUEUED", failureCode: null, failureReason: null, failedAt: null, submittedAt: null, providerMessageId: null },
        });
        await tx.whatsAppCampaignRecipient.updateMany({
          where: { campaignId: id, status: "FAILED", providerMessageId: null },
          data: { status: "QUEUED", failureCode: null, failureReason: null, failedAt: null, providerMessageId: null },
        });
        await tx.whatsAppCampaign.update({
          where: { id },
          data: { failedCount: { decrement: failed }, queuedCount: { increment: failed }, completedAt: null },
        });
      });
    }
    const status = action === "send" || action === "retry" || action === "resume" ? "QUEUED" : action === "pause" ? "PAUSED" : "CANCELLED";
    const result = await prisma.whatsAppCampaign.update({
      where: { id },
      data: {
        status,
        ...(action === "send" ? { scheduledAt: null } : {}),
        ...(action === "send" ? { startedAt: new Date() } : {}),
        ...(action === "cancel" ? { completedAt: new Date() } : {}),
      },
    });
    if (action === "send" || action === "retry" || action === "resume") {
      await enqueue("campaign", { type: "campaign", id });
    }
    await audit(userId, roles, `CAMPAIGN_${action.toUpperCase()}`, "WhatsAppCampaign", id);
    return isAdmin(roles) ? result : vendorSafeCampaign(result);
  },
  async recipients(userId: string, roles: string[], id: string, query: any) {
    const campaign = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Number(query.limit ?? 50));
    const where = { campaignId: id };
    const [data, total] = await Promise.all([
      prisma.whatsAppCampaignRecipient.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.whatsAppCampaignRecipient.count({ where }),
    ]);
    const rows = isAdmin(roles) ? data : data.map((recipient) => ({
      ...recipient,
      unitCost: (campaign.pricingSnapshot as any)?.vendorPricePerMessage ?? (campaign.pricingSnapshot as any)?.perMessageRate ?? 0,
    }));
    return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  },
  async campaignStats(userId: string, roles: string[], id: string) {
    const campaign = await this.getCampaign(userId, roles, id) ?? fail(404, "WHATSAPP_CAMPAIGN_NOT_FOUND");
    const [stats, messages, billing] = await Promise.all([
      prisma.whatsAppCampaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      prisma.whatsAppMessage.groupBy({ by: ["status"], where: { campaignId: id, direction: "OUTBOUND" }, _count: { _all: true } }),
      prisma.whatsAppCampaignBilling.findUnique({ where: { campaignId: id }, select: { messageCount: true, billableMessageCount: true, totalCharge: true, currency: true, billingStatus: true } }),
    ]);
    const delivered = campaign.deliveredCount;
    return {
      campaignId: campaign.id,
      status: campaign.status,
      recipients: campaign.totalRecipients,
      queued: campaign.queuedCount,
      sent: campaign.sentCount,
      delivered,
      read: campaign.readCount,
      failed: campaign.failedCount,
      responses: campaign.repliedCount,
      deliveryRate: campaign.sentCount ? Number((delivered * 100 / campaign.sentCount).toFixed(2)) : 0,
      responseRate: delivered ? Number((campaign.repliedCount * 100 / delivered).toFixed(2)) : 0,
      estimatedCharge: campaign.estimatedCost,
      actualCharge: campaign.actualCost,
      billableMessages: billing?.billableMessageCount ?? 0,
      billingStatus: billing?.billingStatus ?? "PENDING",
      currency: billing?.currency ?? campaign.currency,
      recipientsByStatus: stats,
      messagesByStatus: messages,
    };
  },
  async adminDashboard() {
    const [connectedNumbers, activeCampaigns, scheduledCampaigns, campaignCount, grouped, totalCost, campaignTotals, configStatus] = await Promise.all([
      prisma.whatsAppConnection.count({ where: { status: "CONNECTED" } }),
      prisma.whatsAppCampaign.count({ where: { archivedAt: null, status: { in: ["QUEUED", "PROCESSING"] } } }),
      prisma.whatsAppCampaign.count({ where: { archivedAt: null, status: "SCHEDULED" } }),
      prisma.whatsAppCampaign.count({ where: { archivedAt: null } }),
      prisma.whatsAppMessage.groupBy({ by: ["status", "messageCategory"], where: { direction: "OUTBOUND" }, _count: { _all: true } }),
      prisma.whatsAppCampaignBilling.aggregate({ _sum: { totalCharge: true, billableMessageCount: true, providerCostTotal: true, adminMarginTotal: true } }),
      prisma.whatsAppCampaign.aggregate({ where: { archivedAt: null }, _sum: { estimatedCost: true, actualCost: true, repliedCount: true, providerCostTotal: true, adminMarginTotal: true } }),
      this.configurationStatus(),
    ]);
    return {
      campaignCount,
      connectedNumbers,
      activeCampaigns,
      scheduledCampaigns,
      grouped,
      billableMessages: totalCost._sum.billableMessageCount ?? 0,
      totalWhatsAppCharges: totalCost._sum.totalCharge ?? 0,
      providerCost: campaignTotals._sum.providerCostTotal ?? 0,
      adminMargin: campaignTotals._sum.adminMarginTotal ?? 0,
      outstandingAmount: totalCost._sum.totalCharge ?? 0,
      estimatedCharges: campaignTotals._sum.estimatedCost ?? 0,
      actualCharges: campaignTotals._sum.actualCost ?? 0,
      responses: campaignTotals._sum.repliedCount ?? 0,
      configuration: configStatus,
    };
  },
  async providerTest(userId: string, roles: string[], id: string) {
    await this.connection(userId, roles, id);
    let valid = false;
    try {
      const provider = await providerFor(id);
      valid = await provider.verifyCredentials();
    } catch {
      valid = false;
    }
    await prisma.whatsAppConnection.update({
      where: { id },
      data: { status: valid ? "CONNECTED" : "INVALID", lastHealthCheckAt: new Date(), ...(valid ? { lastConnectedAt: new Date() } : {}) },
    });
    return { valid, status: valid ? "CONNECTED" : "ERROR", reason: valid ? undefined : "Provider credentials or phone number could not be verified." };
  }
};
