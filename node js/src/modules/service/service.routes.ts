import { Router } from "express";
import multer from "multer";
import { authenticate, authorizeRoles, rejectCustomerAccount } from "../../common/middleware/auth.middleware";
import { requireAnyPermissionOrRoles, requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { 
    createService, 
    updateService, 
    deleteService,
    getSalonServices, 
    getServices,
    getServiceDetails,
    getServiceLookups,
    createCombo, 
    getCombos, 
    updateCombo, 
    createCategory, 
    updateCategory, 
    getAllCategories 
} from "./service.controller";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { validate } from "../../common/middleware/validate.middleware";
import { 
    createCategorySchema, 
    updateCategorySchema, 
    createServiceSchema, 
    updateServiceSchema, 
    createComboSchema, 
    updateComboSchema 
} from "../../validators/services";
import { uuidOrAllParam, uuidParam } from "../../validators/common";
import { serviceLookupQuerySchema, serviceLookupTypeSchema } from "../../validators/services";

const router = Router();
const serviceImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
            callback(null, true);
            return;
        }
        callback(Object.assign(new Error("Service images must be JPEG, PNG, WEBP, or GIF files"), {
            status: 400,
            code: "INVALID_SERVICE_IMAGE",
        }));
    },
});

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Salon services and combos management
 */

router.use(authenticate, rejectCustomerAccount);

// --- Categories (Admin Only for mutation) ---
router.post("/categories", requirePermissionOrRoles("categories.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: createCategorySchema }), createCategory);
router.patch("/categories/:id", requirePermissionOrRoles("categories.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: updateCategorySchema }), updateCategory);
router.get("/categories", requirePermissionOrRoles("categories.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), getAllCategories);

// --- Services ---
router.get("/", requirePermissionOrRoles("services.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), getServices);
router.get("/lookups/:type", requireAnyPermissionOrRoles(["services.create", "services.edit"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: serviceLookupTypeSchema, query: serviceLookupQuerySchema }), getServiceLookups);
router.post("/salon/:salonId", requirePermissionOrRoles("services.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("salonId") }), serviceImageUpload.single("image"), validate({ body: createServiceSchema }), createService);
router.get("/salon/:salonId", requirePermissionOrRoles("services.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidOrAllParam("salonId") }), getSalonServices);
router.get("/:id", requirePermissionOrRoles("services.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id") }), getServiceDetails);
router.patch("/:id", requirePermissionOrRoles("services.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id") }), serviceImageUpload.single("image"), validate({ body: updateServiceSchema }), updateService);
router.delete("/:id", requirePermissionOrRoles("services.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id") }), deleteService);

// --- Combos ---
router.post("/salon/:salonId/combos", requirePermissionOrRoles("services.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("salonId") }), serviceImageUpload.single("image"), validate({ body: createComboSchema }), createCombo);
router.get("/salon/:salonId/combos", requirePermissionOrRoles("services.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidOrAllParam("salonId") }), getCombos);
router.patch("/combos/:id", requirePermissionOrRoles("services.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id") }), serviceImageUpload.single("image"), validate({ body: updateComboSchema }), updateCombo);

export default router;
