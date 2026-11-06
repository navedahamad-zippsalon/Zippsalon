import { Request, Response, NextFunction } from "express";
import { updateProfileService, getProfileCompletionService, updateMySalonService, getMySalonService, getMySalonsService } from "./user.service";

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const user = await updateProfileService(userId, req.body);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user
        });
    } catch (err) {
        next(err);
    }
};

export const getProfileCompletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const result = await getProfileCompletionService(userId);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const getMySalon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const salon = await getMySalonService(userId);
        res.status(200).json({
            success: true,
            data: salon
        });
    } catch (err) {
        next(err);
    }
};

export const getAllMySalons = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const salons = await getMySalonsService(userId);
        res.status(200).json({
            success: true,
            data: salons
        });
    } catch (err) {
        next(err);
    }
};

export const updateMySalon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const salon = await updateMySalonService(userId, req.body);
        res.status(200).json({
            success: true,
            message: "Salon details updated successfully",
            data: salon
        });
    } catch (err) {
        next(err);
    }
};
