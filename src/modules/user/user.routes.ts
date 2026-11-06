import { Router } from "express";
import { updateProfile, getProfileCompletion, getMySalon, updateMySalon, getAllMySalons } from "./user.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { validate } from "../../common/middleware/validate.middleware";
import { updateProfileSchema, updateMySalonSchema } from "../../validators/users";

const router = Router();

router.get("/profile/completion", authenticate, getProfileCompletion);
router.patch("/profile", authenticate, validate({ body: updateProfileSchema }), updateProfile);

router.get("/my-salon", authenticate, getMySalon);
router.get("/my-salons", authenticate, getAllMySalons);
router.patch("/my-salon", authenticate, validate({ body: updateMySalonSchema }), updateMySalon);

export default router;
