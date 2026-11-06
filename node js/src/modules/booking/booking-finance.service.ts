import crypto from "crypto";
import { BookingCommissionType, BookingFinanceApprovalStatus, BookingSettlementIntervalUnit, BookingSettlementMode, BookingSettlementStatus, BookingStatus, PaymentStatus, Prisma, VendorSettlementStatus, VendorWalletBucket, VendorWalletEntryType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { decrypt, encrypt } from "../whatsapp/utils/encryption";

const cents = (value: unknown) => Math.round(Number(value) * 100);
const decimal = (valueInCents: number) => new Prisma.Decimal((valueInCents / 100).toFixed(2));
export function calculateCommissionAmounts(bookingAmountCents: number, commissionType: BookingCommissionType, commissionValue: Prisma.Decimal | number) {
  const valueInCents = cents(commissionValue);
  const commissionCents = commissionType === BookingCommissionType.PERCENTAGE
    ? Math.min(bookingAmountCents, Math.round(bookingAmountCents * valueInCents / 10000))
    : Math.min(bookingAmountCents, valueInCents);
  return { commissionCents, vendorPayableCents: bookingAmountCents - commissionCents };
}
const walletField: Record<VendorWalletBucket, "pendingBalance" | "availableBalance" | "processingBalance" | "paidBalance"> = {
  PENDING: "pendingBalance",
  AVAILABLE: "availableBalance",
  PROCESSING: "processingBalance",
  PAID: "paidBalance",
};
const includeFinance = {
  booking: { include: { services: true, payments: true } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  vendor: { select: { id: true, firstName: true, lastName: true, email: true } },
  salon: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  settlements: { select: { id: true, amount: true, status: true, referenceId: true, razorpayPayoutId: true, utr: true, processedAt: true } },
  walletEntries: { select: { type: true, bucket: true, amount: true, createdAt: true, razorpayReference: true }, orderBy: { createdAt: "asc" as const } },
};

export function financeTransactionActions(approvalStatus: BookingFinanceApprovalStatus) {
  const approveAllowed = approvalStatus === BookingFinanceApprovalStatus.PENDING
    || approvalStatus === BookingFinanceApprovalStatus.HELD;
  const holdAllowed = approvalStatus === BookingFinanceApprovalStatus.PENDING;
  return {
    approve: {
      visible: true,
      allowed: approveAllowed,
      label: approvalStatus === BookingFinanceApprovalStatus.APPROVED ? "Approved" : "Approve",
    },
    hold: {
      visible: true,
      allowed: holdAllowed,
      label: approvalStatus === BookingFinanceApprovalStatus.HELD ? "On Hold" : "Hold",
    },
  };
}

function decisionConflict(decision: "APPROVE" | "REJECT" | "HOLD", status: BookingFinanceApprovalStatus) {
  if (decision === "APPROVE" && status === BookingFinanceApprovalStatus.APPROVED) {
    return { status: 409, code: "COMMISSION_ALREADY_APPROVED", message: "This commission transaction has already been approved." };
  }
  if (decision === "HOLD" && status === BookingFinanceApprovalStatus.HELD) {
    return { status: 409, code: "COMMISSION_ALREADY_ON_HOLD", message: "This commission transaction is already on hold." };
  }
  return { status: 409, code: "INVALID_FINANCE_TRANSITION", message: "This booking finance transaction has already been decided" };
}

function decisionAllowed(decision: "APPROVE" | "REJECT" | "HOLD", status: BookingFinanceApprovalStatus) {
  if (decision === "HOLD") return status === BookingFinanceApprovalStatus.PENDING;
  return status === BookingFinanceApprovalStatus.PENDING || status === BookingFinanceApprovalStatus.HELD;
}

async function moveWallet(tx: Prisma.TransactionClient, input: {
  walletId: string;
  bucket: VendorWalletBucket;
  deltaCents: number;
  type: VendorWalletEntryType;
  idempotencyKey: string;
  bookingFinanceId?: string;
  settlementId?: string;
  createdById?: string;
  reference?: string;
  paymentReference?: string;
  razorpayReference?: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const prior = await tx.vendorWalletLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (prior) return prior;
  const wallet = await tx.vendorWallet.findUnique({ where: { id: input.walletId } });
  if (!wallet) throw { status: 500, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet was not initialized" };
  const field = walletField[input.bucket];
  const balanceBeforeCents = cents(wallet[field]);
  const balanceAfterCents = balanceBeforeCents + input.deltaCents;
  if (balanceAfterCents < 0) throw { status: 409, code: "INSUFFICIENT_WALLET_BALANCE", message: "Wallet balance is insufficient for this operation" };
  await tx.vendorWallet.update({ where: { id: wallet.id }, data: { [field]: decimal(balanceAfterCents) } });
  return tx.vendorWalletLedger.create({
    data: {
      walletId: wallet.id,
      bookingFinanceId: input.bookingFinanceId,
      settlementId: input.settlementId,
      type: input.type,
      bucket: input.bucket,
      amount: decimal(input.deltaCents),
      balanceBefore: decimal(balanceBeforeCents),
      balanceAfter: decimal(balanceAfterCents),
      idempotencyKey: input.idempotencyKey,
      reference: input.reference,
      paymentReference: input.paymentReference,
      razorpayReference: input.razorpayReference,
      description: input.description,
      metadata: input.metadata,
      createdById: input.createdById,
      processedAt: new Date(),
    },
  });
}

export async function recordEligibleBookingFinance(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { salon: { select: { id: true, ownerId: true } }, payments: { where: { status: PaymentStatus.COMPLETED }, select: { amount: true, transactionId: true } } },
  });
  if (!booking || booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) return null;
  const bookingAmountCents = cents(booking.finalAmount);
  const paidAmountCents = booking.payments.reduce((total, payment) => total + cents(payment.amount), 0);
  if (bookingAmountCents <= 0 || paidAmountCents < bookingAmountCents) return null;

  const existing = await tx.bookingFinancialTransaction.findUnique({ where: { bookingId } });
  if (existing) return existing;
  const now = new Date();
  const rule = await tx.bookingCommissionRule.findFirst({
    where: { isActive: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
  });
  if (!rule) {
    console.warn("booking_finance_commission_not_configured", { bookingId });
    return null;
  }

  const { commissionCents, vendorPayableCents } = calculateCommissionAmounts(bookingAmountCents, rule.commissionType, rule.commissionValue);
  const finance = await tx.bookingFinancialTransaction.create({
    data: {
      bookingId,
      customerId: booking.customerId,
      vendorId: booking.salon.ownerId,
      salonId: booking.salonId,
      branchId: booking.branchId,
      staffId: booking.staffId,
      commissionRuleId: rule.id,
      bookingAmount: decimal(bookingAmountCents),
      vendorGrossAmount: decimal(bookingAmountCents),
      commissionType: rule.commissionType,
      commissionValue: rule.commissionValue,
      commissionAmount: decimal(commissionCents),
      vendorPayableAmount: decimal(vendorPayableCents),
      currency: rule.currency,
      paymentStatus: PaymentStatus.COMPLETED,
      approvalStatus: BookingFinanceApprovalStatus.PENDING,
      settlementStatus: BookingSettlementStatus.NOT_READY,
    },
  });
  const wallet = await tx.vendorWallet.upsert({
    where: { vendorId: booking.salon.ownerId },
    create: { vendorId: booking.salon.ownerId, currency: rule.currency, pendingBalance: decimal(bookingAmountCents) },
    update: { pendingBalance: { increment: decimal(bookingAmountCents) } },
  });
  const balanceAfterCents = cents(wallet.pendingBalance);
  await tx.vendorWalletLedger.create({
    data: {
      walletId: wallet.id,
      bookingFinanceId: finance.id,
      type: VendorWalletEntryType.BOOKING_PENDING_CREDIT,
      bucket: VendorWalletBucket.PENDING,
      amount: decimal(bookingAmountCents),
      balanceBefore: decimal(balanceAfterCents - bookingAmountCents),
      balanceAfter: decimal(balanceAfterCents),
      idempotencyKey: `booking-finance:${finance.id}:pending-credit`,
      reference: bookingId,
      paymentReference: booking.payments.map((payment) => payment.transactionId).filter(Boolean).join(",").slice(0, 200) || undefined,
      description: `Pending funds for fully paid booking ${bookingId}`,
      metadata: { commissionRuleId: rule.id, paymentCount: booking.payments.length },
    },
  });
  await tx.bookingFinanceAuditLog.create({ data: { targetType: "BOOKING_FINANCE", targetId: finance.id, action: "CREATED_FROM_FULL_PAYMENT", toStatus: BookingFinanceApprovalStatus.PENDING, details: { bookingId, paymentCount: booking.payments.length } } });
  return finance;
}

export async function getCommissionRule() {
  return prisma.bookingCommissionRule.findFirst({
    where: { isActive: true, effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
  });
}

export async function updateCommissionRule(actorId: string, input: { commissionType: BookingCommissionType; commissionValue: number; currency: string; effectiveFrom?: Date }) {
  const ruleValue = new Prisma.Decimal(input.commissionValue);
  if (input.commissionType === BookingCommissionType.PERCENTAGE && (ruleValue.lt(0) || ruleValue.gt(100))) {
    throw { status: 400, code: "INVALID_COMMISSION_VALUE", message: "Percentage commission must be between 0 and 100" };
  }
  if (input.commissionType === BookingCommissionType.FIXED && ruleValue.lt(0)) {
    throw { status: 400, code: "INVALID_COMMISSION_VALUE", message: "Fixed commission must be non-negative" };
  }
  const effectiveFrom = input.effectiveFrom ?? new Date();
  const saved = await prisma.$transaction(async (tx) => {
    const active = await tx.bookingCommissionRule.findFirst({ where: { isActive: true, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
    if (active && effectiveFrom <= active.effectiveFrom) throw { status: 400, code: "INVALID_EFFECTIVE_DATE", message: "A new commission rule must take effect after the current active rule" };
    if (active) await tx.bookingCommissionRule.update({ where: { id: active.id }, data: { effectiveTo: effectiveFrom } });
    const saved = await tx.bookingCommissionRule.create({
      data: { commissionType: input.commissionType, commissionValue: ruleValue, currency: input.currency.toUpperCase(), effectiveFrom, createdById: actorId },
    });
    await tx.bookingFinanceAuditLog.create({ data: { actorId, targetType: "BOOKING_COMMISSION_RULE", targetId: saved.id, action: "COMMISSION_RULE_CREATED", details: { commissionType: saved.commissionType, commissionValue: saved.commissionValue.toString(), currency: saved.currency, effectiveFrom } } });
    return saved;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await backfillEligibleBookingsWithoutFinance();
  return saved;
}

async function backfillEligibleBookingsWithoutFinance() {
  let cursor: string | undefined;
  let created = 0;
  for (;;) {
    const bookings = await prisma.booking.findMany({
      where: {
        id: cursor ? { gt: cursor } : undefined,
        financialTransaction: null,
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
        payments: { some: { status: PaymentStatus.COMPLETED } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 100,
    });
    if (!bookings.length) break;
    await prisma.$transaction(async (tx) => {
      for (const booking of bookings) {
        if (await recordEligibleBookingFinance(tx, booking.id)) created += 1;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    cursor = bookings[bookings.length - 1].id;
    if (bookings.length < 100) break;
  }
  return created;
}

export async function listFinancialTransactions(query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.BookingFinancialTransactionWhereInput = {};
  if (query.bookingId) where.bookingId = String(query.bookingId);
  if (query.vendorId) where.vendorId = String(query.vendorId);
  if (query.salonId) where.salonId = String(query.salonId);
  if (query.branchId) where.branchId = String(query.branchId);
  if (query.customerId) where.customerId = String(query.customerId);
  if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
  if (query.settlementStatus) where.settlementStatus = query.settlementStatus;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.transactionType) where.walletEntries = { some: { type: query.transactionType } };
  if (query.staffId) where.staffId = String(query.staffId);
  if (query.startDate || query.endDate) where.createdAt = { ...(query.startDate ? { gte: new Date(query.startDate) } : {}), ...(query.endDate ? { lte: new Date(query.endDate) } : {}) };
  if (query.search) {
    const search = String(query.search).trim();
    where.OR = [
      { bookingId: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
      { vendor: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } },
      { customer: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.bookingFinancialTransaction.findMany({ where, include: includeFinance, orderBy: { [query.sortBy ?? "createdAt"]: query.sortOrder === "asc" ? "asc" : "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.bookingFinancialTransaction.count({ where }),
  ]);
  const data = items.map((item) => ({
    ...item,
    transactionId: item.id,
    commissionRate: item.commissionValue.toString(),
    transactionType: item.walletEntries[0]?.type ?? VendorWalletEntryType.BOOKING_PENDING_CREDIT,
    razorpayReference: item.settlements?.find((settlement) => settlement.razorpayPayoutId)?.razorpayPayoutId ?? null,
    actions: financeTransactionActions(item.approvalStatus),
  }));
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 };
  return { data, items: data, pagination };
}

export async function getFinancialTransaction(id: string, vendorId?: string) {
  const transaction = await prisma.bookingFinancialTransaction.findFirst({ where: { id, ...(vendorId ? { vendorId } : {}) }, include: { ...includeFinance, walletEntries: { orderBy: { createdAt: "asc" } }, settlements: { orderBy: { createdAt: "desc" } } } });
  if (!transaction) throw { status: 404, code: "BOOKING_FINANCE_NOT_FOUND", message: "Booking finance transaction not found" };
  const settlementIds = transaction.settlements.map((settlement) => settlement.id);
  const auditLogs = await prisma.bookingFinanceAuditLog.findMany({
    where: { OR: [{ targetType: "BOOKING_FINANCE", targetId: id }, ...(settlementIds.length ? [{ targetType: "VENDOR_SETTLEMENT", targetId: { in: settlementIds } }] : [])] },
    orderBy: { createdAt: "asc" },
  });
  return {
    ...transaction,
    transactionId: transaction.id,
    commissionRate: transaction.commissionValue.toString(),
    transactionType: transaction.walletEntries[0]?.type ?? VendorWalletEntryType.BOOKING_PENDING_CREDIT,
    razorpayReference: transaction.settlements.find((settlement) => settlement.razorpayPayoutId)?.razorpayPayoutId ?? null,
    actions: financeTransactionActions(transaction.approvalStatus),
    auditLogs,
  };
}

export async function decideFinancialTransaction(actorId: string, id: string, decision: "APPROVE" | "REJECT" | "HOLD", reason?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
    const finance = await tx.bookingFinancialTransaction.findUnique({ where: { id }, include: { booking: { select: { status: true, finalAmount: true, totalPaid: true } } } });
    if (!finance) throw { status: 404, code: "BOOKING_FINANCE_NOT_FOUND", message: "Booking finance transaction not found" };
    if (!decisionAllowed(decision, finance.approvalStatus)) {
      throw decisionConflict(decision, finance.approvalStatus);
    }
    if (decision === "HOLD") {
      const changed = await tx.bookingFinancialTransaction.updateMany({
        where: { id, approvalStatus: finance.approvalStatus },
        data: { approvalStatus: BookingFinanceApprovalStatus.HELD, decisionReason: reason ?? null },
      });
      if (!changed.count) {
        const current = await tx.bookingFinancialTransaction.findUnique({ where: { id }, select: { approvalStatus: true } });
        throw decisionConflict(decision, current?.approvalStatus ?? finance.approvalStatus);
      }
      const held = await tx.bookingFinancialTransaction.findUniqueOrThrow({ where: { id } });
      await tx.bookingFinanceAuditLog.create({ data: { actorId, targetType: "BOOKING_FINANCE", targetId: id, action: "HELD", fromStatus: finance.approvalStatus, toStatus: held.approvalStatus, reason } });
      return held;
    }
    if (decision === "APPROVE" && ((finance.booking.status === BookingStatus.CANCELLED || finance.booking.status === BookingStatus.NO_SHOW) || cents(finance.booking.totalPaid) < cents(finance.booking.finalAmount))) {
      throw { status: 409, code: "BOOKING_NOT_FINANCIALLY_ELIGIBLE", message: "Only fully paid, non-cancelled bookings can be approved" };
    }
    const wallet = await tx.vendorWallet.findUnique({ where: { vendorId: finance.vendorId } });
    if (!wallet) throw { status: 500, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet was not initialized" };
    const grossCents = cents(finance.vendorGrossAmount);
    if (decision === "APPROVE") {
      const commissionCents = cents(finance.commissionAmount);
      const approvedAt = new Date();
      const changed = await tx.bookingFinancialTransaction.updateMany({
        where: { id, approvalStatus: finance.approvalStatus },
        data: {
          approvalStatus: BookingFinanceApprovalStatus.APPROVED,
          settlementStatus: BookingSettlementStatus.ELIGIBLE,
          approvedById: actorId,
          approvedAt,
          decisionReason: reason ?? null,
        },
      });
      if (!changed.count) {
        const current = await tx.bookingFinancialTransaction.findUnique({ where: { id }, select: { approvalStatus: true } });
        throw decisionConflict(decision, current?.approvalStatus ?? finance.approvalStatus);
      }
      await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.PENDING, deltaCents: -grossCents, type: VendorWalletEntryType.PENDING_RELEASE, idempotencyKey: `booking-finance:${id}:approval-pending-release`, bookingFinanceId: id, createdById: actorId, reference: finance.bookingId, description: "Release approved booking from pending wallet" });
      await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.AVAILABLE, deltaCents: grossCents, type: VendorWalletEntryType.VENDOR_PAYABLE_CREDIT, idempotencyKey: `booking-finance:${id}:approval-payable-credit`, bookingFinanceId: id, createdById: actorId, reference: finance.bookingId, description: "Credit approved booking gross amount to payable wallet" });
      if (commissionCents > 0) await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.AVAILABLE, deltaCents: -commissionCents, type: VendorWalletEntryType.COMMISSION_DEBIT, idempotencyKey: `booking-finance:${id}:commission-debit`, bookingFinanceId: id, createdById: actorId, reference: finance.bookingId, description: "Deduct platform commission from vendor payable" });
      const approved = await tx.bookingFinancialTransaction.findUniqueOrThrow({ where: { id } });
      await tx.bookingFinanceAuditLog.create({ data: { actorId, targetType: "BOOKING_FINANCE", targetId: id, action: "APPROVED", fromStatus: finance.approvalStatus, toStatus: approved.approvalStatus, reason, details: { commissionAmount: finance.commissionAmount.toString(), vendorPayableAmount: finance.vendorPayableAmount.toString() } } });
      return approved;
    }
    const changed = await tx.bookingFinancialTransaction.updateMany({
      where: { id, approvalStatus: finance.approvalStatus },
      data: {
        approvalStatus: BookingFinanceApprovalStatus.REJECTED,
        settlementStatus: BookingSettlementStatus.NOT_READY,
        rejectedById: actorId,
        rejectedAt: new Date(),
        decisionReason: reason ?? null,
      },
    });
    if (!changed.count) {
      const current = await tx.bookingFinancialTransaction.findUnique({ where: { id }, select: { approvalStatus: true } });
      throw decisionConflict(decision, current?.approvalStatus ?? finance.approvalStatus);
    }
    await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.PENDING, deltaCents: -grossCents, type: VendorWalletEntryType.CANCELLATION_REVERSAL, idempotencyKey: `booking-finance:${id}:rejection-reversal`, bookingFinanceId: id, createdById: actorId, reference: finance.bookingId, description: "Reverse pending booking funds rejected by admin" });
    const rejected = await tx.bookingFinancialTransaction.findUniqueOrThrow({ where: { id } });
    await tx.bookingFinanceAuditLog.create({ data: { actorId, targetType: "BOOKING_FINANCE", targetId: id, action: "REJECTED", fromStatus: finance.approvalStatus, toStatus: rejected.approvalStatus, reason } });
    return rejected;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      const current = await prisma.bookingFinancialTransaction.findUnique({ where: { id }, select: { approvalStatus: true } });
      if (current && !decisionAllowed(decision, current.approvalStatus)) {
        throw decisionConflict(decision, current.approvalStatus);
      }
      throw { status: 409, code: "FINANCE_CONCURRENT_UPDATE", message: "This booking finance transaction changed while the action was being processed. Refresh and try again." };
    }
    throw error;
  }
}

export async function getVendorWallet(vendorId: string) {
  const [wallet, aggregates, ledgerTotals] = await Promise.all([
    prisma.vendorWallet.findUnique({ where: { vendorId } }),
    prisma.bookingFinancialTransaction.aggregate({ where: { vendorId }, _sum: { bookingAmount: true, commissionAmount: true, vendorPayableAmount: true } }),
    prisma.vendorWalletLedger.groupBy({ by: ["type"], where: { wallet: { vendorId } }, _sum: { amount: true } }),
  ]);
  const credited = ledgerTotals.reduce((sum, row) => row._sum.amount && row._sum.amount.gt(0) ? sum.add(row._sum.amount) : sum, new Prisma.Decimal(0));
  const debited = ledgerTotals.reduce((sum, row) => row._sum.amount && row._sum.amount.lt(0) ? sum.add(row._sum.amount.abs()) : sum, new Prisma.Decimal(0));
  const commissionDeducted = ledgerTotals.find((row) => row.type === VendorWalletEntryType.COMMISSION_DEBIT)?._sum.amount?.abs() ?? new Prisma.Decimal(0);
  const recentTransactions = await listVendorWalletEntries(vendorId, { page: 1, limit: 5 });
  return {
    wallet: wallet ?? { vendorId, pendingBalance: new Prisma.Decimal(0), availableBalance: new Prisma.Decimal(0), processingBalance: new Prisma.Decimal(0), paidBalance: new Prisma.Decimal(0), currency: "INR" },
    totals: {
      totalBookingValue: aggregates._sum.bookingAmount ?? new Prisma.Decimal(0),
      totalCommission: aggregates._sum.commissionAmount ?? new Prisma.Decimal(0),
      totalVendorPayable: aggregates._sum.vendorPayableAmount ?? new Prisma.Decimal(0),
      totalCredited: credited,
      totalDebited: debited,
      commissionDeducted,
      totalSettled: wallet?.paidBalance ?? new Prisma.Decimal(0),
    },
    recentTransactions: recentTransactions.data,
  };
}

export async function listVendorFinanceLookups(
  vendorId: string,
  type: "salons" | "branches",
  query: { search?: string; salonId?: string; page?: number; limit?: number } = {},
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const search = query.search?.trim();
  const where: Prisma.SalonWhereInput = type === "salons"
    ? { ownerId: vendorId, parentId: null, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) }
    : {
      parentId: { not: null },
      parent: { is: { ownerId: vendorId, ...(query.salonId ? { id: query.salonId } : {}) } },
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
  const [rows, total] = await Promise.all([
    prisma.salon.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.salon.count({ where }),
  ]);
  const data = rows.map(({ id, name }) => ({ id, name, label: name }));
  return {
    data,
    items: data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 },
  };
}

export async function listVendorWalletEntries(vendorId: string, query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.VendorWalletLedgerWhereInput = { wallet: { vendorId } };
  const startDate = query.startDate ?? query.from;
  const endDate = query.endDate ?? query.to;
  if (startDate || endDate) where.createdAt = { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) };
  if (query.bookingId) where.reference = String(query.bookingId);
  if (query.type) where.type = query.type;
  if (query.bucket) where.bucket = query.bucket;
  if (query.status) where.settlement = { is: { status: query.status } };
  if (query.salonName || query.branchName || query.bookingNumber) {
    where.bookingFinance = {
      ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
      ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
      ...(query.bookingNumber ? { bookingId: { contains: String(query.bookingNumber).replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" } } : {}),
    };
  }
  if (query.transactionReference) where.OR = [
    { reference: { contains: String(query.transactionReference), mode: "insensitive" } },
    { paymentReference: { contains: String(query.transactionReference), mode: "insensitive" } },
    { razorpayReference: { contains: String(query.transactionReference), mode: "insensitive" } },
    { settlement: { is: { referenceId: { contains: String(query.transactionReference), mode: "insensitive" } } } },
  ];
  if (query.search) where.AND = [
    ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
    { OR: [
      { reference: { contains: String(query.search), mode: "insensitive" } },
      { paymentReference: { contains: String(query.search), mode: "insensitive" } },
      { razorpayReference: { contains: String(query.search), mode: "insensitive" } },
      { description: { contains: String(query.search), mode: "insensitive" } },
    ] },
  ];
  const [items, total] = await Promise.all([
    prisma.vendorWalletLedger.findMany({
      where,
      include: {
        bookingFinance: {
          select: {
            bookingId: true,
            booking: { select: { id: true, createdAt: true } },
            salon: { select: { name: true } },
            branch: { select: { name: true } },
            bookingAmount: true,
            commissionAmount: true,
            vendorPayableAmount: true,
            approvalStatus: true,
            settlementStatus: true,
          },
        },
        settlement: { select: { id: true, referenceId: true, status: true, razorpayPayoutId: true, utr: true } },
      },
      orderBy: { [query.sortBy === "amount" || query.sortBy === "status" ? query.sortBy : "createdAt"]: query.sortOrder === "asc" ? "asc" : "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.vendorWalletLedger.count({ where }),
  ]);
  const data = items.map((item) => ({
    id: item.id,
    transactionReference: item.razorpayReference ?? item.paymentReference ?? item.settlement?.referenceId ?? item.reference ?? `WAL-${item.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: item.bookingFinance ? `BOOK-${item.bookingFinance.booking.createdAt.getUTCFullYear()}-${item.bookingFinance.booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}` : null,
    salonName: item.bookingFinance?.salon.name ?? null,
    branchName: item.bookingFinance?.branch?.name ?? null,
    type: item.type,
    bucket: item.bucket,
    amount: item.amount,
    balanceBefore: item.balanceBefore,
    balanceAfter: item.balanceAfter,
    status: item.settlement?.status ?? item.bookingFinance?.settlementStatus ?? item.bucket,
    description: item.description,
    razorpayReference: item.razorpayReference ?? item.settlement?.razorpayPayoutId ?? null,
    createdAt: item.createdAt,
  }));
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 };
  return { data, items: data, pagination };
}

export async function getVendorWalletEntry(vendorId: string, id: string) {
  const entry = await prisma.vendorWalletLedger.findFirst({
    where: { id, wallet: { vendorId } },
    include: {
      bookingFinance: {
        select: {
          booking: { select: { id: true, createdAt: true } },
          salon: { select: { name: true } },
          branch: { select: { name: true } },
          bookingAmount: true,
          commissionAmount: true,
          vendorPayableAmount: true,
          settlementStatus: true,
        },
      },
      settlement: { select: { referenceId: true, status: true, razorpayPayoutId: true } },
    },
  });
  if (!entry) throw { status: 404, code: "VENDOR_WALLET_ENTRY_NOT_FOUND", message: "Wallet transaction was not found" };
  return {
    id: entry.id,
    transactionReference: entry.razorpayReference ?? entry.paymentReference ?? entry.settlement?.referenceId ?? entry.reference ?? `WAL-${entry.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: entry.bookingFinance ? `BOOK-${entry.bookingFinance.booking.createdAt.getUTCFullYear()}-${entry.bookingFinance.booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}` : null,
    salonName: entry.bookingFinance?.salon.name ?? null,
    branchName: entry.bookingFinance?.branch?.name ?? null,
    bookingAmount: entry.bookingFinance?.bookingAmount ?? null,
    commissionAmount: entry.bookingFinance?.commissionAmount ?? null,
    vendorPayableAmount: entry.bookingFinance?.vendorPayableAmount ?? null,
    type: entry.type, bucket: entry.bucket, amount: entry.amount,
    balanceBefore: entry.balanceBefore, balanceAfter: entry.balanceAfter,
    status: entry.settlement?.status ?? entry.bookingFinance?.settlementStatus ?? entry.bucket,
    description: entry.description,
    razorpayReference: entry.razorpayReference ?? entry.settlement?.razorpayPayoutId ?? null,
    createdAt: entry.createdAt,
  };
}

export async function listAdminWalletEntries(query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.VendorWalletLedgerWhereInput = {};
  if (query.vendorId) where.wallet = { vendorId: String(query.vendorId) };
  if (query.bookingId) where.reference = String(query.bookingId);
  if (query.type) where.type = query.type;
  if (query.bucket) where.bucket = query.bucket;
  if (query.startDate || query.endDate) where.createdAt = { ...(query.startDate ? { gte: new Date(query.startDate) } : {}), ...(query.endDate ? { lte: new Date(query.endDate) } : {}) };
  if (query.search) {
    const search = String(query.search).trim();
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { paymentReference: { contains: search, mode: "insensitive" } },
      { razorpayReference: { contains: search, mode: "insensitive" } },
      { wallet: { vendor: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.vendorWalletLedger.findMany({
      where,
      include: {
        wallet: { select: { vendorId: true, vendor: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        bookingFinance: { select: { bookingId: true, customer: { select: { firstName: true, lastName: true } }, salon: { select: { name: true } }, branch: { select: { name: true } } } },
        settlement: { select: { id: true, status: true, razorpayPayoutId: true, utr: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorWalletLedger.count({ where }),
  ]);
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 };
  return { data: items, items, pagination };
}

export type FinancePeriod = "today" | "yesterday" | "week" | "lastWeek" | "month" | "lastMonth" | "year" | "custom";
export type FinanceGranularity = "daily" | "weekly" | "monthly" | "yearly";

export function resolveFinanceDateRange(period: FinancePeriod, startDate?: Date, endDate?: Date, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
  if (period === "custom") {
    if (!startDate || !endDate || startDate > endDate) {
      throw { status: 400, code: "INVALID_FINANCE_DATE_RANGE", message: "Custom reports require a valid startDate and endDate" };
    }
    return { start: startDate, end: new Date(endDate.getTime() + 1) };
  }
  if (period === "today") return { start: today, end: addDays(today, 1) };
  if (period === "yesterday") return { start: addDays(today, -1), end: today };
  if (period === "week" || period === "lastWeek") {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const thisMonday = addDays(today, -mondayOffset);
    const start = period === "week" ? thisMonday : addDays(thisMonday, -7);
    return { start, end: addDays(start, 7) };
  }
  if (period === "month" || period === "lastMonth") {
    const thisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const start = period === "month" ? thisMonth : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
  }
  return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)) };
}

async function financePeriodSummary(start: Date, end: Date) {
  const [financeRows, settlementRows] = await Promise.all([
    prisma.$queryRaw<Array<{ bookingAmount: Prisma.Decimal; commission: Prisma.Decimal; vendorGross: Prisma.Decimal; vendorPayable: Prisma.Decimal; pending: Prisma.Decimal; approved: Prisma.Decimal; processing: Prisma.Decimal }>>(Prisma.sql`
      SELECT
        COALESCE(SUM("bookingAmount"), 0) AS "bookingAmount",
        COALESCE(SUM("commissionAmount"), 0) AS commission,
        COALESCE(SUM("vendorGrossAmount"), 0) AS "vendorGross",
        COALESCE(SUM("vendorPayableAmount"), 0) AS "vendorPayable",
        COALESCE(SUM(CASE WHEN "approvalStatus" IN ('PENDING', 'HELD') THEN "vendorGrossAmount" ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN "settlementStatus" = 'ELIGIBLE' THEN "vendorPayableAmount" ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN "settlementStatus" = 'PROCESSING' THEN "vendorPayableAmount" ELSE 0 END), 0) AS processing
      FROM "BookingFinancialTransaction"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    `),
    prisma.$queryRaw<Array<{ failed: Prisma.Decimal; settled: Prisma.Decimal }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(CASE WHEN "status" = 'FAILED' AND "createdAt" >= ${start} AND "createdAt" < ${end} THEN "amount" ELSE 0 END), 0) AS failed,
        COALESCE(SUM(CASE WHEN "status" = 'PAID' AND "processedAt" >= ${start} AND "processedAt" < ${end} THEN "amount" ELSE 0 END), 0) AS settled
      FROM "VendorSettlement"
    `),
  ]);
  const totals = financeRows[0];
  const settlements = settlementRows[0];
  const value = (amount: Prisma.Decimal | null | undefined) => amount?.toString() ?? "0.00";
  return {
    bookingAmount: value(totals?.bookingAmount),
    commission: value(totals?.commission),
    vendorGross: value(totals?.vendorGross),
    vendorPayable: value(totals?.vendorPayable),
    pending: value(totals?.pending),
    approved: value(totals?.approved),
    processing: value(totals?.processing),
    settled: value(settlements?.settled),
    failed: value(settlements?.failed),
  };
}

export async function pendingSettlementSummary(query: { page?: number; limit?: number; vendorId?: string } = {}) {
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  const razorpayX = await prisma.razorpayConfiguration.findFirst({ where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, enabled: true }, select: { id: true } });
  const configuredMinimum = settings?.minimumSettlementAmount ?? new Prisma.Decimal(0);
  const minimum = configuredMinimum.gt(1) ? configuredMinimum : new Prisma.Decimal(1);
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  const readyWallets = { availableBalance: { gte: minimum }, vendor: { vendorPayoutAccount: { isVerified: true, razorpayFundAccountId: { not: null } } } };
  const [wallets, vendors, eligibleTransactions, pendingApproval, processing, failed, settledToday] = await Promise.all([
    prisma.vendorWallet.aggregate({ where: readyWallets, _sum: { availableBalance: true } }),
    prisma.vendorWallet.count({ where: { availableBalance: { gte: minimum }, vendor: { vendorPayoutAccount: { isVerified: true, razorpayFundAccountId: { not: null } } } } }),
    prisma.bookingFinancialTransaction.count({ where: { settlementStatus: BookingSettlementStatus.ELIGIBLE, approvalStatus: BookingFinanceApprovalStatus.APPROVED, ...(query.vendorId ? { vendorId: query.vendorId } : {}), vendor: { vendorPayoutAccount: { isVerified: true, razorpayFundAccountId: { not: null } }, vendorWallet: { availableBalance: { gte: minimum } } } } }),
    prisma.bookingFinancialTransaction.aggregate({ where: { approvalStatus: { in: [BookingFinanceApprovalStatus.PENDING, BookingFinanceApprovalStatus.HELD] } }, _sum: { vendorGrossAmount: true } }),
    prisma.vendorSettlement.aggregate({ where: { status: { in: [VendorSettlementStatus.PROCESSING, VendorSettlementStatus.PENDING, VendorSettlementStatus.QUEUED] } }, _sum: { amount: true } }),
    prisma.vendorSettlement.aggregate({ where: { status: VendorSettlementStatus.FAILED }, _sum: { amount: true } }),
    prisma.vendorSettlement.aggregate({ where: { status: VendorSettlementStatus.PAID, processedAt: { gte: todayStart, lt: tomorrow } }, _sum: { amount: true } }),
  ]);
  const automaticDue = settings?.settlementMode !== BookingSettlementMode.AUTOMATIC
    || (settings.autoSettlementEnabled && Boolean(settings.nextSettlementAt && settings.nextSettlementAt <= now));
  const payoutReady = Boolean(settings?.encryptedDebitAccountNumber && razorpayX);
  const readyAmount = payoutReady && automaticDue ? wallets._sum.availableBalance?.toString() ?? "0.00" : "0.00";
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const eligibleWhere: Prisma.BookingFinancialTransactionWhereInput = {
    settlementStatus: BookingSettlementStatus.ELIGIBLE,
    approvalStatus: BookingFinanceApprovalStatus.APPROVED,
    ...(query.vendorId ? { vendorId: query.vendorId } : {}),
    vendor: {
      vendorPayoutAccount: { isVerified: true, razorpayFundAccountId: { not: null } },
      vendorWallet: { availableBalance: { gte: minimum } },
    },
  };
  const transactions = await prisma.bookingFinancialTransaction.findMany({
    where: eligibleWhere,
    include: includeFinance,
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  const pagination = { page, limit, total: eligibleTransactions, totalPages: Math.ceil(eligibleTransactions / limit), hasNextPage: page * limit < eligibleTransactions, hasPreviousPage: page > 1 };
  const data = transactions.map((transaction) => ({
    ...transaction,
    transactionId: transaction.id,
    commissionRate: transaction.commissionValue.toString(),
    transactionType: transaction.walletEntries[0]?.type ?? VendorWalletEntryType.BOOKING_PENDING_CREDIT,
    razorpayReference: transaction.settlements?.find((settlement) => settlement.razorpayPayoutId)?.razorpayPayoutId ?? null,
  }));
  return {
    totalEligibleAmount: wallets._sum.availableBalance?.toString() ?? "0.00",
    todaySettlementAmount: readyAmount,
    pendingApprovalAmount: pendingApproval._sum.vendorGrossAmount?.toString() ?? "0.00",
    failedAmount: failed._sum.amount?.toString() ?? "0.00",
    processingAmount: processing._sum.amount?.toString() ?? "0.00",
    alreadySettledToday: settledToday._sum.amount?.toString() ?? "0.00",
    nextSettlementAt: settings?.nextSettlementAt ?? null,
    eligibleVendorCount: vendors,
    eligibleTransactionCount: eligibleTransactions,
    payoutConfigured: payoutReady,
    data,
    pagination,
  };
}

export async function bookingFinanceReport(options: { period?: FinancePeriod; granularity?: FinanceGranularity; startDate?: Date; endDate?: Date } = {}) {
  const now = new Date();
  const [wallets, all, today, yesterday, week, lastWeek, month, lastMonth, year, selected, pendingSettlement] = await Promise.all([
    prisma.vendorWallet.aggregate({ _sum: { pendingBalance: true, availableBalance: true, processingBalance: true, paidBalance: true } }),
    financePeriodSummary(new Date(0), new Date("9999-12-31T23:59:59.999Z")),
    resolveAndSummarize("today"),
    resolveAndSummarize("yesterday"),
    resolveAndSummarize("week"),
    resolveAndSummarize("lastWeek"),
    resolveAndSummarize("month"),
    resolveAndSummarize("lastMonth"),
    resolveAndSummarize("year"),
    resolveAndSummarize(options.period ?? "month", options.startDate, options.endDate),
    pendingSettlementSummary(),
  ]);
  const value = (amount: Prisma.Decimal | null) => amount?.toString() ?? "0.00";
  const pending = value(wallets._sum.pendingBalance);
  const available = value(wallets._sum.availableBalance);
  const processing = value(wallets._sum.processingBalance);
  const settled = value(wallets._sum.paidBalance);
  const failedSettlement = await prisma.vendorSettlement.aggregate({ where: { status: VendorSettlementStatus.FAILED }, _sum: { amount: true } });
  const range = resolveFinanceDateRange(options.period ?? "month", options.startDate, options.endDate, now);
  const bucket = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[options.granularity ?? "daily"];
  const series = await prisma.$queryRaw<Array<{ period: Date; bookingAmount: Prisma.Decimal; commission: Prisma.Decimal; vendorPayable: Prisma.Decimal }>>(Prisma.sql`
    SELECT date_trunc(${bucket}, f."createdAt") AS period,
      COALESCE(SUM(f."bookingAmount"), 0) AS "bookingAmount",
      COALESCE(SUM(f."commissionAmount"), 0) AS commission,
      COALESCE(SUM(f."vendorPayableAmount"), 0) AS "vendorPayable"
    FROM "BookingFinancialTransaction" f
    WHERE f."createdAt" >= ${range.start} AND f."createdAt" < ${range.end}
    GROUP BY 1 ORDER BY 1
  `);
  const settlementSeries = await prisma.$queryRaw<Array<{ period: Date; settled: Prisma.Decimal }>>(Prisma.sql`
    SELECT date_trunc(${bucket}, s."processedAt") AS period, COALESCE(SUM(s."amount"), 0) AS settled
    FROM "VendorSettlement" s
    WHERE s."status" = 'PAID' AND s."processedAt" >= ${range.start} AND s."processedAt" < ${range.end}
    GROUP BY 1 ORDER BY 1
  `);
  const settledByPeriod = new Map(settlementSeries.map((row) => [row.period.toISOString(), row.settled.toString()]));
  const buckets = new Map<string, { period: Date; bookingAmount: string; commission: string; vendorPayable: string; settled: string }>();
  for (const row of series) {
    buckets.set(row.period.toISOString(), {
      period: row.period,
      bookingAmount: row.bookingAmount.toString(),
      commission: row.commission.toString(),
      vendorPayable: row.vendorPayable.toString(),
      settled: settledByPeriod.get(row.period.toISOString()) ?? "0.00",
    });
  }
  for (const row of settlementSeries) {
    const key = row.period.toISOString();
    const current = buckets.get(key);
    if (current) current.settled = row.settled.toString();
    else buckets.set(key, { period: row.period, bookingAmount: "0.00", commission: "0.00", vendorPayable: "0.00", settled: row.settled.toString() });
  }
  const dateSeries = [...buckets.values()].sort((a, b) => a.period.getTime() - b.period.getTime());
  return {
    summary: {
      totalBookingAmount: all.bookingAmount,
      totalCommission: all.commission,
      totalVendorGross: all.vendorGross,
      totalVendorPayable: all.vendorPayable,
      totalPendingWallet: pending,
      totalAvailableWallet: available,
      totalPendingSettlement: available,
      totalSettled: settled,
      totalRefunded: "0.00",
      totalFailedSettlement: value(failedSettlement._sum.amount),
      totalProcessingSettlement: processing,
      totalWalletAmount: new Prisma.Decimal(pending).plus(available).plus(processing).plus(settled).toString(),
    },
    today,
    yesterday,
    week,
    lastWeek,
    month,
    lastMonth,
    year,
    todayBookingAmount: today.bookingAmount,
    todayCommission: today.commission,
    todayVendorPayable: today.vendorPayable,
    todayPendingSettlement: pendingSettlement.totalEligibleAmount,
    todaySettled: today.settled,
    weekBookingAmount: week.bookingAmount,
    weekCommission: week.commission,
    weekVendorPayable: week.vendorPayable,
    weekPendingSettlement: week.approved,
    weekSettled: week.settled,
    monthBookingAmount: month.bookingAmount,
    monthCommission: month.commission,
    monthVendorPayable: month.vendorPayable,
    monthPendingSettlement: month.approved,
    monthSettled: month.settled,
    yearBookingAmount: year.bookingAmount,
    yearCommission: year.commission,
    yearVendorPayable: year.vendorPayable,
    yearPendingSettlement: year.approved,
    yearSettled: year.settled,
    selectedPeriod: options.period ?? "month",
    selected,
    pendingSettlement,
    series: dateSeries,
    allTime: { bookingRevenue: all.bookingAmount, commission: all.commission, vendorPayable: all.vendorPayable },
  };
}

async function resolveAndSummarize(period: FinancePeriod, startDate?: Date, endDate?: Date) {
  const range = resolveFinanceDateRange(period, startDate, endDate);
  return financePeriodSummary(range.start, range.end);
}

export async function bookingFinancePeriodSummary(input: { period: FinancePeriod; from?: Date; to?: Date }) {
  const range = resolveFinanceDateRange(input.period, input.from, input.to);
  return { period: { from: range.start, to: new Date(range.end.getTime() - 1) }, ...(await financePeriodSummary(range.start, range.end)) };
}

export async function bookingFinanceTrends(input: { period: FinancePeriod; groupBy: "day" | "week" | "month" | "year"; from?: Date; to?: Date }) {
  const range = resolveFinanceDateRange(input.period, input.from, input.to);
  const financeRows = await prisma.$queryRaw<Array<{ period: Date; bookingAmount: Prisma.Decimal; commission: Prisma.Decimal; vendorPayable: Prisma.Decimal; pending: Prisma.Decimal; approved: Prisma.Decimal; processing: Prisma.Decimal; failed: Prisma.Decimal }>>(Prisma.sql`
    SELECT date_trunc(${input.groupBy}, f."createdAt") AS period,
      COALESCE(SUM(f."bookingAmount"), 0) AS "bookingAmount",
      COALESCE(SUM(f."commissionAmount"), 0) AS commission,
      COALESCE(SUM(f."vendorPayableAmount"), 0) AS "vendorPayable",
      COALESCE(SUM(CASE WHEN f."approvalStatus" IN ('PENDING', 'HELD') THEN f."vendorGrossAmount" ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN f."settlementStatus" = 'ELIGIBLE' THEN f."vendorPayableAmount" ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN f."settlementStatus" = 'PROCESSING' THEN f."vendorPayableAmount" ELSE 0 END), 0) AS processing,
      COALESCE(SUM(CASE WHEN f."settlementStatus" = 'FAILED' THEN f."vendorPayableAmount" ELSE 0 END), 0) AS failed
    FROM "BookingFinancialTransaction" f
    WHERE f."createdAt" >= ${range.start} AND f."createdAt" < ${range.end}
    GROUP BY 1 ORDER BY 1
  `);
  const settledRows = await prisma.$queryRaw<Array<{ period: Date; settled: Prisma.Decimal }>>(Prisma.sql`
    SELECT date_trunc(${input.groupBy}, s."processedAt") AS period, COALESCE(SUM(s."amount"), 0) AS settled
    FROM "VendorSettlement" s
    WHERE s."status" = 'PAID' AND s."processedAt" >= ${range.start} AND s."processedAt" < ${range.end}
    GROUP BY 1 ORDER BY 1
  `);
  const settledByPeriod = new Map(settledRows.map((row) => [row.period.toISOString(), row.settled.toString()]));
  const data = financeRows.map((row) => ({
    period: row.period,
    bookingAmount: row.bookingAmount.toString(),
    commission: row.commission.toString(),
    vendorPayable: row.vendorPayable.toString(),
    pending: row.pending.toString(),
    approved: row.approved.toString(),
    processing: row.processing.toString(),
    settled: settledByPeriod.get(row.period.toISOString()) ?? "0.00",
    failed: row.failed.toString(),
  }));
  for (const row of settledRows) {
    if (!data.some((item) => new Date(item.period).toISOString() === row.period.toISOString())) {
      data.push({ period: row.period, bookingAmount: "0.00", commission: "0.00", vendorPayable: "0.00", pending: "0.00", approved: "0.00", processing: "0.00", settled: row.settled.toString(), failed: "0.00" });
    }
  }
  data.sort((left, right) => new Date(left.period).getTime() - new Date(right.period).getTime());
  return { period: { from: range.start, to: new Date(range.end.getTime() - 1) }, groupBy: input.groupBy, data };
}

export async function listVendorFinancialSummaries(query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.BookingFinancialTransactionWhereInput = {};
  if (query.vendorId) where.vendorId = String(query.vendorId);
  if (query.salonId) where.salonId = String(query.salonId);
  if (query.branchId) where.branchId = String(query.branchId);
  if (query.customerId) where.customerId = String(query.customerId);
  if (query.staffId) where.staffId = String(query.staffId);
  if (query.bookingId) where.bookingId = String(query.bookingId);
  if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
  if (query.settlementStatus) where.settlementStatus = query.settlementStatus;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.startDate || query.endDate) where.createdAt = { ...(query.startDate ? { gte: new Date(query.startDate) } : {}), ...(query.endDate ? { lte: new Date(query.endDate) } : {}) };
  if (query.search) {
    const search = String(query.search).trim();
    where.vendor = { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] };
  }
  const [groups, total] = await Promise.all([
    prisma.bookingFinancialTransaction.groupBy({ by: ["vendorId"], where, _sum: { bookingAmount: true, commissionAmount: true, vendorPayableAmount: true }, _count: { _all: true }, orderBy: { _sum: { bookingAmount: "desc" } }, skip: (page - 1) * limit, take: limit }),
    prisma.bookingFinancialTransaction.groupBy({ by: ["vendorId"], where }),
  ]);
  const wallets = await prisma.vendorWallet.findMany({ where: { vendorId: { in: groups.map((item) => item.vendorId) } }, include: { vendor: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  const walletByVendor = new Map(wallets.map((wallet) => [wallet.vendorId, wallet]));
  const data = groups.map((group) => {
    const wallet = walletByVendor.get(group.vendorId);
    return {
      vendor: wallet?.vendor ?? { id: group.vendorId, firstName: "", lastName: "", email: "" },
      bookingAmount: group._sum.bookingAmount?.toString() ?? "0.00",
      commission: group._sum.commissionAmount?.toString() ?? "0.00",
      vendorPayable: group._sum.vendorPayableAmount?.toString() ?? "0.00",
      pending: wallet?.pendingBalance.toString() ?? "0.00",
      available: wallet?.availableBalance.toString() ?? "0.00",
      settled: wallet?.paidBalance.toString() ?? "0.00",
      transactionCount: group._count._all,
    };
  });
  return {
    data,
    items: data,
    pagination: { page, limit, total: total.length, totalPages: Math.ceil(total.length / limit), hasNextPage: page * limit < total.length, hasPreviousPage: page > 1 },
  };
}

export async function getSettlementSettings() {
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  if (!settings) return { settlementMode: BookingSettlementMode.MANUAL, intervalValue: 1, intervalUnit: BookingSettlementIntervalUnit.DAYS, minimumSettlementAmount: new Prisma.Decimal(0), autoSettlementEnabled: false, nextSettlementAt: null, sourceAccountConfigured: false, payoutMode: "IMPS" };
  const sourceAccountNumber = settings.encryptedDebitAccountNumber ? decrypt(settings.encryptedDebitAccountNumber) : null;
  return { ...settings, encryptedDebitAccountNumber: undefined, sourceAccountNumber: sourceAccountNumber ? `********${sourceAccountNumber.slice(-4)}` : null, sourceAccountConfigured: Boolean(sourceAccountNumber) };
}

export async function updateSettlementSettings(actorId: string, input: {
  settlementMode: BookingSettlementMode;
  intervalValue: number;
  intervalUnit: BookingSettlementIntervalUnit;
  minimumSettlementAmount: number;
  autoSettlementEnabled: boolean;
  sourceAccountNumber?: string;
  payoutMode: string;
}) {
  if (!Number.isInteger(input.intervalValue) || input.intervalValue <= 0) throw { status: 400, code: "INVALID_SETTLEMENT_INTERVAL", message: "intervalValue must be a positive integer" };
  if (input.minimumSettlementAmount < 0 || !Number.isFinite(input.minimumSettlementAmount)) throw { status: 400, code: "INVALID_MINIMUM_SETTLEMENT", message: "minimumSettlementAmount must be non-negative" };
  if (!["IMPS", "NEFT", "RTGS", "UPI"].includes(input.payoutMode)) throw { status: 400, code: "INVALID_PAYOUT_MODE", message: "Unsupported RazorpayX payout mode" };
  const current = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  const sourceAccountNumber = input.sourceAccountNumber?.trim();
  if (sourceAccountNumber && !/^[A-Za-z0-9]{5,35}$/.test(sourceAccountNumber)) throw { status: 400, code: "INVALID_SOURCE_ACCOUNT", message: "Source bank account number is invalid" };
  if (input.autoSettlementEnabled && input.settlementMode !== BookingSettlementMode.AUTOMATIC) throw { status: 400, code: "INVALID_SETTLEMENT_MODE", message: "Automatic settlements require AUTOMATIC settlement mode" };
  if (input.autoSettlementEnabled && !sourceAccountNumber && !current?.encryptedDebitAccountNumber) throw { status: 400, code: "SOURCE_ACCOUNT_REQUIRED", message: "Configure the RazorpayX debit account before enabling automatic settlements" };
  const now = new Date();
  return prisma.bookingSettlementSettings.upsert({
    where: { id: "global" },
    create: { id: "global", settlementMode: input.settlementMode, intervalValue: input.intervalValue, intervalUnit: input.intervalUnit, minimumSettlementAmount: new Prisma.Decimal(input.minimumSettlementAmount), autoSettlementEnabled: input.autoSettlementEnabled, nextSettlementAt: input.autoSettlementEnabled ? nextSettlementDate(now, input.intervalValue, input.intervalUnit) : null, encryptedDebitAccountNumber: sourceAccountNumber ? encrypt(sourceAccountNumber) : null, payoutMode: input.payoutMode, updatedById: actorId },
    update: { settlementMode: input.settlementMode, intervalValue: input.intervalValue, intervalUnit: input.intervalUnit, minimumSettlementAmount: new Prisma.Decimal(input.minimumSettlementAmount), autoSettlementEnabled: input.autoSettlementEnabled, nextSettlementAt: input.autoSettlementEnabled ? nextSettlementDate(now, input.intervalValue, input.intervalUnit) : null, encryptedDebitAccountNumber: sourceAccountNumber && !/^\*+\d{4}$/.test(sourceAccountNumber) ? encrypt(sourceAccountNumber) : undefined, payoutMode: input.payoutMode, updatedById: actorId },
  });
}

function nextSettlementDate(from: Date, intervalValue: number, unit: BookingSettlementIntervalUnit) {
  const next = new Date(from);
  if (unit === BookingSettlementIntervalUnit.SECONDS) next.setUTCSeconds(next.getUTCSeconds() + intervalValue);
  else if (unit === BookingSettlementIntervalUnit.MINUTES) next.setUTCMinutes(next.getUTCMinutes() + intervalValue);
  else if (unit === BookingSettlementIntervalUnit.HOURS) next.setUTCHours(next.getUTCHours() + intervalValue);
  else if (unit === BookingSettlementIntervalUnit.DAYS) next.setUTCDate(next.getUTCDate() + intervalValue);
  else if (unit === BookingSettlementIntervalUnit.WEEKS) next.setUTCDate(next.getUTCDate() + 7 * intervalValue);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + intervalValue);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

export async function listSettlements(query: any = {}, vendorId?: string) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.VendorSettlementWhereInput = {
    ...(vendorId ? { vendorId } : query.vendorId ? { vendorId: String(query.vendorId) } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  if (query.salonId || query.branchId) where.bookingTransactions = { some: { ...(query.salonId ? { salonId: String(query.salonId) } : {}), ...(query.branchId ? { branchId: String(query.branchId) } : {}) } };
  if (query.startDate || query.endDate) where.createdAt = { ...(query.startDate ? { gte: new Date(query.startDate) } : {}), ...(query.endDate ? { lte: new Date(query.endDate) } : {}) };
  const [items, total] = await Promise.all([
    prisma.vendorSettlement.findMany({
      where,
      include: {
        vendor: { select: { id: true, firstName: true, lastName: true, email: true } },
        bookingTransactions: { select: { id: true, bookingId: true, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorSettlement.count({ where }),
  ]);
  const data = items.map((item) => {
    const salons = [...new Map(item.bookingTransactions.map(({ salon }) => [salon.id, salon])).values()];
    const branches = [...new Map(item.bookingTransactions.flatMap(({ branch }) => branch ? [[branch.id, branch] as const] : [])).values()];
    return {
      ...item,
      settlementId: item.id,
      razorpayReference: item.razorpayPayoutId,
      initiatedAt: item.createdAt,
      completedAt: item.processedAt,
      salon: salons.length === 1 ? salons[0] : null,
      branch: branches.length === 1 ? branches[0] : null,
      salons,
      branches,
    };
  });
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 };
  return { data, items: data, pagination };
}

const razorpayXConfigurationRequired = () => ({
  status: 503,
  code: "RAZORPAYX_NOT_CONFIGURED",
  message: "RazorpayX payout credentials are not configured. Configure RazorpayX in Admin Payment & Wallet settings before processing payouts.",
});

async function enabledPayoutConfiguration() {
  const stored = await prisma.razorpayConfiguration.findFirst({
    where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, enabled: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!stored?.keyId || !stored.encryptedKeySecret) return null;
  let keySecret: string;
  try {
    keySecret = decrypt(stored.encryptedKeySecret);
  } catch {
    throw razorpayXConfigurationRequired();
  }
  if (!keySecret) return null;
  const prefix = stored.environment === "TEST" ? "rzp_test_" : "rzp_live_";
  if (!stored.keyId.startsWith(prefix)) return null;
  return { ...stored, keySecret };
}

async function payoutConfiguration() {
  const config = await enabledPayoutConfiguration();
  if (!config) throw razorpayXConfigurationRequired();
  return config;
}

export async function getRazorpayXConfiguration() {
  const stored = await prisma.razorpayConfiguration.findFirst({
    where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, enabled: true },
    orderBy: { updatedAt: "desc" },
  }) ?? await prisma.razorpayConfiguration.findFirst({
    where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null },
    orderBy: { updatedAt: "desc" },
  });
  if (!stored) {
    return {
      provider: "RAZORPAYX",
      environment: null,
      keyId: null,
      enabled: false,
      keySecretConfigured: false,
      webhookSecretConfigured: false,
      payoutConfigured: false,
      missing: ["keyId", "keySecret", "webhookSecret"],
    };
  }
  const keySecretConfigured = Boolean(stored.encryptedKeySecret);
  const webhookSecretConfigured = Boolean(stored.encryptedWebhookSecret);
  const keyModeValid = stored.environment === "TEST"
    ? stored.keyId.startsWith("rzp_test_")
    : stored.keyId.startsWith("rzp_live_");
  const payoutConfigured = stored.enabled && keyModeValid && keySecretConfigured;
  return {
    provider: "RAZORPAYX",
    environment: stored.environment,
    keyId: stored.keyId,
    enabled: stored.enabled,
    keySecretConfigured,
    webhookSecretConfigured,
    payoutConfigured,
    missing: [
      ...(!stored.keyId || !keyModeValid ? ["keyId"] : []),
      ...(!keySecretConfigured ? ["keySecret"] : []),
      ...(!webhookSecretConfigured ? ["webhookSecret"] : []),
      ...(!stored.enabled ? ["enabled"] : []),
    ],
  };
}

export async function updateRazorpayXConfiguration(actorId: string, input: { environment: "TEST" | "LIVE"; keyId: string; keySecret?: string; webhookSecret?: string; enabled: boolean }) {
  const prefix = input.environment === "TEST" ? "rzp_test_" : "rzp_live_";
  if (input.enabled && !input.keyId.startsWith(prefix)) throw { status: 400, code: "RAZORPAYX_KEY_MODE_MISMATCH", message: `A ${input.environment} RazorpayX key is required` };
  const current = await prisma.razorpayConfiguration.findFirst({ where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, environment: input.environment } });
  const secret = input.keySecret?.trim() || (current ? decrypt(current.encryptedKeySecret) : "");
  const webhookSecret = input.webhookSecret?.trim() || (current?.encryptedWebhookSecret ? decrypt(current.encryptedWebhookSecret) : "");
  if (input.enabled && (!secret || !webhookSecret)) throw { status: 400, code: "RAZORPAYX_SECRETS_REQUIRED", message: "RazorpayX API and webhook secrets are required before enabling payouts" };
  const data = { keyId: input.keyId, encryptedKeySecret: encrypt(secret), encryptedWebhookSecret: webhookSecret ? encrypt(webhookSecret) : null, enabled: input.enabled, updatedBy: actorId };
  if (current) await prisma.razorpayConfiguration.update({ where: { id: current.id }, data });
  else await prisma.razorpayConfiguration.create({ data: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, environment: input.environment, createdBy: actorId, ...data } });
  await prisma.subscriptionAuditLog.create({ data: { actorId, action: "RAZORPAYX_PAYOUT_CONFIGURATION_UPDATED", targetType: "RAZORPAYX_CONFIGURATION", targetId: current?.id ?? input.environment, details: { environment: input.environment, keyId: input.keyId, secretUpdated: Boolean(input.keySecret?.trim()), webhookSecretUpdated: Boolean(input.webhookSecret?.trim()) } } });
  return getRazorpayXConfiguration();
}

async function razorpayXRequest(path: string, method: "GET" | "POST" | "PATCH", body?: unknown, idempotencyKey?: string) {
  const config = await payoutConfiguration();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Payout-Idempotency": idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: any = await response.json().catch(() => null);
  if (!response.ok) {
    throw { status: 502, code: "RAZORPAYX_REQUEST_FAILED", providerStatus: response.status, message: payload?.error?.description ?? `RazorpayX request failed with status ${response.status}` };
  }
  return payload;
}

export async function getVendorPayoutAccount(vendorId: string) {
  const account = await prisma.vendorPayoutAccount.findUnique({ where: { vendorId } });
  if (!account) return null;
  const payoutConfiguration = await prisma.razorpayConfiguration.findFirst({
    where: { provider: "RAZORPAYX", scope: "PLATFORM", ownerId: null, enabled: true },
    select: { environment: true, keyId: true, encryptedKeySecret: true },
    orderBy: { updatedAt: "desc" },
  });
  const expectedPrefix = payoutConfiguration?.environment === "TEST" ? "rzp_test_" : "rzp_live_";
  const payoutConfigurationExists = Boolean(
    payoutConfiguration?.keyId.startsWith(expectedPrefix) && payoutConfiguration.encryptedKeySecret,
  );
  const number = decrypt(account.encryptedAccountNumber);
  const payoutReady = Boolean(account.isVerified && account.razorpayFundAccountId);
  return {
    id: account.id,
    accountHolderName: account.accountHolderName,
    bankName: account.bankName,
    accountNumber: `********${number.slice(-4)}`,
    ifscCode: account.ifscCode,
    accountType: account.accountType,
    isVerified: account.isVerified,
    razorpayAccountLinked: Boolean(account.razorpayFundAccountId),
    payoutReady,
    payoutStatus: payoutReady
      ? "READY"
      : !payoutConfigurationExists
        ? "CONFIGURATION_REQUIRED"
        : account.razorpayFundAccountId
          ? "PENDING_VERIFICATION"
          : "PROVIDER_LINK_REQUIRED",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function updateVendorPayoutAccount(vendorId: string, input: { accountHolderName: string; bankName: string; accountNumber: string; ifscCode: string; accountType: string }) {
  const accountNumber = input.accountNumber.trim();
  const ifscCode = input.ifscCode.trim().toUpperCase();
  if (!/^[A-Za-z0-9]{5,35}$/.test(accountNumber)) throw { status: 400, code: "INVALID_BANK_ACCOUNT", message: "Bank account number is invalid" };
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) throw { status: 400, code: "INVALID_IFSC", message: "IFSC code is invalid" };
  if (input.accountHolderName.trim().length < 3 || input.accountHolderName.trim().length > 120) throw { status: 400, code: "INVALID_ACCOUNT_HOLDER", message: "Account holder name must be between 3 and 120 characters" };
  const vendor = await prisma.user.findUnique({ where: { id: vendorId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, roles: { select: { role: { select: { name: true } } } } } });
  if (!vendor || !vendor.roles.some((item) => item.role.name === "VENDOR")) throw { status: 404, code: "VENDOR_NOT_FOUND", message: "Vendor account not found" };
  const current = await prisma.vendorPayoutAccount.findUnique({ where: { vendorId } });
  await prisma.vendorPayoutAccount.upsert({
    where: { vendorId },
    create: {
      vendorId,
      accountHolderName: input.accountHolderName.trim(),
      bankName: input.bankName.trim(),
      encryptedAccountNumber: encrypt(accountNumber),
      ifscCode,
      accountType: input.accountType,
      isVerified: false,
    },
    update: {
      accountHolderName: input.accountHolderName.trim(),
      bankName: input.bankName.trim(),
      encryptedAccountNumber: encrypt(accountNumber),
      ifscCode,
      accountType: input.accountType,
      razorpayFundAccountId: null,
      isVerified: false,
    },
  });

  if (!(await enabledPayoutConfiguration())) return getVendorPayoutAccount(vendorId);

  let contactId = current?.razorpayContactId ?? null;
  if (!contactId) {
    const contact = await razorpayXRequest("/contacts", "POST", {
      name: `${vendor.firstName} ${vendor.lastName ?? ""}`.trim(),
      email: vendor.email,
      contact: `${vendor.countryCode}${vendor.phone}`.replace(/[^\d+]/g, ""),
      type: "vendor",
      reference_id: `vendor_${vendor.id}`,
      notes: { vendorId: vendor.id },
    });
    contactId = contact?.id;
    if (!contactId) throw { status: 502, code: "RAZORPAYX_CONTACT_FAILED", message: "RazorpayX did not return a vendor contact reference" };
    await prisma.vendorPayoutAccount.upsert({
      where: { vendorId },
      create: { vendorId, accountHolderName: input.accountHolderName.trim(), bankName: input.bankName.trim(), encryptedAccountNumber: encrypt(accountNumber), ifscCode, accountType: input.accountType, razorpayContactId: contactId },
      update: { razorpayContactId: contactId },
    });
  }
  const fundAccount = await razorpayXRequest("/fund_accounts", "POST", {
    contact_id: contactId,
    account_type: "bank_account",
    bank_account: { name: input.accountHolderName.trim(), ifsc: ifscCode, account_number: accountNumber },
  });
  if (!fundAccount?.id) throw { status: 502, code: "RAZORPAYX_FUND_ACCOUNT_FAILED", message: "RazorpayX did not return a fund account reference" };
  await prisma.vendorPayoutAccount.upsert({
    where: { vendorId },
    create: { vendorId, accountHolderName: input.accountHolderName.trim(), bankName: input.bankName.trim(), encryptedAccountNumber: encrypt(accountNumber), ifscCode, accountType: input.accountType, razorpayContactId: contactId, razorpayFundAccountId: fundAccount.id, isVerified: Boolean(fundAccount.active) },
    update: { razorpayContactId: contactId, razorpayFundAccountId: fundAccount.id, isVerified: Boolean(fundAccount.active) },
  });
  return getVendorPayoutAccount(vendorId);
}

async function initiateSettlement(actorId: string | undefined, vendorId: string) {
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  if (!settings?.encryptedDebitAccountNumber) throw { status: 503, code: "PAYOUT_SOURCE_ACCOUNT_NOT_CONFIGURED", message: "Configure the platform RazorpayX debit account before settling vendors" };
  if (actorId && settings.settlementMode !== BookingSettlementMode.MANUAL) throw { status: 409, code: "MANUAL_SETTLEMENT_DISABLED", message: "Manual settlement is disabled while AUTOMATIC mode is selected" };
  await payoutConfiguration();
  const recipient = await prisma.vendorPayoutAccount.findUnique({ where: { vendorId } });
  if (!recipient?.razorpayFundAccountId || !recipient.isVerified) throw { status: 409, code: "VENDOR_PAYOUT_ACCOUNT_NOT_READY", message: "Vendor must provide a verified payout bank account before settlement" };
  const minimumCents = Math.max(100, cents(settings.minimumSettlementAmount));
  const settlement = await prisma.$transaction(async (tx) => {
    const wallet = await tx.vendorWallet.findUnique({ where: { vendorId } });
    if (!wallet) throw { status: 404, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet not found" };
    const amountCents = cents(wallet.availableBalance);
    if (amountCents < minimumCents) throw { status: 409, code: "SETTLEMENT_BELOW_MINIMUM", message: "Available balance is below the configured settlement minimum" };
    const changed = await tx.vendorWallet.updateMany({ where: { id: wallet.id, availableBalance: wallet.availableBalance }, data: { availableBalance: { decrement: decimal(amountCents) }, processingBalance: { increment: decimal(amountCents) } } });
    if (!changed.count) throw { status: 409, code: "WALLET_BALANCE_CHANGED", message: "Vendor wallet changed; retry the settlement" };
    const eligible = await tx.bookingFinancialTransaction.findMany({ where: { vendorId, settlementStatus: BookingSettlementStatus.ELIGIBLE, approvalStatus: BookingFinanceApprovalStatus.APPROVED }, select: { id: true } });
    if (!eligible.length) throw { status: 409, code: "NO_SETTLEMENTS_ELIGIBLE", message: "No approved vendor earnings are eligible for settlement" };
    const referenceId = `zipp_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const idempotencyKey = crypto.randomUUID();
    const created = await tx.vendorSettlement.create({
      data: {
        vendorId,
        amount: decimal(amountCents),
        currency: wallet.currency,
        idempotencyKey,
        referenceId,
        initiatedById: actorId,
        bookingTransactions: { connect: eligible.map(({ id }) => ({ id })) },
      },
    });
    await tx.vendorWalletLedger.create({
      data: { walletId: wallet.id, settlementId: created.id, type: VendorWalletEntryType.SETTLEMENT_INITIATED, bucket: VendorWalletBucket.AVAILABLE, amount: decimal(-amountCents), balanceBefore: wallet.availableBalance, balanceAfter: decimal(0), idempotencyKey: `settlement:${created.id}:available-debit`, reference: referenceId, description: "Reserve available vendor funds for RazorpayX settlement", createdById: actorId, processedAt: new Date() },
    });
    await tx.vendorWalletLedger.create({
      data: { walletId: wallet.id, settlementId: created.id, type: VendorWalletEntryType.SETTLEMENT_INITIATED, bucket: VendorWalletBucket.PROCESSING, amount: decimal(amountCents), balanceBefore: wallet.processingBalance, balanceAfter: decimal(cents(wallet.processingBalance) + amountCents), idempotencyKey: `settlement:${created.id}:processing-credit`, reference: referenceId, description: "Move vendor funds into payout processing", createdById: actorId, processedAt: new Date() },
    });
    await tx.bookingFinancialTransaction.updateMany({ where: { id: { in: eligible.map(({ id }) => id) }, settlementStatus: BookingSettlementStatus.ELIGIBLE }, data: { settlementStatus: BookingSettlementStatus.PROCESSING } });
    await tx.bookingFinanceAuditLog.create({ data: { actorId, targetType: "VENDOR_SETTLEMENT", targetId: created.id, action: "PAYOUT_INITIATED", toStatus: VendorSettlementStatus.PROCESSING, details: { amount: decimal(amountCents).toString(), referenceId } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await submitSettlementPayout(settlement.id, recipient.razorpayFundAccountId, settings.payoutMode, settings.encryptedDebitAccountNumber);
  return prisma.vendorSettlement.findUnique({ where: { id: settlement.id } });
}

async function submitSettlementPayout(settlementId: string, fundAccountId: string, payoutMode: string, encryptedDebitAccountNumber: string) {
  const settlement = await prisma.vendorSettlement.findUnique({ where: { id: settlementId } });
  if (!settlement || settlement.status === VendorSettlementStatus.PAID) return settlement;
  const sourceAccountNumber = decrypt(encryptedDebitAccountNumber);
  try {
    const response = await razorpayXRequest("/payouts", "POST", {
      account_number: sourceAccountNumber,
      fund_account_id: fundAccountId,
      amount: cents(settlement.amount),
      currency: settlement.currency,
      mode: payoutMode,
      purpose: "vendor_bill",
      queue_if_low_balance: false,
      reference_id: settlement.referenceId,
      narration: `Vendor settlement ${settlement.referenceId}`,
      notes: { settlementId: settlement.id, vendorId: settlement.vendorId },
    }, settlement.idempotencyKey);
    const payoutId = response?.id;
    if (!payoutId) throw { status: 502, code: "RAZORPAYX_PAYOUT_FAILED", message: "RazorpayX did not return a payout reference" };
    const status = mapPayoutStatus(response.status);
    if (status === VendorSettlementStatus.PAID) await completeSettlement(settlement.id, payoutId, response.utr);
    else if (status === VendorSettlementStatus.FAILED || status === VendorSettlementStatus.REVERSED) await failSettlement(settlement.id, response.status_details?.description ?? `Payout ${response.status}`, status, payoutId);
    else await prisma.vendorSettlement.update({ where: { id: settlement.id }, data: { razorpayPayoutId: payoutId, status } });
    return prisma.vendorSettlement.findUnique({ where: { id: settlement.id } });
  } catch (error: any) {
    if (error?.code === "RAZORPAYX_REQUEST_FAILED" && error?.providerStatus >= 400 && error?.providerStatus < 500) {
      await failSettlement(settlement.id, error.message);
    }
    throw error;
  }
}

function mapPayoutStatus(status: string): VendorSettlementStatus {
  if (status === "processed") return VendorSettlementStatus.PAID;
  if (status === "queued") return VendorSettlementStatus.QUEUED;
  if (status === "rejected") return VendorSettlementStatus.FAILED;
  if (status === "failed") return VendorSettlementStatus.FAILED;
  if (status === "reversed") return VendorSettlementStatus.REVERSED;
  if (status === "pending") return VendorSettlementStatus.PENDING;
  return VendorSettlementStatus.PROCESSING;
}

async function completeSettlement(settlementId: string, payoutId: string, utr?: string | null) {
  await prisma.$transaction(async (tx) => {
    const settlement = await tx.vendorSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement || settlement.status === VendorSettlementStatus.PAID || settlement.status === VendorSettlementStatus.FAILED || settlement.status === VendorSettlementStatus.REVERSED || settlement.status === VendorSettlementStatus.MANUAL_REVIEW) return;
    const wallet = await tx.vendorWallet.findUnique({ where: { vendorId: settlement.vendorId } });
    if (!wallet) throw { status: 500, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet not found" };
    const amountCents = cents(settlement.amount);
    await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.PROCESSING, deltaCents: -amountCents, type: VendorWalletEntryType.SETTLEMENT_PAID, idempotencyKey: `settlement:${settlement.id}:processing-debit`, settlementId, razorpayReference: payoutId, description: "Payout processed by RazorpayX" });
    await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.PAID, deltaCents: amountCents, type: VendorWalletEntryType.SETTLEMENT_PAID, idempotencyKey: `settlement:${settlement.id}:paid-credit`, settlementId, razorpayReference: payoutId, description: "Vendor payout completed" });
    await tx.vendorSettlement.update({ where: { id: settlement.id }, data: { status: VendorSettlementStatus.PAID, razorpayPayoutId: payoutId, utr: utr ?? undefined, processedAt: new Date(), failureReason: null } });
    await tx.bookingFinancialTransaction.updateMany({ where: { settlements: { some: { id: settlement.id } } }, data: { settlementStatus: BookingSettlementStatus.PAID, settledAt: new Date() } });
    await tx.bookingFinanceAuditLog.create({ data: { targetType: "VENDOR_SETTLEMENT", targetId: settlement.id, action: "PAYOUT_PROCESSED", fromStatus: settlement.status, toStatus: VendorSettlementStatus.PAID, details: { payoutId, utr: utr ?? null } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function failSettlement(settlementId: string, failureReason: string, status: VendorSettlementStatus = VendorSettlementStatus.FAILED, payoutId?: string) {
  await prisma.$transaction(async (tx) => {
    const settlement = await tx.vendorSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement || settlement.status === VendorSettlementStatus.FAILED || settlement.status === VendorSettlementStatus.REVERSED || settlement.status === VendorSettlementStatus.MANUAL_REVIEW) return;
    const wallet = await tx.vendorWallet.findUnique({ where: { vendorId: settlement.vendorId } });
    if (!wallet) throw { status: 500, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet not found" };
    const amountCents = cents(settlement.amount);
    const wasPaid = settlement.status === VendorSettlementStatus.PAID;
    const debitBucket = wasPaid ? VendorWalletBucket.PAID : VendorWalletBucket.PROCESSING;
    await moveWallet(tx, { walletId: wallet.id, bucket: debitBucket, deltaCents: -amountCents, type: VendorWalletEntryType.SETTLEMENT_RETURNED, idempotencyKey: `settlement:${settlement.id}:${wasPaid ? "paid" : "processing"}-return`, settlementId, razorpayReference: payoutId, description: "Return failed or reversed payout funds" });
    await moveWallet(tx, { walletId: wallet.id, bucket: VendorWalletBucket.AVAILABLE, deltaCents: amountCents, type: VendorWalletEntryType.SETTLEMENT_RETURNED, idempotencyKey: `settlement:${settlement.id}:available-return`, settlementId, razorpayReference: payoutId, description: "Restore vendor funds after failed or reversed payout" });
    await tx.vendorSettlement.update({ where: { id: settlement.id }, data: { status, failureReason: failureReason.slice(0, 500), razorpayPayoutId: payoutId, processedAt: new Date() } });
    await tx.bookingFinancialTransaction.updateMany({ where: { settlements: { some: { id: settlement.id } } }, data: { settlementStatus: BookingSettlementStatus.ELIGIBLE } });
    await tx.bookingFinanceAuditLog.create({ data: { targetType: "VENDOR_SETTLEMENT", targetId: settlement.id, action: "PAYOUT_FAILED", fromStatus: settlement.status, toStatus: status, reason: failureReason.slice(0, 500), details: { payoutId } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function startVendorSettlement(actorId: string, vendorId: string) {
  const settlement = await initiateSettlement(actorId, vendorId);
  if (!settlement) throw { status: 502, code: "SETTLEMENT_CREATION_FAILED", message: "The settlement was initiated but could not be loaded" };
  return settlementView(settlement);
}

function settlementView(settlement: { id: string; createdAt: Date; processedAt: Date | null; razorpayPayoutId: string | null }) {
  return {
    ...settlement,
    settlementId: settlement.id,
    razorpayReference: settlement.razorpayPayoutId,
    initiatedAt: settlement.createdAt,
    completedAt: settlement.processedAt,
  };
}

export async function getSettlement(id: string, vendorId?: string) {
  const settlement = await prisma.vendorSettlement.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    include: {
      vendor: { select: { id: true, firstName: true, lastName: true, email: true } },
      bookingTransactions: { include: includeFinance },
      walletEntries: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!settlement) throw { status: 404, code: "VENDOR_SETTLEMENT_NOT_FOUND", message: "Vendor settlement not found" };
  const auditLogs = await prisma.bookingFinanceAuditLog.findMany({ where: { targetType: "VENDOR_SETTLEMENT", targetId: id }, orderBy: { createdAt: "asc" } });
  return {
    ...settlement,
    settlementId: settlement.id,
    razorpayReference: settlement.razorpayPayoutId,
    initiatedAt: settlement.createdAt,
    completedAt: settlement.processedAt,
    failureReason: settlement.failureReason,
    auditLogs,
  };
}

export async function retryVendorSettlement(actorId: string, settlementId: string) {
  const prior = await prisma.vendorSettlement.findUnique({ where: { id: settlementId }, select: { vendorId: true, status: true } });
  if (!prior) throw { status: 404, code: "VENDOR_SETTLEMENT_NOT_FOUND", message: "Vendor settlement not found" };
  if (prior.status !== VendorSettlementStatus.FAILED && prior.status !== VendorSettlementStatus.REVERSED) {
    throw { status: 409, code: "SETTLEMENT_NOT_RETRYABLE", message: "Only failed or reversed settlements can be retried" };
  }
  const retry = await initiateSettlement(actorId, prior.vendorId);
  if (!retry) throw { status: 502, code: "SETTLEMENT_CREATION_FAILED", message: "The settlement was initiated but could not be loaded" };
  return { originalSettlementId: settlementId, retry: settlementView(retry) };
}

export async function processExistingSettlement(actorId: string, settlementId: string) {
  const settlement = await prisma.vendorSettlement.findUnique({
    where: { id: settlementId },
    include: { vendor: { select: { vendorPayoutAccount: { select: { razorpayFundAccountId: true, isVerified: true } } } } },
  });
  if (!settlement) throw { status: 404, code: "VENDOR_SETTLEMENT_NOT_FOUND", message: "Vendor settlement not found" };
  const processableStatuses: VendorSettlementStatus[] = [VendorSettlementStatus.PROCESSING, VendorSettlementStatus.PENDING, VendorSettlementStatus.QUEUED];
  if (!processableStatuses.includes(settlement.status)) {
    throw { status: 409, code: "SETTLEMENT_NOT_PROCESSABLE", message: "Only pending settlements can be processed" };
  }
  const fundAccountId = settlement.vendor.vendorPayoutAccount?.razorpayFundAccountId;
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  if (!fundAccountId || !settlement.vendor.vendorPayoutAccount?.isVerified || !settings?.encryptedDebitAccountNumber) {
    throw { status: 409, code: "PAYOUT_ACCOUNT_NOT_READY", message: "A verified vendor payout account and platform source account are required" };
  }
  await prisma.bookingFinanceAuditLog.create({
    data: { actorId, targetType: "VENDOR_SETTLEMENT", targetId: settlement.id, action: "PAYOUT_PROCESS_REQUESTED", fromStatus: settlement.status, toStatus: settlement.status },
  });
  await submitSettlementPayout(settlement.id, fundAccountId, settings.payoutMode, settings.encryptedDebitAccountNumber);
  return getSettlement(settlement.id);
}

export async function runAutomaticSettlements() {
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  if (!settings || !settings.autoSettlementEnabled || settings.settlementMode !== BookingSettlementMode.AUTOMATIC || !settings.nextSettlementAt || settings.nextSettlementAt > new Date()) return { skipped: true };
  const now = new Date();
  const claimed = await prisma.bookingSettlementSettings.updateMany({
    where: { id: settings.id, autoSettlementEnabled: true, nextSettlementAt: settings.nextSettlementAt },
    data: { nextSettlementAt: nextSettlementDate(now, settings.intervalValue, settings.intervalUnit) },
  });
  if (!claimed.count) return { skipped: true, reason: "another worker claimed this settlement cycle" };
  const eligibleVendors = await prisma.vendorWallet.findMany({ where: { availableBalance: { gte: settings.minimumSettlementAmount }, vendor: { vendorPayoutAccount: { isVerified: true, razorpayFundAccountId: { not: null } } } }, select: { vendorId: true } });
  const results = [];
  for (const { vendorId } of eligibleVendors) {
    try { results.push(await initiateSettlement(undefined, vendorId)); }
    catch (error: any) { results.push({ vendorId, error: error?.code ?? "SETTLEMENT_FAILED" }); }
  }
  return { skipped: false, results };
}

export async function retryPendingSettlements() {
  const oldEnough = new Date(Date.now() - 60_000);
  const settlements = await prisma.vendorSettlement.findMany({
    where: { status: { in: [VendorSettlementStatus.PROCESSING, VendorSettlementStatus.PENDING, VendorSettlementStatus.QUEUED] }, updatedAt: { lte: oldEnough } },
    include: { vendor: { select: { vendorPayoutAccount: { select: { razorpayFundAccountId: true } } } } },
    take: 50,
    orderBy: { updatedAt: "asc" },
  });
  const settings = await prisma.bookingSettlementSettings.findUnique({ where: { id: "global" } });
  if (!settings?.encryptedDebitAccountNumber) return { retried: 0 };
  let retried = 0;
  for (const settlement of settlements) {
    const fundAccountId = settlement.vendor.vendorPayoutAccount?.razorpayFundAccountId;
    if (!fundAccountId) continue;
    try {
      await submitSettlementPayout(settlement.id, fundAccountId, settings.payoutMode, settings.encryptedDebitAccountNumber);
      retried += 1;
    } catch (error: any) {
      if (error?.providerStatus >= 500 || error?.code !== "RAZORPAYX_REQUEST_FAILED") console.error("vendor_settlement_retry_deferred", { settlementId: settlement.id, code: error?.code ?? "NETWORK_ERROR" });
    }
  }
  return { retried };
}

export async function processRazorpayXPayoutWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined) {
  const config = await payoutConfiguration();
  if (!config.encryptedWebhookSecret) throw { status: 503, code: "RAZORPAYX_WEBHOOK_NOT_CONFIGURED", message: "RazorpayX webhook secret is not configured" };
  let webhookSecret: string;
  try {
    webhookSecret = decrypt(config.encryptedWebhookSecret);
  } catch {
    throw { status: 503, code: "RAZORPAYX_WEBHOOK_NOT_CONFIGURED", message: "RazorpayX webhook secret is not configured" };
  }
  if (!webhookSecret) throw { status: 503, code: "RAZORPAYX_WEBHOOK_NOT_CONFIGURED", message: "RazorpayX webhook secret is not configured" };
  if (!signature) throw { status: 401, code: "INVALID_RAZORPAYX_WEBHOOK", message: "RazorpayX webhook signature is missing" };
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const supplied = Buffer.from(signature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), supplied)) throw { status: 401, code: "INVALID_RAZORPAYX_WEBHOOK", message: "RazorpayX webhook signature is invalid" };
  const payload: any = JSON.parse(rawBody.toString("utf8"));
  const receivedEventId = eventId ?? payload.id;
  if (!receivedEventId) throw { status: 400, code: "WEBHOOK_EVENT_ID_REQUIRED", message: "Webhook event ID is required" };
  let webhook = await prisma.razorpayPayoutWebhookEvent.findUnique({ where: { eventId: receivedEventId } });
  if (webhook?.processed) return { duplicate: true };
  if (!webhook) {
    try {
      webhook = await prisma.razorpayPayoutWebhookEvent.create({ data: { eventId: receivedEventId, eventType: payload.event, payoutId: payload.payload?.payout?.entity?.id ?? null, payload } });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
      webhook = await prisma.razorpayPayoutWebhookEvent.findUnique({ where: { eventId: receivedEventId } });
    }
  }
  const payout = payload.payload?.payout?.entity;
  if (!payout?.id) throw { status: 400, code: "INVALID_PAYOUT_WEBHOOK", message: "RazorpayX payout webhook is missing payout details" };
  const settlement = await prisma.vendorSettlement.findFirst({ where: { OR: [{ razorpayPayoutId: payout.id }, { referenceId: payout.reference_id }] } });
  if (!settlement) {
    await prisma.razorpayPayoutWebhookEvent.update({ where: { eventId: receivedEventId }, data: { processed: true, processedAt: new Date() } });
    return { ignored: true, reason: "Payout is not managed by this application" };
  }
  const mapped = mapPayoutStatus(payout.status);
  if (mapped === VendorSettlementStatus.PAID) await completeSettlement(settlement.id, payout.id, payout.utr);
  else if (mapped === VendorSettlementStatus.FAILED || mapped === VendorSettlementStatus.REVERSED) await failSettlement(settlement.id, payout.status_details?.description ?? `Payout ${payout.status}`, mapped, payout.id);
  else if (settlement.status !== VendorSettlementStatus.PAID && settlement.status !== VendorSettlementStatus.FAILED && settlement.status !== VendorSettlementStatus.REVERSED && settlement.status !== VendorSettlementStatus.MANUAL_REVIEW) await prisma.vendorSettlement.update({ where: { id: settlement.id }, data: { status: mapped, razorpayPayoutId: payout.id } });
  await prisma.razorpayPayoutWebhookEvent.update({ where: { eventId: receivedEventId }, data: { processed: true, processedAt: new Date(), error: null } });
  return { processed: true, eventId: receivedEventId, settlementId: settlement.id, status: mapped };
}

export async function cancelBookingFinance(bookingId: string, transaction?: Prisma.TransactionClient) {
  const cancelWithTransaction = async (tx: Prisma.TransactionClient) => {
    const finance = await tx.bookingFinancialTransaction.findUnique({ where: { bookingId } });
    if (!finance) return null;
    if (finance.settlementStatus === BookingSettlementStatus.PAID || finance.settlementStatus === BookingSettlementStatus.PROCESSING) {
      const updated = await tx.bookingFinancialTransaction.update({ where: { id: finance.id }, data: { manualReviewRequired: true, settlementStatus: BookingSettlementStatus.MANUAL_REVIEW } });
      await tx.bookingFinanceAuditLog.create({ data: { targetType: "BOOKING_FINANCE", targetId: finance.id, action: "CANCELLATION_AFTER_PAYOUT_STARTED", fromStatus: finance.settlementStatus, toStatus: updated.settlementStatus, reason: "Payout remains unchanged; manual refund/recovery review required" } });
      return updated;
    }
    if (finance.approvalStatus === BookingFinanceApprovalStatus.PENDING || finance.approvalStatus === BookingFinanceApprovalStatus.HELD || finance.approvalStatus === BookingFinanceApprovalStatus.APPROVED) {
      const wallet = await tx.vendorWallet.findUnique({ where: { vendorId: finance.vendorId } });
      if (!wallet) throw { status: 500, code: "VENDOR_WALLET_NOT_FOUND", message: "Vendor wallet not found" };
      const bucket = finance.approvalStatus === BookingFinanceApprovalStatus.APPROVED ? VendorWalletBucket.AVAILABLE : VendorWalletBucket.PENDING;
      const reversalCents = finance.approvalStatus === BookingFinanceApprovalStatus.APPROVED ? cents(finance.vendorPayableAmount) : cents(finance.vendorGrossAmount);
      await moveWallet(tx, { walletId: wallet.id, bucket, deltaCents: -reversalCents, type: VendorWalletEntryType.CANCELLATION_REVERSAL, idempotencyKey: `booking-finance:${finance.id}:cancel-reversal`, bookingFinanceId: finance.id, reference: bookingId, description: "Reverse vendor booking funds after cancellation" });
    }
    const updated = await tx.bookingFinancialTransaction.update({ where: { id: finance.id }, data: { approvalStatus: BookingFinanceApprovalStatus.REJECTED, settlementStatus: BookingSettlementStatus.REVERSED, decisionReason: "Booking cancelled" } });
    await tx.bookingFinanceAuditLog.create({ data: { targetType: "BOOKING_FINANCE", targetId: finance.id, action: "BOOKING_CANCELLED_BEFORE_PAYOUT", fromStatus: finance.approvalStatus, toStatus: updated.approvalStatus, reason: updated.decisionReason } });
    return updated;
  };
  return transaction ? cancelWithTransaction(transaction) : prisma.$transaction(cancelWithTransaction, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
