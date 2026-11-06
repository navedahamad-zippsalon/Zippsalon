import { z } from "zod";
export { adminCreateSalonSchema } from "../modules/admin/admin.validation";

export const adminSalonFilterQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    parentId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    filter: z.enum(["only_head_offices", "only_branches"]).optional(),
    country: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
}).passthrough();

export const salonDirectoryQuerySchema = adminSalonFilterQuerySchema.extend({
    filter: z.enum(["only_head_offices", "only_branches"]).default("only_head_offices"),
});

export const adminListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    country: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    branchId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    // This is deliberately the union of statuses exposed by the Admin modules.
    // Individual services only map values meaningful to their own entity.
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "CONFIRMED", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"]).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).passthrough();

export const adminBooleanStatusListQuerySchema = adminListQuerySchema.extend({
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const adminBookingListQuerySchema = adminListQuerySchema.extend({
    status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"]).optional(),
    source: z.enum(["APP", "WEB"]).optional(),
    paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
    customerId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
