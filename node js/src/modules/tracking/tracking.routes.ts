import { Router, Request, Response, NextFunction } from "express";
import { AuthRequest, authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { getUserPermissions } from "../rbac/rbac.service";
import * as controller from "./tracking.controller";

const router = Router();

const requireTrackingPermission = (permission: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const permissions = await getUserPermissions(user.userId);
      if (!permissions.includes("tracking.view") && !permissions.includes(permission)) {
        res.status(403).json({ success: false, message: "Forbidden: Tracking permission required" });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

const admin = (permission: string) => [
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  requireTrackingPermission(permission),
];

router.post("/heartbeat", authenticate, controller.heartbeat);
router.post("/activity", authenticate, controller.activity);
router.post("/logout", authenticate, controller.logout);

router.get("/overview", ...admin("tracking.overview"), controller.overview);
router.get("/users", ...admin("tracking.activity"), controller.users);
router.get("/users/:userId", ...admin("tracking.activity"), controller.userDetail);
router.get("/sessions", ...admin("tracking.sessions"), controller.sessions);
router.get("/activity", ...admin("tracking.activity"), controller.activities);
router.get("/menu-usage", ...admin("tracking.menu_usage"), controller.menuUsage);
router.get("/customer-app", ...admin("tracking.customer_app"), controller.customerAppUsage);
router.get("/customer-app-usage", ...admin("tracking.customer_app"), controller.customerAppUsage);
router.get("/vendors", ...admin("tracking.vendor"), controller.vendors);
router.get("/vendors/:id", ...admin("tracking.vendor"), controller.vendorDetail);
router.get("/staff", ...admin("tracking.staff"), controller.staff);
router.get("/staff/:id", ...admin("tracking.staff"), controller.staffDetail);
router.get("/customers", ...admin("tracking.customer"), controller.customers);
router.get("/customers/:id", ...admin("tracking.customer"), controller.customerDetail);
router.get("/location-device", ...admin("tracking.location"), controller.locationDevice);
router.get("/analytics", ...admin("tracking.analytics"), controller.analytics);
router.get("/export", ...admin("tracking.export"), controller.exportCsv);

export default router;
