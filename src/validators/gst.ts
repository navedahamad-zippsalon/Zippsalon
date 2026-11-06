import { z } from "zod";

export const updateGSTConfigSchema = z.object({
    cgstRate: z.number().min(0, "CGST rate must be between 0 and 100").max(100, "CGST rate must be between 0 and 100").optional(),
    sgstRate: z.number().min(0, "SGST rate must be between 0 and 100").max(100, "SGST rate must be between 0 and 100").optional(),
    igstRate: z.number().min(0, "IGST rate must be between 0 and 100").max(100, "IGST rate must be between 0 and 100").optional(),
    isActive: z.boolean().optional(),
}).passthrough();
