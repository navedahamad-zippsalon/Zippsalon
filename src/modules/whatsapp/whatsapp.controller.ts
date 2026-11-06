import { NextFunction, Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import * as service from "./whatsapp.service";
import { campaignPreviewSchema, campaignSchema, connectionSchema, contactSchema, pricingSchema, sendSchema, templateSchema } from "./whatsapp.validation";
import { prisma } from "../../infrastructure/database/prisma";
import { decrypt } from "./utils/encryption";
const run = (fn: (req: AuthRequest) => Promise<unknown>) => (req: AuthRequest, res: Response, next: NextFunction) => fn(req).then((data) => res.json({ success: true, data })).catch(next);
const actor = (req: AuthRequest) => req.user!;
const param = (req: AuthRequest, name: string) => typeof req.params[name] === "string" ? req.params[name] : undefined;
export const getConfig = run(async () => service.whatsappService.getConfig());
export const saveConfig = run(async (req) => service.whatsappService.saveConfig(actor(req).userId, actor(req).roles, req.body, param(req, "id")));
export const testConfig = run(async () => service.whatsappService.testConfig());
export const configurationStatus = run(async (req) => service.whatsappService.configurationStatusFor(actor(req).userId, actor(req).roles, typeof req.query.salonId === "string" ? req.query.salonId : undefined));
export const vendorReadiness = run(async (req) => service.whatsappService.vendorReadiness(actor(req).userId, actor(req).roles, typeof req.query.salonId === "string" ? req.query.salonId : undefined));
export const syncTemplates = run(async (req) => service.whatsappService.syncTemplates(actor(req).userId, actor(req).roles));
export const listConnections = run(async (req) => service.whatsappService.listConnections(actor(req).userId, actor(req).roles, req.query));
export const getConnection = run(async (req) => service.whatsappService.connection(actor(req).userId, actor(req).roles, String(req.params.id)));
export const saveConnection = run(async (req) => service.whatsappService.saveConnection(actor(req).userId, actor(req).roles, connectionSchema.parse(req.body), param(req, "id")));
export const deleteConnection = run(async (req) => service.whatsappService.deleteConnection(actor(req).userId, actor(req).roles, String(req.params.id)));
export const testConnection = run(async (req) => service.whatsappService.providerTest(actor(req).userId, actor(req).roles, String(req.params.id)));
export const listContacts = run(async (req) => service.whatsappService.listContacts(actor(req).userId, actor(req).roles, req.query));
export const getContact = run(async (req) => service.whatsappService.contactById(actor(req).userId, actor(req).roles, String(req.params.id)));
export const saveContact = run(async (req) => service.whatsappService.saveContact(actor(req).userId, actor(req).roles, contactSchema.parse(req.body), param(req, "id")));
export const deleteContact = run(async (req) => service.whatsappService.deleteContact(actor(req).userId, actor(req).roles, String(req.params.id)));
export const optIn = run(async (req) => service.whatsappService.optContact(actor(req).userId, actor(req).roles, String(req.params.id), true));
export const optOut = run(async (req) => service.whatsappService.optContact(actor(req).userId, actor(req).roles, String(req.params.id), false));
export const importContacts = run(async (req) => Promise.all((Array.isArray(req.body) ? req.body : req.body.contacts).map((item: unknown) => service.whatsappService.saveContact(actor(req).userId, actor(req).roles, contactSchema.parse(item)))));
export const listTemplates = run(async (req) => service.whatsappService.listTemplates(actor(req).userId, actor(req).roles, req.query));
export const getTemplate = run(async (req) => service.whatsappService.getTemplate(actor(req).userId, actor(req).roles, String(req.params.id)));
export const saveTemplate = run(async (req) => service.whatsappService.saveTemplate(actor(req).userId, actor(req).roles, templateSchema.parse(req.body), param(req, "id")));
export const deleteTemplate = run(async (req) => service.whatsappService.deleteTemplate(actor(req).userId, actor(req).roles, String(req.params.id)));
export const submitTemplate = run(async (req) => service.whatsappService.submitTemplate(actor(req).userId, actor(req).roles, String(req.params.id)));
export const createCampaign = run(async (req) => service.whatsappService.createCampaign(actor(req).userId, actor(req).roles, campaignSchema.parse(req.body), req.header("Idempotency-Key") ?? undefined));
export const updateCampaign = run(async (req) => service.whatsappService.updateCampaign(actor(req).userId, actor(req).roles, String(req.params.id), campaignSchema.parse(req.body)));
export const duplicateCampaign = run(async (req) => service.whatsappService.duplicateCampaign(actor(req).userId, actor(req).roles, String(req.params.id)));
export const deleteCampaign = run(async (req) => service.whatsappService.deleteCampaign(actor(req).userId, actor(req).roles, String(req.params.id)));
export const previewCampaign = run(async (req) => service.whatsappService.previewCampaign(actor(req).userId, actor(req).roles, campaignPreviewSchema.parse(req.body)));
export const listCampaigns = run(async (req) => service.whatsappService.listCampaigns(actor(req).userId, actor(req).roles, req.query));
export const getCampaign = run(async (req) => service.whatsappService.getCampaign(actor(req).userId, actor(req).roles, String(req.params.id)));
export const campaignMessages = run(async (req) => {
  await service.whatsappService.getCampaign(actor(req).userId, actor(req).roles, String(req.params.id));
  return service.whatsappService.listMessages(actor(req).userId, actor(req).roles, { ...req.query, campaignId: req.params.id });
});
export const campaignAnalytics = run(async (req) => service.whatsappService.campaignStats(actor(req).userId, actor(req).roles, String(req.params.id)));
export const scheduleCampaign = run(async (req) => service.whatsappService.scheduleCampaign(actor(req).userId, actor(req).roles, String(req.params.id), req.body));
export const campaignAction = run(async (req) => service.whatsappService.campaignAction(actor(req).userId, actor(req).roles, String(req.params.id), String(req.params.action || req.path.split("/").pop())));
export const recipients = run(async (req) => service.whatsappService.recipients(actor(req).userId, actor(req).roles, String(req.params.id), req.query));
export const campaignStats = run(async (req) => service.whatsappService.campaignStats(actor(req).userId, actor(req).roles, String(req.params.id)));
export const sendMessage = run(async (req) => service.whatsappService.sendMessage(actor(req).userId, actor(req).roles, sendSchema.parse(req.body), req.header("Idempotency-Key") ?? undefined));
export const dashboard = run(async (req) => service.whatsappService.dashboard(actor(req).userId, actor(req).roles));
export const analytics = run(async (req) => service.whatsappService.analytics(actor(req).userId, actor(req).roles, req.query));
export const adminAnalytics = run(async (req) => service.whatsappService.analytics(actor(req).userId, actor(req).roles, req.query));
export const listMessages = run(async (req) => service.whatsappService.listMessages(actor(req).userId, actor(req).roles, req.query));
export const getMessage = run(async (req) => service.whatsappService.getMessage(actor(req).userId, actor(req).roles, String(req.params.id)));
export const contactMessages = run(async (req) => service.whatsappService.contactMessages(actor(req).userId, actor(req).roles, String(req.params.id), req.query));
export const listWebhookEvents = run(async (req) => service.whatsappService.listWebhookEvents(req.query));
export const getWebhookEvent = run(async (req) => service.whatsappService.webhookEvent(String(req.params.id)));
export const retryWebhookEvent = run(async (req) => service.whatsappService.retryWebhookEvent(actor(req).userId, actor(req).roles, String(req.params.id)));
export const adminUsage = run(async (req) => service.whatsappService.adminUsage(req.query));
export const adminDashboard = run(async () => service.whatsappService.adminDashboard());
export const billing = run(async (req) => service.whatsappService.listBilling(actor(req).userId, actor(req).roles, req.query));
export const adminBilling = run(async (req) => service.whatsappService.listBilling(actor(req).userId, actor(req).roles, req.query));
export const getPricing = run(async (req) => service.whatsappService.pricing(actor(req).userId, actor(req).roles, req.query));
export const listPricing = run(async (req) => service.whatsappService.listPricing(req.query));
export const createPricing = run(async (req) => service.whatsappService.createPricing(actor(req).userId, actor(req).roles, pricingSchema.parse(req.body)));
export const updatePricing = run(async (req) => service.whatsappService.updatePricing(actor(req).userId, actor(req).roles, String(req.params.id), pricingSchema.partial().parse(req.body)));
export const deletePricing = run(async (req) => service.whatsappService.deletePricing(actor(req).userId, actor(req).roles, String(req.params.id)));
export const activatePricing = run(async (req) => service.whatsappService.updatePricing(actor(req).userId, actor(req).roles, String(req.params.id), { active: true }));
export const deactivatePricing = run(async (req) => service.whatsappService.updatePricing(actor(req).userId, actor(req).roles, String(req.params.id), { active: false }));
export const webhookVerify = (req: AuthRequest, res: Response, next: NextFunction) => {
  prisma.whatsAppConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
    .then(async (config) => {
      const token = config?.webhookVerifyToken ?? process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
      if (req.query["hub.mode"] !== "subscribe" || !token || req.query["hub.verify_token"] !== token || typeof req.query["hub.challenge"] !== "string") {
        return res.sendStatus(403);
      }
      if (config) {
        await prisma.whatsAppAuditLog.create({
          data: { userId: config.createdBy, action: "WEBHOOK_VERIFIED", entityType: "WhatsAppConfiguration", entityId: config.id },
        });
      }
      return res.type("text/plain").send(req.query["hub.challenge"]);
    })
    .catch(next);
};
export const webhook = (req: AuthRequest, res: Response, next: NextFunction) => {
  const signature = req.header("x-hub-signature-256");
  prisma.whatsAppConfiguration.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
    .then(async (config) => {
      const secret = config ? decrypt(config.encryptedWebhookSecret) : process.env.WHATSAPP_WEBHOOK_SECRET;
      const rawBody = (req as AuthRequest & { rawBody?: Buffer }).rawBody;
      if (!signature || !secret || !rawBody) return res.sendStatus(401);
      const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
      const provided = Buffer.from(signature);
      const actual = Buffer.from(expected);
      if (provided.length !== actual.length || !crypto.timingSafeEqual(provided, actual)) return res.sendStatus(401);
      await service.whatsappService.webhook(req.body, signature);
      return res.sendStatus(200);
    })
    .catch(next);
};
