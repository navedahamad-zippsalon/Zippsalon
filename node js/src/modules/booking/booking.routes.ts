import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authenticate, rejectCustomerAccount } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { createBookingSchema, updateBookingSchema, addPaymentSchema } from '../../validators/bookings';
import { uuidParam } from '../../validators/common';
import { requireAnyPermissionOrRoles, requirePermissionOrRoles } from '../../common/middleware/permission.middleware';

const router = Router();

router.use(authenticate, rejectCustomerAccount);

const allow = (permission: string) => requirePermissionOrRoles(permission, 'ADMIN', 'SUPER_ADMIN');

router.get('/', allow('bookings.view'), bookingController.getAllBookings);
router.get('/all', allow('bookings.view'), bookingController.getAllBookings);
router.get('/lookups/:type', requireAnyPermissionOrRoles(['bookings.create', 'bookings.edit'], 'ADMIN', 'SUPER_ADMIN'), bookingController.getBookingLookups);

/**
 * @swagger
 * /api/v1/bookings/salon/{salonId}:
 *   get:
 *     summary: Get all bookings for a salon
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: source
 *         description: Filter by the original booking source.
 *         schema:
 *           type: string
 *           enum: [APP, WEB]
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/salon/:salonId', allow('bookings.view'), bookingController.getAllBookings);

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details include medium (APP, ONLINE, or IN_SALON); ONLINE represents Web.
 */
router.get('/:id', allow('bookings.view'), validate({ params: uuidParam("id") }), bookingController.getBookingById);

/**
 * @swagger
 * /api/v1/bookings/salon/{salonId}:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
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
 *             required: [items, bookingDate]
 *             properties:
 *               customerId:
 *                 type: string
 *               customerData:
 *                 type: object
 *               staffId:
 *                 type: string
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code; discount and final amount are calculated server-side
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               payment:
 *                   type: object
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/salon/:salonId', allow('bookings.create'), validate({ params: uuidParam("salonId"), body: createBookingSchema }), bookingController.createBooking);

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   patch:
 *     summary: Update booking status or details
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Booking updated
 */
router.patch('/:id', allow('bookings.edit'), validate({ params: uuidParam("id"), body: updateBookingSchema }), bookingController.updateBooking);

/**
 * @swagger
 * /api/v1/bookings/{id}/payments:
 *   post:
 *     summary: Add a payment to a booking
 *     tags: [Bookings]
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
 *             required: [amount, method]
 *     responses:
 *       201:
 *         description: Payment recorded
 */
router.post('/:id/payments', allow('bookings.edit'), validate({ params: uuidParam("id"), body: addPaymentSchema }), bookingController.addPayment);
router.post('/:id/payments/verify-razorpay', allow('bookings.edit'), validate({ params: uuidParam("id") }), bookingController.verifyRazorpayPayment);

/**
 * @swagger
 * /api/v1/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 */
router.patch('/:id/cancel', allow('bookings.edit'), validate({ params: uuidParam("id") }), bookingController.cancelBooking);

export default router;
