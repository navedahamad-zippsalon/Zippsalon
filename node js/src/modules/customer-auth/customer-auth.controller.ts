import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as service from "./customer-auth.service";
import { createLoginSession } from "../tracking/tracking.service";
import logger from "../../infrastructure/logger/logger";

const registrationSchema = z.object({ firstName: z.string().trim().min(2), lastName: z.string().trim().optional(), email: z.string().email(), phone: z.string().min(5), countryCode: z.string().min(1), vendorId: z.string().uuid(), branchId: z.string().uuid().optional() });
const otpRequestSchema = z.object({ identifier: z.string().trim().min(3) });
const otpVerifySchema = z.object({ identifier: z.string().trim().min(3), code: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });

const handle = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data) => res.json({ success: true, data })).catch(next);
export const register = handle((req) => service.register(registrationSchema.parse(req.body)));
export const requestEmailOtp = handle((req) => service.requestOtp("EMAIL", otpRequestSchema.parse(req.body).identifier, req.ip));
export const requestWhatsappOtp = handle((req) => service.requestOtp("WHATSAPP", otpRequestSchema.parse(req.body).identifier, req.ip));
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
    res.json({ success: true, message: "Customer login successful", data });
  } catch (error) { next(error); }
};
export const verifyEmailOtp = verified("EMAIL");
export const verifyWhatsappOtp = verified("WHATSAPP");
const publicEmailRequest = z.object({ email: z.string().trim().email() });
const publicEmailVerify = z.object({ email: z.string().trim().email(), otp: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });
const publicPhoneRequest = z.object({ phone: z.string().trim().min(5) });
const publicPhoneVerify = z.object({ phone: z.string().trim().min(5), otp: z.string().regex(/^\d{6}$/), challengeId: z.string().uuid().optional() });
const publicMessage = (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req)).then((data: any) => res.json({ success: true, message: "OTP sent successfully", data })).catch(next);
export const publicEmailRequestOtp = publicMessage((req) => service.requestOtp("EMAIL", publicEmailRequest.parse(req.body).email, req.ip));
export const publicWhatsappRequestOtp = publicMessage((req) => service.requestOtp("WHATSAPP", publicPhoneRequest.parse(req.body).phone, req.ip));
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
    res.json({ success: true, message: "Customer login successful", data });
  } catch (error) { next(error); }
};
export const publicEmailVerifyOtp = publicVerified("EMAIL", publicEmailVerify.parse);
export const publicWhatsappVerifyOtp = publicVerified("WHATSAPP", publicPhoneVerify.parse);
