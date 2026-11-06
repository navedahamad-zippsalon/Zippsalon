import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().min(2),
    isActive: z.boolean().optional(),
});

export const createServiceSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    categoryId: z.string().uuid(),
    basePrice: z.number().or(z.string()),
    baseDuration: z.number().or(z.string()),
    isActive: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean().optional()),
    vendorId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    images: z.array(z.string()).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createComboSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.number().or(z.string()),
    duration: z.number().or(z.string()),
    isActive: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean().optional()),
    imageUrl: z.string().optional(),
    vendorId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    serviceIds: z.preprocess((value) => {
        if (typeof value !== "string") return value;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }, z.array(z.string().uuid())),
});
