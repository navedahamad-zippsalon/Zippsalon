import { z } from "zod";
import { createSalonSchema } from "../../validators/salons";

export const adminCreateSalonSchema = z.object({
    user: z.object({
        id: z.string().uuid().optional(),
        firstName: z.string().min(2).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().min(5).optional(),
        countryCode: z.string().min(1).optional(),
        password: z.string().min(6).optional(),
    }).refine(data => data.id || (data.firstName && data.email && data.phone && data.countryCode && data.password), {
        message: "If user ID is not provided, firstName, email, phone, countryCode, and password are required to create a new user.",
    }),
    salon: createSalonSchema,
}).or(z.object({
    userId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    firstName: z.string().min(2).optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    countryCode: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    salonName: z.string().min(2).optional(),
    businessName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    parentId: z.string().uuid().optional(),
    description: z.string().optional(),
    avgPrice: z.number().nonnegative().optional(),
    avgWaitTime: z.number().int().nonnegative().optional(),
    timings: z.any().optional(),
    isActive: z.boolean().optional(),
    contacts: createSalonSchema.shape.contacts,
    address: createSalonSchema.shape.address,
}).superRefine((data, ctx) => {
    const ownerId = data.userId || data.ownerId || data.vendorId;
    const hasNewUser = data.firstName && data.email && data.phone && data.countryCode && data.password;
    if (!ownerId && !hasNewUser) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["user"], message: "Provide userId/ownerId/vendorId or firstName, email, phone, countryCode, and password." });
    }
    if (!data.name && !data.salonName && !data.businessName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Salon name is required." });
    }
})).transform((data) => {
    if ("user" in data && "salon" in data) return data;
    const ownerId = data.userId || data.ownerId || data.vendorId;
    const { userId: _userId, ownerId: _ownerId, vendorId: _vendorId, firstName, lastName, email, phone, countryCode, password, salonName, businessName, name, ...salon } = data;
    return {
        user: ownerId ? { id: ownerId } : { firstName, lastName, email, phone, countryCode, password },
        salon: { ...salon, name: name || salonName || businessName },
    };
});
