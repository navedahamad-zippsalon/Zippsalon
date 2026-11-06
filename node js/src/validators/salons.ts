import { z } from "zod";

export const createSalonSchema = z.object({
    name: z.string().min(2, "Salon name must be at least 2 characters"),
    parentId: z.string().uuid().optional(),
    description: z.string().optional(),
    avgPrice: z.number().nonnegative().optional(),
    avgWaitTime: z.number().int().nonnegative().optional(),
    timings: z.any().optional(),
    isActive: z.boolean().optional(),
    contacts: z.array(
        z.object({
            phone: z.string().min(5),
            countryCode: z.string().min(1),
            email: z.string().email().optional().or(z.literal("")),
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
}).passthrough();

export const updateSalonSchema = createSalonSchema.partial();

export const branchSearchQuerySchema = z.object({
    vendorId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).passthrough();
