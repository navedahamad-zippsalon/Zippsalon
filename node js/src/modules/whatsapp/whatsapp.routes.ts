import { Router } from "express";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import * as c from "./whatsapp.controller";
import { requirePermissionOrRoles } from "../../common/middleware/permission.middleware";

/**
 * @swagger
 * tags:
 *   - name: WhatsApp
 *     description: Multi-tenant WhatsApp Business Cloud API
 *   - name: WhatsApp Admin
 *     description: Provider configuration, pricing, templates, usage and reporting
 * /api/v1/whatsapp/messages/send:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Queue an outbound WhatsApp message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [connectionId, contactId, messageType]
 *             properties:
 *               connectionId: { type: string, format: uuid }
 *               contactId: { type: string, format: uuid }
 *               templateId: { type: string, format: uuid }
 *               messageType: { type: string, enum: [TEXT, TEMPLATE, IMAGE, VIDEO, DOCUMENT, AUDIO, INTERACTIVE] }
 *               messageBody: { type: string }
 *               variables: { type: object }
 *     responses:
 *       200: { description: Message queued }
 * /api/v1/whatsapp/webhook:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Meta webhook verification
 *     responses:
 *       200: { description: Verification challenge }
 *   post:
 *     tags: [WhatsApp]
 *     summary: Receive verified Meta webhook events
 *     responses:
 *       200: { description: Event accepted }
 */

const router = Router();
router.get("/webhook", c.webhookVerify);
router.post("/webhook", c.webhook);
router.use(authenticate);
router.use(requirePermissionOrRoles("whatsapp.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR));
router.get("/status", c.configurationStatus); router.get("/readiness", c.vendorReadiness);
router.get("/connections", c.listConnections); router.post("/connections", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveConnection); router.get("/connections/:id", c.getConnection); router.put("/connections/:id", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveConnection); router.delete("/connections/:id", requirePermissionOrRoles("whatsapp.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.deleteConnection); router.post("/connections/:id/test", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.testConnection);
router.get("/contacts", c.listContacts); router.post("/contacts", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveContact); router.post("/contacts/import", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.importContacts); router.get("/contacts/:id", c.getContact); router.get("/contacts/:id/messages", c.contactMessages); router.put("/contacts/:id", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveContact); router.delete("/contacts/:id", requirePermissionOrRoles("whatsapp.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.deleteContact); router.post("/contacts/:id/opt-in", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.optIn); router.post("/contacts/:id/opt-out", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.optOut);
router.get("/templates", c.listTemplates); router.post("/templates", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveTemplate); router.get("/templates/:id", c.getTemplate); router.put("/templates/:id", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.saveTemplate); router.delete("/templates/:id", requirePermissionOrRoles("whatsapp.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.deleteTemplate); router.post("/templates/:id/submit", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.submitTemplate);
router.post("/campaigns/preview", c.previewCampaign); router.post("/campaigns", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.createCampaign); router.get("/campaigns", c.listCampaigns); router.get("/campaigns/:id", c.getCampaign); router.put("/campaigns/:id", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.updateCampaign); router.delete("/campaigns/:id", requirePermissionOrRoles("whatsapp.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.deleteCampaign); router.post("/campaigns/:id/schedule", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.scheduleCampaign); router.post("/campaigns/:id/send", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.campaignAction); router.post("/campaigns/:id/pause", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.campaignAction); router.post("/campaigns/:id/resume", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.campaignAction); router.post("/campaigns/:id/cancel", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.campaignAction); router.post("/campaigns/:id/retry-failed", requirePermissionOrRoles("whatsapp.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.campaignAction); router.post("/campaigns/:id/duplicate", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.duplicateCampaign); router.get("/campaigns/:id/recipients", c.recipients); router.get("/campaigns/:id/messages", c.campaignMessages); router.get("/campaigns/:id/stats", c.campaignStats); router.get("/campaigns/:id/analytics", c.campaignAnalytics);
router.post("/messages/send", requirePermissionOrRoles("whatsapp.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), c.sendMessage); router.get("/messages", c.listMessages); router.get("/messages/:id", c.getMessage); router.get("/analytics", c.analytics); router.get("/pricing/estimate", c.getPricing); router.get("/billing", c.billing); router.get("/dashboard", c.dashboard);

export const whatsappAdminRoutes = Router();
whatsappAdminRoutes.use(authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
whatsappAdminRoutes.use(requirePermissionOrRoles("whatsapp.admin", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
whatsappAdminRoutes.get("/config", c.getConfig); whatsappAdminRoutes.get("/config/status", c.configurationStatus); whatsappAdminRoutes.post("/config", c.saveConfig); whatsappAdminRoutes.put("/config", c.saveConfig); whatsappAdminRoutes.post("/config/test", c.testConfig); whatsappAdminRoutes.post("/config/validate", c.testConfig);
whatsappAdminRoutes.get("/connections", c.listConnections); whatsappAdminRoutes.post("/connections", c.saveConnection); whatsappAdminRoutes.put("/connections/:id", c.saveConnection); whatsappAdminRoutes.delete("/connections/:id", c.deleteConnection);
whatsappAdminRoutes.get("/templates", c.listTemplates); whatsappAdminRoutes.post("/templates", c.saveTemplate); whatsappAdminRoutes.put("/templates/:id", c.saveTemplate); whatsappAdminRoutes.delete("/templates/:id", c.deleteTemplate); whatsappAdminRoutes.post("/templates/:id/submit", c.submitTemplate); whatsappAdminRoutes.post("/templates/sync", c.syncTemplates);
whatsappAdminRoutes.get("/campaigns", c.listCampaigns); whatsappAdminRoutes.post("/campaigns", c.createCampaign); whatsappAdminRoutes.get("/campaigns/:id", c.getCampaign); whatsappAdminRoutes.delete("/campaigns/:id", c.deleteCampaign);
whatsappAdminRoutes.get("/pricing", c.listPricing); whatsappAdminRoutes.post("/pricing", c.createPricing); whatsappAdminRoutes.put("/pricing/:id", c.updatePricing); whatsappAdminRoutes.delete("/pricing/:id", c.deletePricing); whatsappAdminRoutes.post("/pricing/:id/activate", c.activatePricing); whatsappAdminRoutes.post("/pricing/:id/deactivate", c.deactivatePricing);
whatsappAdminRoutes.get("/usage", c.adminUsage); whatsappAdminRoutes.get("/billing", c.adminBilling); whatsappAdminRoutes.get("/messages", c.listMessages); whatsappAdminRoutes.get("/analytics", c.adminAnalytics); whatsappAdminRoutes.get("/dashboard", c.adminDashboard);
whatsappAdminRoutes.get("/webhooks", c.listWebhookEvents); whatsappAdminRoutes.get("/webhooks/:id", c.getWebhookEvent); whatsappAdminRoutes.post("/webhooks/:id/retry", c.retryWebhookEvent);
export default router;
