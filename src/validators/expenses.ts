import { z } from "zod";

const optionalUuid = z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional());
const date = z.string().date();

export const expenseIdSchema = z.object({ id: z.string().uuid() });

export const expenseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(150).optional()),
  startDate: date.optional(),
  endDate: date.optional(),
  month: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(1).max(12).optional()),
  year: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(2000).max(2100).optional()),
  countryId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(100).optional()),
  cityId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(100).optional()),
  vendorId: optionalUuid,
  salonId: optionalUuid,
  branchId: optionalUuid,
  categoryId: optionalUuid,
  paymentMethod: z.preprocess((value) => value === "" ? undefined : value, z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "WALLET", "OTHER"]).optional()),
  status: z.preprocess((value) => value === "" ? undefined : value, z.enum(["ACTIVE", "VOID"]).optional()),
  sortBy: z.preprocess((value) => value === "" ? undefined : value, z.enum(["expenseDate", "amount", "createdAt", "category"]).default("expenseDate")),
  sortOrder: z.preprocess((value) => value === "" ? undefined : value, z.enum(["asc", "desc"]).default("desc")),
}).superRefine((query, context) => {
  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    context.addIssue({ code: "custom", path: ["startDate"], message: "startDate must be before endDate" });
  }
  if (query.month && !query.year) {
    context.addIssue({ code: "custom", path: ["year"], message: "year is required when month is provided" });
  }
});

export const expensePayloadSchema = z.object({
  expenseDate: date,
  amount: z.coerce.number().finite().positive().max(9999999999.99)
    .refine((amount) => Number(amount.toFixed(2)) === amount, "Amount supports at most two decimal places."),
  categoryId: z.string().uuid(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "WALLET", "OTHER"]),
  note: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  receiptUrl: z.string().trim().max(2048).optional().nullable(),
  salonId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
});

export const expenseUpdateSchema = expensePayloadSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided.",
);

export const expenseCategoryPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().optional(),
});

export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
export type ExpensePayload = z.infer<typeof expensePayloadSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
