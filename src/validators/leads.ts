import { z } from "zod";
import { LeadStatus } from "@prisma/client";

export const createLeadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(5, "Phone is required"),
    countryCode: z.string().optional().default("+1"),
    message: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const updateLeadStatusSchema = z.object({
    status: z.nativeEnum(LeadStatus),
}).passthrough();
