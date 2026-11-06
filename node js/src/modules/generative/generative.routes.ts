import { Router } from "express";
import { NextFunction, Request, Response } from "express";
import { generateSalonImage } from "./generative.controller";
import { AuthRequest, authenticate } from "../../common/middleware/auth.middleware";
import { generateImageRateLimiter } from "../../common/middleware/rate-limiter.middleware";
import { getEffectivePermissions } from "../rbac/rbac.service";
import { ensureAiImageGenerationPermission } from "../subscription/subscription.service";

const router = Router();
let aiPermissionReady: Promise<string> | undefined;
const ensureAiPermissionReady = () => {
    if (!aiPermissionReady) {
        aiPermissionReady = ensureAiImageGenerationPermission().catch((error) => {
            aiPermissionReady = undefined;
            throw error;
        });
    }
    return aiPermissionReady;
};

/**
 * @swagger
 * tags:
 *   name: Generative AI
 *   description: Stability AI powered image generation
 */

/**
 * @swagger
 * /api/v1/generate/image:
 *   post:
 *     summary: Generate a salon/beauty AI image
 *     tags: [Generative AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The text prompt for AI (must include salon/beauty keywords)
 *     responses:
 *       200:
 *         description: Image generated successfully
 *       400:
 *         description: Validation error or restricted prompt
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded (Max 5 per day)
 */
const requireAiImagePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
        await ensureAiPermissionReady();
        const permissions = await getEffectivePermissions(user.userId, user.salonId);
        if (!permissions.includes("services.ai-image.generate")) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                code: "AI_IMAGE_ACCESS_DENIED",
                message: "AI image generation is not enabled for this account.",
            });
        }
        next();
    } catch (error) {
        next(error);
    }
};

router.post("/image", authenticate, requireAiImagePermission, generateImageRateLimiter, generateSalonImage);

export default router;