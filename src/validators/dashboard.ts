import { z } from "zod";

const indiaCountry = "India";
const normalizeQueryToken = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    if (!text) return undefined;
    const lowered = text.toLowerCase();
    const ignored = new Set([
        "all",
        "all branches",
        "all vendors",
        "all salons",
        "all cities",
        "all countries",
        "all states",
    ]);
    return ignored.has(lowered) ? undefined : text;
};

const normalizeCountryValue = (value: unknown) => {
    if (value === undefined || value === null || value === "") return indiaCountry;
    const text = String(value).trim();
    if (!text) return indiaCountry;
    const compact = text.toLowerCase().replace(/[^a-z]/g, "");
    if (["india", "in", "ind"].includes(compact)) return indiaCountry;
    return indiaCountry;
};

export const dashboardStatsQuerySchema = z.object({
    country: z.preprocess((value) => normalizeQueryToken(value), z.string().optional()),
    countryId: z.preprocess((value) => normalizeQueryToken(value), z.string().optional()).transform((value) => value ? normalizeCountryValue(value) : indiaCountry),
    stateId: z.preprocess((value) => normalizeQueryToken(value), z.string().optional()),
    cityId: z.preprocess((value) => normalizeQueryToken(value), z.string().optional()),
    city: z.preprocess((value) => normalizeQueryToken(value), z.string().optional()),
    vendorId: z.preprocess((value) => normalizeQueryToken(value), z.string().uuid().optional()),
    salonId: z.preprocess((value) => normalizeQueryToken(value), z.string().uuid().optional()),
    branchId: z.preprocess((value) => normalizeQueryToken(value), z.string().uuid().optional()),
    status: z.preprocess((value) => {
        const token = normalizeQueryToken(value);
        return token ? token.toUpperCase() : undefined;
    }, z.enum(["ACTIVE", "INACTIVE"]).optional()),
    range: z.enum(["today", "yesterday", "7d", "30d", "90d", "thisWeek", "thisMonth", "lastMonth", "thisYear", "custom"]).optional(),
    period: z.enum(["today", "week", "month", "year", "custom"]).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    search: z.string().trim().max(100).optional(),
    serviceId: z.preprocess((value) => normalizeQueryToken(value), z.string().uuid().optional()),
    staffId: z.preprocess((value) => normalizeQueryToken(value), z.string().uuid().optional()),
    bookingStatus: z.preprocess((value) => {
        const token = normalizeQueryToken(value);
        return token ? token.toUpperCase() : undefined;
    }, z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"]).optional()),
    paymentStatus: z.preprocess((value) => normalizeQueryToken(value), z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional()),
}).passthrough().superRefine((query, context) => {
    if ((query.range === "custom" || query.period === "custom") && (!query.startDate || !query.endDate)) {
        context.addIssue({
            code: "custom",
            message: "Custom ranges require both startDate and endDate",
            path: ["startDate"],
        });
    }
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
        context.addIssue({
            code: "custom",
            message: "startDate must be on or before endDate",
            path: ["endDate"],
        });
    }
});
