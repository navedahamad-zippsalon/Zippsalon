import { BookingFinanceApprovalStatus, BookingSettlementStatus, PaymentMethod, PaymentStatus, RefundStatus, VendorSettlementStatus, VendorWalletEntryType, WalletTransactionStatus, WalletTransactionType } from "@prisma/client";
import { z } from "zod";

const date = z.string().datetime().optional();

export const paymentWalletListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  customerId: z.string().uuid().optional(),
  startDate: date,
  endDate: date,
  from: date,
  to: date,
  vendorName: z.string().trim().max(160).optional(),
  salonName: z.string().trim().max(160).optional(),
  branchName: z.string().trim().max(160).optional(),
  customerName: z.string().trim().max(160).optional(),
  customerContact: z.string().trim().max(160).optional(),
  bookingNumber: z.string().trim().max(100).optional(),
  transactionReference: z.string().trim().max(160).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  refundStatus: z.nativeEnum(RefundStatus).optional(),
  approvalStatus: z.nativeEnum(BookingFinanceApprovalStatus).optional(),
  settlementStatus: z.nativeEnum(BookingSettlementStatus).optional(),
  settlementRecordStatus: z.nativeEnum(VendorSettlementStatus).optional(),
  period: z.enum(["today", "week", "month", "year", "custom"]).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentTransactionType: z.literal("PAYMENT").optional(),
  transactionType: z.nativeEnum(VendorWalletEntryType).optional(),
  walletTransactionType: z.nativeEnum(WalletTransactionType).optional(),
  walletTransactionStatus: z.nativeEnum(WalletTransactionStatus).optional(),
  customerStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  ledgerStatus: z.union([z.literal("COMPLETED"), z.nativeEnum(VendorSettlementStatus)]).optional(),
  sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const paymentRefundCreateSchema = z.object({
  paymentReference: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive().finite().optional(),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const vendorWalletListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  startDate: date,
  endDate: date,
  from: date,
  to: date,
  bookingId: z.string().max(80).optional(),
  bookingNumber: z.string().trim().max(100).optional(),
  transactionReference: z.string().trim().max(160).optional(),
  salonName: z.string().trim().max(160).optional(),
  branchName: z.string().trim().max(160).optional(),
  type: z.nativeEnum(VendorWalletEntryType).optional(),
  bucket: z.enum(["PENDING", "AVAILABLE", "PROCESSING", "PAID"]).optional(),
  status: z.nativeEnum(VendorSettlementStatus).optional(),
  sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const paymentWalletLookupQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  salonName: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
