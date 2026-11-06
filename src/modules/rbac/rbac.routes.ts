import { Router } from "express";
import { z } from "zod";
import * as rbacController from "./rbac.controller";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { validate } from "../../common/middleware/validate.middleware";
import { 
    createMenuSchema, 
    updateMenuSchema, 
    reorderMenusSchema, 
    toggleRolePermissionSchema, 
    replaceRolePermissionsSchema,
    createStaffRoleSchema, 
    updateStaffRoleSchema,
    systemRoleSchema,
    systemRoleUpdateSchema
} from "../../validators/rbac";
import { uuidParam, idParam } from "../../validators/common";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: RBAC
 *   description: Role-Based Access Control APIs
 */

/**
 * @swagger
 * /api/v1/rbac/menus:
 *   get:
 *     summary: Get sidebar menus for the authenticated user
 *     description: Returns the existing menu tree filtered by effective role permissions, menu audience, and, for vendors and staff, active subscription entitlements such as payment_wallet. Payment & Wallet is returned only when at least one permitted child is visible. Admin-only and Vendor-only menu entries are restricted to their respective audiences. Menu permission metadata is returned in menuPermissions.
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sidebarOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Exclude menus hidden from the sidebar when true.
 *       - in: query
 *         name: fetchAll
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return the full menu tree for admin access-control management; restricted to admins.
 *     responses:
 *       200:
 *         description: Authenticated, permission-filtered menu tree
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RbacMenusResponse'
 *       401:
 *         description: Missing or invalid authentication
 *       403:
 *         description: fetchAll requires administrator access
 *   post:
 *     summary: Create a new menu
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               path:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Menu created successfully
 */
router.get("/menus", rbacController.getSidebarMenus);
router.post("/menus", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ body: createMenuSchema }), rbacController.createMenu);
router.put("/menus/reorder", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ body: reorderMenusSchema }), rbacController.reorderMenus);
router.put("/menus/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ params: uuidParam("id"), body: updateMenuSchema }), rbacController.updateMenu);
router.delete("/menus/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ params: uuidParam("id") }), rbacController.deleteMenu);

/**
 * @swagger
 * /api/v1/rbac/permissions/me:
 *   get:
 *     summary: Get permissions for the authenticated user
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: salonId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permissions fetched successfully
 */
router.get("/permissions/me", rbacController.getMyPermissions);
router.get("/me", rbacController.getMyAccessControl);

/**
 * @swagger
 * /api/v1/rbac/permissions:
 *   get:
 *     summary: Get all available permissions
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All permissions fetched successfully
 */
router.get("/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), rbacController.getAllPermissions);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}/permissions:
 *   get:
 *     summary: Get permissions for a specific role (system or staff)
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID or system role name (e.g. ADMIN, VENDOR)
 *     responses:
 *       200:
 *         description: Role permissions fetched successfully
 */
router.get("/roles/:id/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ params: idParam("id") }), rbacController.getRolePermissions);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}/permissions/toggle:
 *   post:
 *     summary: Toggle a permission for a specific role
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID or system role name (e.g. ADMIN, VENDOR)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role permission toggled successfully
 */
router.post("/roles/:id/permissions/toggle", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ params: idParam("id"), body: toggleRolePermissionSchema }), rbacController.toggleRolePermission);
router.put("/roles/:id/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN), validate({ params: idParam("id"), body: replaceRolePermissionsSchema }), rbacController.replaceRolePermissions);

/**
 * @swagger
 * /api/v1/rbac/staff-roles:
 *   post:
 *     summary: Create a new staff role
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               salonId:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Staff role created successfully
 *   get:
 *     summary: Get all staff roles
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: salonId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff roles fetched successfully
 */
router.post("/staff-roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.VENDOR), validate({ body: createStaffRoleSchema }), rbacController.createStaffRole);
router.get("/staff-roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.VENDOR), rbacController.getStaffRoles);

/**
 * @swagger
 * /api/v1/rbac/staff-roles/{id}:
 *   put:
 *     summary: Update a staff role
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Staff role updated successfully
 *   delete:
 *     summary: Delete a staff role
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff role deleted successfully
 */
router.put("/staff-roles/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id"), body: updateStaffRoleSchema }), rbacController.updateStaffRole);
router.delete("/staff-roles/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.VENDOR), validate({ params: uuidParam("id") }), rbacController.deleteStaffRole);

router.get("/plans/:planId/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("planId") }), rbacController.getPlanPermissions);
router.put("/plans/:planId/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("planId"), body: replaceRolePermissionsSchema }), rbacController.updatePlanPermissions);
/**
 * @swagger
 * /api/v1/rbac/me:
 *   get:
 *     summary: Get the authenticated user's effective access matrix
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Role and permission matrix } }
 * /api/v1/rbac/roles:
 *   get:
 *     summary: List system roles
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Roles and assigned permissions } }
 *   post:
 *     summary: Create a custom system role
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, subscriptionPlanId]
 *             properties:
 *               name: { type: string }
 *               subscriptionPlanId: { type: string, format: uuid }
 *               permissions: { type: array, items: { type: string } }
 *               isActive: { type: boolean }
 *     responses: { 201: { description: Role created } }
 * /api/v1/rbac/roles/{id}:
 *   get:
 *     summary: Get a role's permissions
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Role permissions } }
 *   put:
 *     summary: Update a custom system role
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Role updated } }
 *   delete:
 *     summary: Deactivate a custom system role
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Role deactivated } }
 * /api/v1/rbac/roles/{id}/clone:
 *   post:
 *     summary: Clone a plan-bound role
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: Role cloned } }
 * /api/v1/rbac/plans/{planId}/permissions:
 *   get:
 *     summary: List permissions for a subscription plan
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: planId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Plan permissions } }
 *   put:
 *     summary: Replace subscription plan permissions
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: planId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Plan permissions updated } }
 * /api/v1/rbac/vendors/{vendorId}/role:
 *   get:
 *     summary: Get the vendor's plan-bound role
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: vendorId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Vendor role } }
 *   put:
 *     summary: Assign a plan-compatible role to a vendor
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: vendorId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Vendor role assigned } }
 * /api/v1/rbac/vendors/{vendorId}/roles:
 *   get:
 *     summary: List roles available under the vendor's active subscription
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: vendorId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Vendor roles } }
 */
router.get("/roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), rbacController.listSystemRoles);
router.post("/roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: systemRoleSchema }), rbacController.createSystemRole);
router.get("/roles/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id") }), rbacController.getRolePermissions);
router.put("/roles/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: systemRoleUpdateSchema }), rbacController.updateSystemRole);
router.delete("/roles/:id", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id") }), rbacController.deleteSystemRole);
router.post("/roles/:id/clone", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: systemRoleSchema.pick({ name: true }) }), rbacController.cloneSystemRole);
router.get("/roles/:id/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id") }), rbacController.getSystemRolePermissions);
router.put("/roles/:id/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: replaceRolePermissionsSchema }), rbacController.updateSystemRolePermissions);
router.put("/vendors/:vendorId/role", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("vendorId"), body: z.object({ roleId: z.string().uuid() }) }), rbacController.assignVendorRole);
router.get("/vendors/:vendorId/roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("vendorId") }), rbacController.getVendorRoles);
router.get("/vendors/:vendorId/role", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("vendorId") }), rbacController.getVendorRole);

export const accessControlRouter = Router();
accessControlRouter.use(authenticate);
/**
 * @swagger
 * /api/v1/access-control/me:
 *   get:
 *     summary: Get effective subscription-aware permissions
 *     tags: [RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Effective permissions }
 *       401: { description: Unauthorized }
 */
accessControlRouter.get("/me", rbacController.getMyAccessControl);
/** @swagger /api/v1/access-control/my-permissions: { get: { summary: Get current user permissions, tags: [RBAC], security: [{ bearerAuth: [] }], responses: { 200: { description: Permissions } } } } */
accessControlRouter.get("/my-permissions", rbacController.getMyPermissions);
/** @swagger /api/v1/access-control/my-menu: { get: { summary: Get current user effective menu, tags: [RBAC], security: [{ bearerAuth: [] }], responses: { 200: { description: Authorized menu tree } } } } */
accessControlRouter.get("/my-menu", rbacController.getMyMenu);
/** @swagger /api/v1/access-control/permissions: { get: { summary: List permissions, tags: [RBAC], security: [{ bearerAuth: [] }], responses: { 200: { description: Permission list } } } } */
accessControlRouter.get("/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), rbacController.getAllPermissions);
/** @swagger /api/v1/access-control/permissions/tree: { get: { summary: Get permission tree, tags: [RBAC], security: [{ bearerAuth: [] }], responses: { 200: { description: Permission tree } } } } */
accessControlRouter.get("/roles", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), rbacController.listSystemRoles);
accessControlRouter.get("/permissions/tree", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), rbacController.getPermissionTree);
accessControlRouter.get("/permission-tree", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), rbacController.getPermissionTree);
accessControlRouter.get("/plans/:planId/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("planId") }), rbacController.getPlanPermissions);
accessControlRouter.put("/plans/:planId/permissions", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("planId"), body: replaceRolePermissionsSchema }), rbacController.updatePlanPermissions);

export default router;
