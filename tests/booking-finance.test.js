const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { BookingCommissionType, BookingFinanceApprovalStatus, BookingSettlementStatus, PrismaClient } = require("@prisma/client");
const app = require("../dist/app").default;
const {
  calculateCommissionAmounts,
  financeTransactionActions,
  resolveFinanceDateRange,
} = require("../dist/modules/booking/booking-finance.service");
const {
  financeReportQuerySchema,
  financeTrendQuerySchema,
  settlementSettingsSchema,
  financeListQuerySchema,
  vendorFinanceLookupQuerySchema,
} = require("../dist/modules/booking/booking-finance.validation");

test("percentage commission is calculated in cents and payable is the remainder", () => {
  assert.deepEqual(
    calculateCommissionAmounts(100000, BookingCommissionType.PERCENTAGE, 30),
    { commissionCents: 30000, vendorPayableCents: 70000 },
  );
});

test("fixed commission is capped at the fully-paid booking amount", () => {
  assert.deepEqual(
    calculateCommissionAmounts(100000, BookingCommissionType.FIXED, 100),
    { commissionCents: 10000, vendorPayableCents: 90000 },
  );
  assert.deepEqual(
    calculateCommissionAmounts(5000, BookingCommissionType.FIXED, 100),
    { commissionCents: 5000, vendorPayableCents: 0 },
  );
});

test("commission transaction actions remain visible and reflect persisted approval states", () => {
  assert.deepEqual(financeTransactionActions(BookingFinanceApprovalStatus.PENDING), {
    approve: { visible: true, allowed: true, label: "Approve" },
    hold: { visible: true, allowed: true, label: "Hold" },
  });
  assert.deepEqual(financeTransactionActions(BookingFinanceApprovalStatus.APPROVED), {
    approve: { visible: true, allowed: false, label: "Approved" },
    hold: { visible: true, allowed: false, label: "Hold" },
  });
  assert.deepEqual(financeTransactionActions(BookingFinanceApprovalStatus.HELD), {
    approve: { visible: true, allowed: true, label: "Approve" },
    hold: { visible: true, allowed: false, label: "On Hold" },
  });
});

test("approve and hold persist and remain in the commission transaction list", async (t) => {
  const prisma = new PrismaClient();
  const server = http.createServer(app);
  const suffix = crypto.randomUUID();
  const vendorId = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const salonId = crypto.randomUUID();
  const bookingIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const financeIds = [...bookingIds];
  let vendorCreated = false;
  let customerCreated = false;
  let salonCreated = false;

  try {
    const admin = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: "ADMIN" } } } },
      include: { roles: { include: { role: true } } },
    });
    assert.ok(admin, "An Admin fixture is required for finance API integration tests");
    await new Promise((resolve) => server.listen(0, resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const token = jwt.sign(
      { userId: admin.id, roles: admin.roles.map(({ role }) => role.name) },
      process.env.JWT_SECRET || "your-jwt-secret",
    );
    const request = async (path, options = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
      return { status: response.status, body: await response.json() };
    };

    await prisma.user.create({
      data: { id: vendorId, firstName: "Finance", lastName: "Test Vendor", email: `finance-vendor-${suffix}@example.test`, phone: "9876543210", countryCode: "+91", password: "not-used" },
    });
    vendorCreated = true;
    await prisma.user.create({
      data: { id: customerId, firstName: "Finance", lastName: "Test Customer", email: `finance-customer-${suffix}@example.test`, phone: "9876543211", countryCode: "+91", password: "not-used" },
    });
    customerCreated = true;
    await prisma.salon.create({
      data: { id: salonId, name: `Finance Test ${suffix}`, ownerId: vendorId, timings: {} },
    });
    salonCreated = true;
    await prisma.vendorWallet.create({
      data: { vendorId, pendingBalance: 300 },
    });

    for (let index = 0; index < bookingIds.length; index += 1) {
      const bookingId = bookingIds[index];
      await prisma.booking.create({
        data: {
          id: bookingId,
          salonId,
          customerId,
          bookingDate: new Date(Date.now() + 60_000),
          status: "CONFIRMED",
          totalAmount: 100,
          finalAmount: 100,
          totalPaid: 100,
        },
      });
      await prisma.bookingFinancialTransaction.create({
        data: {
          id: financeIds[index],
          bookingId,
          customerId,
          vendorId,
          salonId,
          bookingAmount: 100,
          vendorGrossAmount: 100,
          commissionType: BookingCommissionType.PERCENTAGE,
          commissionValue: 10,
          commissionAmount: 10,
          vendorPayableAmount: 90,
          approvalStatus: BookingFinanceApprovalStatus.PENDING,
          settlementStatus: BookingSettlementStatus.NOT_READY,
        },
      });
    }

    const approveId = financeIds[0];
    const holdId = financeIds[1];
    const concurrentId = financeIds[2];
    const listPath = (approvalStatus) => `/api/v1/admin/payment-wallet/commission/transactions?vendorName=Finance%20Test%20Vendor${approvalStatus ? `&approvalStatus=${approvalStatus}` : ""}`;
    const listedTransaction = (body, id) => body.data.data.find((transaction) => transaction.id === id);

    const pending = await request(listPath("PENDING"));
    assert.equal(pending.status, 200);
    assert.deepEqual(listedTransaction(pending.body, approveId).actions, {
      approve: { visible: true, allowed: true, label: "Approve" },
      hold: { visible: true, allowed: true, label: "Hold" },
    });

    assert.equal((await request(`/api/v1/admin/payment-wallet/commission/transactions/${approveId}/approve`, { method: "POST", body: "{}" })).status, 200);
    const approvedRefresh = await request(listPath("APPROVED"));
    const approvedTransaction = listedTransaction(approvedRefresh.body, approveId);
    assert.ok(approvedTransaction, "Approved transaction remains in the refreshed transactions list");
    assert.equal(approvedTransaction.approvalStatus, "APPROVED");
    assert.equal(approvedTransaction.actions.approve.label, "Approved");
    assert.equal(approvedTransaction.actions.approve.allowed, false);
    const approvedInDatabase = await prisma.bookingFinancialTransaction.findUnique({ where: { id: approveId } });
    assert.equal(approvedInDatabase.approvalStatus, "APPROVED");
    assert.ok(approvedInDatabase.approvedAt);
    const duplicateApproval = await request(`/api/v1/admin/payment-wallet/commission/transactions/${approveId}/approve`, { method: "POST", body: "{}" });
    assert.equal(duplicateApproval.status, 409);
    assert.equal(duplicateApproval.body.code, "COMMISSION_ALREADY_APPROVED");

    assert.equal((await request(`/api/v1/admin/payment-wallet/commission/transactions/${holdId}/hold`, { method: "POST", body: JSON.stringify({ reason: "Review requested" }) })).status, 200);
    const heldRefresh = await request(listPath("HELD"));
    const heldTransaction = listedTransaction(heldRefresh.body, holdId);
    assert.ok(heldTransaction, "Held transaction remains in the refreshed transactions list");
    assert.equal(heldTransaction.approvalStatus, "HELD");
    assert.equal(heldTransaction.actions.approve.allowed, true);
    assert.equal(heldTransaction.actions.hold.label, "On Hold");
    assert.equal(heldTransaction.actions.hold.allowed, false);
    const heldInDatabase = await prisma.bookingFinancialTransaction.findUnique({ where: { id: holdId } });
    assert.equal(heldInDatabase.approvalStatus, "HELD");
    assert.equal(heldInDatabase.decisionReason, "Review requested");
    assert.ok(await prisma.bookingFinanceAuditLog.findFirst({
      where: { targetType: "BOOKING_FINANCE", targetId: holdId, action: "HELD" },
    }));
    const duplicateHold = await request(`/api/v1/admin/payment-wallet/commission/transactions/${holdId}/hold`, { method: "POST", body: "{}" });
    assert.equal(duplicateHold.status, 409);
    assert.equal(duplicateHold.body.code, "COMMISSION_ALREADY_ON_HOLD");

    const concurrentResults = await Promise.all([
      request(`/api/v1/admin/payment-wallet/commission/transactions/${concurrentId}/approve`, { method: "POST", body: "{}" }),
      request(`/api/v1/admin/payment-wallet/commission/transactions/${concurrentId}/approve`, { method: "POST", body: "{}" }),
    ]);
    assert.equal(concurrentResults.filter(({ status }) => status === 200).length, 1);
    assert.equal(concurrentResults.filter(({ status }) => status === 409).length, 1);
    const concurrentPersisted = await prisma.bookingFinancialTransaction.findUnique({ where: { id: concurrentId } });
    assert.equal(concurrentPersisted.approvalStatus, "APPROVED");
    assert.equal((await prisma.vendorWalletLedger.count({ where: { bookingFinanceId: concurrentId } })), 3);
    const allStatusesRefresh = await request(listPath());
    assert.equal(allStatusesRefresh.body.data.pagination.total, 3);
    for (const id of financeIds) assert.ok(listedTransaction(allStatusesRefresh.body, id));
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    if (financeIds.length) {
      await prisma.bookingFinanceAuditLog.deleteMany({ where: { targetType: "BOOKING_FINANCE", targetId: { in: financeIds } } });
      await prisma.vendorWalletLedger.deleteMany({ where: { bookingFinanceId: { in: financeIds } } });
    }
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await prisma.vendorWallet.deleteMany({ where: { vendorId } });
    if (salonCreated) await prisma.salon.deleteMany({ where: { id: salonId } });
    if (customerCreated) await prisma.user.deleteMany({ where: { id: customerId } });
    if (vendorCreated) await prisma.user.deleteMany({ where: { id: vendorId } });
    await prisma.$disconnect();
  }
});

test("date presets return UTC half-open ranges, including the prior month", () => {
  const now = new Date("2026-10-06T15:00:00.000Z");
  const today = resolveFinanceDateRange("today", undefined, undefined, now);
  assert.equal(today.start.toISOString(), "2026-10-06T00:00:00.000Z");
  assert.equal(today.end.toISOString(), "2026-10-07T00:00:00.000Z");

  const lastMonth = resolveFinanceDateRange("lastMonth", undefined, undefined, now);
  assert.equal(lastMonth.start.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(lastMonth.end.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("custom reporting requires ordered dates and includes the selected end instant", () => {
  const parsed = financeReportQuerySchema.safeParse({
    period: "custom",
    granularity: "daily",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-10-03T00:00:00.000Z",
  });

  test("report query accepts API contract aliases for periods, date bounds, and groupBy", () => {
    const summary = financeReportQuerySchema.parse({
      period: "last_week",
      from: "2026-09-28T00:00:00.000Z",
      to: "2026-10-04T23:59:59.999Z",
    });
    assert.equal(summary.period, "lastWeek");
    assert.equal(summary.startDate, "2026-09-28T00:00:00.000Z");
    assert.equal(summary.endDate, "2026-10-04T23:59:59.999Z");

    const trends = financeTrendQuerySchema.parse({ period: "custom", groupBy: "month", from: "2026-01-01T00:00:00.000Z", to: "2026-10-06T00:00:00.000Z" });
    assert.equal(trends.groupBy, "month");
    assert.equal(trends.period, "custom");
  });

  test("finance list accepts filters, ordering, and settlement setting unit aliases", () => {
    const list = financeListQuerySchema.parse({
      page: "2",
      limit: "50",
      transactionType: "COMMISSION_DEBIT",
      sortBy: "commissionAmount",
      sortOrder: "asc",
    });
    assert.equal(list.page, 2);
    assert.equal(list.limit, 50);
    assert.equal(list.sortOrder, "asc");
    assert.deepEqual(vendorFinanceLookupQuerySchema.parse({ page: "2", salonId: "00000000-0000-4000-8000-000000000001" }), {
      salonId: "00000000-0000-4000-8000-000000000001",
      page: 2,
      limit: 10,
    });
    assert.throws(() => vendorFinanceLookupQuerySchema.parse({ salonId: "not-a-uuid" }));

    const settings = settlementSettingsSchema.parse({
      settlementMode: "MANUAL",
      intervalValue: "1",
      intervalUnit: "DAY",
      minimumSettlementAmount: 0,
      autoSettlementEnabled: false,
      payoutMode: "IMPS",
    });
    assert.equal(settings.intervalUnit, "DAYS");
  });
  assert.equal(parsed.success, true);
  assert.equal(financeReportQuerySchema.safeParse({ period: "custom" }).success, false);

  const range = resolveFinanceDateRange("custom", new Date(parsed.data.startDate), new Date(parsed.data.endDate));
  assert.equal(range.end.toISOString(), "2026-10-03T00:00:00.001Z");
  assert.throws(() => resolveFinanceDateRange("custom", new Date("2026-10-04"), new Date("2026-10-03")));
});
