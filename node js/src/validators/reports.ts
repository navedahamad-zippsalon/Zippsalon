import { z } from "zod";

export const reportsQuerySchema = z.object({
    vendorId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    salonId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    branchId: z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional()),
    countryId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
    cityId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    status: z.preprocess((value) => value === "" ? undefined : value, z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"]).optional()),
}).superRefine((query, context) => {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
        context.addIssue({ code: "custom", path: ["startDate"], message: "startDate must be before endDate" });
    }
});

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;