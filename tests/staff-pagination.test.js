const test = require("node:test");
const assert = require("node:assert/strict");

const { staffListQuerySchema } = require("../dist/validators/staff");

test("staff list pagination defaults to the first ten-record page", () => {
  assert.deepEqual(staffListQuerySchema.parse({}), { page: 1, limit: 10 });
});

test("staff list pagination caps client limits and preserves combined filters", () => {
  const query = staffListQuerySchema.parse({
    page: "2",
    limit: "1000",
    search: "ravi",
    salonId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    branchId: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    status: "ACTIVE",
    role: "Stylist",
    signal: "[object AbortSignal]",
  });

  assert.equal(query.page, 2);
  assert.equal(query.limit, 100);
  assert.equal(query.search, "ravi");
  assert.equal(query.status, "ACTIVE");
  assert.equal(query.role, "Stylist");
  assert.equal(query.signal, "[object AbortSignal]");
});

test("staff list pagination rejects invalid page numbers", () => {
  assert.throws(() => staffListQuerySchema.parse({ page: "0" }));
});
