import { Router } from "express";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { validate } from "../../common/middleware/validate.middleware";
import * as c from "./subscription.controller";
import { idParamSchema, planIdParamSchema, planSchema } from "./subscription.validation";

const vendor = Router();
vendor.use(authenticate, authorizeRoles(APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF, APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
/**
 * @swagger
 * /api/v1/subscriptions/my-access:
 *   get:
 *     summary: Get effective subscription permissions and image capabilities
 *     tags: [Subscriptions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: userType, schema: { type: string, enum: [VENDOR, STAFF] } }
 *     responses:
 *       200:
 *         description: Effective access and safe image capabilities. Manual image upload remains available; AI generation reflects effective RBAC, subscription, and Vendor assignment.
 *       401: { description: Unauthorized }
 */
vendor.get("/current", c.current);
vendor.get("/plans", c.plans);
vendor.get("/features", c.features);
vendor.get("/my-access", c.myAccess);
vendor.post("/change-plan", c.changeDummyPlan);
vendor.post("/checkout", c.checkout);
vendor.post("/verify-payment", c.verifyPayment);
vendor.post("/cancel", c.cancel);
vendor.get("/payments", c.payments);
vendor.get("/invoices", c.invoices);

const admin = Router();
admin.use(authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
admin.get("/dashboard", c.adminDashboard);
admin.get("/plans", c.adminPlans);
admin.post("/plans", c.adminCreatePlan);
admin.get("/plans/:id", validate({ params: idParamSchema }), c.adminGetPlan);
admin.put("/plans/:id", validate({ params: idParamSchema }), c.adminUpdatePlan);
admin.patch("/plans/:id/status", validate({ params: idParamSchema, body: planSchema.pick({ isActive: true }) }), c.adminStatus);
admin.delete("/plans/:id", validate({ params: idParamSchema }), c.adminDeletePlan);
admin.get("/features", c.adminFeatures);
admin.post("/features", c.adminCreateFeature);
admin.put("/features/:id", validate({ params: idParamSchema }), c.adminUpdateFeature);
admin.get("/subscribers", c.adminSubscribers);
/** @swagger
 * /api/v1/admin/subscriptions/subscribers/export:
 *   get:
 *     summary: Export filtered subscription subscribers as CSV
 *     tags: [Subscription Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: planId, schema: { type: string, format: uuid } }
 *       - { in: query, name: billingCycle, schema: { type: string, enum: [MONTHLY, ANNUAL] } }
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
admin.get("/subscribers/export", c.adminSubscribersExport);
admin.get("/subscribers/:id", validate({ params: idParamSchema }), c.adminSubscriber);
admin.post("/subscribers/:id/assign", validate({ params: idParamSchema }), c.adminAssign);
admin.post("/subscribers/:id/cancel", validate({ params: idParamSchema }), c.adminCancel);
admin.post("/subscribers/:id/extend", validate({ params: idParamSchema }), c.adminExtend);
admin.get("/payments", c.adminPayments);
admin.get("/invoices", c.adminInvoices);
admin.get("/audit-logs", c.adminAuditLogs);

const planEntitlements = Router();
planEntitlements.use(authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
planEntitlements.get("/:planId/access", validate({ params: planIdParamSchema }), c.adminPlanAccess);
planEntitlements.put("/:planId/access", validate({ params: planIdParamSchema }), c.adminUpdatePlanAccess);
planEntitlements.get("/:planId/menus", validate({ params: planIdParamSchema }), c.adminPlanMenus);
planEntitlements.put("/:planId/menus", validate({ params: planIdParamSchema }), c.adminUpdatePlanMenus);
planEntitlements.get("/:planId/modules", validate({ params: planIdParamSchema }), c.adminPlanModules);
planEntitlements.put("/:planId/modules", validate({ params: planIdParamSchema }), c.adminUpdatePlanModules);

export { vendor as subscriptionRoutes, admin as subscriptionAdminRoutes, planEntitlements as subscriptionPlanEntitlementRoutes };
