import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser, forgotPassword, resetPassword, changePasswordService } from "./auth.service";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.validation";
import { z } from "zod";
import { createLoginSession } from "../tracking/tracking.service";
import logger from "../../infrastructure/logger/logger";

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = registerSchema.parse(req.body);
        const user = await registerUser(data);

        res.status(201).json({
            success: true,
            messageKey: "auth.registration_successful",
            message: req.t?.("auth.registration_successful") ?? "User registered successfully.",
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await loginUser(data.email, data.password);
        try {
            await createLoginSession(result.user.userId, result.trackingSessionId, req);
        } catch (trackingError) {
            logger.warn("tracking_login_session_failed", {
                userId: result.user.userId,
                message: trackingError instanceof Error ? trackingError.message : String(trackingError),
            });
        }

        res.status(200).json({
            success: true,
            messageKey: "auth.login_successful",
            message: req.t?.("auth.login_successful") ?? "Login successful.",
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const result = await forgotPassword(email);

        res.status(200).json({
            ...result,
            messageKey: "auth.password_reset_instructions_sent",
            message: req.t?.("auth.password_reset_instructions_sent") ?? result.message,
        });
    } catch (err) {
        next(err);
    }
};

export const resetPasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password } = resetPasswordSchema.parse(req.body);
        const result = await resetPassword(token, password);

        res.status(200).json({
            ...result,
            messageKey: "auth.password_reset",
            message: req.t?.("auth.password_reset") ?? result.message,
        });
    } catch (err) {
        next(err);
    }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            currentPassword: z.string().min(1),
            newPassword: z.string().min(6)
        });
        const { currentPassword, newPassword } = schema.parse(req.body);
        const userId = (req as any).user.userId;

        const result = await changePasswordService(userId, currentPassword, newPassword);
        res.status(200).json({
            ...result,
            messageKey: "auth.password_updated",
            message: req.t?.("auth.password_updated") ?? result.message,
        });
    } catch (err) {
        next(err);
    }
};