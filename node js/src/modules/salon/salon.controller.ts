import { Request, Response, NextFunction } from "express";
import { createSalonService, createBranchService, getMySalonsService, getSalonByIdService, getSalonBranchesService, searchBranchesService } from "./salon.service";
import { createSalonSchema } from "./salon.validation";
import { adminCreateSalonSchema } from "../admin/admin.validation";
import { AuthRequest } from "../../common/middleware/auth.middleware";

interface GetSalonParams {
    id: string;
}

export const createSalon = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const data = createSalonSchema.parse(req.body);

        const salon = await createSalonService(req.user!.userId, data);

        res.status(201).json({
            success: true,
            message: "Salon created successfully",
            data: salon,
        });
    } catch (err) {
        next(err);
    }
};

export const getMySalons = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const salons = await getMySalonsService(req.user!.userId);

        res.status(200).json({
            success: true,
            message: "Salons fetched successfully",
            data: salons
        });
    } catch (err) {
        next(err);
    }
};

export const createBranch = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const data = adminCreateSalonSchema.parse(req.body);
        const branch = await createBranchService(req.params.id as string, data, req.user);

        res.status(201).json({ 
            success: true,
            message: "Branch created successfully", 
            data: branch 
        });
    } catch (err) {
        next(err);
    }
};


export const getSalonById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const salon = await getSalonByIdService(req.params.id as string);
        res.status(200).json({
            success: true,
            message: "Salon fetched successfully",
            data: salon
        });
    } catch (err) {
        next(err);
    }
};

export const getSalonBranches = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const branches = await getSalonBranchesService(String(req.params.id));
        res.status(200).json({ success: true, data: branches });
    } catch (err) {
        next(err);
    }
};

export const searchBranches = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await searchBranchesService(req.query as {
            salonId?: string;
            vendorId?: string;
            search?: string;
            page?: number;
            limit?: number;
        }, req.user!);
        res.status(200).json({ success: true, data: result.branches, pagination: result.pagination });
    } catch (err) {
        next(err);
    }
};
