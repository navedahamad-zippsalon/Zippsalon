import { PaymentMethod, PaymentStatus, Prisma, RefundStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { createClient } from "../payment-gateway/razorpay.service";
import { userNameContains, userSearchWhere } from "./payment-wallet.helpers";

const refundInclude = {
  payment: {
    include: {
      booking: {
        include: {
          salon: { include: { owner: { select: { firstName: true, lastName: true } } } },
          branch: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentRefundInclude;

type RefundRecord = Prisma.PaymentRefundGetPayload<{ include: typeof refundInclude }>;

function refundDto(refund: RefundRecord) {
  const payment = refund.payment;
  const booking = payment.booking;
  return {
    id: refund.id,
    refundReference: `REF-${refund.createdAt.getUTCFullYear()}-${refund.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    paymentReference: payment.transactionId ?? `PAY-${payment.createdAt.getUTCFullYear()}-${payment.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: `BOOK-${booking.createdAt.getUTCFullYear()}-${booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    customerName: [booking.customer.firstName, booking.customer.lastName].filter(Boolean).join(" "),
    customerMobile: booking.customer.phone,
    customerEmail: booking.customer.email,
    vendorName: [booking.salon.owner.firstName, booking.salon.owner.lastName].filter(Boolean).join(" "),
    salonName: booking.salon.name,
    branchName: booking.branch?.name ?? null,
    paymentAmount: payment.amount,
    refundAmount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
    status: refund.status,
    gateway: payment.method,
    gatewayRefundId: refund.gatewayRefundId,
    failureReason: refund.failureReason,
    processedAt: refund.processedAt,
    developmentRecord: refund.reason.startsWith("[DEVELOPMENT TEST DATA]"),
    createdAt: refund.createdAt,
  };
}

function makeRefundWhere(query: {
  search?: string; vendorName?: string; salonName?: string; branchName?: string;
  customerName?: string; customerContact?: string; bookingNumber?: string;
  transactionReference?: string; startDate?: string; endDate?: string; from?: string; to?: string;
  refundStatus?: RefundStatus;
}): Prisma.PaymentRefundWhereInput {
  const start = query.startDate ?? query.from;
  const end = query.endDate ?? query.to;
  const bookingToken = (query.bookingNumber ?? "").replace(/^BOOK-\d{4}-/i, "");
  const reference = query.transactionReference;
  const paymentToken = reference?.match(/^PAY-\d{4}-([A-Z0-9]{8})$/i)?.[1];
  const customerName = query.customerName;
  const customerContact = query.customerContact;
  const search = query.search;
  const salonConditions: Prisma.SalonWhereInput[] = [];
  if (query.vendorName) salonConditions.push({ owner: userNameContains(query.vendorName) });
  if (query.salonName) salonConditions.push({ name: { contains: query.salonName, mode: "insensitive" } });
  const paymentBooking: Prisma.BookingWhereInput = {
    ...(salonConditions.length ? { salon: { AND: salonConditions } } : {}),
    ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    ...(bookingToken ? { id: { contains: bookingToken, mode: "insensitive" } } : {}),
    ...(customerName || customerContact ? { customer: { AND: [
      ...(customerName ? [userNameContains(customerName)] : []),
      ...(customerContact ? [{ OR: [
        { email: { contains: customerContact, mode: "insensitive" as const } },
        { phone: { contains: customerContact } },
      ] }] : []),
    ] } } : {}),
  };
  return {
    ...(query.refundStatus ? { status: query.refundStatus } : {}),
    ...(start || end ? { createdAt: { ...(start ? { gte: new Date(start) } : {}), ...(end ? { lte: new Date(end) } : {}) } } : {}),
    ...(Object.keys(paymentBooking).length ? { payment: { booking: paymentBooking } } : {}),
    ...((reference || search) ? { AND: [
      ...(reference ? [{ OR: [
        { gatewayRefundId: { contains: reference, mode: "insensitive" as const } },
        { payment: { transactionId: { contains: reference, mode: "insensitive" as const } } },
        ...(paymentToken ? [{ payment: { id: { contains: paymentToken, mode: "insensitive" as const } } }] : []),
        { id: { contains: reference.replace(/^REF-\d{4}-/i, ""), mode: "insensitive" as const } },
      ] }] : []),
      ...(search ? [{ OR: [
        { gatewayRefundId: { contains: search, mode: "insensitive" as const } },
        { reason: { contains: search, mode: "insensitive" as const } },
        { payment: { transactionId: { contains: search, mode: "insensitive" as const } } },
        { payment: { booking: { id: { contains: search.replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" as const } } } },
        { payment: { booking: { customer: userNameContains(search) } } },
      ] }] : []),
    ] } : {}),
  };
}

export async function listRefunds(query: {
  page: number; limit: number; sortBy?: "createdAt" | "amount" | "status"; sortOrder?: "asc" | "desc";
  search?: string; vendorName?: string; salonName?: string; branchName?: string; customerName?: string;
  customerContact?: string; bookingNumber?: string; transactionReference?: string;
  startDate?: string; endDate?: string; from?: string; to?: string; refundStatus?: RefundStatus;
}) {
  const where = makeRefundWhere(query);
  const [rows, total] = await Promise.all([
    prisma.paymentRefund.findMany({
      where,
      include: refundInclude,
      orderBy: { [query.sortBy === "amount" || query.sortBy === "status" ? query.sortBy : "createdAt"]: query.sortOrder ?? "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.paymentRefund.count({ where }),
  ]);
  return {
    data: rows.map(refundDto),
    pagination: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit),
      hasNextPage: query.page * query.limit < total, hasPreviousPage: query.page > 1,
    },
  };
}

export async function getRefund(idOrReference: string) {
  const compactReference = idOrReference.replace(/^REF-\d{4}-/i, "");
  const refund = await prisma.paymentRefund.findFirst({
    where: { OR: [
      { id: idOrReference },
      { gatewayRefundId: idOrReference },
      ...(compactReference !== idOrReference ? [{ id: { contains: compactReference, mode: "insensitive" as const } }] : []),
    ] },
    include: refundInclude,
  });
  if (!refund) throw { status: 404, code: "REFUND_NOT_FOUND", message: "Refund was not found" };
  return refundDto(refund);
}

export async function refundSummary(query: Parameters<typeof listRefunds>[0]) {
  const where = makeRefundWhere(query);
  const grouped = await prisma.paymentRefund.groupBy({
    by: ["status"], where, _sum: { amount: true }, _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((row) => [row.status, { count: row._count._all, amount: row._sum.amount ?? 0 }]));
}

export async function listCustomerWallet(query: {
  page: number; limit: number; search?: string; customerName?: string; customerContact?: string;
  sortBy?: "createdAt" | "amount" | "status"; sortOrder?: "asc" | "desc";
  customerStatus?: "ACTIVE" | "INACTIVE"; startDate?: string; endDate?: string; from?: string; to?: string;
  walletTransactionType?: "CREDIT" | "DEBIT" | "REFUND" | "REFERRAL_REWARD" | "PROMOTIONAL_REWARD" | "BOOKING_ADJUSTMENT";
  walletTransactionStatus?: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
}) {
  const startDate = query.startDate ?? query.from;
  const endDate = query.endDate ?? query.to;
  const hasTransactionFilters = Boolean(startDate || endDate || query.walletTransactionType || query.walletTransactionStatus);
  const walletWhere: Prisma.CustomerWalletWhereInput = {
    customer: { is: { AND: [
      ...(query.customerStatus ? [{ isActive: query.customerStatus === "ACTIVE" }] : []),
      ...((query.customerName || query.customerContact || query.search) ? [{
        AND: [
          ...((query.customerName ?? query.search) ? [userNameContains(query.customerName ?? query.search!)] : []),
          ...(query.customerContact ? [{ OR: [
            { phone: { contains: query.customerContact } },
            { email: { contains: query.customerContact, mode: "insensitive" as const } },
          ] }] : []),
        ],
      }] : []),
    ] } },
    ...(hasTransactionFilters ? { transactions: { some: {
      ...(startDate || endDate ? { createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      } } : {}),
      ...(query.walletTransactionType ? { type: query.walletTransactionType } : {}),
      ...(query.walletTransactionStatus ? { status: query.walletTransactionStatus } : {}),
    } } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customerWallet.findMany({
      where: walletWhere,
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, email: true, isActive: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 1, select: { referenceId: true, amount: true, type: true, status: true, createdAt: true } },
      },
      orderBy: query.sortBy === "amount"
        ? { balance: query.sortOrder ?? "desc" }
        : query.sortBy === "status"
          ? { customer: { isActive: query.sortOrder ?? "desc" } }
          : { updatedAt: query.sortOrder ?? "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.customerWallet.count({ where: walletWhere }),
  ]);
  const walletIds = rows.map(({ id }) => id);
  const transactionWhere: Prisma.WalletTransactionWhereInput = {
    walletId: { in: walletIds },
    ...(query.walletTransactionType ? { type: query.walletTransactionType } : {}),
    ...(query.walletTransactionStatus ? { status: query.walletTransactionStatus } : {}),
    ...((query.startDate ?? query.from) || (query.endDate ?? query.to) ? {
      createdAt: {
        ...((query.startDate ?? query.from) ? { gte: new Date(query.startDate ?? query.from!) } : {}),
        ...((query.endDate ?? query.to) ? { lte: new Date(query.endDate ?? query.to!) } : {}),
      },
    } : {}),
  };
  const [sums, latestTransactions] = walletIds.length ? await Promise.all([
    prisma.walletTransaction.groupBy({
      by: ["walletId", "type"], where: transactionWhere, _sum: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: transactionWhere, orderBy: { createdAt: "desc" }, distinct: ["walletId"],
      select: { id: true, walletId: true, referenceId: true, amount: true, type: true, status: true, description: true, createdAt: true },
    }),
  ]) : [[], []];
  const totalsByWallet = new Map<string, { credit: number; debit: number }>();
  for (const row of sums) {
    const totals = totalsByWallet.get(row.walletId) ?? { credit: 0, debit: 0 };
    if (["CREDIT", "REFUND", "REFERRAL_REWARD", "PROMOTIONAL_REWARD"].includes(row.type)) totals.credit += row._sum.amount ?? 0;
    else totals.debit += row._sum.amount ?? 0;
    totalsByWallet.set(row.walletId, totals);
  }
  const latestByWallet = new Map(latestTransactions.map((transaction) => [transaction.walletId, transaction]));
  const data = rows.map((wallet) => {
    const totals = totalsByWallet.get(wallet.id) ?? { credit: 0, debit: 0 };
    const lastTransaction = latestByWallet.get(wallet.id);
    return {
      id: wallet.id,
      customerId: wallet.customerId,
      customerName: [wallet.customer.firstName, wallet.customer.lastName].filter(Boolean).join(" "),
      mobile: wallet.customer.phone,
      email: wallet.customer.email,
      balance: wallet.balance,
      currency: wallet.currency,
      totalCredit: totals.credit,
      totalDebit: totals.debit,
      lastTransaction: lastTransaction ? {
        transactionReference: lastTransaction.referenceId ?? `WAL-${lastTransaction.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        amount: lastTransaction.amount,
        type: lastTransaction.type,
        status: lastTransaction.status,
        description: lastTransaction.description,
        createdAt: lastTransaction.createdAt,
      } : null,
      status: wallet.customer.isActive ? "ACTIVE" : "INACTIVE",
    };
  });
  return {
    data,
    pagination: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit),
      hasNextPage: query.page * query.limit < total, hasPreviousPage: query.page > 1,
    },
  };
}

export async function getCustomerWallet(customerId: string) {
  const wallet = await prisma.customerWallet.findUnique({
    where: { customerId },
    include: { customer: { select: { firstName: true, lastName: true, phone: true, email: true, isActive: true } } },
  });
  if (!wallet) throw { status: 404, code: "CUSTOMER_WALLET_NOT_FOUND", message: "Customer wallet was not found" };
  const [sums, transactionCount] = await Promise.all([
    prisma.walletTransaction.groupBy({ by: ["type"], where: { walletId: wallet.id }, _sum: { amount: true } }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);
  const totals = { credit: 0, debit: 0 };
  for (const row of sums) {
    if (["CREDIT", "REFUND", "REFERRAL_REWARD", "PROMOTIONAL_REWARD"].includes(row.type)) totals.credit += row._sum.amount ?? 0;
    else totals.debit += row._sum.amount ?? 0;
  }
  return {
    id: wallet.id,
    customerId: wallet.customerId,
    customerName: [wallet.customer.firstName, wallet.customer.lastName].filter(Boolean).join(" "),
    mobile: wallet.customer.phone, email: wallet.customer.email, balance: wallet.balance, currency: wallet.currency,
    totalCredit: totals.credit, totalDebit: totals.debit, transactionCount,
    status: wallet.customer.isActive ? "ACTIVE" : "INACTIVE",
  };
}

export async function getCustomerWalletTransaction(customerId: string, transactionId: string) {
  const transaction = await prisma.walletTransaction.findFirst({
    where: { id: transactionId, customerId },
    include: { customer: { select: { firstName: true, lastName: true, phone: true, email: true } } },
  });
  if (!transaction) throw { status: 404, code: "WALLET_TRANSACTION_NOT_FOUND", message: "Customer wallet transaction was not found" };
  return {
    id: transaction.id,
    transactionReference: transaction.referenceId ?? `WAL-${transaction.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    customerName: [transaction.customer.firstName, transaction.customer.lastName].filter(Boolean).join(" "),
    mobile: transaction.customer.phone, email: transaction.customer.email,
    type: transaction.type, amount: transaction.amount, status: transaction.status,
    description: transaction.description, createdAt: transaction.createdAt,
  };
}

export async function createRazorpayRefund(input: {
  paymentReference: string; amount?: number; reason: string; idempotencyKey: string; actorId: string;
}) {
  const paymentToken = input.paymentReference.match(/^PAY-\d{4}-([A-Z0-9]{8})$/i)?.[1];
  const payment = await prisma.payment.findFirst({
    where: { OR: [
      { id: input.paymentReference },
      { transactionId: input.paymentReference },
      ...(paymentToken ? [{ id: { contains: paymentToken, mode: "insensitive" as const } }] : []),
    ] },
    include: { refunds: { where: { status: { not: RefundStatus.FAILED } }, select: { amount: true } } },
  });
  if (!payment) throw { status: 404, code: "PAYMENT_NOT_FOUND", message: "Payment was not found" };
  if (payment.method !== PaymentMethod.RAZORPAY || !payment.transactionId || payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.FAILED) {
    throw { status: 422, code: "PAYMENT_NOT_REFUNDABLE", message: "Only completed Razorpay payments can be refunded through this endpoint" };
  }

  const existing = await prisma.paymentRefund.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: refundInclude });
  if (existing) {
    if (existing.paymentId !== payment.id || (input.amount !== undefined && Number(existing.amount) !== input.amount) || existing.reason !== input.reason) {
      throw { status: 409, code: "IDEMPOTENCY_KEY_REUSED", message: "This idempotency key was already used for a different refund request" };
    }
    if (existing.status === RefundStatus.PENDING) {
      throw { status: 409, code: "REFUND_REQUIRES_RECONCILIATION", message: "A refund request with this key is already pending. Verify its status in Razorpay before retrying." };
    }
    return refundDto(existing);
  }
  const previouslyReserved = payment.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
  const amount = input.amount ?? Math.round((payment.amount - previouslyReserved) * 100) / 100;
  const paise = Math.round(amount * 100);
  if (!Number.isSafeInteger(paise) || paise < 1 || Math.abs(paise / 100 - amount) > 0.000001) {
    throw { status: 422, code: "INVALID_REFUND_AMOUNT", message: "Refund amount must be a positive amount with at most two decimal places" };
  }
  if (amount + previouslyReserved > payment.amount + 0.000001) {
    throw { status: 422, code: "REFUND_EXCEEDS_PAYMENT", message: "The refund amount exceeds the unrefunded payment balance" };
  }

  const { client } = await createClient("PLATFORM");
  const refund = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { refunds: { where: { status: { not: RefundStatus.FAILED } }, select: { amount: true } } },
    });
    if (!currentPayment || currentPayment.method !== PaymentMethod.RAZORPAY || !currentPayment.transactionId ||
      currentPayment.status === PaymentStatus.PENDING || currentPayment.status === PaymentStatus.FAILED) {
      throw { status: 409, code: "PAYMENT_NOT_REFUNDABLE", message: "Payment status changed while processing the refund request" };
    }
    const reserved = currentPayment.refunds.reduce((sum, item) => sum + Number(item.amount), 0);
    if (amount + reserved > currentPayment.amount + 0.000001) {
      throw { status: 409, code: "REFUND_EXCEEDS_PAYMENT", message: "Another refund request already reserved some or all of this payment" };
    }
    return tx.paymentRefund.create({
      data: {
        paymentId: payment.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        createdById: input.actorId,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  try {
    const gatewayRefund = await client.payments.refund(payment.transactionId, {
      amount: paise,
      notes: { reason: input.reason, refundReference: refund.id },
    });
    const processed = gatewayRefund.status === "processed";
    const failed = gatewayRefund.status === "failed";
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.paymentRefund.update({
        where: { id: refund.id },
        data: {
          gatewayRefundId: gatewayRefund.id,
          status: processed ? RefundStatus.PROCESSED : failed ? RefundStatus.FAILED : RefundStatus.PENDING,
          processedAt: processed ? new Date() : null,
          failureReason: failed ? "Razorpay reported that the refund failed" : null,
        },
        include: refundInclude,
      });
      if (processed) {
        const sums = await tx.paymentRefund.aggregate({
          where: { paymentId: payment.id, status: RefundStatus.PROCESSED },
          _sum: { amount: true },
        });
        if (Number(sums._sum.amount ?? 0) >= payment.amount - 0.000001) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
        }
      }
      return saved;
    });
    return refundDto(updated);
  } catch (error) {
    await prisma.paymentRefund.update({
      where: { id: refund.id },
      data: { failureReason: "Razorpay did not confirm the refund. Check the provider dashboard before retrying." },
    });
    throw {
      status: 502,
      code: "RAZORPAY_REFUND_UNCONFIRMED",
      message: "Razorpay did not confirm the refund. The request remains pending for reconciliation.",
      cause: error,
    };
  }
}
