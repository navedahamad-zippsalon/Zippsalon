import { Router } from "express";
import { createSalon, createBranch, getMySalons, getSalonById, getSalonBranches, searchBranches } from "./salon.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { branchSearchQuerySchema, createSalonSchema } from "../../validators/salons";
import { adminCreateSalonSchema, salonDirectoryQuerySchema } from "../../validators/admin";
import { uuidParam } from "../../validators/common";
import { getAllSalons } from "../admin/admin.controller";
import { APP_CONSTANTS } from "../../common/constants/app.constants";

const router = Router();
export const branchDirectoryRouter = Router();
branchDirectoryRouter.get("/", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ query: branchSearchQuerySchema }), searchBranches);

/**
 * @swagger
 * tags:
 *   name: Salons
 *   description: Salon management APIs
 */

/**
 * @swagger
 * /api/v1/salons:
 *   post:
 *     summary: Create a new salon
 *     tags: [Salons]
 *     security:
 *       - bearerAuth: []
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
 *                   properties:
 *                     phone:
 *                       type: string
 *                     countryCode:
 *                       type: string
 *                     email:
 *                       type: string
 *                     isPrimary:
 *                       type: boolean
 *                     isWhatsapp:
 *                       type: boolean
 *               address:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   line2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       200:
 *         description: Salon created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticate, validate({ body: createSalonSchema }), createSalon);
router.get("/", authenticate, authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ query: salonDirectoryQuerySchema }), getAllSalons);

/**
 * @swagger
 * /api/v1/salons/{id}/branches:
 *   post:
 *     summary: Create a branch for a salon (Head office action)
 *     tags: [Salons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Head Office Salon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 description: Branch admin user details or ID
 *               salon:
 *                 type: object
 *                 description: Branch salon details
 *     responses:
 *       200:
 *         description: Branch created successfully
 */
router.post("/:id/branches", authenticate, validate({ params: uuidParam("id"), body: adminCreateSalonSchema }), createBranch);

/**
 * @swagger
 * /api/v1/salons/my:
 *   get:
 *     summary: Get my salons
 *     tags: [Salons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of salons owned by the user
 *       401:
 *         description: Unauthorized
 */
router.get("/my", authenticate, getMySalons);

router.get("/:id/branches", authenticate, validate({ params: uuidParam("id") }), getSalonBranches);

/**
 * @swagger
 * /api/v1/salons/{id}:
 *   get:
 *     summary: Get a salon by ID
 *     tags: [Salons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The salon ID
 *     responses:
 *       200:
 *         description: Salon details
 *       404:
 *         description: Salon not found
 *       500:
 *         description: Internal Server Error
 */
router.get("/:id", validate({ params: uuidParam("id") }), getSalonById);

export default router;