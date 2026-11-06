import { z } from "zod";

export const uuidParam = (name: string = "id") =>
    z.object({
        [name]: z.string().uuid(`Invalid ${name} format, must be a UUID`),
    }).passthrough();

export const uuidOrAllParam = (name: string = "id") =>
    z.object({
        [name]: z.union([z.string().uuid(), z.literal("all")]),
    }).passthrough();

export const idParam = (name: string = "id") =>
    z.object({
        [name]: z.string().min(1, `${name} is required`),
    }).passthrough();

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
}).passthrough();

export const dateRangeQuerySchema = z.object({
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    range: z.enum(["today", "7d", "30d", "90d", "custom"]).optional(),
}).passthrough();
