import { z } from "zod";

export const createSalonSchema = z.object({
    name: z.string().min(2),
    parentId: z.string().uuid().optional(),
    description: z.string().optional(),
    avgPrice: z.number().optional(),
    avgWaitTime: z.number().optional(),
    timings: z.any().optional(), // Can refine later
    isActive: z.boolean().optional(),
    contacts: z.array(
        z.object({
            phone: z.string().min(5),
            countryCode: z.string().min(1),
            email: z.string().email().optional(),
            isPrimary: z.boolean().optional(),
            isWhatsapp: z.boolean().optional(),
        })
    ).optional(),
    address: z.object({
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        pincode: z.string().min(1),
        country: z.string().min(1),
    }).optional(),
});