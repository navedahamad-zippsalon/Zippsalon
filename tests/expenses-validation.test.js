require("ts-node/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const { expenseListQuerySchema, expensePayloadSchema } = require("../src/validators/expenses");
const { reportsQuerySchema } = require("../src/validators/reports");
const { createTranslator } = require("../src/modules/i18n/i18n.translations");
const { parseExpenseQuery } = require("../src/modules/expenses/expenses.controller");
const { isPureCustomerUser } = require("../src/common/utils/role.util");

const expenseInput = {
  expenseDate: "2026-10-12",
  amount: "1.15",
  categoryId: "f4e709b2-8c8f-4dd2-8c2c-45c04f241f89",
  paymentMethod: "UPI",
  salonId: "ac6dc07b-ce7f-4f53-b1ce-2dcc005970bd",
};

test("expense validation accepts currency precision and supported payment codes", () => {
  const result = expensePayloadSchema.parse(expenseInput);
  assert.equal(result.amount, 1.15);
  assert.equal(result.paymentMethod, "UPI");
});

test("expense validation rejects non-positive amounts, excess decimals and invalid methods", () => {
  assert.equal(expensePayloadSchema.safeParse({ ...expenseInput, amount: "0" }).success, false);
  assert.equal(expensePayloadSchema.safeParse({ ...expenseInput, amount: "1.234" }).success, false);
  assert.equal(expensePayloadSchema.safeParse({ ...expenseInput, paymentMethod: "CHEQUE" }).success, false);
});

test("expense validation strips client-supplied tenant identifiers", () => {
  const result = expensePayloadSchema.parse({ ...expenseInput, vendorId: "client-controlled" });
  assert.equal("vendorId" in result, false);
});

test("expense filters validate date ranges, month/year pairs and pagination bounds", () => {
  assert.equal(expenseListQuerySchema.safeParse({ month: 10 }).success, false);
  assert.equal(expenseListQuerySchema.safeParse({ startDate: "2026-10-20", endDate: "2026-10-01" }).success, false);
  assert.equal(expenseListQuerySchema.safeParse({ page: 1, limit: 1000 }).success, false);
  const result = expenseListQuerySchema.parse({ month: 10, year: 2026 });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
});

test("customer-only restriction does not reject a user with an authorized Vendor role", () => {
  assert.equal(isPureCustomerUser(["CUSTOMER"]), true);
  assert.equal(isPureCustomerUser(["VENDOR", "CUSTOMER"]), false);
  assert.equal(isPureCustomerUser(["STAFF", "CUSTOMER"]), false);
});

test("Expenses controller normalizes string query parameters before Prisma pagination", () => {
  const query = parseExpenseQuery({
    query: {
      page: "2",
      limit: "10",
      month: "10",
      year: "2026",
      sortBy: "expenseDate",
      sortOrder: "desc",
    },
  });
  assert.equal(query.page, 2);
  assert.equal(query.limit, 10);
  assert.equal(query.month, 10);
  assert.equal(query.year, 2026);
  assert.equal(typeof query.limit, "number");
});

test("Reports & Analytics accepts selected month and year only as a valid pair", () => {
  assert.equal(reportsQuerySchema.safeParse({ month: 10 }).success, false);
  assert.deepEqual(reportsQuerySchema.parse({ month: 10, year: 2026 }), { month: 10, year: 2026 });
});

test("expense messages have non-English Hinglish and Hindi translations", () => {
  const en = createTranslator("en");
  const hi = createTranslator("hi");
  const hinglish = createTranslator("hi-en");
  assert.notEqual(hi("expenses.created"), en("expenses.created"));
  assert.notEqual(hinglish("expenses.created"), en("expenses.created"));
  assert.equal(hinglish("expenses.created"), "Expense successfully add ho gaya hai.");
});
