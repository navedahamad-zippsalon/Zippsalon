import { z } from "zod";

export const createCustomerSchema = z.object({
    userId: z.string().uuid().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(5).optional(),
    countryCode: z.string().optional(),
    newCustomer: z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().min(5),
        countryCode: z.string().optional(),
    }).optional(),
}).refine(data => data.userId || data.phone || data.newCustomer?.phone, {
    message: "A customer phone, userId, or newCustomer details must be provided",
}).passthrough();

export const customerSearchQuerySchema = z.object({
    query: z.string().min(1, "Search query is required"),
}).passthrough();
