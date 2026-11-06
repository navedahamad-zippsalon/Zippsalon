import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { prisma } from "../../infrastructure/database/prisma";
import { authenticate, authorizeRoles } from "../../common/middleware/auth.middleware";
import { APP_CONSTANTS } from "../../common/constants/app.constants";
import * as c from "./feed.controller";
import { requireAnyPermissionOrRoles, requirePermissionOrRoles } from "../../common/middleware/permission.middleware";
import { adminPostUpdateSchema, adminStoryUpdateSchema, feedAdminQuerySchema, feedFilterQuerySchema } from "./feed.validation";
import { validate } from "../../common/middleware/validate.middleware";
import { requireFeature } from "../subscription/entitlement.middleware";

const router = Router();
const contentAuthorizer = authorizeRoles(APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF, APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN");
const admin = authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN");
const uploadDir = path.join(process.cwd(), "public", "uploads", "feed");
fs.mkdirSync(uploadDir, { recursive: true });
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov"]);
const extensionForMime = (mime: string) => ({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
}[mime] || "");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const knownMime = imageTypes.has(file.mimetype) || videoTypes.has(file.mimetype);
    const genericMime = !file.mimetype || file.mimetype === "application/octet-stream";
    if (knownMime || (genericMime && (imageExtensions.has(extension) || videoExtensions.has(extension)))) {
      return cb(null, true);
    }
    const error = new Error("Unsupported media type. Use JPG, PNG, WEBP, MP4, WEBM, or MOV.");
    Object.assign(error, { status: 400 });
    cb(error);
  },
});

/**
 * @swagger
 * tags:
 *   - name: Feed
 *     description: Authenticated salon feed and social interactions
 */

router.use(authenticate);
router.use(requireAnyPermissionOrRoles(["feed.view", "customer.feed.view"], APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF, "CUSTOMER"));
router.post("/media/upload", requirePermissionOrRoles("feed.media.upload", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), upload.array("media", 10), async (req, res, next) => { try { const files = (req.files as Express.Multer.File[]) ?? []; if (!files.length) return res.status(400).json({ success: false, message: "Media is required" }); const result = await Promise.all(files.map(async (file) => { const ext = path.extname(file.originalname).toLowerCase() || extensionForMime(file.mimetype); const isImage = imageTypes.has(file.mimetype) || imageExtensions.has(ext); if (isImage && file.size > 10 * 1024 * 1024) throw { status: 400, message: "Image exceeds 10 MB" }; const allowed = isImage ? imageExtensions : videoExtensions; if (!allowed.has(ext)) throw { status: 400, message: "Unsupported media format" }; const fileName = `${randomUUID()}${ext}`; const savedUrl = `/public/uploads/feed/${fileName}`; await fs.promises.writeFile(path.join(uploadDir, fileName), file.buffer); const mediaRecord = await prisma.feedMedia.create({ data: { type: isImage ? "IMAGE" : "VIDEO", url: savedUrl, thumbnailUrl: savedUrl, fileName, mimeType: file.mimetype || null, fileSize: file.size, width: undefined, height: undefined, durationSeconds: undefined, sortOrder: 0 } }); return { id: mediaRecord.id, url: savedUrl, type: mediaRecord.type, thumbnailUrl: mediaRecord.thumbnailUrl ?? savedUrl, fileName, mimeType: file.mimetype, fileSize: file.size }; })); res.json({ success: true, data: result }); } catch (error) { next(error); } });
router.get("/posts", c.listPosts); router.get("/posts/:id", c.getPost); router.post("/posts", requirePermissionOrRoles("feed.posts.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), requireFeature("posts"), c.createPost); router.put("/posts/:id", requirePermissionOrRoles("feed.posts.update_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), requireFeature("posts"), c.updatePost); router.delete("/posts/:id", requirePermissionOrRoles("feed.posts.delete_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), c.deletePost); router.patch("/posts/:id/archive", contentAuthorizer, requireFeature("posts"), c.archivePost); router.post("/posts/:id/like", c.like); router.delete("/posts/:id/like", c.unlike); router.post("/posts/:id/view", c.view); router.post("/posts/:id/share", c.share); router.post("/posts/:id/report", c.report);
router.get("/posts/:id/comments", c.listComments); router.post("/posts/:id/comments", c.addComment); router.put("/comments/:commentId", c.editComment); router.delete("/comments/:commentId", c.deleteComment);
router.get("/stories", c.listStories); router.get("/stories/:id", c.getStory); router.post("/stories", requirePermissionOrRoles("feed.stories.create", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), c.createStory); router.put("/stories/:id", requirePermissionOrRoles("feed.stories.update_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), c.updateStory); router.delete("/stories/:id", requirePermissionOrRoles("feed.stories.delete_own", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN", APP_CONSTANTS.ROLES.VENDOR, APP_CONSTANTS.ROLES.STAFF), c.deleteStory); router.post("/stories/:id/view", c.storyView);
export const feedAdminRouter = Router();
feedAdminRouter.use(authenticate, requirePermissionOrRoles("feed.view", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"));
feedAdminRouter.get("/filters", validate({ query: feedFilterQuerySchema }), c.adminFilters);
feedAdminRouter.get("/filters/:type", validate({ query: feedFilterQuerySchema }), c.adminFilterOptions);
feedAdminRouter.get("/posts", validate({ query: feedAdminQuerySchema }), c.adminPosts);
feedAdminRouter.get("/posts/export", validate({ query: feedAdminQuerySchema }), c.adminPostsExport);
feedAdminRouter.get("/posts/:id", c.adminPostDetails);
feedAdminRouter.patch("/posts/:id", requirePermissionOrRoles("feed.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: adminPostUpdateSchema }), c.adminUpdatePost);
feedAdminRouter.delete("/posts/:id", requirePermissionOrRoles("feed.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), c.adminDeletePost);
feedAdminRouter.get("/stories", validate({ query: feedAdminQuerySchema }), c.adminStories);
feedAdminRouter.get("/stories/export", validate({ query: feedAdminQuerySchema }), c.adminStoriesExport);
feedAdminRouter.get("/stories/:id", c.adminStoryDetails);
feedAdminRouter.patch("/stories/:id", requirePermissionOrRoles("feed.edit", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), validate({ body: adminStoryUpdateSchema }), c.adminUpdateStory);
feedAdminRouter.delete("/stories/:id", requirePermissionOrRoles("feed.delete", APP_CONSTANTS.ROLES.ADMIN, "SUPER_ADMIN"), c.adminDeleteStory);
feedAdminRouter.get("/reports", c.adminReports);
export default router;
