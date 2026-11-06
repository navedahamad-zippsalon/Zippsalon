import { Request, Response, NextFunction } from "express";
import { hasFeature, subscriptionOwnerIdForUser } from "./subscription.service";

export const requireFeature = (featureKey: string) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.roles?.includes("ADMIN") || user.roles?.includes("SUPER_ADMIN")) return next();
    const salonId = String(req.params.branchId ?? req.params.salonId ?? req.query.branchId ?? req.query.salonId
        ?? req.body?.branchId ?? req.body?.salonId ?? user.salonId ?? "") || undefined;
    const userType = user.roles?.includes("VENDOR") ? "VENDOR" : "STAFF";
    const ownerId = await subscriptionOwnerIdForUser(user.userId, userType, salonId);
    if (ownerId && await hasFeature(ownerId, featureKey)) return next();
    return res.status(403).json({ success: false, code: "FEATURE_NOT_AVAILABLE", message: `The ${featureKey} feature is not available on your current plan.` });
  } catch (error) { next(error); }
};
