const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.PAYMENT_ENCRYPTION_KEY ||= "staff-bank-details-test-encryption-key";
const app = require("../dist/app").default;
const { generateTestToken } = require("./factories/auth.factory");

let server;
let baseUrl;

function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  return fetch(url, { ...options, headers }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    return { status: response.status, body };
  });
}

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("POST /api/v1/admin/demo-data/import is admin-only and guarded", async () => {
  const customerToken = generateTestToken("customer-1", ["CUSTOMER"]);
  const customerRes = await request("/api/v1/admin/demo-data/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(customerRes.status, 403);

  const adminToken = generateTestToken("admin-1", ["ADMIN"]);
  const adminRes = await request("/api/v1/admin/demo-data/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(adminRes.status, 403);
  assert.match(String(adminRes.body.message || adminRes.body.error || ""), /demo data/i);
});
