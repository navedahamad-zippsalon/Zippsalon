import { Router } from "express";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { requirePermission, requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import * as controller from "./razorpay.controller";
import { razorpayConfigSchema } from "./razorpay.validation";

const router = Router();
router.use(authenticate);
router.use(authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
router.get("/razorpay", requirePermission("payment-gateway.view"), controller.getConfig);
router.put("/razorpay", requirePermission("payment-gateway.manage"), validate({ body: razorpayConfigSchema }), controller.updateConfig);
router.post("/razorpay/test", requirePermission("payment-gateway.manage"), controller.testConfig);

export const vendorRazorpayRouter = Router();
vendorRazorpayRouter.use(authenticate);
vendorRazorpayRouter.use(authorizeRoles(APP_CONSTANTS.ROLES.VENDOR));
vendorRazorpayRouter.get("/me/payment-gateway/razorpay", requirePermissionOrRoles("payment-gateway.view", APP_CONSTANTS.ROLES.VENDOR), controller.getVendorConfig);
vendorRazorpayRouter.put("/me/payment-gateway/razorpay", requirePermissionOrRoles("payment-gateway.manage", APP_CONSTANTS.ROLES.VENDOR), validate({ body: razorpayConfigSchema }), controller.updateVendorConfig);
vendorRazorpayRouter.post("/me/payment-gateway/razorpay/test", requirePermissionOrRoles("payment-gateway.manage", APP_CONSTANTS.ROLES.VENDOR), controller.testVendorConfig);
export default router;
