import { Router } from "express";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { requirePermission } from "../../common/middleware/permission.middleware";
import * as c from "./customer-api.controller";

const router = Router();
router.use(authenticate, authorizeRoles("CUSTOMER"));
/** @swagger
 * /api/v1/customer/home:
 *   get:
 *     summary: Get the customer mobile home feed
 *     tags: [Customer]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: lat, schema: { type: number } }
 *       - { in: query, name: lng, schema: { type: number } }
 *       - { in: query, name: radius, schema: { type: number } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses: { 200: { description: Customer home payload } }
 */
router.get("/home", c.home);
/** @swagger
 * /api/v1/customer/salons/{salonId}:
 *   get:
 *     summary: Get salon details for a customer
 *     tags: [Customer]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: salonId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Existing salon, services, staff, feed and customer state } }
 */
router.get("/salons/:salonId", c.salonDetails);
/** @swagger
 * /api/v1/customer/salons/{salonId}/availability:
 *   get:
 *     summary: Get available booking slots for a salon
 *     tags: [Customer]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: salonId, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: serviceIds, schema: { type: string, example: "uuid1,uuid2" } }
 *       - { in: query, name: staffId, schema: { type: string, example: ANY_AVAILABLE } }
 *       - { in: query, name: date, required: true, schema: { type: string, format: date } }
 *     responses: { 200: { description: Available time slots } }
 */
router.get("/salons/:salonId/availability", c.availability);
/** @swagger /api/v1/customer/favorites: { get: { summary: List favorite salons, tags: [Customer], security: [{ bearerAuth: [] }], responses: { 200: { description: Favorite salons } } } } */
router.get("/favorites", c.favorites);
/** @swagger /api/v1/customer/favorites/{salonId}: { post: { summary: Favorite a salon, tags: [Customer], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: salonId, required: true, schema: { type: string, format: uuid } }], responses: { 201: { description: Favorite created } } }, delete: { summary: Remove a favorite salon, tags: [Customer], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: salonId, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Favorite removed } } } } */
router.post("/favorites/:salonId", c.addFavorite);
router.delete("/favorites/:salonId", c.removeFavorite);
/** @swagger /api/v1/customer/profile/dashboard: { get: { summary: Get customer profile dashboard, tags: [Customer], security: [{ bearerAuth: [] }], responses: { 200: { description: Customer profile and booking summary } } } } */
router.get("/profile/dashboard", c.profileDashboard);
/** @swagger /api/v1/customer/coupons: { get: { summary: List coupons applicable to the selected booking context, tags: [Customer], security: [{ bearerAuth: [] }], parameters: [{ in: query, name: salonId, schema: { type: string } }, { in: query, name: branchId, schema: { type: string } }, { in: query, name: serviceId, schema: { type: string } }, { in: query, name: vendorId, schema: { type: string } }, { in: query, name: bookingAmount, schema: { type: number } }], responses: { 200: { description: Applicable coupons } } } } */
router.get("/coupons", c.customerCoupons);
/** @swagger /api/v1/customer/coupons/validate: { post: { summary: Validate and calculate a coupon for a booking, tags: [Customer], security: [{ bearerAuth: [] }], requestBody: { required: true, content: { application/json: { schema: { type: object, required: [code, salonId, amount], properties: { code: { type: string }, couponCode: { type: string }, vendorId: { type: string }, salonId: { type: string }, branchId: { type: string }, serviceIds: { type: array, items: { type: string } }, amount: { type: number }, bookingAmount: { type: number } } } } } }, responses: { 200: { description: Calculated coupon discount } } } } */
router.post("/coupons/validate", c.validateCoupon);
router.get("/salons/:salonId/reviews", c.customerReviews);
router.get("/staff/:staffId/reviews", c.customerReviews);
router.post("/reviews", c.createCustomerReview);
router.put("/reviews/:id", c.updateCustomerReview);
router.delete("/reviews/:id", c.deleteCustomerReview);
router.get("/wallet", c.customerWallet);
router.get("/wallet/transactions", c.customerWalletTransactions);
router.get("/referral", c.customerReferral);
router.get("/referral/history", c.customerReferral);
router.post("/referral", c.createCustomerReferral);
router.post("/referral/validate", c.validateCustomerReferral);
router.post("/referral/apply", c.applyCustomerReferral);
router.get("/advertisements", c.customerAdvertisements);
router.get("/addresses", c.customerAddresses);
router.post("/addresses", c.createCustomerAddress);
router.put("/addresses/:id", c.updateCustomerAddress);
router.delete("/addresses/:id", c.deleteCustomerAddress);
router.patch("/addresses/:id/default", c.defaultCustomerAddress);
/** @swagger /api/v1/customer/me: { get: { summary: Get customer profile, tags: [Customer], security: [{ bearerAuth: [] }], responses: { 200: { description: Customer profile }, 401: { description: Unauthorized }, 403: { description: Forbidden } } } } */
router.get("/me", requirePermission("customer.profile.view"), c.me);
router.put("/me", requirePermission("customer.profile.update"), c.updateMe);
router.get("/me/permissions", c.permissions);
router.get("/me/menu", c.menu);
router.get("/salons", c.salons);
router.get("/branches", c.branches);
router.get("/services", requirePermission("customer.services.view"), c.services);
router.get("/products", requirePermission("customer.products.view"), c.products);
/** @swagger /api/v1/customer/bookings: { get: { summary: List customer bookings, tags: [Customer], security: [{ bearerAuth: [] }], responses: { 200: { description: "Bookings include medium; APP is Mobile App and ONLINE is Web." } } } } */
router.get("/bookings", requirePermission("customer.bookings.view"), c.bookings);
/** @swagger /api/v1/customer/bookings: { post: { summary: Create a booking from the customer app, description: "medium is assigned server-side as APP; client-supplied values are ignored.", tags: [Customer], security: [{ bearerAuth: [] }], responses: { 201: { description: "Booking created with medium APP." } } } } */
router.post("/bookings", requirePermission("customer.bookings.create"), c.createBooking);
router.post("/bookings/:id/cancel", requirePermission("customer.bookings.cancel"), c.cancelBooking);
export default router;
