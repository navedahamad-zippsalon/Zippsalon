import { z } from "zod";
import { BookingCommissionType, BookingFinanceApprovalStatus, BookingSettlementIntervalUnit, BookingSettlementMode, BookingSettlementStatus, VendorSettlementStatus, VendorWalletBucket, VendorWalletEntryType } from "@prisma/client";

const dateFilter = z.string().datetime().optional();
const dateAliases = <T extends z.ZodType>(schema: T) => z.preprocess((input) => {
  if (!input || typeof input !== "object") return input;
  const query = { ...(input as Record<string, unknown>) };
  if (query.from !== undefined && query.startDate === undefined) query.startDate = query.from;
  if (query.to !== undefined && query.endDate === undefined) query.endDate = query.to;
  return query;
}, schema);
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  startDate: dateFilter,
  endDate: dateFilter,
  vendorId: z.string().uuid().optional(),
  salonId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
});

export const financeListQuerySchema = dateAliases(pageQuery.extend({
  approvalStatus: z.nativeEnum(BookingFinanceApprovalStatus).optional(),
  settlementStatus: z.nativeEnum(BookingSettlementStatus).optional(),
  paymentStatus: z.enum(["COMPLETED"]).optional(),
  transactionType: z.nativeEnum(VendorWalletEntryType).optional(),
  sortBy: z.enum(["createdAt", "bookingAmount", "commissionAmount", "vendorPayableAmount", "approvalStatus", "settlementStatus"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}));

export const financeReportQuerySchema = dateAliases(z.object({
  period: z.preprocess((value) => value === "last_week" ? "lastWeek" : value === "last_month" ? "lastMonth" : value, z.enum(["today", "yesterday", "week", "lastWeek", "month", "lastMonth", "year", "custom"]).default("month")),
  granularity: z.preprocess((value) => value === "day" ? "daily" : value === "week" ? "weekly" : value === "month" ? "monthly" : value === "year" ? "yearly" : value, z.enum(["daily", "weekly", "monthly", "yearly"]).default("daily")),
  startDate: dateFilter,
  endDate: dateFilter,
  from: dateFilter,
  to: dateFilter,
}).refine((query) => query.period !== "custom" || Boolean(query.startDate && query.endDate), {
  message: "Custom period requires startDate and endDate",
}));

export const financeTrendQuerySchema = dateAliases(z.object({
  period: z.preprocess((value) => value === "last_week" ? "lastWeek" : value === "last_month" ? "lastMonth" : value, z.enum(["today", "yesterday", "week", "lastWeek", "month", "lastMonth", "year", "custom"]).default("month")),
  groupBy: z.preprocess((value) => value === "daily" ? "day" : value === "weekly" ? "week" : value === "monthly" ? "month" : value === "yearly" ? "year" : value, z.enum(["day", "week", "month", "year"]).default("day")),
  startDate: dateFilter,
  endDate: dateFilter,
  from: dateFilter,
  to: dateFilter,
}).refine((query) => query.period !== "custom" || Boolean(query.startDate && query.endDate), {
  message: "Custom period requires from and to",
}));

export const settlementListQuerySchema = dateAliases(pageQuery.pick({ page: true, limit: true, startDate: true, endDate: true, vendorId: true, salonId: true, branchId: true }).extend({
  status: z.nativeEnum(VendorSettlementStatus).optional(),
}));

export const walletListQuerySchema = dateAliases(pageQuery.pick({ page: true, limit: true, startDate: true, endDate: true }).extend({
  bookingId: z.string().max(80).optional(),
  type: z.nativeEnum(VendorWalletEntryType).optional(),
  bucket: z.nativeEnum(VendorWalletBucket).optional(),
}));

export const vendorFinanceLookupQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  salonId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const commissionRuleSchema = z.object({
  commissionType: z.nativeEnum(BookingCommissionType),
  commissionValue: z.coerce.number().finite().min(0).max(10000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("INR"),
  effectiveFrom: z.coerce.date().optional(),
});

export const financeDecisionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const pendingSettlementQuerySchema = pageQuery.pick({ page: true, limit: true, vendorId: true });

export const settlementSettingsSchema = z.object({
  settlementMode: z.nativeEnum(BookingSettlementMode),
  intervalValue: z.coerce.number().int().positive().max(100000),
  intervalUnit: z.preprocess((value) => typeof value === "string" ? ({ SECOND: "SECONDS", MINUTE: "MINUTES", HOUR: "HOURS", DAY: "DAYS", WEEK: "WEEKS", MONTH: "MONTHS" } as Record<string, string>)[value] ?? value : value, z.nativeEnum(BookingSettlementIntervalUnit)),
  minimumSettlementAmount: z.coerce.number().finite().min(0).max(100000000),
  autoSettlementEnabled: z.boolean(),
  sourceAccountNumber: z.string().trim().min(5).max(35).optional(),
  payoutMode: z.enum(["IMPS", "NEFT", "RTGS", "UPI"]),
});

export const razorpayXConfigurationSchema = z.object({
  environment: z.enum(["TEST", "LIVE"]),
  keyId: z.string().trim().min(1).max(200),
  keySecret: z.string().trim().max(500).optional(),
  webhookSecret: z.string().trim().max(500).optional(),
  enabled: z.boolean(),
});

export const vendorPayoutAccountSchema = z.object({
  accountHolderName: z.string().trim().min(3).max(120),
  bankName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(5).max(35),
  ifscCode: z.string().trim().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/),
  accountType: z.enum(["SAVINGS", "CURRENT", "SALARY", "OTHER"]).default("CURRENT"),
});
