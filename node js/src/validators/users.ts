import { z } from "zod";

export const updateProfileSchema = z.object({
    firstName: z.string().min(1, "First name must not be empty").optional(),
    lastName: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dob: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
}).passthrough();

export const updateMySalonSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    avgPrice: z.number().nonnegative().optional(),
    avgWaitTime: z.number().int().nonnegative().optional(),
    timings: z.record(z.string(), z.any()).optional(),
    isActive: z.boolean().optional(),
    address: z.object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
    }).optional(),
    contacts: z.array(
        z.object({
            phone: z.string(),
            countryCode: z.string(),
            email: z.string().email().optional().or(z.literal("")),
            isPrimary: z.boolean().optional(),
            isWhatsapp: z.boolean().optional(),
        })
    ).optional(),
    images: z.array(z.string()).optional(),
}).passthrough();
