import { Router } from "express";
import { register, login, forgotPasswordController, resetPasswordController, changePasswordController } from "./auth.controller";
import { authenticate } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "../../validators/auth";
import { prisma } from "../../infrastructure/database/prisma";
import { getEffectivePermissions, getMenus } from "../rbac/rbac.service";
import { currentSubscription, ensureDefaultVendorSubscription, getSubscriptionPermissionActions, subscriptionMenuIds, subscriptionOwnerIdForUser } from "../subscription/subscription.service";
import { publicEmailRequestOtp, publicEmailVerifyOtp, publicWhatsappRequestOtp, publicWhatsappVerifyOtp } from "../customer-auth/customer-auth.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               phone:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               salonName:
 *                 type: string
 *               salonType:
 *                 type: string
 *               salonImage:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post("/register", validate({ body: registerSchema }), register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", validate({ body: loginSchema }), login);
/** @swagger
 * /api/v1/auth/email/request-otp:
 *   post:
 *     summary: Request a customer email OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: OTP sent }
 *       404: { description: Customer contact not found }
 */
router.post("/email/request-otp", publicEmailRequestOtp);
/** @swagger
 * /api/v1/auth/email/verify-otp:
 *   post:
 *     summary: Verify a customer email OTP and create a session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, pattern: '^\\d{6}$' }
 *               challengeId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Customer login successful }
 *       400: { description: Invalid or expired OTP }
 */
router.post("/email/verify-otp", publicEmailVerifyOtp);
/** @swagger
 * /api/v1/auth/whatsapp/request-otp:
 *   post:
 *     summary: Request a customer WhatsApp OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string }
 *     responses:
 *       200: { description: OTP sent }
 *       404: { description: Customer contact not found }
 */
router.post("/whatsapp/request-otp", publicWhatsappRequestOtp);
/** @swagger
 * /api/v1/auth/whatsapp/verify-otp:
 *   post:
 *     summary: Verify a customer WhatsApp OTP and create a session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone: { type: string }
 *               otp: { type: string, pattern: '^\\d{6}$' }
 *               challengeId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Customer login successful }
 *       400: { description: Invalid or expired OTP }
 */
router.post("/whatsapp/verify-otp", publicWhatsappVerifyOtp);

/** @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user profile and permissions }
 *       401: { description: Unauthorized }
 */
router.get("/me", authenticate, async (req: any, res, next) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user.userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				countryCode: true,
				isActive: true,
				roles: { select: { role: { select: { id: true, name: true } } } },
				ownedSalons: {
					where: { isActive: true },
					select: { id: true, name: true, parentId: true },
				},
				staffIn: { where: { isActive: true }, select: { salonId: true } },
			},
		});
		if (!user) return res.status(401).json({ success: false, message: "Invalid user" });

		const roles = user.roles.map(({ role }) => role.name);
		const salonId = roles.includes("VENDOR") ? user.ownedSalons[0]?.id : user.staffIn[0]?.salonId;
		if (roles.includes("VENDOR")) await ensureDefaultVendorSubscription(user.id, salonId);
		const [permissions, subscription] = await Promise.all([
			getEffectivePermissions(user.id, salonId),
			roles.includes("VENDOR") ? currentSubscription(user.id) : Promise.resolve(null),
		]);
		res.status(200).json({
			success: true,
			message: "Current user fetched successfully",
			data: {
				...user,
				roles,
				role: roles[0] ?? null,
				userId: user.id,
				vendorId: roles.includes("VENDOR") ? user.id : null,
				salonId: salonId ?? null,
				onboardingRequired: roles.includes("VENDOR") && !salonId,
				permissions,
				subscription,
			},
		});
	} catch (error) {
		next(error);
	}
});

/** @swagger
 * /api/v1/auth/permissions:
 *   get:
 *     summary: Get current user permissions
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: salonId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Permission list }
 *       401: { description: Unauthorized }
 */
router.get("/permissions", authenticate, async (req: any, res, next) => {
	try {
		if (req.user.roles?.includes("VENDOR")) {
			const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId, isActive: true }, select: { id: true } });
			await ensureDefaultVendorSubscription(req.user.userId, salon?.id);
		}
		const permissions = await getEffectivePermissions(req.user.userId, req.query.salonId as string | undefined);
		res.status(200).json({ success: true, data: permissions });
	} catch (error) {
		next(error);
	}
});

/** @swagger
 * /api/v1/auth/menus:
 *   get:
 *     summary: Get the current user's navigation menus
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fetchAll
 *         schema: { type: boolean }
 *       - in: query
 *         name: sidebarOnly
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200: { description: Navigation menu tree }
 *       401: { description: Unauthorized }
 */
router.get("/menus", authenticate, async (req: any, res, next) => {
	try {
		if (req.user.roles?.includes("VENDOR")) {
			const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.userId, isActive: true }, select: { id: true } });
			await ensureDefaultVendorSubscription(req.user.userId, salon?.id);
		}
		const salonId = req.user.roles?.includes("VENDOR")
			? (await prisma.salon.findFirst({ where: { ownerId: req.user.userId, isActive: true }, select: { id: true } }))?.id
			: undefined;
		const permissions = await getEffectivePermissions(req.user.userId, salonId);
		const fetchAll = req.query.fetchAll === "true";
		if (fetchAll && !req.user.roles?.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
			return res.status(403).json({ success: false, message: "Forbidden: Access control data requires admin access" });
		}
		const userType = req.user.roles?.includes("VENDOR") ? "VENDOR" : req.user.roles?.includes("STAFF") ? "STAFF" : undefined;
		const ownerId = userType ? await subscriptionOwnerIdForUser(req.user.userId, userType, salonId ?? req.user.salonId) : undefined;
		const subscriptionPermissions = ownerId && userType ? await getSubscriptionPermissionActions(ownerId, userType) : undefined;
		const planMenuIds = ownerId && userType ? await subscriptionMenuIds(ownerId, userType) : undefined;
		const menus = await getMenus(
			req.user.roles,
			permissions,
			fetchAll,
			req.query.sidebarOnly !== "false",
			subscriptionPermissions,
			planMenuIds,
		);
		res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
		res.setHeader("Vary", "Authorization");
		res.status(200).json({ success: true, data: menus });
	} catch (error) {
		next(error);
	}
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent
 */
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), forgotPasswordController);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", validate({ body: resetPasswordSchema }), resetPasswordController);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password for logged in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/change-password", authenticate, validate({ body: changePasswordSchema }), changePasswordController);

export default router;
