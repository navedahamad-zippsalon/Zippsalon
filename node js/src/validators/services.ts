import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().min(2, "Category name must be at least 2 characters"),
    isActive: z.boolean().optional(),
}).passthrough();

export const updateCategorySchema = createCategorySchema.partial();

export const createServiceSchema = z.object({
    name: z.string().min(2, "Service name must be at least 2 characters"),
    description: z.string().optional(),
    categoryId: z.string().uuid("Invalid categoryId format"),
    basePrice: z.number().nonnegative().or(z.string().regex(/^\d+(\.\d+)?$/)),
    baseDuration: z.number().int().positive().or(z.string().regex(/^\d+$/)),
    isActive: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean().optional()),
    vendorId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    images: z.array(z.string()).optional(),
}).passthrough();

export const updateServiceSchema = createServiceSchema.partial();

export const serviceLookupQuerySchema = z.object({
    search: z.string().trim().max(160).optional(),
    vendorId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const serviceLookupTypeSchema = z.object({
    type: z.enum(["vendors", "salons", "branches"]),
});

export const createComboSchema = z.object({
    name: z.string().min(2, "Combo name must be at least 2 characters"),
    description: z.string().optional(),
    price: z.number().nonnegative().or(z.string().regex(/^\d+(\.\d+)?$/)),
    duration: z.number().int().positive().or(z.string().regex(/^\d+$/)),
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
    }, z.array(z.string().uuid("Invalid serviceId format"))),
}).passthrough();

export const updateComboSchema = createComboSchema.partial();
