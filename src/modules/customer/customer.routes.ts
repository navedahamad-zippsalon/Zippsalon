import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate, rejectCustomerAccount } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { createCustomerSchema, customerSearchQuerySchema } from '../../validators/customers';
import { idParam, uuidParam } from '../../validators/common';
import { requirePermissionOrRoles } from '../../common/middleware/permission.middleware';

const router = Router();

router.use(authenticate, rejectCustomerAccount);

const allow = (permission: string) => requirePermissionOrRoles(permission, 'ADMIN', 'SUPER_ADMIN');

router.get('/', allow('customers.view'), customerController.getAllCustomers);
router.get('/all', allow('customers.view'), customerController.getAllCustomers);

/**
 * @swagger
 * /api/v1/customers/salon/{salonId}:
 *   get:
 *     summary: Get all customers for a salon
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/salon/:salonId', allow('customers.view'), customerController.getAllCustomers);

/**
 * @swagger
 * /api/v1/customers/search:
 *   get:
 *     summary: Search for customers globally
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get('/search', allow('customers.view'), validate({ query: customerSearchQuerySchema }), customerController.searchCustomers);

/**
 * @swagger
 * /api/v1/customers/salon/{salonId}:
 *   post:
 *     summary: Create or map a customer to a salon
 *     tags: [Customers]
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
 *             required: [firstName, phone]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created/mapped
 */
router.post('/salon/:salonId', allow('customers.create'), validate({ params: uuidParam("salonId"), body: createCustomerSchema }), customerController.createCustomer);

/**
 * @swagger
 * /api/v1/customers/{id}/salon/{salonId}:
 *   get:
 *     summary: Get customer basic info by ID for a salon
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 */
router.get('/:id/salon/:salonId', allow('customers.view'), validate({ params: idParam("id") }), customerController.getCustomerById);

/**
 * @swagger
 * /api/v1/customers/{id}/salon/{salonId}/details:
 *   get:
 *     summary: Get full customer profile, booking history, and stats for a salon
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full customer profile details
 */
router.get('/:id/salon/:salonId/details', allow('customers.view'), validate({ params: idParam("id") }), customerController.getCustomerFullDetails);

export default router;
