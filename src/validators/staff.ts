import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const addStaffSchema = z.object({
    salonId: z.string().uuid("Invalid salonId format"),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    staffRoleId: z.string().uuid().optional(),
    user: z.object({
        id: z.string().uuid().optional(),
        firstName: z.string().min(2, "First name must be at least 2 characters"),
        lastName: z.string().optional(),
        email: z.string().email("Invalid email format"),
        phone: z.string().min(5, "Phone is required"),
        countryCode: z.string().optional(),
        password: z.string().min(6).optional(),
    }),
}).passthrough();

export const updateStaffSchema = z.object({
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    staffRoleId: z.string().uuid().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
    user: z.object({
        firstName: z.string().min(2).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().min(5).optional(),
        countryCode: z.string().min(1).optional(),
    }).optional(),
}).passthrough();

export const markAttendanceSchema = z.object({
    staffId: z.string().uuid("Invalid staffId format"),
    date: z.string().min(1, "Date is required"),
    status: z.nativeEnum(AttendanceStatus),
}).passthrough();

export const staffAttendanceQuerySchema = z.object({
    salonId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    status: z.string().trim().toUpperCase().pipe(z.nativeEnum(AttendanceStatus)).optional(),
    search: z.string().trim().max(120).optional(),
    date: z.string().date().optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM").optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).passthrough().superRefine((query, context) => {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
        context.addIssue({ code: "custom", path: ["endDate"], message: "endDate must be on or after startDate" });
    }
});

// `passthrough` deliberately keeps this tolerant of unrelated query-string
// values (for example an accidentally serialized AbortSignal) while only the
// fields below are used by the staff listing.
export const staffListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    search: z.string().trim().optional(),
    salonId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    role: z.string().trim().min(1).optional(),
    designation: z.string().trim().min(1).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM").optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    attendanceStartDate: z.string().date().optional(),
    attendanceEndDate: z.string().date().optional(),
    sortBy: z.enum(["createdAt", "name", "designation", "status"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
}).passthrough().transform((query) => ({
    ...query,
    // The list stays server-paginated even when a client sends a larger value.
    limit: Math.min(query.limit, 100),
}));
