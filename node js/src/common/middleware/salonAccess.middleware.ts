import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { prisma } from "../../infrastructure/database/prisma";

export const authorizeSalonAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.userId;
        const salonId = req.params.salonId as string;

        if (!userId || !salonId) {
            return res.status(400).json({ message: "Missing data" });
        }

        // Check if user is owner
        const salon = await prisma.salon.findFirst({
            where: {
                id: salonId,
                ownerId: userId,
            },
        });

        if (salon) return next();

        // Check if user is staff
        const staff = await prisma.salonStaff.findFirst({
            where: {
                salonId,
                userId,
            },
        });

        if (staff) return next();

        return res.status(403).json({
            message: "No access to this salon",
        });
    } catch (err) {
        next(err);
    }
};