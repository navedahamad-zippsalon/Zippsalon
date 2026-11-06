const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../dist/app").default;
const { paymentWalletListQuerySchema } = require("../dist/modules/booking/payment-wallet.validation");
const { paymentRefundCreateSchema, vendorWalletListQuerySchema } = require("../dist/modules/booking/payment-wallet.validation");
const { errorHandler } = require("../dist/common/middleware/error.middleware");

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("Payment & Wallet list filters use readable names and default to ten rows", () => {
  const filters = paymentWalletListQuerySchema.parse({
    vendorName: "Urban Glow",
    salonName: "Urban Glow Salon",
    branchName: "Connaught Place",
    customerName: "Rahul Sharma",
    bookingNumber: "BOOK-2026-12345678",
    transactionReference: "PAY-2026-ABC123",
  });
  assert.equal(filters.limit, 10);
  assert.equal(filters.vendorName, "Urban Glow");
  assert.equal(filters.salonName, "Urban Glow Salon");
  assert.equal(filters.branchName, "Connaught Place");
  assert.equal(filters.customerName, "Rahul Sharma");
  assert.equal(filters.bookingNumber, "BOOK-2026-12345678");
  assert.equal(filters.transactionReference, "PAY-2026-ABC123");
  assert.equal(paymentWalletListQuerySchema.parse({ customerStatus: "ACTIVE" }).customerStatus, "ACTIVE");
  assert.equal(paymentWalletListQuerySchema.parse({ walletTransactionStatus: "COMPLETED" }).walletTransactionStatus, "COMPLETED");
  assert.equal(paymentWalletListQuerySchema.parse({ refundStatus: "PROCESSED" }).refundStatus, "PROCESSED");
  assert.equal(paymentWalletListQuerySchema.parse({ customerId: "00000000-0000-4000-8000-000000000001" }).customerId, "00000000-0000-4000-8000-000000000001");
  assert.equal(paymentWalletListQuerySchema.parse({ ledgerStatus: "PAID" }).ledgerStatus, "PAID");
  assert.equal(paymentWalletListQuerySchema.parse({ paymentTransactionType: "PAYMENT" }).paymentTransactionType, "PAYMENT");
  assert.throws(() => paymentWalletListQuerySchema.parse({ paymentTransactionType: "REFUND" }));
  assert.throws(() => paymentWalletListQuerySchema.parse({ customerStatus: "ANY" }));
  assert.equal(paymentRefundCreateSchema.parse({
    paymentReference: "pay_test_123",
    reason: "Duplicate booking charge",
    idempotencyKey: "refund-request-0001",
  }).paymentReference, "pay_test_123");
  assert.equal(vendorWalletListQuerySchema.parse({ salonName: "Urban Glow", branchName: "Connaught Place", limit: 10 }).limit, 10);
});

test("Payment & Wallet admin endpoints are registered and enforce authentication", async () => {
  const endpoints = [
    "/api/v1/admin/payment-wallet/overview",
    "/api/v1/admin/payment-wallet/payments",
    "/api/v1/admin/payment-wallet/transactions",
    "/api/v1/admin/payment-wallet/gateway",
    "/api/v1/admin/payment-wallet/refunds",
    "/api/v1/admin/payment-wallet/refunds/reference",
    "/api/v1/admin/payment-wallet/customer-wallets",
    "/api/v1/admin/payment-wallet/customer-wallets/00000000-0000-4000-8000-000000000001",
    "/api/v1/admin/payment-wallet/customer-wallets/00000000-0000-4000-8000-000000000001/transactions",
    "/api/v1/admin/payment-wallet/customer-wallets/00000000-0000-4000-8000-000000000001/transactions/00000000-0000-4000-8000-000000000002",
    "/api/v1/admin/payment-wallet/customer-wallet-transactions",
    "/api/v1/admin/payment-wallet/wallet/overview",
    "/api/v1/admin/payment-wallet/wallet/transactions",
    "/api/v1/admin/payment-wallet/commission",
    "/api/v1/admin/payment-wallet/commission/transactions",
    "/api/v1/admin/payment-wallet/settlements/pending",
    "/api/v1/admin/payment-wallet/settlements/history",
    "/api/v1/admin/payment-wallet/settlements/settings",
    "/api/v1/admin/payment-wallet/reports",
    "/api/v1/admin/payment-wallet/lookups/salons",
    "/api/v1/admin/payment-wallet/lookups/branches",
    "/api/v1/admin/payment-wallet/lookups/vendors",
    "/api/v1/admin/payment-wallet/lookups/customers",
    "/api/v1/payments",
    "/api/v1/payments/summary",
    "/api/v1/payments/transactions",
    "/api/v1/payments/transactions/reference",
    "/api/v1/refunds",
    "/api/v1/refunds/summary",
    "/api/v1/refunds/reference",
    "/api/v1/customer-wallet",
    "/api/v1/customer-wallet/transactions",
    "/api/v1/vendor/finance/wallet",
    "/api/v1/vendor/finance/lookups/salons",
    "/api/v1/vendor/finance/lookups/branches",
    "/api/v1/vendor/finance/wallet/transactions",
    "/api/v1/vendor/finance/payout-account",
    "/api/v1/vendor/wallet/summary",
    "/api/v1/vendor/wallet/transactions",
    "/api/v1/admin/booking-finance/vendors/00000000-0000-4000-8000-000000000001/payout-account",
    "/api/v1/admin/booking-finance/razorpayx",
    "/api/v1/booking/commission/settings",
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(response.status, 401, `${endpoint} should be routed and require authentication`);
  }
});

test("Vendor and Admin payout-account updates require authentication", async () => {
  const endpoints = [
    "/api/v1/vendor/finance/payout-account",
    "/api/v1/admin/booking-finance/vendors/00000000-0000-4000-8000-000000000001/payout-account",
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountHolderName: "Example Vendor",
        bankName: "Example Bank",
        accountNumber: "1234567890",
        ifscCode: "ABCD0123456",
        accountType: "CURRENT",
      }),
    });
    assert.equal(response.status, 401, `${endpoint} should require authentication before any payout operation`);
  }
});

test("Payout provider errors preserve safe messages without exposing unexpected server errors", () => {
  const invokeErrorHandler = (error) => {
    let statusCode;
    let body;
    const response = {
      getHeader: () => "test-request-id",
      status: (status) => {
        statusCode = status;
        return response;
      },
      json: (value) => {
        body = value;
        return value;
      },
    };
    errorHandler(error, { path: "/api/v1/vendor/finance/payout-account", method: "PUT" }, response, () => {});
    return { statusCode, body };
  };

  assert.deepEqual(invokeErrorHandler({
    status: 503,
    code: "RAZORPAYX_NOT_CONFIGURED",
    message: "RazorpayX payout credentials are not configured. Configure RazorpayX in Admin Payment & Wallet settings before processing payouts.",
  }), {
    statusCode: 503,
    body: {
      success: false,
      code: "RAZORPAYX_NOT_CONFIGURED",
      message: "RazorpayX payout credentials are not configured. Configure RazorpayX in Admin Payment & Wallet settings before processing payouts.",
    },
  });

  assert.deepEqual(invokeErrorHandler({
    status: 500,
    code: "DATABASE_FAILURE",
    message: "Sensitive internal detail",
  }), {
    statusCode: 500,
    body: {
      success: false,
      code: "DATABASE_FAILURE",
      message: "Internal Server Error",
    },
  });
});
