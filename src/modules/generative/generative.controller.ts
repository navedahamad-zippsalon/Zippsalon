import { Request, Response, NextFunction } from "express";
import { enrichSalonPrompt } from "../../common/utils/prompt.guard";
import { generateImage } from "./generative.service";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma";
import { hasSalonPermission } from "../../common/utils/permission.util";

const generateSchema = z.object({
    prompt: z.string().min(5, "Prompt must be at least 5 characters"),
    serviceId: z.string().uuid().optional(),
    comboId: z.string().uuid().optional(),
}).refine((value) => !(value.serviceId && value.comboId), {
    message: "Specify either serviceId or comboId, not both",
});

export const generateSalonImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = generateSchema.parse(req.body);
        const user = (req as any).user;
        if (data.serviceId || data.comboId) {
            const salonId = data.serviceId
                ? (await prisma.service.findUnique({ where: { id: data.serviceId }, select: { salonId: true } }))?.salonId
                : (await prisma.combo.findUnique({ where: { id: data.comboId }, select: { salonId: true } }))?.salonId;
            if (!salonId) {
                return res.status(404).json({ success: false, code: "IMAGE_TARGET_NOT_FOUND", message: "The selected service or combo was not found." });
            }
            const isAdmin = user.roles?.some((role: string) => role === "ADMIN" || role === "SUPER_ADMIN");
            if (!isAdmin && !(await hasSalonPermission(salonId, user.userId, user.roles))) {
                return res.status(403).json({
                    success: false,
                    statusCode: 403,
                    code: "AI_IMAGE_TARGET_ACCESS_DENIED",
                    message: "You can only generate images for services or combos in your own salon scope.",
                });
            }
        }

        const finalPrompt = enrichSalonPrompt(data.prompt);

        const imageBase64 = await generateImage(finalPrompt);

        const { saveBase64Image } = await import("../../common/utils/file.util");
        const relativePath = await saveBase64Image(imageBase64, "ai-generated");

        const protocol = req.protocol;
        const host = req.get("host");
        const fullUrl = `${protocol}://${host}${relativePath}`;

        return res.status(200).json({
            success: true,
            message: "Image generated successfully",
            data: { image: fullUrl },
        });
    } catch (err: any) {
        next(err);
    }
};