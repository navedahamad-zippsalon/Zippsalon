import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as service from "./customer-auth.service";
import { createLoginSession } from "../tracking/tracking.service";
import logger from "../../infrastructure/logger/logger";
import { SupportedLanguage } from "../i18n/i18n.translations";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { isPureCustomerUser } from "../../common/utils/role.util";

const registrationSchema = z.object({ firstName: z.string().trim().min(2), lastName: z.string().trim().optional(), email: z.string().email(), phone: z.string().min(5), countryCode: z.string().min(1), vendorId: z.string().uuid(), branchId: z.string().uuid().optional() });
const otpRequestSchema = z.object({ identifier: z.string().trim().min(3) });
const otpVerifySchema = z.object({ identifier: z.string().trim().min(3), code: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });
const strongPasswordSchema = z.string().min(8).max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");
const initialPasswordSchema = z.object({
  password: strongPasswordSchema,
  confirmPassword: strongPasswordSchema,
}).strict().superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

const handle = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data) => res.json({ success: true, data })).catch(next);
const requestLanguages = (req: Request) => ({
  requested: (req.language as SupportedLanguage | undefined) ?? "en",
  explicit: req.explicitLanguage as SupportedLanguage | undefined,
});
export const register = handle((req) => service.register(registrationSchema.parse(req.body), requestLanguages(req).explicit ?? requestLanguages(req).requested));
export const requestEmailOtp = handle((req) => service.requestOtp("EMAIL", otpRequestSchema.parse(req.body).identifier, req.ip, requestLanguages(req).requested, requestLanguages(req).explicit));
export const requestWhatsappOtp = handle((req) => service.requestOtp("WHATSAPP", otpRequestSchema.parse(req.body).identifier, req.ip, requestLanguages(req).requested, requestLanguages(req).explicit));
const verified = (channel: "EMAIL" | "WHATSAPP") => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = otpVerifySchema.parse(req.body);
    const data = await service.verifyOtp(channel, body.identifier, body.code, body.challengeId);
    try {
      await createLoginSession(data.customer.id, data.trackingSessionId, req);
    } catch (trackingError) {
      logger.warn("tracking_customer_login_session_failed", {
        userId: data.customer.id,
        message: trackingError instanceof Error ? trackingError.message : String(trackingError),
      });
    }
    res.json({
      success: true,
      message: req.t?.("auth.customer_login_successful") ?? "Customer login successful.",
      messageKey: "auth.customer_login_successful",
      data,
    });
  } catch (error) { next(error); }
};
export const verifyEmailOtp = verified("EMAIL");
export const verifyWhatsappOtp = verified("WHATSAPP");
const publicEmailRequest = z.object({ email: z.string().trim().email() });
const publicEmailVerify = z.object({ email: z.string().trim().email(), otp: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });
const publicPhoneRequest = z.object({ phone: z.string().trim().min(5) });
const publicPhoneVerify = z.object({ phone: z.string().trim().min(5), otp: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });
const publicMessage = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data: any) => res.json({
  success: true,
  message: req.t?.("auth.otp_sent") ?? "Verification code sent successfully.",
  messageKey: "auth.otp_sent",
  data,
})).catch(next);
export const publicEmailRequestOtp = publicMessage((req) => service.requestOtp("EMAIL", publicEmailRequest.parse(req.body).email, req.ip, requestLanguages(req).requested, requestLanguages(req).explicit));
export const publicWhatsappRequestOtp = publicMessage((req) => service.requestOtp("WHATSAPP", publicPhoneRequest.parse(req.body).phone, req.ip, requestLanguages(req).requested, requestLanguages(req).explicit));
const publicVerified = (channel: "EMAIL" | "WHATSAPP", parse: (body: unknown) => { email?: string; phone?: string; otp: string; challengeId?: string }) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = parse(req.body);
    const data = await service.verifyOtp(channel, body.email ?? body.phone!, body.otp, body.challengeId);
    try {
      await createLoginSession(data.customer.id, data.trackingSessionId, req);
    } catch (trackingError) {
      logger.warn("tracking_customer_login_session_failed", {
        userId: data.customer.id,
        message: trackingError instanceof Error ? trackingError.message : String(trackingError),
      });
    }
    res.json({
      success: true,
      message: req.t?.("auth.customer_login_successful") ?? "Customer login successful.",
      messageKey: "auth.customer_login_successful",
      data,
    });
  } catch (error) { next(error); }
};
export const publicEmailVerifyOtp = publicVerified("EMAIL", publicEmailVerify.parse);
export const publicWhatsappVerifyOtp = publicVerified("WHATSAPP", publicPhoneVerify.parse);

export const setupInitialPassword = [
  authenticate,
  authorizeRoles("CUSTOMER"),
  (req: Request, res: Response, next: NextFunction) => {
    if (!isPureCustomerUser(((req as any).user?.roles ?? []) as string[])) {
      return res.status(403).json({ success: false, code: "CUSTOMER_ONLY", message: "This endpoint is only available to customer accounts." });
    }
    return handle((currentReq) => service.setupInitialPassword(
      (currentReq as any).user.userId,
      initialPasswordSchema.parse(currentReq.body).password,
    ))(req, res, next);
  },
];
