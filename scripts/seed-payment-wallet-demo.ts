import "dotenv/config";
import bcrypt from "bcrypt";
import { BookingCommissionType, Prisma, PrismaClient } from "@prisma/client";
import { recordEligibleBookingFinance } from "../src/modules/booking/booking-finance.service";

export const SEED_VENDOR_EMAIL = "vendor@example.com";
const SEED_VENDOR_PASSWORD = "Vendor@123";
const SEED_MARKER = "payment-wallet-demo:vendor-example";
const COMMISSION_RULE_MARKER = "PAYMENT_WALLET_DEMO:vendor@example.com";
const FIXTURE_COUNT = 4;
const PAYMENT_STATUS_FIXTURE_COUNT = 1;
const REFUND_AMOUNT_BASE = 1200;
const COMPLETED_AMOUNT_BASE = 1800;

const prisma = new PrismaClient();

export function assertSafeSeedEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Payment & Wallet demo seed refuses to run in production.");
  }
  if (env.ALLOW_PAYMENT_WALLET_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_PAYMENT_WALLET_DEMO_SEED=true to run this development-only seed.");
  }
}

export function assertExistingVendorRole(existingVendor: boolean, hasVendorRole: boolean) {
  if (existingVendor && !hasVendorRole) {
    throw new Error(`Existing ${SEED_VENDOR_EMAIL} account is not assigned the VENDOR role; refusing to change its access.`);
  }
}

export function assertMarkerOwnership(marker: string, expectedBookingId: string, expectedVendorId: string, actualBookingId: string, actualVendorId: string) {
  if (actualBookingId !== expectedBookingId || actualVendorId !== expectedVendorId) {
    throw new Error(`Conflicting demo marker ${marker} is already attached to another booking or vendor.`);
  }
}

export function commissionRuleRestoreData(rule: { isActive: boolean; effectiveFrom: Date; effectiveTo: Date | null }) {
  return { isActive: rule.isActive, effectiveFrom: rule.effectiveFrom, effectiveTo: rule.effectiveTo };
}

export type PaymentWalletFixtureKind = "refund" | "completed" | "pending" | "failed";

export function paymentWalletFixture(index: number, kind: PaymentWalletFixtureKind) {
  const count = kind === "refund" || kind === "completed" ? FIXTURE_COUNT : PAYMENT_STATUS_FIXTURE_COUNT;
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`Payment & Wallet ${kind} fixture index must be between 0 and ${count - 1}.`);
  }
  const suffix = String(index + 1).padStart(2, "0");
  const amount = (kind === "refund" ? REFUND_AMOUNT_BASE : COMPLETED_AMOUNT_BASE) + index * 200;
  return {
    note: `${SEED_MARKER}:${kind}-booking:${suffix}`,
    transactionId: `PW-DEMO-${kind.toUpperCase()}-${suffix}`,
    paymentStatus: (kind === "refund" ? "REFUNDED" : kind.toUpperCase()) as "REFUNDED" | "COMPLETED" | "PENDING" | "FAILED",
    refundIdempotencyKey: `${SEED_MARKER}:refund:${suffix}`,
    gatewayRefundId: `PW-DEMO-GATEWAY-REFUND-${suffix}`,
    amount,
  };
}

async function nextAvailablePhone(tx: Prisma.TransactionClient, start: number) {
  for (let offset = 0; offset < 1000; offset += 1) {
    const phone = String(start + offset);
    if (!(await tx.user.findFirst({ where: { phone }, select: { id: true } }))) return phone;
  }
  throw new Error("Unable to allocate a unique phone number for a demo account.");
}

async function ensureVendor(tx: Prisma.TransactionClient) {
  const existingVendor = await tx.user.findUnique({ where: { email: SEED_VENDOR_EMAIL } });
  if (existingVendor) {
    const vendorRole = await tx.role.findUnique({ where: { name: "VENDOR" }, select: { id: true } });
    const roleAssignment = vendorRole
      ? await tx.userRole.findUnique({ where: { userId_roleId: { userId: existingVendor.id, roleId: vendorRole.id } }, select: { id: true } })
      : null;
    assertExistingVendorRole(true, Boolean(roleAssignment));
    return existingVendor;
  }

  const password = await bcrypt.hash(SEED_VENDOR_PASSWORD, 10);
  const phone = await nextAvailablePhone(tx, 9000000002);
  const vendor = await tx.user.create({
    data: {
      firstName: "Demo",
      lastName: "Vendor",
      email: SEED_VENDOR_EMAIL,
      phone,
      countryCode: "+91",
      password,
      isActive: true,
      source: "WEBSITE",
    },
  });
  const vendorRole = await tx.role.upsert({ where: { name: "VENDOR" }, update: {}, create: { name: "VENDOR" } });
  await tx.userRole.upsert({
    where: { userId_roleId: { userId: vendor.id, roleId: vendorRole.id } },
    update: {},
    create: { userId: vendor.id, roleId: vendorRole.id },
  });
  return vendor;
}

async function ensureVendorSalon(tx: Prisma.TransactionClient, vendorId: string) {
  const existingSalon = await tx.salon.findFirst({
    where: { ownerId: vendorId, parentId: null },
    orderBy: { createdAt: "asc" },
  });
  if (existingSalon) return existingSalon;
  return tx.salon.create({
    data: {
      name: "Zipp Salon Payment Wallet Demo",
      ownerId: vendorId,
      isActive: true,
      isMain: true,
      isProfileCompleted: true,
      timings: {},
    },
  });
}

async function ensureDemoCustomers(tx: Prisma.TransactionClient, salonId: string, branchIds: string[]) {
  const locations = [salonId, ...branchIds];
  const existing = await tx.user.findMany({
    where: { salonCustomers: { some: { salonId: { in: locations } } } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: FIXTURE_COUNT,
  });
  const customers = [...existing];
  const customerRole = await tx.role.upsert({ where: { name: "CUSTOMER" }, update: {}, create: { name: "CUSTOMER" } });
  const password = await bcrypt.hash(SEED_VENDOR_PASSWORD, 10);

  let candidateIndex = 1;
  while (customers.length < FIXTURE_COUNT) {
    const index = customers.length;
    const suffix = String(candidateIndex++).padStart(2, "0");
    const email = `payment.wallet.vendor.${suffix}@zippsalon.test`;
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) continue;
    const phone = await nextAvailablePhone(tx, 9200000001 + index * 1000);
    const customer = await tx.user.create({
      data: {
        firstName: ["Aarav", "Ananya", "Ishaan", "Meera"][index],
        lastName: "Demo Customer",
        email,
        phone,
        countryCode: "+91",
        password,
        isActive: true,
        source: "CUSTOMER",
      },
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: customer.id, roleId: customerRole.id } },
      update: {},
      create: { userId: customer.id, roleId: customerRole.id },
    });
    customers.push({ id: customer.id });
  }

  for (const customer of customers) {
    await tx.salonCustomer.upsert({
      where: { salonId_userId: { salonId, userId: customer.id } },
      update: {},
      create: { salonId, userId: customer.id },
    });
  }
  return customers;
}

async function ensureDemoService(tx: Prisma.TransactionClient, salonId: string, vendorId: string) {
  const existing = await tx.service.findFirst({ where: { salonId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return tx.service.create({
    data: {
      salonId,
      name: "Payment Wallet Demo Service",
      description: "Development-only service for Payment & Wallet seed bookings.",
      basePrice: COMPLETED_AMOUNT_BASE,
      baseDuration: 60,
      createdById: vendorId,
    },
  });
}

async function ensureBookingPayment(
  tx: Prisma.TransactionClient,
  bookingId: string,
  vendorId: string,
  fixture: ReturnType<typeof paymentWalletFixture>,
  method: "CARD" | "UPI",
  status: "COMPLETED" | "REFUNDED" | "PENDING" | "FAILED",
) {
  const existingPayments = await tx.payment.findMany({
    where: { transactionId: fixture.transactionId },
    select: {
      id: true,
      bookingId: true,
      status: true,
      booking: { select: { salon: { select: { ownerId: true } } } },
    },
  });
  for (const existing of existingPayments) {
    assertMarkerOwnership(fixture.transactionId, bookingId, vendorId, existing.bookingId, existing.booking.salon.ownerId);
    if (existingPayments.length > 1) {
      throw new Error(`Duplicate payment marker ${fixture.transactionId} is already present.`);
    }
    if (existing.status !== status) {
      throw new Error(`Conflicting payment status for demo marker ${fixture.transactionId}.`);
    }
  }
  if (existingPayments[0]) return existingPayments[0];
  return tx.payment.create({
    data: {
      bookingId,
      amount: fixture.amount,
      method,
      status,
      transactionId: fixture.transactionId,
      ...(status === "COMPLETED" || status === "REFUNDED" ? { completedAt: new Date() } : {}),
    },
  });
}

async function seedRefundBooking(tx: Prisma.TransactionClient, input: {
  salonId: string;
  branchId?: string;
  staffId?: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  vendorId: string;
  index: number;
}) {
  const fixture = paymentWalletFixture(input.index, "refund");
  const existingBookings = await tx.booking.findMany({
    where: { notes: fixture.note },
    select: { id: true, salonId: true, customerId: true, salon: { select: { ownerId: true } } },
  });
  if (existingBookings.length > 1) throw new Error(`Duplicate booking marker ${fixture.note} is already present.`);
  const existingBooking = existingBookings[0];
  if (existingBooking) {
    assertMarkerOwnership(fixture.note, input.salonId, input.vendorId, existingBooking.salonId, existingBooking.salon.ownerId);
    if (existingBooking.customerId !== input.customerId) throw new Error(`Conflicting demo marker ${fixture.note} is attached to another customer.`);
  }
  const bookingId = existingBooking?.id ?? (await tx.booking.create({
      data: {
        salonId: input.salonId,
        branchId: input.branchId,
        staffId: input.staffId,
        customerId: input.customerId,
        bookingDate: new Date(Date.now() - (input.index + 1) * 86_400_000),
        status: "CANCELLED",
        medium: "ONLINE",
        totalAmount: fixture.amount,
        taxableAmount: fixture.amount,
        finalAmount: fixture.amount,
        totalPaid: 0,
        notes: fixture.note,
        services: { create: { serviceId: input.serviceId, name: input.serviceName, price: fixture.amount } },
      },
    })).id;
  const payment = await ensureBookingPayment(tx, bookingId, input.vendorId, fixture, input.index % 2 ? "CARD" : "UPI", "REFUNDED");
  const existingRefund = await tx.paymentRefund.findUnique({ where: { idempotencyKey: fixture.refundIdempotencyKey } });
  if (existingRefund) {
    const existingPayment = await tx.payment.findUnique({
      where: { id: existingRefund.paymentId },
      select: { bookingId: true, booking: { select: { salon: { select: { ownerId: true } } } } },
    });
    assertMarkerOwnership(
      fixture.refundIdempotencyKey,
      bookingId,
      input.vendorId,
      existingPayment?.bookingId ?? "",
      existingPayment?.booking.salon.ownerId ?? "",
    );
  }
  const gatewayRefund = await tx.paymentRefund.findFirst({
    where: { gatewayRefundId: fixture.gatewayRefundId },
    select: {
      id: true,
      paymentId: true,
      payment: { select: { bookingId: true, booking: { select: { salon: { select: { ownerId: true } } } } } },
    },
  });
  if (gatewayRefund) {
    assertMarkerOwnership(
      fixture.gatewayRefundId,
      bookingId,
      input.vendorId,
      gatewayRefund.payment.bookingId,
      gatewayRefund.payment.booking.salon.ownerId,
    );
    if (existingRefund && gatewayRefund.id !== existingRefund.id) {
      throw new Error(`Conflicting demo refund marker ${fixture.gatewayRefundId} is already used by another refund row.`);
    }
  }
  if (!existingRefund) {
    await tx.paymentRefund.create({
      data: {
        paymentId: payment.id,
        amount: new Prisma.Decimal(fixture.amount.toFixed(2)),
        reason: "[DEVELOPMENT TEST DATA] Sample full refund for UI validation.",
        status: "PROCESSED",
        gatewayRefundId: fixture.gatewayRefundId,
        idempotencyKey: fixture.refundIdempotencyKey,
        processedAt: new Date(),
      },
    });
  }
}

async function seedCompletedBooking(tx: Prisma.TransactionClient, input: {
  salonId: string;
  branchId?: string;
  staffId?: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  vendorId: string;
  index: number;
}) {
  const fixture = paymentWalletFixture(input.index, "completed");
  const existingBookings = await tx.booking.findMany({
    where: { notes: fixture.note },
    select: { id: true, salonId: true, customerId: true, salon: { select: { ownerId: true } } },
  });
  if (existingBookings.length > 1) throw new Error(`Duplicate booking marker ${fixture.note} is already present.`);
  const existingBooking = existingBookings[0];
  if (existingBooking) {
    assertMarkerOwnership(fixture.note, input.salonId, input.vendorId, existingBooking.salonId, existingBooking.salon.ownerId);
    if (existingBooking.customerId !== input.customerId) throw new Error(`Conflicting demo marker ${fixture.note} is attached to another customer.`);
  }
  const bookingId = existingBooking?.id ?? (await tx.booking.create({
      data: {
        salonId: input.salonId,
        branchId: input.branchId,
        staffId: input.staffId,
        customerId: input.customerId,
        bookingDate: new Date(Date.now() - (input.index + 5) * 86_400_000),
        status: "DONE",
        medium: "IN_SALON",
        totalAmount: fixture.amount,
        taxableAmount: fixture.amount,
        finalAmount: fixture.amount,
        totalPaid: fixture.amount,
        notes: fixture.note,
        services: { create: { serviceId: input.serviceId, name: input.serviceName, price: fixture.amount } },
      },
    })).id;
  await ensureBookingPayment(tx, bookingId, input.vendorId, fixture, "UPI", "COMPLETED");
  return { id: bookingId };
}

async function seedNoncompletedPaymentBooking(
  tx: Prisma.TransactionClient,
  input: {
    salonId: string;
    branchId?: string;
    staffId?: string;
    customerId: string;
    serviceId: string;
    serviceName: string;
    vendorId: string;
  },
  kind: "pending" | "failed",
) {
  const fixture = paymentWalletFixture(0, kind);
  const existingBookings = await tx.booking.findMany({
    where: { notes: fixture.note },
    select: { id: true, salonId: true, customerId: true, salon: { select: { ownerId: true } } },
  });
  if (existingBookings.length > 1) throw new Error(`Duplicate booking marker ${fixture.note} is already present.`);
  const existingBooking = existingBookings[0];
  if (existingBooking) {
    assertMarkerOwnership(fixture.note, input.salonId, input.vendorId, existingBooking.salonId, existingBooking.salon.ownerId);
    if (existingBooking.customerId !== input.customerId) throw new Error(`Conflicting demo marker ${fixture.note} is attached to another customer.`);
  }
  const bookingId = existingBooking?.id ?? (await tx.booking.create({
      data: {
        salonId: input.salonId,
        branchId: input.branchId,
        staffId: input.staffId,
        customerId: input.customerId,
        bookingDate: new Date(Date.now() + (kind === "pending" ? 1 : 2) * 86_400_000),
        status: "PENDING",
        medium: "ONLINE",
        totalAmount: fixture.amount,
        taxableAmount: fixture.amount,
        finalAmount: fixture.amount,
        totalPaid: 0,
        notes: fixture.note,
        services: { create: { serviceId: input.serviceId, name: input.serviceName, price: fixture.amount } },
      },
    })).id;
  await ensureBookingPayment(
    tx,
    bookingId,
    input.vendorId,
    fixture,
    kind === "pending" ? "CARD" : "UPI",
    kind === "pending" ? "PENDING" : "FAILED",
  );
}

async function seedFinancialFixtures(tx: Prisma.TransactionClient, vendorId: string) {
  const now = new Date();
  let commissionRule = await tx.bookingCommissionRule.findFirst({
    where: { applicableTo: COMMISSION_RULE_MARKER },
    orderBy: { createdAt: "asc" },
  });
  if (!commissionRule) {
    commissionRule = await tx.bookingCommissionRule.create({
      data: {
        commissionType: BookingCommissionType.PERCENTAGE,
        commissionValue: new Prisma.Decimal(20),
        applicableTo: COMMISSION_RULE_MARKER,
        currency: "INR",
        isActive: false,
        effectiveFrom: now,
      },
    });
  }
  const activeRule = await tx.bookingCommissionRule.findFirst({
    where: { isActive: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
    select: { id: true },
  });
  const temporarilyEnabled = !activeRule;
  const originalRuleState = commissionRuleRestoreData(commissionRule);
  if (temporarilyEnabled) {
    await tx.bookingCommissionRule.update({
      where: { id: commissionRule.id },
      data: { isActive: true, effectiveFrom: now, effectiveTo: null },
    });
  }
  try {
    let financeCreated = 0;
    for (let index = 0; index < FIXTURE_COUNT; index += 1) {
      const fixture = paymentWalletFixture(index, "completed");
      const booking = await tx.booking.findFirst({
        where: {
          notes: fixture.note,
          salon: { is: { ownerId: vendorId } },
          payments: { some: { transactionId: fixture.transactionId, status: "COMPLETED" } },
        },
        select: { id: true },
      });
      if (!booking) continue;
      const existing = await tx.bookingFinancialTransaction.findUnique({ where: { bookingId: booking.id }, select: { id: true } });
      const finance = await recordEligibleBookingFinance(tx, booking.id);
      if (finance && !existing) financeCreated += 1;
    }
    return { financeCreated };
  } finally {
    if (temporarilyEnabled) {
      await tx.bookingCommissionRule.update({ where: { id: commissionRule.id }, data: originalRuleState });
    }
  }
}

async function addPaymentWalletFixtures() {
  return prisma.$transaction(async (tx) => {
    const vendor = await ensureVendor(tx);
    const salon = await ensureVendorSalon(tx, vendor.id);
    const branches = await tx.salon.findMany({
      where: { ownerId: vendor.id, parentId: salon.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const branch = branches[0];
    const bookingLocations = [salon.id, ...(branch ? [branch.id] : [])];
    const staff = await tx.salonStaff.findFirst({
      where: { salonId: { in: bookingLocations }, isActive: true },
      select: { id: true, salonId: true },
      orderBy: { createdAt: "asc" },
    });
    const service = await ensureDemoService(tx, salon.id, vendor.id);
    const customers = await ensureDemoCustomers(tx, salon.id, branches.map(({ id }) => id));
    let refundBookings = 0;
    let completedBookings = 0;

    for (let index = 0; index < FIXTURE_COUNT; index += 1) {
      const shared = {
        salonId: salon.id,
        branchId: branch?.id,
        staffId: staff?.id,
        customerId: customers[index].id,
        serviceId: service.id,
        serviceName: service.name,
        vendorId: vendor.id,
        index,
      };
      await seedRefundBooking(tx, shared);
      await seedCompletedBooking(tx, shared);
      refundBookings += 1;
      completedBookings += 1;
    }
    const statusFixtureInput = {
      salonId: salon.id,
      branchId: branch?.id,
      staffId: staff?.id,
      customerId: customers[0].id,
      serviceId: service.id,
      serviceName: service.name,
      vendorId: vendor.id,
    };
    await seedNoncompletedPaymentBooking(tx, statusFixtureInput, "pending");
    await seedNoncompletedPaymentBooking(tx, statusFixtureInput, "failed");

    const { financeCreated } = await seedFinancialFixtures(tx, vendor.id);
    const [paymentCount, refundCount, financeCount, pendingPaymentCount, failedPaymentCount, wallet] = await Promise.all([
      tx.payment.count({
        where: {
          transactionId: { startsWith: "PW-DEMO-" },
          booking: {
            is: {
              salon: { is: { ownerId: vendor.id } },
              notes: { startsWith: `${SEED_MARKER}:` },
            },
          },
        },
      }),
      tx.paymentRefund.count({
        where: {
          idempotencyKey: { startsWith: `${SEED_MARKER}:refund:` },
          payment: {
            is: {
              booking: { is: { salon: { is: { ownerId: vendor.id } } } },
            },
          },
        },
      }),
      tx.bookingFinancialTransaction.count({
        where: {
          booking: {
            is: {
              salon: { is: { ownerId: vendor.id } },
              notes: { startsWith: `${SEED_MARKER}:completed-booking:` },
            },
          },
        },
      }),
      tx.payment.count({
        where: {
          status: "PENDING",
          transactionId: { startsWith: "PW-DEMO-PENDING-" },
          booking: { is: { salon: { is: { ownerId: vendor.id } }, notes: { startsWith: `${SEED_MARKER}:pending-booking:` } } },
        },
      }),
      tx.payment.count({
        where: {
          status: "FAILED",
          transactionId: { startsWith: "PW-DEMO-FAILED-" },
          booking: { is: { salon: { is: { ownerId: vendor.id } }, notes: { startsWith: `${SEED_MARKER}:failed-booking:` } } },
        },
      }),
      tx.vendorWallet.findUnique({ where: { vendorId: vendor.id }, select: { pendingBalance: true, availableBalance: true, processingBalance: true, paidBalance: true } }),
    ]);
    return {
      vendorEmail: SEED_VENDOR_EMAIL,
      salonCount: 1,
      branchCount: branches.length,
      staffCount: staff ? 1 : 0,
      customerCount: customers.length,
      refundBookingCount: refundBookings,
      completedBookingCount: completedBookings,
      paymentCount,
      refundCount,
      pendingPaymentCount,
      failedPaymentCount,
      financeCount,
      financeCreated,
      vendorWallet: wallet,
      customerWalletTransactionsCreated: 0,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120_000 });
}

async function main() {
  assertSafeSeedEnvironment();
  const paymentWallet = await addPaymentWalletFixtures();
  console.log(JSON.stringify({
    seeded: true,
    paymentWallet,
    note: "All seeded bookings and finance records belong to vendor@example.com; refund samples are development-only and no external refund or payout is requested.",
    countSemantics: "Booking/payment/refund/finance totals include matching fixtures after the run. financeCreated counts newly created finance transactions.",
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}

export { main };
