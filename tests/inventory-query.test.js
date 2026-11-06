const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const app = require("../dist/app").default;
const { inventoryService } = require("../dist/modules/inventory/inventory.service");
const { updateProductSchema } = require("../dist/modules/inventory/inventory.validation");
const { getEffectivePermissions } = require("../dist/modules/rbac/rbac.service");

const prisma = new PrismaClient();
let server;
let baseUrl;
let adminToken;

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  assert.ok(admin, "inventory tests require an admin fixture");
  adminToken = jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret");
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test("admin product listing supports server pagination and allowlisted sorting", async () => {
  for (const sortBy of ["name", "price", "stock", "sku", "createdAt", "updatedAt"]) {
    const result = await request(`/api/v1/inventory/admin/products?page=1&limit=1&sortBy=${sortBy}&sortOrder=asc`);
    assert.equal(result.status, 200, `${sortBy} ordering should be supported`);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.pagination.page, 1);
    assert.equal(result.body.data.pagination.limit, 1);
    assert.ok(Number.isInteger(result.body.data.pagination.total));
    assert.ok(result.body.data.items.length <= 1);
  }
  const first = await request("/api/v1/inventory/admin/products?page=1&limit=1&sortBy=name&sortOrder=asc");
  if (first.body.data.pagination.total > 1) {
    const second = await request("/api/v1/inventory/admin/products?page=2&limit=1&sortBy=name&sortOrder=asc");
    assert.notEqual(first.body.data.items[0].id, second.body.data.items[0].id);
    assert.equal(second.body.data.pagination.hasPreviousPage, true);
    assert.equal(second.body.data.pagination.hasNextPage, second.body.data.pagination.total > 2);
    const last = await request(`/api/v1/inventory/admin/products?page=${first.body.data.pagination.total}&limit=1&sortBy=name&sortOrder=asc`);
    assert.equal(last.body.data.pagination.hasNextPage, false);
  }
});

test("invalid pagination, sorting, stock status, and date ranges are rejected", async () => {
  for (const path of [
    "/api/v1/inventory/admin/products?page=0",
    "/api/v1/inventory/admin/products?sortBy=unsafeField",
    "/api/v1/inventory/admin/products?stockStatus=UNKNOWN",
    "/api/v1/inventory/categories?startDate=not-a-date",
    "/api/v1/inventory/reports?startDate=2026-10-02&endDate=2026-10-01",
  ]) {
    const result = await request(path);
    assert.equal(result.status, 400, `${path} should be rejected`);
    assert.equal(result.body.success, false);
  }
});

test("category search, status, sorting, and pagination are applied together", async () => {
  const categories = await request("/api/v1/inventory/categories?status=ACTIVE&sortBy=name&sortOrder=asc&page=1&limit=1");
  assert.equal(categories.status, 200);
  assert.ok(Array.isArray(categories.body.data.items));
  assert.equal(categories.body.data.pagination.page, 1);
  assert.equal(categories.body.data.pagination.limit, 1);
  assert.ok(categories.body.data.items.length <= 1);
  assert.ok(categories.body.data.items.every(({ status }) => status === "ACTIVE"));
  if (categories.body.data.pagination.total > 1) {
    const second = await request("/api/v1/inventory/categories?status=ACTIVE&sortBy=name&sortOrder=asc&page=2&limit=1");
    assert.notEqual(categories.body.data.items[0].id, second.body.data.items[0].id);
    assert.equal(second.body.data.pagination.hasPreviousPage, true);
  }
});

test("stock listing filters and report summary return real paginated data", async () => {
  const stock = await request("/api/v1/inventory/salon/stock?page=1&limit=2&sortBy=quantity&sortOrder=desc&stockStatus=LOW_STOCK");
  assert.equal(stock.status, 200);
  assert.ok(Array.isArray(stock.body.data.items));
  assert.equal(stock.body.data.pagination.limit, 2);
  assert.ok(stock.body.data.items.length <= 2);
  for (const item of stock.body.data.items) {
    const available = item.quantity - item.reservedQuantity;
    assert.ok(available > 0 && available <= item.reorderLevel);
  }
  if (stock.body.data.pagination.total > 2) {
    const secondPage = await request("/api/v1/inventory/salon/stock?page=2&limit=2&sortBy=quantity&sortOrder=desc&stockStatus=LOW_STOCK");
    assert.equal(secondPage.body.data.pagination.page, 2);
    assert.notEqual(stock.body.data.items[0].id, secondPage.body.data.items[0].id);
    assert.equal(secondPage.body.data.pagination.hasPreviousPage, true);
  }

  const report = await request("/api/v1/inventory/reports?page=1&limit=1&sortBy=name&sortOrder=asc");
  assert.equal(report.status, 200);
  for (const field of ["totalProducts", "totalCategories", "totalStock", "availableStock", "lowStock", "outOfStock", "stockValue", "stockMovement"]) {
    assert.equal(typeof report.body.data[field], "number", `${field} should be an aggregated number`);
  }
  assert.equal(report.body.data.pagination.page, 1);
  assert.equal(report.body.data.pagination.limit, 1);
  assert.ok(Number.isInteger(report.body.data.pagination.total));
  assert.equal(report.body.data.items.length, Math.min(1, report.body.data.pagination.total));
  if (report.body.data.pagination.total > 1) {
    const pageTwo = await request("/api/v1/inventory/reports?page=2&limit=1&sortBy=name&sortOrder=asc");
    assert.equal(pageTwo.status, 200);
    assert.equal(pageTwo.body.data.pagination.page, 2);
    assert.equal(pageTwo.body.data.pagination.hasPreviousPage, true);
    assert.notEqual(pageTwo.body.data.items[0].id, report.body.data.items[0].id, "page 2 must contain a different stock record");
    if (report.body.data.pagination.total > 2) {
      const pageThree = await request("/api/v1/inventory/reports?page=3&limit=1&sortBy=name&sortOrder=asc");
      assert.equal(pageThree.body.data.pagination.page, 3);
      assert.notEqual(pageThree.body.data.items[0].id, pageTwo.body.data.items[0].id, "page 3 must contain a different stock record");
    }
    const lastPageNumber = report.body.data.pagination.total;
    const lastPage = await request(`/api/v1/inventory/reports?page=${lastPageNumber}&limit=1&sortBy=name&sortOrder=asc`);
    assert.equal(lastPage.body.data.pagination.hasNextPage, false);
    assert.equal(lastPage.body.data.pagination.hasPreviousPage, true);
  } else {
    assert.equal(report.body.data.pagination.totalPages, 0);
    assert.equal(report.body.data.pagination.hasNextPage, false);
  }

  const sampleStock = await prisma.inventoryStock.findFirst({
    include: {
      variant: { include: { product: { select: { name: true, categoryId: true } } } },
      vendorProduct: { select: { salonId: true, branchId: true } },
    },
  });

  if (sampleStock) {
    const filters = new URLSearchParams({
      page: "1",
      limit: "1",
      search: sampleStock.variant.product.name,
      salonId: sampleStock.vendorProduct.salonId,
      startDate: sampleStock.updatedAt.toISOString().slice(0, 10),
      endDate: sampleStock.updatedAt.toISOString().slice(0, 10),
      sortBy: "name",
      sortOrder: "asc",
    });
    if (sampleStock.variant.product.categoryId) filters.set("categoryId", sampleStock.variant.product.categoryId);
    if (sampleStock.vendorProduct.branchId) filters.set("branchId", sampleStock.vendorProduct.branchId);
    const filteredReport = await request(`/api/v1/inventory/reports?${filters}`);
    assert.equal(filteredReport.status, 200);
    assert.ok(filteredReport.body.data.items.some(({ id }) => id === sampleStock.id));
    assert.equal(filteredReport.body.data.pagination.limit, 1);
    assert.ok(filteredReport.body.data.pagination.total >= filteredReport.body.data.items.length);
  }
  const emptyReport = await request("/api/v1/inventory/reports?categoryId=00000000-0000-4000-8000-000000000000&page=2&limit=1");
  assert.equal(emptyReport.status, 200);
  assert.deepEqual(emptyReport.body.data.items, []);
  assert.equal(emptyReport.body.data.pagination.total, 0);
  assert.equal(emptyReport.body.data.pagination.totalPages, 0);
  assert.equal(emptyReport.body.data.pagination.hasNextPage, false);
  assert.equal(emptyReport.body.data.pagination.hasPreviousPage, false);
});

test("vendor stock adjustment route updates owned stock and rejects another vendor's stock", async (t) => {
  const vendors = await prisma.user.findMany({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
    select: { id: true },
  });
  let fixture;
  for (const vendor of vendors) {
    const permissions = await getEffectivePermissions(vendor.id);
    if (!permissions.includes("inventory.edit")) continue;
    const stock = await prisma.inventoryStock.findFirst({
      where: { vendorProduct: { vendorId: vendor.id } },
      select: { id: true, quantity: true, reservedQuantity: true, reorderLevel: true },
    });
    if (stock) {
      fixture = { vendor, stock };
      break;
    }
  }
  if (!fixture) return t.skip("No Vendor with inventory.edit permission and owned stock is available");

  const token = jwt.sign({ userId: fixture.vendor.id, roles: ["VENDOR"] }, process.env.JWT_SECRET || "your-jwt-secret");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const originalQuantity = fixture.stock.quantity;
  const originalReorderLevel = fixture.stock.reorderLevel;
  const nextQuantity = Math.max(originalQuantity, fixture.stock.reservedQuantity) + 1;
  const nextReorderLevel = originalReorderLevel + 1;
  try {
    const response = await fetch(`${baseUrl}/api/v1/inventory/vendor/stock/${fixture.stock.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ quantity: nextQuantity, reorderLevel: nextReorderLevel }),
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.data.quantity, nextQuantity);
    assert.equal(body.data.reorderLevel, nextReorderLevel);

    const otherVendorStock = await prisma.inventoryStock.findFirst({
      where: { vendorProduct: { vendorId: { not: fixture.vendor.id } } },
      select: { id: true },
    });
    if (otherVendorStock) {
      const denied = await fetch(`${baseUrl}/api/v1/inventory/vendor/stock/${otherVendorStock.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reorderLevel: 99 }),
      });
      assert.equal(denied.status, 404, "a Vendor must not update another Vendor's stock");
    }
  } finally {
    await prisma.inventoryStock.update({
      where: { id: fixture.stock.id },
      data: { quantity: originalQuantity, reorderLevel: originalReorderLevel },
    });
  }
});

test("product filters combine and vendor inventory rejects another vendor's ID", async () => {
  const listing = await prisma.vendorProduct.findFirst({
    include: { product: { select: { id: true, name: true, categoryId: true } } },
  });

  test("partial product updates do not reset omitted stock, reorder, tax, or image fields", () => {
    const parsed = updateProductSchema.parse({
      variants: [{ sku: "SKU-TEST", sellingPrice: 10 }],
    });
    assert.equal(parsed.gstRate, undefined);
    assert.equal(parsed.images, undefined);
    assert.equal(parsed.variants[0].stock, undefined);
    assert.equal(parsed.variants[0].reorderLevel, undefined);
    assert.equal(parsed.variants[0].costPrice, undefined);
    assert.equal(parsed.variants[0].mrp, undefined);
  });
  if (listing) {
    const params = new URLSearchParams({
      search: listing.product.name,
      vendorId: listing.vendorId,
      salonId: listing.salonId,
      page: "1",
      limit: "5",
    });
    if (listing.branchId) params.set("branchId", listing.branchId);
    if (listing.product.categoryId) params.set("categoryId", listing.product.categoryId);
    const result = await request(`/api/v1/inventory/admin/products?${params}`);
    assert.equal(result.status, 200);
    assert.ok(result.body.data.items.some(({ id }) => id === listing.productId));
  }

  const [vendor, anotherVendor] = await prisma.user.findMany({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
    take: 2,
    select: { id: true },
  });
  if (vendor && anotherVendor) {
    await assert.rejects(
      inventoryService.listVendorProducts(vendor.id, { vendorId: anotherVendor.id }),
      (error) => error.status === 403,
    );
  }
});
