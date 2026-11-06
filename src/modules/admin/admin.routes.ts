import { Router } from "express";
import { adminCreateSalon, getAllSalons, getSalonById, updateSalon, deleteSalon, exportSalons, adminCustomers, exportCustomers, adminBookings, exportBookings, adminServices, exportServices, importDemoData } from "./admin.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { requireAnyPermissionOrRoles, requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { feedAdminRouter } from "../feed/feed.routes";
import { validate } from "../../common/middleware/validate.middleware";
import { adminCreateSalonSchema, adminSalonFilterQuerySchema, adminBooleanStatusListQuerySchema, adminBookingListQuerySchema } from "../../validators/admin";
import { updateSalonSchema } from "../../validators/salons";
import { uuidParam } from "../../validators/common";
import * as commerce from "../customer/customer-commerce.service";
import { advertisementQuerySchema, advertisementSchema, advertisementStatusSchema, reorderAdvertisementsSchema, updateAdvertisementSchema } from "../../validators/advertisements";
import { registerUserManagementRoutes } from "../user-management/user-management.routes";

const router = Router();
registerUserManagementRoutes(router, "ADMIN", "/users");
/** @swagger
 * /api/v1/admin/coupons:
 *   get: { summary: List admin coupons, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: Coupon list } } }
 *   post: { summary: Create an admin coupon, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 201: { description: Coupon created } } }
 * /api/v1/admin/coupons/{id}:
 *   put: { summary: Update an admin coupon, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon updated } } }
 *   delete: { summary: Archive an admin coupon, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon archived } } }
 * /api/v1/admin/coupons/{id}/status:
 *   patch: { summary: Activate or deactivate an admin coupon, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Coupon status updated } } }
 * /api/v1/admin/advertisements:
 *   get: { summary: List admin advertisements, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: Advertisement list } } }
 *   post:
 *     summary: Create an advertisement
 *     description: Calendar durations are calculated in UTC; month/year arithmetic clamps to the target month's last day (for example, January 31 plus one month becomes February 28 or 29).
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetingMode: { type: string, enum: [ALL, PINCODE], default: ALL }
 *               pincodes: { type: array, items: { type: string, pattern: '^[0-9]{6}$' } }
 *               durationValue: { type: integer, minimum: 1 }
 *               durationUnit: { type: string, enum: [DAYS, MONTHS, YEARS] }
 *               startAt: { type: string, format: date-time }
 *     responses: { 201: { description: Advertisement created } }
 * /api/v1/admin/advertisements/{id}:
 *   put: { summary: Update an advertisement (including pincode targeting and duration), tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Advertisement updated } } }
 *   delete: { summary: Archive an advertisement, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Advertisement archived } } }
 * /api/v1/admin/advertisements/{id}/status:
 *   patch: { summary: Change advertisement status, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Advertisement status updated } } }
 */
router.get("/coupons", authenticate, requireAnyPermissionOrRoles(["coupons.view", "coupons.manage"]), async (req: any, res, next) => { try { res.json({ success: true, data: await commerce.listOwnedCoupons(undefined, "ADMIN", req.query) }); } catch (e) { next(e); } });
router.post("/coupons", authenticate, requireAnyPermissionOrRoles(["coupons.create", "coupons.manage"]), async (req: any, res, next) => { try { res.status(201).json({ success: true, data: await commerce.saveCoupon(req.user.userId, "ADMIN", req.body) }); } catch (e) { next(e); } });
router.put("/coupons/:id", authenticate, requireAnyPermissionOrRoles(["coupons.update", "coupons.manage"]), async (req: any, res, next) => { try { res.json({ success: true, data: await commerce.saveCoupon(req.user.userId, "ADMIN", req.body, String(req.params.id)) }); } catch (e) { next(e); } });
router.patch("/coupons/:id/status", authenticate, requireAnyPermissionOrRoles(["coupons.status", "coupons.manage"]), async (req: any, res, next) => { try { const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : req.body.status === "ACTIVE"; res.json({ success: true, data: await commerce.setCouponStatus(req.user.userId, String(req.params.id), isActive, "ADMIN") }); } catch (e) { next(e); } });
router.delete("/coupons/:id", authenticate, requireAnyPermissionOrRoles(["coupons.delete", "coupons.manage"]), async (req: any, res, next) => { try { res.json({ success: true, data: await commerce.deleteCoupon(req.user.userId, String(req.params.id), "ADMIN") }); } catch (e) { next(e); } });
router.get("/advertisements", authenticate, requireAnyPermissionOrRoles(["advertisement.view"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: advertisementQuerySchema }), async (req: any, res, next) => { try { const result = await commerce.listOwnedAdvertisements(req.user.userId, req.query); res.json({ success: true, data: result.items, pagination: result.pagination, meta: result.pagination }); } catch (e) { next(e); } });
router.get("/advertisements/:id", authenticate, requireAnyPermissionOrRoles(["advertisement.view"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), async (req: any, res, next) => { try { res.json({ success: true, data: await commerce.getAdvertisement(String(req.params.id)) }); } catch (e) { next(e); } });
router.post("/advertisements", authenticate, requireAnyPermissionOrRoles(["advertisement.create"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: advertisementSchema }), async (req: any, res, next) => { try { res.status(201).json({ success: true, message: "Advertisement created successfully", data: await commerce.saveAdvertisement(req.user.userId, req.body) }); } catch (e) { next(e); } });
router.put("/advertisements/reorder", authenticate, requireAnyPermissionOrRoles(["advertisement.reorder"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: reorderAdvertisementsSchema }), async (req: any, res, next) => { try { res.json({ success: true, message: "Advertisements reordered successfully", data: await commerce.reorderAdvertisements(req.user.userId, req.body.items) }); } catch (e) { next(e); } });
router.put("/advertisements/:id", authenticate, requireAnyPermissionOrRoles(["advertisement.update"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: updateAdvertisementSchema }), async (req: any, res, next) => { try { res.json({ success: true, message: "Advertisement updated successfully", data: await commerce.saveAdvertisement(req.user.userId, req.body, String(req.params.id)) }); } catch (e) { next(e); } });
router.patch("/advertisements/:id/status", authenticate, requireAnyPermissionOrRoles(["advertisement.status"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: advertisementStatusSchema }), async (req: any, res, next) => { try { res.json({ success: true, message: "Advertisement status updated successfully", data: await commerce.setAdvertisementStatus(req.user.userId, String(req.params.id), req.body.status) }); } catch (e) { next(e); } });
router.delete("/advertisements/:id", authenticate, requireAnyPermissionOrRoles(["advertisement.delete"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), async (req: any, res, next) => { try { res.json({ success: true, message: "Advertisement deleted successfully", data: await commerce.deleteAdvertisement(req.user.userId, String(req.params.id)) }); } catch (e) { next(e); } });
router.use("/feed", feedAdminRouter);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations
 */

/**
 * @swagger
 * /api/v1/admin/salons:
 *   get:
 *     summary: Admin gets all salons paginated
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by Head Office ID
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [only_head_offices, only_branches]
 *         description: Filter by salon type
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] } }
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/salons", authenticate, requirePermissionOrRoles("branch.view", "ADMIN", "SUPER_ADMIN"), validate({ query: adminSalonFilterQuerySchema }), getAllSalons);
/** @swagger
 * /api/v1/admin/salons/export:
 *   get:
 *     summary: Export filtered salons as CSV
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] } }
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
router.get("/salons/export", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminSalonFilterQuerySchema }), exportSalons);
/**
 * @swagger
 * /api/v1/admin/customers:
 *   get:
 *     summary: Filtered Admin customer list
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: Filtered paginated customers } }
 */
router.get("/customers", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminBooleanStatusListQuerySchema }), adminCustomers);
/** @swagger
 * /api/v1/admin/customers/export:
 *   get:
 *     summary: Export filtered Admin customers as CSV
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
router.get("/customers/export", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminBooleanStatusListQuerySchema }), exportCustomers);
/** @swagger
 * /api/v1/admin/bookings:
 *   get:
 *     summary: Filtered Admin booking list
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, CONFIRMED, CHECKED_IN, DONE, CANCELLED, NO_SHOW] } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date-time } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date-time } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: Filtered paginated bookings } }
 */
router.get("/bookings", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminBookingListQuerySchema }), adminBookings);
/** @swagger
 * /api/v1/admin/bookings/export:
 *   get:
 *     summary: Export bookings using the same filters as the booking list
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
router.get("/bookings/export", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminBookingListQuerySchema }), exportBookings);
/** @swagger
 * /api/v1/admin/services:
 *   get:
 *     summary: Filtered Admin service list
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: Filtered paginated services } }
 */
router.get("/services", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ query: adminBooleanStatusListQuerySchema }), adminServices);
/** @swagger
 * /api/v1/admin/services/export:
 *   get:
 *     summary: Export services using the same filters as the service list
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
router.get("/services/export", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ query: adminBooleanStatusListQuerySchema }), exportServices);

/**
 * @swagger
 * /api/v1/admin/salons:
 *   post:
 *     summary: Admin creates a salon (and optionally a user)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Optional user ID if assigning to existing user
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   countryCode:
 *                     type: string
 *                   password:
 *                     type: string
 *               salon:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   avgPrice:
 *                     type: number
 *                   avgWaitTime:
 *                     type: number
 *                   timings:
 *                     type: object
 *                   isActive:
 *                     type: boolean
 *                   contacts:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         phone:
 *                           type: string
 *                         countryCode:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isPrimary:
 *                           type: boolean
 *                         isWhatsapp:
 *                           type: boolean
 *                   address:
 *                     type: object
 *                     properties:
 *                       line1:
 *                         type: string
 *                       line2:
 *                         type: string
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       pincode:
 *                         type: string
 *                       country:
 *                         type: string
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
router.post("/salons", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ body: adminCreateSalonSchema }), adminCreateSalon);

/**
 * @swagger
 * /api/v1/admin/salons/{id}:
 *   get:
 *     summary: Admin gets a salon by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *   put:
 *     summary: Admin updates a salon
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avgPrice:
 *                 type: number
 *               avgWaitTime:
 *                 type: number
 *               timings:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: object
 *               address:
 *                 type: object
 *     responses:
 *       200:
 *         description: Success
 *   delete:
 *     summary: Admin deletes a salon
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/salons/:id", authenticate, requirePermissionOrRoles("branch.view", "ADMIN", "SUPER_ADMIN"), validate({ params: uuidParam("id") }), getSalonById);
router.put("/salons/:id", authenticate, requirePermissionOrRoles("branch.edit", "ADMIN", "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: updateSalonSchema }), updateSalon);
router.delete("/salons/:id", authenticate, requirePermissionOrRoles("branch.delete", "ADMIN", "SUPER_ADMIN"), validate({ params: uuidParam("id") }), deleteSalon);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users for admin dropdown
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.post("/demo-data/import", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), importDemoData);

export default router;
