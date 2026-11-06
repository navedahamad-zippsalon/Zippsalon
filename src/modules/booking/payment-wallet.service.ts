import {
  BookingFinanceApprovalStatus,
  BookingSettlementStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  VendorSettlementStatus,
  VendorWalletEntryType,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { financeTransactionActions } from "./booking-finance.service";
import { prisma } from "../../infrastructure/database/prisma";
import { userNameContains, userSearchWhere } from "./payment-wallet.helpers";

type ListQuery = {
  page: number;
  limit: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  vendorName?: string;
  salonName?: string;
  branchName?: string;
  customerName?: string;
  customerContact?: string;
  bookingNumber?: string;
  transactionReference?: string;
  status?: PaymentStatus;
  approvalStatus?: BookingFinanceApprovalStatus;
  settlementStatus?: BookingSettlementStatus;
  settlementRecordStatus?: VendorSettlementStatus;
  paymentMethod?: PaymentMethod;
  transactionType?: VendorWalletEntryType;
  walletTransactionType?: WalletTransactionType;
  walletTransactionStatus?: WalletTransactionStatus;
  customerStatus?: "ACTIVE" | "INACTIVE";
  ledgerStatus?: "COMPLETED" | VendorSettlementStatus;
  customerId?: string;
  sortBy: "createdAt" | "amount" | "status";
  sortOrder: "asc" | "desc";
};

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const dateBounds = (query: ListQuery) => {
  const startDate = query.startDate ?? query.from;
  const endDate = query.endDate ?? query.to;
  const bounds: Prisma.DateTimeFilter = {};
  if (startDate) bounds.gte = new Date(startDate);
  if (endDate) bounds.lte = new Date(endDate);
  return Object.keys(bounds).length ? bounds : undefined;
};

const personName = (firstName: string, lastName?: string | null) =>
  [firstName, lastName].filter(Boolean).join(" ");

function customerFilters(name?: string, contact?: string): Prisma.UserWhereInput | undefined {
  const conditions: Prisma.UserWhereInput[] = [];
  if (name) conditions.push(userNameContains(name));
  if (contact) conditions.push({ OR: [
    { phone: { contains: contact } },
    { email: { contains: contact, mode: "insensitive" } },
  ] });
  return conditions.length ? { AND: conditions } : undefined;
}

function bookingDisplayNumber(id: string, createdAt: Date) {
  return `BOOK-${createdAt.getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function paymentDisplayReference(id: string, createdAt: Date, transactionId?: string | null) {
  return transactionId || `PAY-${createdAt.getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function makePaymentWhere(query: ListQuery, status?: PaymentStatus): Prisma.PaymentWhereInput {
  const search = query.search?.trim();
  const bookingToken = query.bookingNumber?.trim().replace(/^BOOK-\d{4}-/i, "");
  const transactionSearch = query.transactionReference?.trim();
  const displayPaymentToken = transactionSearch?.match(/^PAY-\d{4}-([A-Z0-9]{8})$/i)?.[1];
  const salonFilters: Prisma.SalonWhereInput[] = [];
  const customerWhere = customerFilters(query.customerName, query.customerContact);
  if (query.vendorName) salonFilters.push({ owner: userNameContains(query.vendorName) });
  if (query.salonName) salonFilters.push({ name: { contains: query.salonName, mode: "insensitive" } });
  return {
    ...(status || query.status ? { status: status ?? query.status } : {}),
    ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    booking: { is: {
      ...(salonFilters.length ? { salon: { AND: salonFilters } } : {}),
      ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
      ...(customerWhere ? { customer: { is: customerWhere } } : {}),
      ...(bookingToken ? { id: { contains: bookingToken, mode: "insensitive" } } : {}),
      ...(search ? {
        OR: [
          { id: { contains: search.replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" } },
          { salon: { name: { contains: search, mode: "insensitive" } } },
          { salon: { owner: userNameContains(search) } },
          { customer: userNameContains(search) },
        ],
      } : {}),
    } },
    ...(transactionSearch ? { OR: [
      { transactionId: { contains: transactionSearch, mode: "insensitive" } },
      ...(displayPaymentToken ? [{ id: { contains: displayPaymentToken, mode: "insensitive" as const } }] : []),
    ] } : {}),
  };
}

const paymentInclude = {
  booking: {
    include: {
      salon: { include: { owner: { select: { firstName: true, lastName: true, email: true } } } },
      branch: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      financialTransaction: { select: { approvalStatus: true, settlementStatus: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

function paymentDto(payment: Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>) {
  const booking = payment.booking;
  return {
    id: payment.id,
    transactionReference: paymentDisplayReference(payment.id, payment.createdAt, payment.transactionId),
    paymentReference: payment.transactionId,
    bookingNumber: bookingDisplayNumber(booking.id, booking.createdAt),
    bookingId: booking.id,
    customerName: personName(booking.customer.firstName, booking.customer.lastName),
    customerMobile: booking.customer.phone,
    vendorName: personName(booking.salon.owner.firstName, booking.salon.owner.lastName),
    salonName: booking.salon.name,
    branchName: booking.branch?.name ?? null,
    amount: payment.amount,
    currency: "INR",
    transactionType: "PAYMENT",
    paymentMethod: payment.method,
    gateway: payment.method === PaymentMethod.RAZORPAY ? "RAZORPAY" : null,
    gatewayTransactionReference: payment.transactionId,
    status: payment.status,
    completedAt: payment.completedAt,
    failureReason: payment.failureReason,
    approvalStatus: booking.financialTransaction?.approvalStatus ?? null,
    settlementStatus: booking.financialTransaction?.settlementStatus ?? null,
    createdAt: payment.createdAt,
  };
}

export async function listPayments(query: ListQuery, status?: PaymentStatus) {
  const where = makePaymentWhere(query, status);
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.payment.count({ where }),
  ]);
  const data = rows.map(paymentDto);
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export async function getPayment(reference: string) {
  const displayToken = reference.match(/^PAY-\d{4}-([A-Z0-9]{8})$/i)?.[1];
  const payment = await prisma.payment.findFirst({
    where: { OR: [
      { id: reference },
      { transactionId: reference },
      ...(displayToken ? [{ id: { contains: displayToken, mode: "insensitive" as const } }] : []),
    ] },
    include: paymentInclude,
  });
  if (!payment) throw { status: 404, code: "PAYMENT_NOT_FOUND", message: "Payment was not found" };
  return paymentDto(payment);
}

export async function paymentOverview(query: ListQuery) {
  const statuses = [
    PaymentStatus.COMPLETED,
    PaymentStatus.PENDING,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
  ];
  const bounds = dateBounds(query);
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  const [aggregates, today] = await Promise.all([
    Promise.all(statuses.map(async (status) => {
      const [count, total] = await Promise.all([
        prisma.payment.count({ where: makePaymentWhere(query, status) }),
        prisma.payment.aggregate({ where: makePaymentWhere(query, status), _sum: { amount: true } }),
      ]);
      return { status, count, amount: total._sum.amount ?? 0 };
    })),
    prisma.payment.aggregate({
      where: { ...makePaymentWhere({ ...query, startDate: undefined, endDate: undefined, from: undefined, to: undefined }, PaymentStatus.COMPLETED), createdAt: { gte: todayStart, lt: tomorrow } },
      _sum: { amount: true },
    }),
  ]);
  const byStatus = Object.fromEntries(aggregates.map(({ status, count, amount }) => [status, { count, amount }]));
  return {
    totalPayments: aggregates.reduce((sum, row) => sum + row.count, 0),
    successfulPayments: byStatus.COMPLETED,
    pendingPayments: byStatus.PENDING,
    failedPayments: byStatus.FAILED,
    refundedPayments: byStatus.REFUNDED,
    todayRevenue: today._sum.amount ?? 0,
    filters: { startDate: query.startDate ?? query.from, endDate: query.endDate ?? query.to },
  };
}

export async function listCustomerWallets(query: ListQuery) {
  const customerSearch = query.customerName ?? query.search;
  const customerWhere = customerFilters(customerSearch, query.customerContact);
  const where: Prisma.CustomerWalletWhereInput = {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(customerWhere || query.customerStatus ? { customer: { is: { AND: [
      ...(customerWhere ? [customerWhere] : []),
      ...(query.customerStatus ? [{ isActive: query.customerStatus === "ACTIVE" }] : []),
    ] } } } : {}),
    ...((dateBounds(query) || query.walletTransactionType || query.walletTransactionStatus) ? {
      transactions: { some: {
        ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
        ...(query.walletTransactionType ? { type: query.walletTransactionType } : {}),
        ...(query.walletTransactionStatus ? { status: query.walletTransactionStatus } : {}),
      } },
    } : {}),
  };
  const [wallets, total] = await Promise.all([
    prisma.customerWallet.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, email: true, isActive: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 1, select: { amount: true, type: true, status: true, createdAt: true } },
      },
      orderBy: query.sortBy === "amount"
        ? { balance: query.sortOrder }
        : query.sortBy === "status"
          ? { customer: { isActive: query.sortOrder } }
          : { updatedAt: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.customerWallet.count({ where }),
  ]);
  const ids = wallets.map(({ id }) => id);
  const sums = ids.length ? await prisma.walletTransaction.groupBy({
    by: ["walletId", "type"],
    where: { walletId: { in: ids }, ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}) },
    _sum: { amount: true },
  }) : [];
  const totals = new Map<string, { credit: number; debit: number }>();
  for (const row of sums) {
    const current = totals.get(row.walletId) ?? { credit: 0, debit: 0 };
    if (row.type === "CREDIT" || row.type === "REFUND" || row.type === "REFERRAL_REWARD" || row.type === "PROMOTIONAL_REWARD") current.credit += row._sum.amount ?? 0;
    else current.debit += row._sum.amount ?? 0;
    totals.set(row.walletId, current);
  }
  const data = wallets.map((wallet) => ({
    id: wallet.id,
    customerName: personName(wallet.customer.firstName, wallet.customer.lastName),
    mobile: wallet.customer.phone,
    email: wallet.customer.email,
    balance: wallet.balance,
    currency: wallet.currency,
    credit: totals.get(wallet.id)?.credit ?? 0,
    debit: totals.get(wallet.id)?.debit ?? 0,
    lastTransaction: wallet.transactions[0] ?? null,
    status: wallet.customer.isActive ? "ACTIVE" : "INACTIVE",
  }));
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export async function listCustomerWalletTransactions(query: ListQuery) {
  const customerSearch = query.customerName ?? query.search;
  const customerWhere = customerFilters(customerSearch, query.customerContact);
  const where: Prisma.WalletTransactionWhereInput = {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    ...(customerWhere || query.customerStatus ? { customer: { is: { AND: [
      ...(customerWhere ? [customerWhere] : []),
      ...(query.customerStatus ? [{ isActive: query.customerStatus === "ACTIVE" }] : []),
    ] } } } : {}),
    ...(query.walletTransactionType ? { type: query.walletTransactionType } : {}),
    ...(query.walletTransactionStatus ? { status: query.walletTransactionStatus } : {}),
    ...(query.transactionReference ? { OR: [
      { referenceId: { contains: query.transactionReference, mode: "insensitive" } },
      ...(query.transactionReference.match(/^WAL-([A-Z0-9]{8})$/i)
        ? [{ id: { contains: query.transactionReference.match(/^WAL-([A-Z0-9]{8})$/i)![1], mode: "insensitive" as const } }]
        : []),
    ] } : {}),
    ...(query.search ? { OR: [
      { referenceId: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { customer: { firstName: { contains: query.search, mode: "insensitive" } } },
      { customer: { lastName: { contains: query.search, mode: "insensitive" } } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      include: { customer: { select: { firstName: true, lastName: true, phone: true, email: true } } },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);
  const bookingIds = rows
    .filter((row) => row.referenceType?.toLowerCase() === "booking" && row.referenceId)
    .map((row) => row.referenceId!);
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({ where: { id: { in: bookingIds } }, select: { id: true, createdAt: true } })
    : [];
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const data = rows.map((row) => ({
    id: row.id,
    transactionReference: row.referenceId ?? `WAL-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: (() => {
      const booking = row.referenceType?.toLowerCase() === "booking" && row.referenceId
        ? bookingById.get(row.referenceId)
        : undefined;
      return booking
        ? `BOOK-${booking.createdAt.getUTCFullYear()}-${booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
        : null;
    })(),
    customerName: personName(row.customer.firstName, row.customer.lastName),
    mobile: row.customer.phone,
    type: row.type,
    amount: row.amount,
    status: row.status,
    description: row.description,
    createdAt: row.createdAt,
  }));
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export async function listLookups(type: "salons" | "branches" | "vendors" | "customers", query: { search?: string; salonName?: string; page: number; limit: number }) {
  const search = query.search?.trim();
  const skip = (query.page - 1) * query.limit;
  if (type === "salons") {
    const where: Prisma.SalonWhereInput = { parentId: null, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) };
    const [rows, total] = await Promise.all([
      prisma.salon.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" }, skip, take: query.limit }),
      prisma.salon.count({ where }),
    ]);
    return { data: rows.map(({ id, name }) => ({ id, name, label: name })), pagination: pagination(query.page, query.limit, total) };
  }
  if (type === "branches") {
    const where: Prisma.SalonWhereInput = {
      parentId: { not: null },
      ...(query.salonName ? { parent: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.salon.findMany({ where, select: { id: true, name: true, parent: { select: { name: true } } }, orderBy: { name: "asc" }, skip, take: query.limit }),
      prisma.salon.count({ where }),
    ]);
    return { data: rows.map(({ id, name, parent }) => ({ id, name, label: name, salonName: parent?.name ?? null })), pagination: pagination(query.page, query.limit, total) };
  }
  const customer = type === "customers";
  const where: Prisma.UserWhereInput = {
    roles: { some: { role: { name: customer ? "CUSTOMER" : "VENDOR" } } },
    ...(search ? userSearchWhere(search) : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, firstName: true, lastName: true, email: true, phone: true, ownedSalons: { where: { parentId: null }, select: { name: true }, take: 1 } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], skip, take: query.limit }),
    prisma.user.count({ where }),
  ]);
  const data = rows.map(({ id, firstName, lastName, email, phone, ownedSalons }) => ({
    id,
    name: personName(firstName, lastName),
    label: personName(firstName, lastName),
    email,
    phone,
    ...(customer ? {} : { salonName: ownedSalons[0]?.name ?? null }),
  }));
  return { data, pagination: pagination(query.page, query.limit, total) };
}

export async function listAdminWalletOverview(query: ListQuery) {
  const financeWhere: Prisma.BookingFinancialTransactionWhereInput = {
    ...(query.vendorName ? { vendor: userNameContains(query.vendorName) } : {}),
    ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
    ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
  };
  const walletWhere: Prisma.VendorWalletWhereInput = {
    ...(query.vendorName ? { vendor: userNameContains(query.vendorName) } : {}),
    ...(query.salonName || query.branchName || dateBounds(query) ? {
      entries: { some: {
        ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
        ...(query.salonName || query.branchName ? { bookingFinance: {
          ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
          ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
        } } : {}),
      } },
    } : {}),
  };
  const [wallets, finance] = await Promise.all([
    prisma.vendorWallet.aggregate({ where: walletWhere, _sum: { pendingBalance: true, availableBalance: true, processingBalance: true, paidBalance: true } }),
    prisma.bookingFinancialTransaction.aggregate({ where: financeWhere, _sum: { bookingAmount: true, commissionAmount: true, vendorPayableAmount: true }, _count: { _all: true } }),
  ]);
  return {
    pendingWallet: wallets._sum.pendingBalance ?? 0,
    availableWallet: wallets._sum.availableBalance ?? 0,
    processingWallet: wallets._sum.processingBalance ?? 0,
    settledWallet: wallets._sum.paidBalance ?? 0,
    totalWallet: Number(wallets._sum.pendingBalance ?? 0) + Number(wallets._sum.availableBalance ?? 0) + Number(wallets._sum.processingBalance ?? 0) + Number(wallets._sum.paidBalance ?? 0),
    totalEarned: finance._sum.bookingAmount ?? 0,
    totalCommission: finance._sum.commissionAmount ?? 0,
    totalVendorPayable: finance._sum.vendorPayableAmount ?? 0,
    transactionCount: finance._count._all,
  };
}

export async function paymentFinancialReport(query: ListQuery) {
  const paymentWhere = makePaymentWhere(query);
  const vendorWhere: Prisma.UserWhereInput | undefined = query.vendorName ? userNameContains(query.vendorName) : undefined;
  const financeWhere: Prisma.BookingFinancialTransactionWhereInput = {
    ...(vendorWhere ? { vendor: vendorWhere } : {}),
    ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
    ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    ...(query.settlementStatus ? { settlementStatus: query.settlementStatus as BookingSettlementStatus } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
  };
  const walletWhere: Prisma.VendorWalletWhereInput = {
    ...(vendorWhere ? { vendor: vendorWhere } : {}),
    ...(query.salonName || query.branchName || dateBounds(query) ? {
      entries: { some: {
        ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
        ...(query.salonName || query.branchName ? { bookingFinance: {
          ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
          ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
        } } : {}),
      } },
    } : {}),
  };
  const settlementWhere: Prisma.VendorSettlementWhereInput = {
    ...(vendorWhere ? { vendor: vendorWhere } : {}),
    ...(query.settlementRecordStatus ? { status: query.settlementRecordStatus } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    ...(query.salonName || query.branchName ? { bookingTransactions: { some: {
      ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
      ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    } } } : {}),
  };
  const paymentStatusMatches = (status: PaymentStatus) => !query.status || query.status === status;
  const [revenue, refunded, failed, finance, wallets, settlements] = await Promise.all([
    paymentStatusMatches(PaymentStatus.COMPLETED)
      ? prisma.payment.aggregate({ where: { ...paymentWhere, status: PaymentStatus.COMPLETED }, _sum: { amount: true } })
      : Promise.resolve({ _sum: { amount: null } }),
    paymentStatusMatches(PaymentStatus.REFUNDED)
      ? prisma.payment.aggregate({ where: { ...paymentWhere, status: PaymentStatus.REFUNDED }, _sum: { amount: true } })
      : Promise.resolve({ _sum: { amount: null } }),
    paymentStatusMatches(PaymentStatus.FAILED)
      ? prisma.payment.aggregate({ where: { ...paymentWhere, status: PaymentStatus.FAILED }, _sum: { amount: true } })
      : Promise.resolve({ _sum: { amount: null } }),
    prisma.bookingFinancialTransaction.aggregate({ where: financeWhere, _sum: { bookingAmount: true, commissionAmount: true, vendorPayableAmount: true } }),
    prisma.vendorWallet.aggregate({ where: walletWhere, _sum: { pendingBalance: true, availableBalance: true, processingBalance: true, paidBalance: true } }),
    prisma.vendorSettlement.aggregate({ where: settlementWhere, _sum: { amount: true } }),
  ]);
  return {
    paymentRevenue: revenue._sum.amount ?? 0,
    bookingRevenue: finance._sum.bookingAmount ?? 0,
    commission: finance._sum.commissionAmount ?? 0,
    vendorPayable: finance._sum.vendorPayableAmount ?? 0,
    wallet: {
      pending: wallets._sum.pendingBalance ?? 0,
      available: wallets._sum.availableBalance ?? 0,
      processing: wallets._sum.processingBalance ?? 0,
      settled: wallets._sum.paidBalance ?? 0,
    },
    settlement: settlements._sum?.amount ?? 0,
    refund: refunded._sum.amount ?? 0,
    failedPayment: failed._sum.amount ?? 0,
  };
}

export async function listCommissionTransactions(query: ListQuery) {
  const commissionReference = query.transactionReference?.replace(/^COM-/i, "");
  const customerSearchFilter = customerFilters(query.customerName, query.customerContact);
  const where: Prisma.BookingFinancialTransactionWhereInput = {
    ...(query.vendorName ? { vendor: userNameContains(query.vendorName) } : {}),
    ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
    ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    ...(customerSearchFilter ? { customer: { is: customerSearchFilter } } : {}),
    ...(query.bookingNumber ? { bookingId: { contains: query.bookingNumber.replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" } } : {}),
    ...(commissionReference ? { id: { contains: commissionReference, mode: "insensitive" } } : {}),
    ...(query.status ? { paymentStatus: query.status } : {}),
    ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}),
    ...(query.settlementStatus ? { settlementStatus: query.settlementStatus as BookingSettlementStatus } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    ...(query.search ? { OR: [
      { bookingId: { contains: query.search.replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" } },
      { vendor: userNameContains(query.search) },
      { salon: { name: { contains: query.search, mode: "insensitive" } } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.bookingFinancialTransaction.findMany({
      where,
      include: {
        booking: { select: { id: true, createdAt: true } },
        vendor: { select: { firstName: true, lastName: true } },
        salon: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.bookingFinancialTransaction.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    commissionReference: `COM-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: bookingDisplayNumber(row.booking.id, row.booking.createdAt),
    vendorName: personName(row.vendor.firstName, row.vendor.lastName),
    salonName: row.salon.name,
    branchName: row.branch?.name ?? null,
    bookingAmount: row.bookingAmount,
    commissionRate: row.commissionValue,
    commissionAmount: row.commissionAmount,
    vendorPayable: row.vendorPayableAmount,
    approvalStatus: row.approvalStatus,
    actions: financeTransactionActions(row.approvalStatus),
    settlementStatus: row.settlementStatus,
    createdAt: row.createdAt,
  }));
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export async function listVendorWalletLedger(query: ListQuery) {
  const where: Prisma.VendorWalletLedgerWhereInput = {
    ...(query.transactionReference ? { OR: [
      { reference: { contains: query.transactionReference, mode: "insensitive" } },
      { paymentReference: { contains: query.transactionReference, mode: "insensitive" } },
      { razorpayReference: { contains: query.transactionReference, mode: "insensitive" } },
      { settlement: { is: { referenceId: { contains: query.transactionReference, mode: "insensitive" } } } },
      ...(query.transactionReference.match(/^WAL-([A-Z0-9]{8})$/i)
        ? [{ id: { contains: query.transactionReference.match(/^WAL-([A-Z0-9]{8})$/i)![1], mode: "insensitive" as const } }]
        : []),
    ] } : {}),
    ...(query.transactionType ? { type: query.transactionType } : {}),
    ...(query.ledgerStatus === "COMPLETED" ? { settlementId: null } : {}),
    ...(query.ledgerStatus && query.ledgerStatus !== "COMPLETED" ? { settlement: { is: { status: query.ledgerStatus } } } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    ...(query.vendorName ? { wallet: { vendor: userNameContains(query.vendorName) } } : {}),
    ...(query.salonName || query.branchName || query.bookingNumber ? {
      bookingFinance: {
        ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
        ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
        ...(query.bookingNumber ? { bookingId: { contains: query.bookingNumber.replace(/^BOOK-\d{4}-/i, ""), mode: "insensitive" } } : {}),
      },
    } : {}),
    ...(query.search ? { AND: [{ OR: [
      { reference: { contains: query.search, mode: "insensitive" } },
      { paymentReference: { contains: query.search, mode: "insensitive" } },
      { razorpayReference: { contains: query.search, mode: "insensitive" } },
      { wallet: { vendor: userNameContains(query.search) } },
    ] }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.vendorWalletLedger.findMany({
      where,
      include: {
        wallet: { include: { vendor: { select: { firstName: true, lastName: true } } } },
        bookingFinance: { include: { booking: { select: { id: true, createdAt: true } }, salon: { select: { name: true } }, branch: { select: { name: true } } } },
        settlement: { select: { referenceId: true, razorpayPayoutId: true, status: true } },
      },
      orderBy: { createdAt: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.vendorWalletLedger.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    transactionReference: row.razorpayReference ?? row.paymentReference ?? row.settlement?.referenceId ?? row.reference ?? `WAL-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    bookingNumber: row.bookingFinance ? bookingDisplayNumber(row.bookingFinance.booking.id, row.bookingFinance.booking.createdAt) : null,
    vendorName: personName(row.wallet.vendor.firstName, row.wallet.vendor.lastName),
    salonName: row.bookingFinance?.salon.name ?? null,
    branchName: row.bookingFinance?.branch?.name ?? null,
    type: row.type,
    amount: row.amount,
    balanceBefore: row.balanceBefore,
    balanceAfter: row.balanceAfter,
    status: row.settlement?.status ?? "COMPLETED",
    bucket: row.bucket,
    createdAt: row.createdAt,
  }));
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export async function listSettlementHistory(query: ListQuery) {
  const settlementSearch = query.transactionReference ?? query.search;
  const where: Prisma.VendorSettlementWhereInput = {
    ...(query.settlementRecordStatus ? { status: query.settlementRecordStatus } : {}),
    ...(query.vendorName ? { vendor: userNameContains(query.vendorName) } : {}),
    ...(query.salonName || query.branchName ? { bookingTransactions: { some: {
      ...(query.salonName ? { salon: { name: { contains: query.salonName, mode: "insensitive" } } } : {}),
      ...(query.branchName ? { branch: { is: { name: { contains: query.branchName, mode: "insensitive" } } } } : {}),
    } } } : {}),
    ...(dateBounds(query) ? { createdAt: dateBounds(query) } : {}),
    ...(settlementSearch ? { OR: [
      { referenceId: { contains: settlementSearch, mode: "insensitive" } },
      { razorpayPayoutId: { contains: settlementSearch, mode: "insensitive" } },
      { utr: { contains: settlementSearch, mode: "insensitive" } },
      ...(query.search ? [
        { vendor: userNameContains(query.search) },
      ] : []),
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.vendorSettlement.findMany({
      where,
      include: {
        vendor: { select: { firstName: true, lastName: true, email: true } },
        bookingTransactions: { select: { salon: { select: { name: true } }, branch: { select: { name: true } } } },
      },
      orderBy: { createdAt: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.vendorSettlement.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    settlementReference: row.referenceId,
    vendorName: personName(row.vendor.firstName, row.vendor.lastName),
    salonNames: [...new Set(row.bookingTransactions.map(({ salon }) => salon.name))],
    branchNames: [...new Set(row.bookingTransactions.flatMap(({ branch }) => branch ? [branch.name] : []))],
    amount: row.amount,
    status: row.status,
    razorpayReference: row.razorpayPayoutId,
    initiatedAt: row.createdAt,
    completedAt: row.processedAt,
    failureReason: row.failureReason,
  }));
  return { data, items: data, pagination: pagination(query.page, query.limit, total) };
}

export const paymentWalletStatus = {
  approval: BookingFinanceApprovalStatus,
  settlement: BookingSettlementStatus,
};
