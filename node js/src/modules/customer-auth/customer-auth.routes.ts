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
/** @swagger /api/v1/customer/auth/otp/email/request: { post: { summary: Request customer email OTP, tags: [Customer Authentication], responses: { 200: { description: OTP requested }, 429: { description: Rate limited } } } } */
router.post("/otp/email/request", controller.requestEmailOtp);
/** @swagger /api/v1/customer/auth/otp/email/verify: { post: { summary: Verify customer email OTP, tags: [Customer Authentication], responses: { 200: { description: Customer JWT }, 400: { description: Invalid OTP } } } } */
router.post("/otp/email/verify", controller.verifyEmailOtp);
/** @swagger /api/v1/customer/auth/otp/whatsapp/request: { post: { summary: Request customer WhatsApp OTP, tags: [Customer Authentication], responses: { 200: { description: OTP requested }, 429: { description: Rate limited } } } } */
router.post("/otp/whatsapp/request", controller.requestWhatsappOtp);
/** @swagger /api/v1/customer/auth/otp/whatsapp/verify: { post: { summary: Verify customer WhatsApp OTP, tags: [Customer Authentication], responses: { 200: { description: Customer JWT }, 400: { description: Invalid OTP } } } } */
router.post("/otp/whatsapp/verify", controller.verifyWhatsappOtp);
export default router;
