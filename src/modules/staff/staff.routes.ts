import { Router } from "express";
import multer from "multer";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { requirePermissionOrRoles, requireAnyPermissionOrRoles } from "../../common/middleware/permission.middleware";
import { 
    addStaff, 
    getAllStaff, 
    getStaffFilterOptions,
    getStaffById,
    deleteStaff,
    exportAdminStaff,
    markAttendance, 
    getMyAttendance, 
    updateStaff, 
    getSalonAttendance,
    getMyProfile,
    getMyDashboard,
    getMyAppointments,
    getMyEarnings,
    getMyCommissions,
    getMySchedule,
    getMyReviews,
    getMyPosts,
    createMyPost,
    updateMyPost,
    deleteMyPost,
    archiveMyPost,
    getMyStories,
    createMyStory,
    updateMyStory,
    deleteMyStory,
    getMyNotifications,
    getMyBankDetails,
    updateMyBankDetails,
    deleteMyBankDetails,
    generateMyBankDetailsQr,
    getMySupportFaqs,
    getMySupportTickets,
    createMySupportTicket,
    markMyNotificationRead,
    markAllMyNotificationsRead
} from "./staff.controller";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import { validate } from "../../common/middleware/validate.middleware";
import { addStaffSchema, updateStaffSchema, markAttendanceSchema, staffAttendanceQuerySchema, staffListQuerySchema } from "../../validators/staff";
import { uuidParam } from "../../validators/common";
import { staffBankDetailsSchema } from "../../validators/staff-bank-details";
import { adminBooleanStatusListQuerySchema } from "../../validators/admin";

const router = Router();
const storyUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});
const staffStoryPermissions = {
    view: requirePermissionOrRoles("feed.stories.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF),
    create: requirePermissionOrRoles("feed.stories.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF),
    update: requirePermissionOrRoles("feed.stories.update_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF),
    delete: requirePermissionOrRoles("feed.stories.delete_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF),
};

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Staff and Attendance management
 */

router.use(authenticate);

/**
 * @swagger
 * /api/v1/staff:
 *   post:
 *     summary: Add a new staff member to a salon
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *   get:
 *     summary: Get all staff members (scoped by permission)
 *     tags: [Staff]
 */
router.post("/", requirePermissionOrRoles("staff.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: addStaffSchema }), addStaff);
router.get("/", requirePermissionOrRoles("staff.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: staffListQuerySchema }), getAllStaff);
router.get("/filter-options", requirePermissionOrRoles("staff.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), getStaffFilterOptions);
router.get("/attendance", requirePermissionOrRoles("attendance.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: staffAttendanceQuerySchema }), getSalonAttendance);
/**
 * @swagger
 * /api/v1/staff/{id}:
 *   get:
 *     summary: Get a staff member with its assigned Salon and Branch
 *     tags: [Staff]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: Staff details including assigned branchId and branch } }
 */
router.get("/:id", requirePermissionOrRoles("staff.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id") }), getStaffById);
/** @swagger
 * /api/v1/staff/admin/export:
 *   get:
 *     summary: Export filtered staff as CSV
 *     tags: [Staff]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: country, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] } }
 *     responses: { 200: { description: UTF-8 CSV export, content: { text/csv: {} } } }
 */
router.get("/admin/export", authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ query: adminBooleanStatusListQuerySchema }), exportAdminStaff);

/**
 * @swagger
 * /api/v1/staff/{id}:
 *   patch:
 *     summary: Update staff member details/status
 *     tags: [Staff]
 */
router.patch("/:id", requirePermissionOrRoles("staff.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id"), body: updateStaffSchema }), updateStaff);
router.delete("/:id", requirePermissionOrRoles("staff.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ params: uuidParam("id") }), deleteStaff);

/**
 * @swagger
 * /api/v1/staff/attendance:
 *   post:
 *     summary: Mark attendance for a staff member
 *     tags: [Staff]
 *   get:
 *     summary: Get attendance for a salon
 *     tags: [Staff]
 */
router.post("/attendance", requirePermissionOrRoles("attendance.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: markAttendanceSchema }), markAttendance);

/**
 * @swagger
 * /api/v1/staff/me/attendance:
 *   get:
 *     summary: Get my own attendance records (for staff members)
 *     tags: [Staff]
 */
router.get("/me/attendance", getMyAttendance);
router.get("/me/profile", getMyProfile);
router.get("/me/dashboard", getMyDashboard);
router.get("/me/appointments", getMyAppointments);
router.get("/me/earnings", getMyEarnings);
router.get("/me/commissions", getMyCommissions);
router.get("/me/schedule", getMySchedule);
router.get("/me/reviews", getMyReviews);
router.get("/me/posts", getMyPosts);
router.post("/me/posts", createMyPost);
router.put("/me/posts/:id", updateMyPost);
router.delete("/me/posts/:id", deleteMyPost);
router.patch("/me/posts/:id/archive", archiveMyPost);
router.get("/me/stories", staffStoryPermissions.view, getMyStories);
router.post("/me/stories", staffStoryPermissions.create, storyUpload.single("media"), createMyStory);
router.put("/me/stories/:id", staffStoryPermissions.update, storyUpload.single("media"), updateMyStory);
router.delete("/me/stories/:id", staffStoryPermissions.delete, deleteMyStory);
router.get("/me/notifications", getMyNotifications);
const bankDetailsView = requirePermissionOrRoles("staff_bank_details.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF);
const bankDetailsWrite = requireAnyPermissionOrRoles(["staff_bank_details.create", "staff_bank_details.update"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF);
const bankDetailsDelete = requirePermissionOrRoles("staff_bank_details.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF);
const bankDetailsQr = requirePermissionOrRoles("staff_bank_details.qr", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.STAFF);
router.get("/me/bank-details", bankDetailsView, getMyBankDetails);
router.put("/me/bank-details", bankDetailsWrite, validate({ body: staffBankDetailsSchema }), updateMyBankDetails);
router.delete("/me/bank-details", bankDetailsDelete, deleteMyBankDetails);
router.post("/me/bank-details/qr", bankDetailsQr, generateMyBankDetailsQr);
router.get("/me/support/faqs", getMySupportFaqs);
router.get("/me/support/tickets", getMySupportTickets);
router.post("/me/support/tickets", createMySupportTicket);
router.patch("/me/notifications/:id/read", markMyNotificationRead);
router.patch("/me/notifications/read-all", markAllMyNotificationsRead);

export default router;
