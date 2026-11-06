import { z } from "zod";

export const newCustomerSchema = z.object({
    firstName: z.string().min(2),
    lastName: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(5),
    countryCode: z.string().min(1),
});

export const addCustomerSchema = z.object({
    userId: z.string().uuid().optional(),
    newCustomer: newCustomerSchema.optional(),
}).refine(data => data.userId || data.newCustomer, {
    message: "Either userId or newCustomer details must be provided",
});

export const searchCustomerSchema = z.object({
    query: z.string().min(3, "Search query must be at least 3 characters"),
});
