import { Router } from "express";
import { NextFunction, Response } from "express";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { AuthRequest, authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { uuidParam } from "../../validators/common";
import { getSubscriptionPermissionActions } from "../subscription/subscription.service";
import * as controller from "./user-management.controller";
import {
    createManagedUserSchema,
    managedUserStatusSchema,
    replaceUserAccessSchema,
    aiImageAccessSchema,
    replaceUserPermissionsSchema,
    replaceUserRolesSchema,
    updateManagedUserSchema,
    userListQuerySchema,
} from "./user-management.validation";

export const registerUserManagementRoutes = (router: Router, scope: "ADMIN" | "VENDOR", basePath: string) => {
    router.use(basePath, authenticate);
    if (scope === "ADMIN") {
        router.use(basePath, (req: AuthRequest, res: Response, next: NextFunction) => {
            const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
            if (roles.some((role) => [APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR].includes(role))) return next();
            return res.status(403).json({ success: false, statusCode: 403, message: "Forbidden: Insufficient permissions" });
        });
    } else {
        router.use(basePath, authorizeRoles(APP_CONSTANTS.ROLES.VENDOR));
    }

    const permission = (action: string) => requirePermissionOrRoles(
        `users.${action}`,
        ...(scope === "ADMIN" ? [APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"] : []),
    );
    const entitlement = (action: string) => async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const roles = req.user?.roles ?? [];
            if (roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) return next();
            if (roles.includes("VENDOR")) {
                const actions = await getSubscriptionPermissionActions(req.user!.userId, "VENDOR");
                if (!actions.includes(`users.${action}`)) {
                    return res.status(403).json({
                        success: false,
                        statusCode: 403,
                        code: "PERMISSION_DENIED",
                        message: "You do not have permission to perform this action.",
                    });
                }
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
    const access = (action: string) => [permission(action), entitlement(action)];

    if (scope === "ADMIN") {
        const adminOnly = authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN");
        router.get(`${basePath}/:id/ai-image-access`, adminOnly, validate({ params: uuidParam("id") }), controller.getVendorAiImageAccess);
        router.put(`${basePath}/:id/ai-image-access`, adminOnly, validate({
            params: uuidParam("id"),
            body: aiImageAccessSchema,
        }), controller.setVendorAiImageAccess);
    }

    router.get(basePath, ...access("view"), validate({ query: userListQuerySchema }), controller.listManagedUsers);
    router.post(basePath, ...access("create"), validate({ body: createManagedUserSchema }), controller.createManagedUser);
    router.get(`${basePath}/:id`, ...access("view"), validate({ params: uuidParam("id") }), controller.getManagedUser);
    router.put(`${basePath}/:id`, ...access("update"), validate({ params: uuidParam("id"), body: updateManagedUserSchema }), controller.updateManagedUser);
    router.patch(`${basePath}/:id/status`, ...access("update"), validate({
        params: uuidParam("id"),
        body: managedUserStatusSchema,
    }), controller.setManagedUserStatus);
    router.delete(`${basePath}/:id`, ...access("delete"), validate({ params: uuidParam("id") }), controller.deleteManagedUser);
    router.get(`${basePath}/:id/roles`, ...access("view"), validate({ params: uuidParam("id") }), controller.getManagedUserRoles);
    router.put(`${basePath}/:id/roles`, ...access("update"), validate({ params: uuidParam("id"), body: replaceUserRolesSchema }), controller.replaceManagedUserRoles);
    router.get(`${basePath}/:id/permissions`, ...access("view"), validate({ params: uuidParam("id") }), controller.getManagedUserPermissions);
    router.put(`${basePath}/:id/permissions`, ...access("update"), validate({ params: uuidParam("id"), body: replaceUserPermissionsSchema }), controller.replaceManagedUserPermissions);
    router.get(`${basePath}/:id/access`, ...access("view"), validate({ params: uuidParam("id") }), controller.getManagedUserAccess);
    router.put(`${basePath}/:id/access`, ...access("update"), validate({ params: uuidParam("id"), body: replaceUserAccessSchema }), controller.replaceManagedUserAccess);
};

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List users for administration
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Paginated users without password credentials } }
 *   post:
 *     summary: Create a manager, staff member, or custom-role salon user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, email, phone, countryCode, password, salonId]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string, nullable: true }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               countryCode: { type: string }
 *               password: { type: string, minLength: 8 }
 *               roleId: { type: string, format: uuid }
 *               roleName: { type: string, enum: [MANAGER, STAFF] }
 *               salonId: { type: string, format: uuid }
 *               branchIds: { type: array, items: { type: string, format: uuid } }
 *               permissions: { type: array, items: { type: string } }
 *               isActive: { type: boolean, default: true }
 *     responses: { 201: { description: Created user and salon scope } }
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a managed user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: User profile, roles, and salon membership } }
 *   put:
 *     summary: Update a managed user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: User updated } }
 *   delete:
 *     summary: Deactivate a managed user without deleting historical records
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: User deactivated } }
 * /api/v1/admin/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: User status updated } }
 * /api/v1/admin/users/{id}/roles:
 *   get: { summary: Get user roles, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: User roles } } }
 *   put: { summary: Replace user roles, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: User roles updated } } }
 * /api/v1/admin/users/{id}/permissions:
 *   get: { summary: Get effective and direct user permissions, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: User permissions } } }
 *   put: { summary: Replace direct user permissions, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: Direct user permissions updated } } }
 * /api/v1/admin/users/{id}/access:
 *   get: { summary: Get salon and branch access, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: User access scope } } }
 *   put: { summary: Replace salon and branch access, tags: [Admin], security: [{ bearerAuth: [] }], responses: { 200: { description: User access scope updated } } }
 * /api/v1/admin/users/{id}/ai-image-access:
 *   get: { summary: Get Vendor AI image access assignment, tags: [Admin], security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }], responses: { 200: { description: Explicit Vendor AI image access; disabled by default }, 403: { description: Admin role required }, 404: { description: Active Vendor not found } } }
 *   put:
 *     summary: Enable or revoke Vendor AI image access
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [enabled], properties: { enabled: { type: boolean } } }
 *     responses: { 200: { description: Vendor AI image access updated and audited }, 403: { description: Admin role required }, 404: { description: Active Vendor not found } }
 * /api/v1/vendor/users:
 *   get: { summary: List users belonging to the vendor salon, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: Scoped users } } }
 *   post:
 *     summary: Create a manager, staff member, or salon custom-role user
 *     tags: [Vendor]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, email, phone, countryCode, password, salonId]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string, nullable: true }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               countryCode: { type: string }
 *               password: { type: string, minLength: 8 }
 *               roleId: { type: string, format: uuid }
 *               roleName: { type: string, enum: [MANAGER, STAFF] }
 *               salonId: { type: string, format: uuid }
 *               branchIds: { type: array, items: { type: string, format: uuid } }
 *               permissions: { type: array, items: { type: string } }
 *               isActive: { type: boolean, default: true }
 *     responses: { 201: { description: Scoped user created } }
 * /api/v1/vendor/users/{id}:
 *   get: { summary: Get a vendor-managed user, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: Scoped user } } }
 *   put: { summary: Update a vendor-managed user, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: Scoped user updated } } }
 *   delete: { summary: Deactivate a vendor-managed user, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User deactivated } } }
 * /api/v1/vendor/users/{id}/status:
 *   patch: { summary: Activate or deactivate a vendor-managed user, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User status updated } } }
 * /api/v1/vendor/users/{id}/roles:
 *   get: { summary: Get vendor-managed user roles, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User roles } } }
 *   put: { summary: Replace vendor-managed user roles, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User roles updated } } }
 * /api/v1/vendor/users/{id}/permissions:
 *   get: { summary: Get vendor-managed user permissions, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User permissions } } }
 *   put: { summary: Replace vendor-managed user direct permissions, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User permissions updated } } }
 * /api/v1/vendor/users/{id}/access:
 *   get: { summary: Get vendor-managed user salon and branch access, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User access scope } } }
 *   put: { summary: Replace vendor-managed user salon and branch access, tags: [Vendor], security: [{ bearerAuth: [] }], responses: { 200: { description: User access scope updated } } }
 */
