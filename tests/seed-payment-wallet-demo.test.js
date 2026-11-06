const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node").register({ files: true });
const {
  assertSafeSeedEnvironment,
  assertExistingVendorRole,
  assertMarkerOwnership,
  commissionRuleRestoreData,
  paymentWalletFixture,
  SEED_VENDOR_EMAIL,
} = require("../scripts/seed-payment-wallet-demo.ts");

test("seed requires its development opt-in and refuses production", () => {
  assert.throws(
    () => assertSafeSeedEnvironment({ NODE_ENV: "development" }),
    /ALLOW_PAYMENT_WALLET_DEMO_SEED=true/,
  );
  assert.throws(
    () => assertSafeSeedEnvironment({ NODE_ENV: "production", ALLOW_PAYMENT_WALLET_DEMO_SEED: "true" }),
    /refuses to run in production/,
  );
  assert.doesNotThrow(
    () => assertSafeSeedEnvironment({ NODE_ENV: "test", ALLOW_PAYMENT_WALLET_DEMO_SEED: "true" }),
  );
});

test("an existing vendor account must already have the vendor role", () => {
  assert.throws(
    () => assertExistingVendorRole(true, false),
    /not assigned the VENDOR role/,
  );
  assert.doesNotThrow(() => assertExistingVendorRole(true, true));
  assert.doesNotThrow(() => assertExistingVendorRole(false, false));
});

test("marker reuse rejects any booking/vendor mismatch", () => {
  assert.doesNotThrow(() => assertMarkerOwnership("payment-marker", "booking-1", "vendor-1", "booking-1", "vendor-1"));
  assert.throws(
    () => assertMarkerOwnership("payment-marker", "booking-1", "vendor-1", "booking-2", "vendor-1"),
    /another booking or vendor/,
  );
  assert.throws(
    () => assertMarkerOwnership("payment-marker", "booking-1", "vendor-1", "booking-1", "vendor-2"),
    /another booking or vendor/,
  );
});

test("temporary commission-rule activation can restore the exact prior fields", () => {
  const prior = {
    isActive: true,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: new Date("2026-12-31T23:59:59.999Z"),
  };
  assert.deepEqual(commissionRuleRestoreData(prior), prior);
  assert.deepEqual(commissionRuleRestoreData({ ...prior, effectiveTo: null }), { ...prior, effectiveTo: null });
});

test("fixtures use only stable vendor@example.com-scoped booking/payment references", () => {
  assert.equal(SEED_VENDOR_EMAIL, "vendor@example.com");
  const refunds = Array.from({ length: 4 }, (_, index) => paymentWalletFixture(index, "refund"));
  const completions = Array.from({ length: 4 }, (_, index) => paymentWalletFixture(index, "completed"));

  assert.equal(new Set(refunds.map(({ note }) => note)).size, 4);
  assert.equal(new Set(completions.map(({ transactionId }) => transactionId)).size, 4);
  assert.ok(refunds.every(({ note }) => note.startsWith("payment-wallet-demo:vendor-example:")));
  assert.ok(completions.every(({ note }) => note.startsWith("payment-wallet-demo:vendor-example:")));
  assert.equal(refunds[0].paymentStatus, "REFUNDED");
  assert.equal(completions[0].paymentStatus, "COMPLETED");
  assert.equal(refunds[0].amount, 1200);
  assert.equal(completions[0].amount, 1800);
  assert.equal(completions[3].amount, 2400);
  const pending = paymentWalletFixture(0, "pending");
  const failed = paymentWalletFixture(0, "failed");
  assert.equal(pending.paymentStatus, "PENDING");
  assert.equal(failed.paymentStatus, "FAILED");
  assert.notEqual(pending.transactionId, failed.transactionId);
  assert.ok(pending.note.startsWith("payment-wallet-demo:vendor-example:"));
  assert.ok(failed.note.startsWith("payment-wallet-demo:vendor-example:"));
  assert.throws(() => paymentWalletFixture(1, "pending"), RangeError);
  assert.throws(() => paymentWalletFixture(1, "failed"), RangeError);
  assert.throws(() => paymentWalletFixture(-1, "refund"), RangeError);
  assert.throws(() => paymentWalletFixture(4, "completed"), RangeError);
});

test("seed does not invoke global demo imports or create customer wallet credits", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "seed-payment-wallet-demo.ts"), "utf8");
  assert.doesNotMatch(source, /importDashboardDemoData|ALLOW_DEMO_DATA_IMPORT/);
  assert.doesNotMatch(source, /walletTransaction\.create|customerWallet\.upsert/);
  assert.doesNotMatch(source, /vendorSettlement\.create|submitSettlementPayout/);
  assert.match(source, /recordEligibleBookingFinance/);
  assert.match(source, /assertExistingVendorRole\(true, Boolean\(roleAssignment\)\)/);
  assert.match(source, /assertMarkerOwnership\(fixture\.transactionId/);
  assert.match(source, /assertMarkerOwnership\(\s*fixture\.refundIdempotencyKey/);
  assert.match(source, /salon:\s*\{\s*is:\s*\{\s*ownerId:\s*vendorId\s*\}\s*\}/);
});
