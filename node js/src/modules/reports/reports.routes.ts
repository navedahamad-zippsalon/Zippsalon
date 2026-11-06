import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware";
import { requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { reportsQuerySchema } from "../../validators/reports";
import { reportsController } from "./reports.controller";

const router = Router();

router.get("/analytics", authenticate, requirePermissionOrRoles("reports.view", "ADMIN", "SUPER_ADMIN"), validate({ query: reportsQuerySchema }), reportsController.analytics);
router.get("/filters", authenticate, requirePermissionOrRoles("reports.view", "ADMIN", "SUPER_ADMIN"), validate({ query: reportsQuerySchema }), reportsController.filters);

export default router;
