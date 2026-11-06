import { Router } from "express";
import { upload, uploadFile } from "./upload.controller";
import { authenticate } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { uploadQuerySchema } from "../../validators/upload";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload APIs
 */

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Sub-folder inside public directory to store the file (e.g. salon-images)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticate, validate({ query: uploadQuerySchema }), (req: any, res, next) => {
	if (req.query.folder === "advertisements" && !req.user?.roles?.some((role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
		return res.status(403).json({ success: false, statusCode: 403, message: "Only administrators can upload advertisement media" });
	}
	return next();
}, upload.single("file"), uploadFile);

export default router;
