import { Router } from "express";
import * as controller from "./customer-auth.controller";

const router = Router();
/** @swagger
 * /api/v1/customer/auth/register:
 *   post:
 *     summary: Register a customer and request OTP
 *     tags: [Customer Authentication]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [firstName, email, phone, countryCode, vendorId], properties: { firstName: { type: string }, email: { type: string, format: email }, phone: { type: string }, countryCode: { type: string }, vendorId: { type: string, format: uuid }, branchId: { type: string, format: uuid } } } } } }
 *     responses: { 200: { description: OTP requested }, 400: { description: Validation error }, 409: { description: Existing customer } }
 */
router.post("/register", controller.register);
/**
 * @swagger
 * /api/v1/customer/auth/otp/email/request:
 *   post:
 *     summary: Request a customer email OTP
 *     tags: [Customer Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier: { type: string, format: email }
 *     responses:
 *       200: { description: OTP requested; includes challengeId and expiresInSeconds }
 *       404: { description: Customer account not found }
 *       429: { description: OTP request rate limit reached }
 */
router.post("/otp/email/request", controller.requestEmailOtp);
/**
 * @swagger
 * /api/v1/customer/auth/otp/email/verify:
 *   post:
 *     summary: Verify a customer email OTP
 *     tags: [Customer Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, code]
 *             properties:
 *               identifier: { type: string, format: email }
 *               code: { type: string, pattern: '^\d{6}$' }
 *               challengeId: { type: string, format: uuid }
 *     responses:
 *       200: { description: JWT session and customer status including profileCompleted, passwordConfigured, and missingFields }
 *       400: { description: Invalid, expired, or exhausted OTP challenge }
 */
router.post("/otp/email/verify", controller.verifyEmailOtp);
/**
 * @swagger
 * /api/v1/customer/auth/otp/whatsapp/request:
 *   post:
 *     summary: Request a customer WhatsApp OTP
 *     tags: [Customer Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier: { type: string, description: Customer phone number }
 *     responses:
 *       200: { description: OTP requested; includes challengeId and expiresInSeconds }
 *       404: { description: Customer account not found }
 *       429: { description: OTP request rate limit reached }
 */
router.post("/otp/whatsapp/request", controller.requestWhatsappOtp);
/**
 * @swagger
 * /api/v1/customer/auth/otp/whatsapp/verify:
 *   post:
 *     summary: Verify a customer WhatsApp OTP
 *     tags: [Customer Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, code]
 *             properties:
 *               identifier: { type: string, description: Customer phone number }
 *               code: { type: string, pattern: '^\d{6}$' }
 *               challengeId: { type: string, format: uuid }
 *     responses:
 *       200: { description: JWT session and customer status including profileCompleted, passwordConfigured, and missingFields }
 *       400: { description: Invalid, expired, or exhausted OTP challenge }
 */
router.post("/otp/whatsapp/verify", controller.verifyWhatsappOtp);
/** @swagger /api/v1/customer/auth/setup-password: { post: { summary: Configure the initial password for an authenticated customer account, description: "Requires a customer JWT. May only be used when the account has no configured password; it never replaces an existing password.", tags: [Customer Authentication], security: [{ bearerAuth: [] }], requestBody: { required: true, content: { application/json: { schema: { type: object, required: [password, confirmPassword], properties: { password: { type: string, minLength: 8, maxLength: 128, format: password, description: "Must contain lowercase, uppercase, numeric, and symbol characters." }, confirmPassword: { type: string, format: password } } } } } }, responses: { 200: { description: "Initial password configured" }, 400: { description: "Weak password or password confirmation mismatch" }, 401: { description: "Authentication required" }, 403: { description: "Customer account required" }, 409: { description: "Password is already configured" } } } } */
router.post("/setup-password", ...controller.setupInitialPassword);
export default router;
