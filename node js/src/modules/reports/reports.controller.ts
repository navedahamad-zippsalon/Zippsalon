import { NextFunction, Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { reportsService } from "./reports.service";

export const reportsController = {
    async analytics(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json({ success: true, data: await reportsService.analytics(req.query as any, req.user!) });
        } catch (error) {
            next(error);
        }
    },
    async filters(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json({ success: true, data: await reportsService.filters(req.query as any, req.user!) });
        } catch (error) {
            next(error);
        }
    },
};