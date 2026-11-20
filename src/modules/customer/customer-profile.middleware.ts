import { NextFunction, Request, Response } from "express";
import { isPureCustomerUser } from "../../common/utils/role.util";
import { getCustomerProfileStatus } from "./customer-profile.service";

export function requireCompletedCustomerProfile(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as { userId?: string; roles?: string[] } | undefined;
  if (!user?.userId || !isPureCustomerUser(user.roles ?? [])) return next();

  void getCustomerProfileStatus(user.userId)
    .then((status) => {
      if (!status.profileCompleted) {
        return res.status(403).json({
          success: false,
          code: "PROFILE_INCOMPLETE",
          message: "Complete your customer profile before using this feature.",
          data: { profileCompleted: false, missingFields: status.missingFields },
        });
      }
      next();
    })
    .catch(next);
}

export function requireCompletedProfileExceptOnboarding(req: Request, res: Response, next: NextFunction) {
  const onboardingPath = req.path === "/me"
    || req.path === "/addresses"
    || req.path.startsWith("/addresses/");
  if (onboardingPath) return next();
  return requireCompletedCustomerProfile(req, res, next);
}
