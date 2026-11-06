import { Router } from "express";
import { gstController } from "./gst.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { updateGSTConfigSchema } from "../../validators/gst";
import { uuidParam } from "../../validators/common";

const router = Router();
const allowBookingView = requirePermissionOrRoles("bookings.view", "ADMIN", "SUPER_ADMIN");

router.use(authenticate);

/**
 * @swagger
 * /api/v1/gst/config/{salonId}:
 *   get:
 *     summary: Get GST configuration for a salon
 *     tags: [GST]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GST configuration
 */
router.get("/config/:salonId", validate({ params: uuidParam("salonId") }), gstController.getGSTConfig);

/**
 * @swagger
 * /api/v1/gst/config/{salonId}:
 *   put:
 *     summary: Update GST configuration (Admin only)
 *     tags: [GST]
 *     parameters:
 *       - in: path
 *         name: salonId
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
 *               cgstRate:
 *                 type: number
 *                 description: Central GST rate (0-100)
 *               sgstRate:
 *                 type: number
 *                 description: State GST rate (0-100)
 *               igstRate:
 *                 type: number
 *                 description: Integrated GST rate (0-100)
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated GST configuration
 */
router.put(
  "/config/:salonId",
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  validate({ params: uuidParam("salonId"), body: updateGSTConfigSchema }),
  gstController.updateGSTConfig
);

/**
 * @swagger
 * /api/v1/gst/booking/{bookingId}:
 *   get:
 *     summary: Get booking with GST details
 *     tags: [GST]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking with GST details
 */
router.get("/booking/:bookingId", allowBookingView, validate({ params: uuidParam("bookingId") }), gstController.getBookingWithGST);

/**
 * @swagger
 * /api/v1/gst/print/{bookingId}:
 *   get:
 *     summary: Get printable invoice with GST details
 *     tags: [GST]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice data with GST breakdown
 */
router.get("/print/:bookingId", allowBookingView, validate({ params: uuidParam("bookingId") }), gstController.getPrintInvoice);

export default router;
