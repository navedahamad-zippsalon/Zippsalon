const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { bookingService, assertBookingAccess } = require("../dist/modules/booking/booking.service");
const { getStaffByIdService, updateStaffService } = require("../dist/modules/staff/staff.service");
const { updateSalonService } = require("../dist/modules/admin/admin.service");
const { gstService } = require("../dist/modules/gst/gst.service");
const app = require("../dist/app").default;

const prisma = new PrismaClient();

test("booking create and update enforce Vendor, Salon, and Branch ownership", async (t) => {
  const suffix = crypto.randomUUID();
  const createdUserIds = [];
  const salonIds = [];
  const bookingIds = [];
  const subscriptionIds = [];
  const createdServiceIds = [];
  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  const staffRole = await prisma.role.findUnique({ where: { name: "STAFF" } });
  const category = await prisma.serviceCategory.findFirst({ where: { isActive: true } });
  const admin = await prisma.user.findFirst({
    where: { isActive: true, roles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  if (!vendorRole || !staffRole || !category || !admin) {
    return t.skip("Vendor, Staff, ServiceCategory, and Admin fixtures are required");
  }

  const makeUser = async (prefix, roleId) => {
    const user = await prisma.user.create({
      data: {
        firstName: prefix,
        lastName: "Booking Scope Test",
        email: `${prefix}-${suffix}@example.test`,
        phone: `9${crypto.randomInt(100000000, 999999999)}`,
        countryCode: "+91",
        password: "not-used",
        roles: { create: { roleId } },
      },
      select: { id: true },
    });
    createdUserIds.push(user.id);
    return user;
  };

  try {
    const vendorA = await makeUser("VendorA", vendorRole.id);
    const vendorB = await makeUser("VendorB", vendorRole.id);
    const customer = await makeUser("Customer", staffRole.id);
    const staffUser = await makeUser("Staff", staffRole.id);
    const salonA = await prisma.salon.create({
      data: { name: `Booking Scope A ${suffix}`, ownerId: vendorA.id, timings: {} },
      select: { id: true },
    });
    const salonB = await prisma.salon.create({
      data: { name: `Booking Scope B ${suffix}`, ownerId: vendorB.id, timings: {} },
      select: { id: true },
    });
    salonIds.push(salonA.id, salonB.id);
    const bookingViewPermission = await prisma.permission.findUnique({
      where: { action: "bookings.view" },
      select: { id: true },
    });
    const bookingPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        isActive: true,
        permissions: { some: { permissionId: bookingViewPermission.id, userType: "VENDOR" } },
        rolePermissions: { some: { roleId: vendorRole.id, permissionId: bookingViewPermission.id, enabled: true } },
      },
      select: { id: true },
    });
    assert.ok(bookingViewPermission && bookingPlan, "An active plan with Vendor booking-view access is required");
    const subscription = await prisma.subscription.create({
      data: { vendorId: vendorA.id, salonId: salonA.id, planId: bookingPlan.id, billingCycle: "MONTHLY", status: "ACTIVE", isManual: true },
      select: { id: true },
    });
    subscriptionIds.push(subscription.id);
    const branchA = await prisma.salon.create({
      data: { name: `Booking Branch A ${suffix}`, ownerId: vendorA.id, parentId: salonA.id, timings: {} },
      select: { id: true },
    });
    const branchB = await prisma.salon.create({
      data: { name: `Booking Branch B ${suffix}`, ownerId: vendorB.id, parentId: salonB.id, timings: {} },
      select: { id: true },
    });
    const branchWithSeparateOwner = await prisma.salon.create({
      data: { name: `Booking Branch Managed by B ${suffix}`, ownerId: vendorB.id, parentId: salonA.id, timings: {} },
      select: { id: true },
    });
    salonIds.push(branchA.id, branchB.id, branchWithSeparateOwner.id);
    await prisma.salonStaff.create({ data: { userId: staffUser.id, salonId: salonA.id, isActive: true } });
    const staffB = await prisma.salonStaff.create({ data: { userId: staffUser.id, salonId: salonB.id, isActive: true }, select: { id: true } });
    const service = await prisma.service.create({
      data: { salonId: salonA.id, name: `Scope Service ${suffix}`, categoryId: category.id, basePrice: 100, baseDuration: 30 },
      select: { id: true },
    });
    createdServiceIds.push(service.id);
    const replacementService = await prisma.service.create({
      data: { salonId: salonA.id, name: `Replacement Service ${suffix}`, categoryId: category.id, basePrice: 900, baseDuration: 45 },
      select: { id: true },
    });
    createdServiceIds.push(replacementService.id);
    await prisma.gSTConfiguration.upsert({
      where: { salonId: salonB.id },
      create: { salonId: salonB.id, cgstRate: 5, sgstRate: 5, igstRate: 10, isActive: true },
      update: { cgstRate: 5, sgstRate: 5, igstRate: 10, isActive: true },
    });

    const staffA = await prisma.salonStaff.findFirst({ where: { userId: staffUser.id, salonId: salonA.id }, select: { id: true } });
    const payload = (overrides = {}) => ({
      customerId: customer.id,
      staffId: staffA.id,
      bookingDate: new Date(Date.now() + 86_400_000).toISOString(),
      items: [{ serviceId: service.id, name: "Scope Service", price: 100 }],
      ...overrides,
    });
    const vendorActor = { userId: vendorA.id, roles: ["VENDOR"] };

    await assert.rejects(
      bookingService.createBooking(salonA.id, payload({ vendorId: vendorB.id }), vendorActor),
      (error) => error.code === "VENDOR_ACCESS_DENIED" && error.status === 403,
    );
    await assert.rejects(
      bookingService.createBooking(salonB.id, payload(), vendorActor),
      (error) => error.code === "SALON_ACCESS_DENIED" && error.status === 403,
    );
    await assert.rejects(
      bookingService.createBooking(salonA.id, payload({ branchId: branchB.id }), vendorActor),
      (error) => error.code === "BRANCH_ACCESS_DENIED" && error.status === 403,
    );
    await assert.rejects(
      bookingService.createBooking(
        salonB.id,
        payload({ vendorId: vendorA.id }),
        { userId: admin.id, roles: ["ADMIN"] },
      ),
      (error) => error.code === "INVALID_VENDOR_SALON_RELATIONSHIP" && error.status === 400,
    );
    await assert.rejects(
      bookingService.createBooking(
        salonB.id,
        payload({ vendorId: vendorB.id }),
        { userId: admin.id, roles: ["ADMIN"] },
      ),
      (error) => error.code === "INVALID_BOOKING_SERVICE_SCOPE" && error.status === 400,
    );
    await assert.rejects(
      bookingService.createBooking(
        salonA.id,
        payload({ branchId: branchB.id }),
        { userId: admin.id, roles: ["ADMIN"] },
      ),
      (error) => error.code === "INVALID_SALON_BRANCH_RELATIONSHIP" && error.status === 400,
    );

    const vendorBooking = await bookingService.createBooking(
      salonA.id,
      payload({ branchId: branchA.id, medium: "APP" }),
      vendorActor,
    );
    bookingIds.push(vendorBooking.id);
    await prisma.payment.create({
      data: { bookingId: vendorBooking.id, amount: 25, method: "CASH", status: "PENDING" },
    });
    const invoice = await gstService.getBookingInvoice(vendorBooking.id);
    const repeatedInvoice = await gstService.getBookingInvoice(vendorBooking.id);
    assert.equal(invoice.invoiceNumber, repeatedInvoice.invoiceNumber);
    assert.equal(invoice.summary.finalAmount, vendorBooking.finalAmount);
    assert.equal(invoice.summary.amountPaid, vendorBooking.totalPaid);
    assert.equal(invoice.services[0].quantity, 1);
    assert.equal(Object.hasOwn(invoice, "id"), false);
    assert.equal(Object.hasOwn(invoice.customer, "password"), false);
    await assert.rejects(
      assertBookingAccess(vendorBooking.id, { userId: vendorB.id, roles: ["VENDOR"] }, "view"),
      (error) => error.status === 404,
    );
    assert.equal(vendorBooking.salonId, salonA.id);
    assert.equal(vendorBooking.branchId, branchA.id);
    assert.equal(vendorBooking.medium, "ONLINE");
    const beforeVendorBookingUpdate = await bookingService.getBookingById(vendorBooking.id);
    const vendorUpdatedBooking = await bookingService.updateBooking(
      vendorBooking.id,
      {
        notes: "Vendor booking update",
        items: [{ serviceId: service.id, name: "Scope Service", price: 800, quantity: 1 }],
        finalAmount: 0,
      },
      vendorActor,
    );
    assert.equal(vendorUpdatedBooking.notes, "Vendor booking update");
    assert.equal(vendorUpdatedBooking.totalAmount, 800);
    assert.equal(vendorUpdatedBooking.services[0].price, 800);
    assert.notEqual(vendorUpdatedBooking.finalAmount, beforeVendorBookingUpdate.finalAmount);
    const appBooking = await bookingService.createBooking(
      salonA.id,
      payload({ branchId: branchA.id }),
      undefined,
      "APP",
    );
    bookingIds.push(appBooking.id);
    assert.equal(appBooking.medium, "APP");
    assert.equal(appBooking.bookingSource, "APP");
    const appBookingDetail = await bookingService.getBookingById(appBooking.id);
    assert.equal(appBookingDetail.medium, "APP");
    assert.equal(appBookingDetail.bookingSource, "APP");
    const updatedAppBooking = await bookingService.updateBooking(appBooking.id, { notes: "edited", medium: "ONLINE" });
    assert.equal(updatedAppBooking.medium, "APP");
    assert.equal(updatedAppBooking.bookingSource, "APP");
    const oversizedPage = await bookingService.getAllBookings(undefined, { page: 1, limit: 999999 });
    assert.equal(oversizedPage.meta.limit, 100);
    assert.ok(oversizedPage.bookings.length <= 100);
    await prisma.booking.update({ where: { id: vendorBooking.id }, data: { medium: "APP" } });
    const appFilteredBookings = await bookingService.getAllBookings(undefined, { source: "APP" });
    assert.ok(appFilteredBookings.bookings.some(({ id }) => id === appBooking.id));
    assert.ok(appFilteredBookings.bookings.every(({ bookingSource }) => bookingSource === "APP"));
    const webFilteredBookings = await bookingService.getAllBookings(undefined, { bookingSource: "WEB" });
    assert.ok(webFilteredBookings.bookings.some(({ id }) => id === vendorBooking.id));
    assert.ok(webFilteredBookings.bookings.every(({ bookingSource }) => bookingSource === "WEB"));
    await assert.rejects(
      bookingService.getAllBookings(undefined, { bookingSource: "ANDROID" }),
      (error) => error.code === "INVALID_BOOKING_SOURCE" && error.status === 400,
    );
    const branchBooking = await bookingService.createBooking(
      salonA.id,
      payload({ branchId: branchWithSeparateOwner.id, items: [{ name: "Manual booking item", price: 100 }] }),
      vendorActor,
    );
    bookingIds.push(branchBooking.id);
    const staffBeforeBranchChange = await getStaffByIdService(staffA.id, vendorA.id, ["VENDOR"]);
    assert.equal(staffBeforeBranchChange.salonId, salonA.id);
    assert.equal(staffBeforeBranchChange.branchId, null);
    await assert.rejects(
      updateStaffService(staffA.id, vendorA.id, { branchId: branchB.id }, ["VENDOR"]),
      (error) => error.code === "STAFF_LOCATION_ACCESS_DENIED" && error.status === 403,
    );
    const updatedStaff = await updateStaffService(staffA.id, vendorA.id, { branchId: branchA.id }, ["VENDOR"]);
    assert.equal(updatedStaff.salonId, branchA.id);
    const staffAfterBranchChange = await getStaffByIdService(staffA.id, vendorA.id, ["VENDOR"]);
    assert.equal(staffAfterBranchChange.mainSalonId, salonA.id);
    assert.equal(staffAfterBranchChange.branchId, branchA.id);
    assert.equal(staffAfterBranchChange.branch.name, `Booking Branch A ${suffix}`);
    await assert.rejects(
      updateSalonService(branchB.id, { name: `Unauthorized update ${suffix}` }, vendorActor),
      (error) => error.status === 403,
    );
    const movedStaff = await updateStaffService(staffA.id, vendorA.id, { branchId: branchWithSeparateOwner.id }, ["VENDOR"]);
    assert.equal(movedStaff.branchId, branchWithSeparateOwner.id);
    const profileUpdatedStaff = await updateStaffService(staffA.id, vendorA.id, { user: { firstName: "Updated Staff" } }, ["VENDOR"]);
    assert.equal(profileUpdatedStaff.user.firstName, "Updated Staff");
    assert.equal(profileUpdatedStaff.branchId, branchWithSeparateOwner.id);
    const fieldUpdatedStaff = await updateStaffService(staffA.id, vendorA.id, { role: "Senior Stylist" }, ["VENDOR"]);
    assert.equal(fieldUpdatedStaff.salonId, branchWithSeparateOwner.id);
    await updateStaffService(staffA.id, vendorA.id, { branchId: branchA.id }, ["VENDOR"]);
    const foreignVendorBooking = await bookingService.createBooking(
      salonB.id,
      payload({ branchId: branchB.id, staffId: staffB.id, items: [{ name: "Vendor B manual booking", price: 100 }] }),
      { userId: vendorB.id, roles: ["VENDOR"] },
    );
    bookingIds.push(foreignVendorBooking.id);
    const paidBooking = await bookingService.createBooking(
      salonA.id,
      payload({
        branchId: branchA.id,
        items: [{ serviceId: service.id, name: "Scope Service", price: 500 }],
        payment: { amount: 200, method: "CASH" },
      }),
      vendorActor,
    );
    bookingIds.push(paidBooking.id);
    const vendorBBookings = await bookingService.getAllBookings(undefined, {}, vendorB.id, false, true);
    assert.equal(vendorBBookings.bookings.some(({ id }) => id === branchBooking.id), false);
    const vendorFiltered = await bookingService.getAllBookings(
      undefined,
      { vendorId: vendorB.id, serviceId: service.id },
      vendorA.id,
      false,
      true,
    );
    assert.ok(vendorFiltered.bookings.some(({ id }) => id === vendorBooking.id));
    assert.ok(vendorFiltered.bookings.every(({ salon }) => salon.owner.id === vendorA.id));
    const vendorPaymentFilter = await bookingService.getAllBookings(
      undefined,
      { paymentStatus: "PENDING", customerId: customer.id },
      vendorA.id,
      false,
      true,
    );
    assert.ok(vendorPaymentFilter.bookings.some(({ id }) => id === vendorBooking.id));
    const vendorSearch = await bookingService.getAllBookings(undefined, { search: "Scope Service", serviceId: service.id }, vendorA.id, false, true);
    assert.ok(vendorSearch.bookings.some(({ id }) => id === vendorBooking.id));
    const vendorDateFilter = await bookingService.getAllBookings(
      undefined,
      { startDate: vendorBooking.bookingDate.toISOString().slice(0, 10), endDate: vendorBooking.bookingDate.toISOString().slice(0, 10) },
      vendorA.id,
      false,
      true,
    );
    assert.ok(vendorDateFilter.bookings.some(({ id }) => id === vendorBooking.id));
    const vendorOptions = await bookingService.getBookingFilterOptions(vendorActor, { vendorId: vendorB.id });
    assert.ok(vendorOptions.salons.some(({ id }) => id === salonA.id));
    assert.ok(!vendorOptions.salons.some(({ id }) => id === salonB.id));
    assert.ok(vendorOptions.branches.some(({ id }) => id === branchA.id));
    assert.ok(!vendorOptions.branches.some(({ id }) => id === branchB.id));
    assert.ok(vendorOptions.services.some(({ id }) => id === service.id));
    assert.ok(vendorOptions.customers.some(({ id }) => id === customer.id));
    const adminFiltered = await bookingService.getAllBookings(undefined, { vendorId: vendorA.id, serviceId: service.id });
    assert.ok(adminFiltered.bookings.some(({ id }) => id === vendorBooking.id));
    assert.ok(adminFiltered.bookings.every(({ salon }) => salon.owner.id === vendorA.id));
    await assert.rejects(
      bookingService.getAllBookings(undefined, { sortBy: "unsafeField" }),
      (error) => error.code === "INVALID_BOOKING_SORT" && error.status === 400,
    );
    await assert.rejects(
      bookingService.getAllBookings(undefined, { paymentStatus: "not-a-status" }),
      (error) => error.code === "INVALID_PAYMENT_STATUS" && error.status === 400,
    );

    const apiServer = http.createServer(app);
    await new Promise((resolve) => apiServer.listen(0, resolve));
    try {
      const baseUrl = `http://127.0.0.1:${apiServer.address().port}`;
      const apiRequest = async (path, userId, roles) => fetch(`${baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${jwt.sign({ userId, roles }, process.env.JWT_SECRET || "your-jwt-secret")}`,
        },
      });
      const vendorApiBookings = await apiRequest(
        `/api/v1/bookings?vendorId=${vendorB.id}&serviceId=${service.id}`,
        vendorA.id,
        ["VENDOR"],
      );
      assert.equal(vendorApiBookings.status, 200);
      const vendorApiData = (await vendorApiBookings.json()).data;
      assert.ok(vendorApiData.bookings.some(({ id }) => id === vendorBooking.id));
      assert.ok(!vendorApiData.bookings.some(({ id }) => id === foreignVendorBooking.id));
      const vendorApiOptions = await apiRequest(`/api/v1/bookings/filter-options?vendorId=${vendorB.id}`, vendorA.id, ["VENDOR"]);
      assert.equal(vendorApiOptions.status, 200);
      const vendorApiOptionData = (await vendorApiOptions.json()).data;
      assert.ok(vendorApiOptionData.salons.some(({ id }) => id === salonA.id));
      assert.ok(!vendorApiOptionData.salons.some(({ id }) => id === salonB.id));
      const vendorLegacySalons = await apiRequest("/api/v1/bookings/lookups/salons?page=1&limit=1", vendorA.id, ["VENDOR"]);
      assert.equal(vendorLegacySalons.status, 200);
      const vendorLegacySalonData = await vendorLegacySalons.json();
      assert.ok(vendorLegacySalonData.data.some(({ id }) => id === salonA.id));
      assert.equal(vendorLegacySalonData.pagination.total, 1);
      const vendorLegacyBranches = await apiRequest(`/api/v1/bookings/lookups/branches?salonId=${salonA.id}`, vendorA.id, ["VENDOR"]);
      assert.equal(vendorLegacyBranches.status, 200);
      assert.ok((await vendorLegacyBranches.json()).data.some(({ id }) => id === branchA.id));
      const vendorLegacyVendorLookup = await apiRequest("/api/v1/bookings/lookups/vendors", vendorA.id, ["VENDOR"]);
      assert.equal(vendorLegacyVendorLookup.status, 403);
      const adminLegacySalonsWithoutVendor = await apiRequest("/api/v1/bookings/lookups/salons", admin.id, ["ADMIN"]);
      assert.equal(adminLegacySalonsWithoutVendor.status, 400);
      const adminApiOptions = await apiRequest(`/api/v1/bookings/filter-options?vendorId=${vendorA.id}`, admin.id, ["ADMIN"]);
      assert.equal(adminApiOptions.status, 200);
      const adminApiOptionData = (await adminApiOptions.json()).data;
      assert.ok(adminApiOptionData.vendors.some(({ id }) => id === vendorA.id));
      assert.ok(adminApiOptionData.salons.some(({ id }) => id === salonA.id));
      assert.ok(!adminApiOptionData.salons.some(({ id }) => id === salonB.id));
      const adminLegacySalons = await apiRequest(`/api/v1/bookings/lookups/salons?vendorId=${vendorA.id}&page=1&limit=1`, admin.id, ["ADMIN"]);
      assert.equal(adminLegacySalons.status, 200);
      assert.equal((await adminLegacySalons.json()).pagination.total, 1);
      const staffApiDetails = await apiRequest(`/api/v1/staff/${staffA.id}`, admin.id, ["ADMIN"]);
      assert.equal(staffApiDetails.status, 200);
      const staffApiData = (await staffApiDetails.json()).data;
      assert.equal(staffApiData.mainSalonId, salonA.id);
      assert.equal(staffApiData.branchId, branchA.id);
      assert.equal(staffApiData.branch.name, `Booking Branch A ${suffix}`);
      const foreignBookingDetails = await apiRequest(`/api/v1/bookings/${foreignVendorBooking.id}`, vendorA.id, ["VENDOR"]);
      assert.equal(foreignBookingDetails.status, 404);
      const priceUpdateResponse = await fetch(`${baseUrl}/api/v1/bookings/${paidBooking.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${jwt.sign({ userId: admin.id, roles: ["ADMIN"] }, process.env.JWT_SECRET || "your-jwt-secret")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ serviceId: service.id, name: "Scope Service", price: 800, quantity: 1 }],
        }),
      });
      assert.equal(priceUpdateResponse.status, 200);
      const updatedResponseData = (await priceUpdateResponse.json()).data;
      assert.equal(updatedResponseData.totalAmount, 800);
      assert.equal(updatedResponseData.totalPaid, 200);
      assert.equal(updatedResponseData.services[0].price, 800);
      assert.equal(updatedResponseData.services[0].quantity, 1);
      const persistedPriceUpdate = await prisma.booking.findUnique({
        where: { id: paidBooking.id },
        include: { services: true, payments: true },
      });
      assert.equal(persistedPriceUpdate.totalAmount, 800);
      assert.equal(persistedPriceUpdate.totalPaid, 200);
      assert.equal(persistedPriceUpdate.payments.length, 1);
      assert.equal(persistedPriceUpdate.services[0].price, 800);
      assert.equal(persistedPriceUpdate.finalAmount - persistedPriceUpdate.totalPaid, updatedResponseData.finalAmount - 200);
      const bookingDetailsResponse = await apiRequest(`/api/v1/bookings/${paidBooking.id}`, admin.id, ["ADMIN"]);
      assert.equal((await bookingDetailsResponse.json()).data.totalAmount, 800);
      const bookingListResponse = await apiRequest(`/api/v1/bookings?serviceId=${service.id}`, admin.id, ["ADMIN"]);
      const bookingListData = (await bookingListResponse.json()).data;
      const updatedListBooking = bookingListData.bookings.find(({ id }) => id === paidBooking.id);
      assert.equal(updatedListBooking.totalAmount, 800);
      assert.equal(updatedListBooking.totalPaid, 200);
      const nonPriceUpdate = await bookingService.updateBooking(
        paidBooking.id,
        { notes: "Price remains unchanged" },
        { userId: admin.id, roles: ["ADMIN"] },
      );
      assert.equal(nonPriceUpdate.totalAmount, 800);
      assert.equal(nonPriceUpdate.services[0].price, 800);
      const discountedUpdate = await bookingService.updateBooking(
        paidBooking.id,
        { discount: 10 },
        { userId: admin.id, roles: ["ADMIN"] },
      );
      assert.equal(discountedUpdate.totalAmount, 800);
      assert.equal(discountedUpdate.discount, 10);
      const quantityUpdate = await bookingService.updateBooking(
        paidBooking.id,
        { items: [{ serviceId: service.id, name: "Scope Service", price: 800, quantity: 2 }] },
        { userId: admin.id, roles: ["ADMIN"] },
      );
      assert.equal(quantityUpdate.totalAmount, 1600);
      assert.equal(quantityUpdate.totalPaid, 200);
      assert.equal(quantityUpdate.services[0].price, 800);
      assert.equal(quantityUpdate.services[0].quantity, 2);
      const quantityInvoice = await gstService.getBookingInvoice(paidBooking.id);
      assert.equal(quantityInvoice.services[0].quantity, 2);
      assert.equal(quantityInvoice.services[0].unitPrice, 800);
      assert.equal(quantityInvoice.services[0].amount, 1600);
      const changedServiceUpdate = await bookingService.updateBooking(
        paidBooking.id,
        { items: [{ serviceId: replacementService.id, name: `Replacement Service ${suffix}`, price: 900, quantity: 1 }] },
        { userId: admin.id, roles: ["ADMIN"] },
      );
      assert.equal(changedServiceUpdate.totalAmount, 900);
      assert.equal(changedServiceUpdate.services[0].serviceId, replacementService.id);
      assert.equal(changedServiceUpdate.services[0].price, 900);
      await assert.rejects(
        bookingService.updateBooking(
          paidBooking.id,
          { items: [{ serviceId: service.id, name: "Scope Service", price: 100, quantity: 1 }] },
          { userId: admin.id, roles: ["ADMIN"] },
        ),
        (error) => error.code === "BOOKING_AMOUNT_BELOW_PAID" && error.status === 409,
      );
      const adminApiBookings = await apiRequest(
        `/api/v1/admin/bookings?vendorId=${vendorA.id}&serviceId=${service.id}`,
        admin.id,
        ["ADMIN"],
      );
      assert.equal(adminApiBookings.status, 200);
      const adminApiData = (await adminApiBookings.json()).data;
      assert.ok(adminApiData.bookings.some(({ id }) => id === vendorBooking.id));
      assert.ok(!adminApiData.bookings.some(({ id }) => id === foreignVendorBooking.id));
    } finally {
      await new Promise((resolve, reject) => apiServer.close((error) => error ? reject(error) : resolve()));
    }

    await assert.rejects(
      bookingService.updateBooking(vendorBooking.id, { salonId: salonB.id, branchId: branchB.id }, vendorActor),
      (error) => error.code === "SALON_ACCESS_DENIED" && error.status === 403,
    );
    await assert.rejects(
      bookingService.updateBooking(vendorBooking.id, { branchId: branchB.id }, vendorActor),
      (error) => error.code === "BRANCH_ACCESS_DENIED" && error.status === 403,
    );

    const adminBooking = await bookingService.createBooking(
      salonA.id,
      payload({ branchId: branchA.id, items: [{ name: "Manual booking item", price: 100 }] }),
      { userId: admin.id, roles: ["ADMIN"] },
    );
    bookingIds.push(adminBooking.id);
    const movedByAdmin = await bookingService.updateBooking(
      adminBooking.id,
      { vendorId: vendorB.id, salonId: salonB.id, branchId: branchB.id, staffId: staffB.id },
      { userId: admin.id, roles: ["ADMIN"] },
    );
    assert.equal(movedByAdmin.salonId, salonB.id);
    assert.equal(movedByAdmin.branchId, branchB.id);
    assert.equal(movedByAdmin.finalAmount, 110);
    await prisma.payment.create({
      data: { bookingId: adminBooking.id, amount: 1, method: "CASH", status: "PENDING" },
    });
    await assert.rejects(
      bookingService.updateBooking(
        adminBooking.id,
        { vendorId: vendorA.id, salonId: salonA.id, branchId: branchA.id, staffId: staffA.id },
        { userId: admin.id, roles: ["ADMIN"] },
      ),
      (error) => error.code === "BOOKING_UPDATE_NOT_ALLOWED" && error.status === 409,
    );

    await assert.rejects(
      bookingService.updateBooking(
        vendorBooking.id,
        { notes: "foreign update", items: [{ serviceId: service.id, name: "Scope Service", price: 10 }] },
        { userId: vendorB.id, roles: ["VENDOR"] },
      ),
      (error) => error.status === 404,
    );
    await assert.rejects(
      bookingService.getBookingById(vendorBooking.id, { userId: vendorB.id, roles: ["VENDOR"] }),
      (error) => error.status === 404,
    );
    await assert.rejects(
      bookingService.cancelBooking(vendorBooking.id, { userId: vendorB.id, roles: ["VENDOR"] }),
      (error) => error.status === 404,
    );
  } finally {
    if (bookingIds.length) await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    if (subscriptionIds.length) await prisma.subscription.deleteMany({ where: { id: { in: subscriptionIds } } });
    if (createdServiceIds.length) await prisma.service.deleteMany({ where: { id: { in: createdServiceIds } } });
    if (salonIds.length) await prisma.salon.deleteMany({ where: { id: { in: salonIds } } });
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  }
});
