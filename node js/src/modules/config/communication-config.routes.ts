import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware";
import { requireAnyPermissionOrRoles, requirePermission } from "../../common/middleware/permission.middleware";
import * as c from "./communication-config.controller";
const router = Router();
router.use(authenticate);
/**
 * @swagger
 * /api/v1/settings/smtp:
 *   get: { tags: [Settings], summary: Get the scoped SMTP configuration, security: [{ bearerAuth: [] }], responses: { 200: { description: Configuration without secrets }, 403: { description: INSUFFICIENT_PERMISSION } } }
 *   post: { tags: [Settings], summary: Create SMTP configuration, security: [{ bearerAuth: [] }], requestBody: { required: true, content: { application/json: { schema: { type: object, required: [host, port, username, password, fromEmail, fromName, encryption, isActive], properties: { password: { type: string, writeOnly: true }, encryption: { type: string, enum: [none, ssl, tls] } } } } } }, responses: { 200: { description: Created }, 400: { description: SMTP_CONFIGURATION_INVALID } } }
 *   put: { tags: [Settings], summary: Update SMTP configuration; password is write-only and optional, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Settings], summary: Delete SMTP configuration, security: [{ bearerAuth: [] }], responses: { 200: { description: Deleted } } }
 * /api/v1/settings/smtp/status:
 *   patch: { tags: [Settings], summary: Enable or disable SMTP, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /api/v1/settings/smtp/test:
 *   post: { tags: [Settings], summary: Test SMTP connection, security: [{ bearerAuth: [] }], responses: { 200: { description: Connected }, 503: { description: SMTP_CONNECTION_FAILED } } }
 * /api/v1/settings/smtp/test-email:
 *   post: { tags: [Settings], summary: Send SMTP test email, security: [{ bearerAuth: [] }], responses: { 200: { description: Sent }, 503: { description: SMTP_TEST_EMAIL_FAILED } } }
 * /api/v1/settings/whatsapp:
 *   get: { tags: [Settings], summary: Get scoped WhatsApp configuration without tokens, security: [{ bearerAuth: [] }], responses: { 200: { description: Configuration } } }
 *   post: { tags: [Settings], summary: Create WhatsApp configuration, security: [{ bearerAuth: [] }], requestBody: { required: true, content: { application/json: { schema: { type: object, properties: { accessToken: { type: string, writeOnly: true }, webhookVerifyToken: { type: string, writeOnly: true } } } } } }, responses: { 200: { description: Created } } }
 *   put: { tags: [Settings], summary: Update WhatsApp configuration, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Settings], summary: Delete WhatsApp configuration, security: [{ bearerAuth: [] }], responses: { 200: { description: Deleted } } }
 * /api/v1/settings/whatsapp/status:
 *   patch: { tags: [Settings], summary: Enable or disable WhatsApp, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 * /api/v1/settings/whatsapp/test:
 *   post: { tags: [Settings], summary: Test WhatsApp credentials, security: [{ bearerAuth: [] }], responses: { 200: { description: Connected }, 503: { description: WHATSAPP_CONNECTION_FAILED } } }
 * /api/v1/settings/whatsapp/test-message:
 *   post: { tags: [Settings], summary: Send WhatsApp test message, security: [{ bearerAuth: [] }], responses: { 200: { description: Sent }, 503: { description: WHATSAPP_TEST_MESSAGE_FAILED } } }
 */
router.get("/smtp", requirePermission("settings.smtp.view"), c.getSmtp); router.post("/smtp", requirePermission("settings.smtp.create"), c.saveSmtp); router.put("/smtp", requirePermission("settings.smtp.update"), c.saveSmtp); router.delete("/smtp", requirePermission("settings.smtp.delete"), c.deleteSmtp); router.post("/smtp/test", requirePermission("settings.smtp.test"), c.testSmtp); router.post("/smtp/test-email", requirePermission("settings.smtp.test"), c.testEmail); router.patch("/smtp/status", requirePermission("settings.smtp.update"), c.smtpStatus);
router.get("/whatsapp", requireAnyPermissionOrRoles(["settings.whatsapp.view", "whatsapp.view", "communication.whatsapp.view"]), c.getWhatsapp);
router.post("/whatsapp", requireAnyPermissionOrRoles(["settings.whatsapp.create", "whatsapp.create", "communication.whatsapp.manage"]), c.saveWhatsapp);
router.put("/whatsapp", requireAnyPermissionOrRoles(["settings.whatsapp.update", "whatsapp.edit", "communication.whatsapp.manage"]), c.saveWhatsapp);
router.delete("/whatsapp", requireAnyPermissionOrRoles(["settings.whatsapp.delete", "whatsapp.delete", "communication.whatsapp.manage"]), c.deleteWhatsapp);
router.post("/whatsapp/test", requireAnyPermissionOrRoles(["settings.whatsapp.test", "communication.whatsapp.test"]), c.testWhatsapp);
router.post("/whatsapp/test-message", requireAnyPermissionOrRoles(["settings.whatsapp.test", "communication.whatsapp.test"]), c.sendTestWhatsapp);
router.patch("/whatsapp/status", requireAnyPermissionOrRoles(["settings.whatsapp.update", "whatsapp.edit", "communication.whatsapp.manage"]), c.whatsappStatus);
export default router;
