import { z } from "zod";

export const reportsQuerySchema = z.object({
    vendorId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    salonId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    branchId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    countryId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
    cityId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    month: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(1).max(12).optional()),
    year: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(2000).max(2100).optional()),
    status: z.preprocess((value) => value === "" ? undefined : value, z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"]).optional()),
}).superRefine((query, context) => {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
        context.addIssue({ code: "custom", path: ["startDate"], message: "startDate must be before endDate" });
    }
    if (query.month && !query.year) {
        context.addIssue({ code: "custom", path: ["year"], message: "year is required when month is provided" });
    }
});

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;