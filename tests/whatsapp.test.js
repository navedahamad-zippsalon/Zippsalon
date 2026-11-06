const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

process.env.WHATSAPP_ENCRYPTION_KEY = "test-key-for-whatsapp";

const { normalizePhone } = require("../dist/modules/whatsapp/utils/phone");
const { encrypt, decrypt } = require("../dist/modules/whatsapp/utils/encryption");
const { MockWhatsAppProvider } = require("../dist/modules/whatsapp/providers/mock-whatsapp.provider");
const { retryDelay, enqueue, dequeue } = require("../dist/modules/whatsapp/workers/queue");
const { categoryFor } = require("../dist/modules/whatsapp/whatsapp.types");
const { calculateWhatsAppCharge } = require("../dist/modules/whatsapp/utils/billing");
const { calculateWhatsAppFinancials, pricingRates } = require("../dist/modules/whatsapp/utils/pricing");
const redis = require("../dist/infrastructure/redis/redis").default;

test.after(() => redis.disconnect());

test("normalizes Indian phone numbers to E.164", () => {
  assert.equal(normalizePhone("09876543210", "+91"), "+919876543210");
  assert.throws(() => normalizePhone("123", "+91"), /WHATSAPP_INVALID_PHONE/);
});

test("encrypts and decrypts secrets without plaintext storage", () => {
  const encrypted = encrypt("demo-access-token");
  assert.notEqual(encrypted, "demo-access-token");
  assert.equal(decrypt(encrypted), "demo-access-token");
});

test("mock provider returns normalized message IDs and supports verification", async () => {
  const provider = new MockWhatsAppProvider();
  const result = await provider.sendTextMessage("+919876543210", "Hello");
  assert.match(result.providerMessageId, /^mock-/);
  assert.equal(await provider.verifyCredentials(), true);
});

test("message categories default to service and template utility", () => {
  assert.equal(categoryFor("TEXT"), "SERVICE");
  assert.equal(categoryFor("TEMPLATE"), "UTILITY");
  assert.equal(categoryFor("TEMPLATE", "MARKETING"), "MARKETING");
});

test("WhatsApp estimates add a campaign charge once and charge only billable messages", () => {
  assert.equal(calculateWhatsAppCharge(0, 0.5, 100), 0);
  assert.equal(calculateWhatsAppCharge(500, 0.5, 100), 350);
  assert.equal(calculateWhatsAppCharge(480, 0.5, 0), 240);
});

test("WhatsApp financials separate provider cost, vendor charge and admin margin", () => {
  assert.deepEqual(calculateWhatsAppFinancials(1000, 0.3, 1), {
    providerCost: 300,
    vendorCharge: 1000,
    adminMargin: 700,
    providerCostRate: 0.3,
    vendorPriceRate: 1,
    warning: null,
  });
  const belowCost = calculateWhatsAppFinancials(1000, 0.3, 0.2);
  assert.equal(belowCost.adminMargin, -100);
  assert.match(belowCost.warning, /lower than provider cost/);
  assert.deepEqual(pricingRates({ costPerMessage: 1, providerCostPerMessage: 0.3 }), {
    vendorPricePerMessage: 1,
    providerCostPerMessage: 0.3,
  });
});

test("retry backoff uses bounded exponential schedule", () => {
  assert.deepEqual([retryDelay(0), retryDelay(1), retryDelay(2), retryDelay(3), retryDelay(10)], [5000, 30000, 120000, 600000, 600000]);
});

test("queue persists jobs or explicitly rejects unavailable Redis", async () => {
  const queue = `test-${crypto.randomUUID()}`;
  const job = { type: "message", id: "message-1" };
  try {
    await enqueue(queue, job);
    const [queued] = await dequeue(queue);
    assert.equal(queued.id, job.id);
    assert.equal(queued.type, job.type);
  } catch (error) {
    assert.equal(error.code, "WHATSAPP_QUEUE_UNAVAILABLE");
  }
});

test("seed contains at least thirty demo templates and no ten-template cap", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "prisma", "whatsapp-templates.ts"), "utf8");
  assert.equal((source.match(/^\s*\[\"/gm) || []).length, 30);
  assert.doesNotMatch(source, /take:\s*10|limit\s*[:=]\s*10/);
});
