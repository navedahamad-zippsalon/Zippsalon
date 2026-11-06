import "dotenv/config";
import bcrypt from "bcrypt";
import { BookingCommissionType, Prisma, PrismaClient } from "@prisma/client";
import { importDashboardDemoData } from "../src/modules/admin/demo-data-import.service";
import { recordEligibleBookingFinance } from "../src/modules/booking/booking-finance.service";
import { ensureDefaultVendorSubscription } from "../src/modules/subscription/subscription.service";

if (process.env.NODE_ENV === "production") {
  throw new Error("Payment & Wallet demo seed refuses to run in production.");
}
if (process.env.ALLOW_PAYMENT_WALLET_DEMO_SEED !== "true") {
  throw new Error("Set ALLOW_PAYMENT_WALLET_DEMO_SEED=true to run this development-only seed.");
}

const prisma = new PrismaClient();
const vendorFixtures = [
  ["urban.glow.demo@zippsalon.test", "Urban Glow Salon", "Delhi", "Delhi", ["Connaught Place", "Lajpat Nagar"]],
  ["style.studio.demo@zippsalon.test", "Style Studio", "Delhi", "Delhi", ["Rohini", "Dwarka"]],
  ["elite.beauty.demo@zippsalon.test", "Elite Beauty Lounge", "Gurugram", "Haryana", ["Sector 29", "Golf Course Road"]],
  ["looks.style.demo@zippsalon.test", "Looks & Style", "Noida", "Uttar Pradesh", ["Sector 18", "Sector 62"]],
  ["royal.touch.demo@zippsalon.test", "Royal Touch Salon", "Jaipur", "Rajasthan", ["Vaishali Nagar", "Malviya Nagar"]],
  ["glow.garden.demo@zippsalon.test", "Glow Garden", "Pune", "Maharashtra", ["Koregaon Park", "Baner"]],
  ["modern.cuts.demo@zippsalon.test", "Modern Cuts", "Chandigarh", "Chandigarh", ["Sector 17", "Sector 35"]],
] as const;
const firstNames = ["Aarav", "Ananya", "Ishaan", "Meera", "Rahul", "Priya", "Kabir", "Nisha", "Arjun", "Kavya"];
const lastNames = ["Sharma", "Verma", "Singh", "Kapoor", "Patel"];

async function ensureDemoEntities(tx: Prisma.TransactionClient) {
  const password = await bcrypt.hash("Demo@12345", 10);
  const vendorRole = await tx.role.upsert({ where: { name: "VENDOR" }, update: {}, create: { name: "VENDOR" } });
  const customerRole = await tx.role.upsert({ where: { name: "CUSTOMER" }, update: {}, create: { name: "CUSTOMER" } });
  const salons: Array<{ id: string; ownerId: string; name: string }> = [];

  for (const [index, [email, salonName, city, state, branches]] of vendorFixtures.entries()) {
    const vendor = await tx.user.upsert({
      where: { email },
      update: { firstName: salonName.split(" ")[0], lastName: "Demo", phone: `910000${String(index + 1).padStart(4, "0")}`, countryCode: "+91", password, isActive: true, source: "WEBSITE" },
      create: { firstName: salonName.split(" ")[0], lastName: "Demo", email, phone: `910000${String(index + 1).padStart(4, "0")}`, countryCode: "+91", password, isActive: true, source: "WEBSITE" },
    });
    await tx.userRole.upsert({ where: { userId_roleId: { userId: vendor.id, roleId: vendorRole.id } }, update: {}, create: { userId: vendor.id, roleId: vendorRole.id } });
    let salon = await tx.salon.findFirst({ where: { ownerId: vendor.id, parentId: null, name: salonName } });
    salon ??= await tx.salon.create({ data: { name: salonName, ownerId: vendor.id, isActive: true, isMain: true, isProfileCompleted: true, timings: {} } });
    for (const branchName of branches) {
      const name = `${salonName} - ${branchName}`;
      const branch = await tx.salon.findFirst({ where: { parentId: salon.id, name } });
      if (!branch) await tx.salon.create({ data: { name, ownerId: vendor.id, parentId: salon.id, isActive: true, timings: {} } });
    }
    salons.push(salon);
    await ensureDefaultVendorSubscription(vendor.id, salon.id, tx);
  }

  const customers: Array<{ id: string; email: string }> = [];
  for (let index = 0; index < 50; index += 1) {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const email = `payment.wallet.customer.${String(index + 1).padStart(2, "0")}@zippsalon.test`;
    const customer = await tx.user.upsert({
      where: { email },
      update: { firstName, lastName, phone: `920000${String(index + 1).padStart(4, "0")}`, countryCode: "+91", password, isActive: true, source: "CUSTOMER" },
      create: { firstName, lastName, email, phone: `920000${String(index + 1).padStart(4, "0")}`, countryCode: "+91", password, isActive: true, source: "CUSTOMER" },
    });
    await tx.userRole.upsert({ where: { userId_roleId: { userId: customer.id, roleId: customerRole.id } }, update: {}, create: { userId: customer.id, roleId: customerRole.id } });
    customers.push({ id: customer.id, email });
  }
  return { salons, customers };
}

async function addPaymentWalletFixtures() {
  const fixtures = await prisma.$transaction(async (tx) => {
    const { salons, customers } = await ensureDemoEntities(tx);
    const mainSalon = salons[0];
    const branch = await tx.salon.findFirst({ where: { parentId: mainSalon.id }, select: { id: true } });

    for (let index = 0; index < 4; index += 1) {
      const note = `payment-wallet-demo:refunded-booking:${index + 1}`;
      let booking = await tx.booking.findFirst({ where: { notes: note } });
      const customer = customers[index];
      if (!booking) {
        booking = await tx.booking.create({ data: {
          salonId: mainSalon.id,
          branchId: branch?.id,
          customerId: customer.id,
          bookingDate: new Date(Date.now() - (index + 1) * 86_400_000),
          status: "CANCELLED",
          medium: "ONLINE",
          totalAmount: 1200 + index * 200,
          taxableAmount: 1200 + index * 200,
          finalAmount: 1200 + index * 200,
          totalPaid: 0,
          notes: note,
          payments: { create: { amount: 1200 + index * 200, method: index % 2 ? "CARD" : "UPI", status: "REFUNDED", transactionId: `PW-DEMO-REFUND-${index + 1}` } },
        } });
      }
      if (!booking.id) throw new Error("Failed to create a demo refund booking.");
      const payment = await tx.payment.findFirst({ where: { bookingId: booking.id, transactionId: `PW-DEMO-REFUND-${index + 1}` } });
      if (!payment) throw new Error(`Failed to create payment for demo refund booking ${index + 1}.`);
      const idempotencyKey = `payment-wallet-demo:refund:${index + 1}`;
      const existingRefund = await tx.paymentRefund.findUnique({ where: { idempotencyKey }, select: { id: true } });
      if (!existingRefund) {
        await tx.paymentRefund.create({
          data: {
            paymentId: payment.id,
            amount: new Prisma.Decimal(payment.amount.toFixed(2)),
            reason: "[DEVELOPMENT TEST DATA] Sample full refund for UI validation.",
            status: "PROCESSED",
            gatewayRefundId: `PW-DEMO-GATEWAY-REFUND-${index + 1}`,
            idempotencyKey,
            processedAt: new Date(),
          },
        });
      }
    }

    const completedDemoPayments = await tx.payment.findMany({
      where: {
        status: "COMPLETED",
        completedAt: null,
        booking: { is: { OR: [
          { notes: { startsWith: "demo-import:" } },
          { notes: { startsWith: "zippbeauty:history:" } },
        ] } },
      },
      select: { id: true, createdAt: true },
    });
    for (const payment of completedDemoPayments) {
      await tx.payment.update({ where: { id: payment.id }, data: { completedAt: payment.createdAt } });
    }

    for (let index = 0; index < customers.length; index += 1) {
      const referenceId = `credit-${String(index + 1).padStart(2, "0")}`;
      const existing = await tx.walletTransaction.findFirst({ where: { referenceType: "PAYMENT_WALLET_DEMO", referenceId } });
      if (existing) continue;
      const customer = customers[index];
      const amount = 250 + (index % 12) * 100;
      const wallet = await tx.customerWallet.upsert({
        where: { customerId: customer.id },
        update: { balance: { increment: amount } },
        create: { customerId: customer.id, balance: amount },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, customerId: customer.id, type: "CREDIT", amount, referenceType: "PAYMENT_WALLET_DEMO", referenceId, description: "Development sample wallet credit", status: "COMPLETED" },
      });
    }

    const now = new Date();
    let demoRule = await tx.bookingCommissionRule.findFirst({ where: { applicableTo: "PAYMENT_WALLET_DEMO" } });
    if (!demoRule) {
      demoRule = await tx.bookingCommissionRule.create({
        data: {
          commissionType: BookingCommissionType.PERCENTAGE,
          commissionValue: new Prisma.Decimal(20),
          applicableTo: "PAYMENT_WALLET_DEMO",
          currency: "INR",
          isActive: false,
          effectiveFrom: now,
        },
      });
    }
    const hasActiveRule = await tx.bookingCommissionRule.findFirst({
      where: { isActive: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      select: { id: true },
    });
    if (!hasActiveRule) await tx.bookingCommissionRule.update({ where: { id: demoRule.id }, data: { isActive: true } });

    const paidDemoBookings = await tx.booking.findMany({
      where: {
        OR: [
          { notes: { startsWith: "demo-import:" } },
          { notes: { startsWith: "zippbeauty:history:" } },
        ],
        payments: { some: { status: "COMPLETED" } },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: 75,
    });
    let financeCreated = 0;
    for (const booking of paidDemoBookings) {
      const existingFinance = await tx.bookingFinancialTransaction.findUnique({
        where: { bookingId: booking.id },
        select: { id: true },
      });
      const finance = await recordEligibleBookingFinance(tx, booking.id);
      if (finance && !existingFinance) financeCreated += 1;
    }
    if (!hasActiveRule) await tx.bookingCommissionRule.update({ where: { id: demoRule.id }, data: { isActive: false } });

    const [bookingCount, paymentCount, customerWalletCount] = await Promise.all([
      tx.booking.count({ where: { notes: { startsWith: "payment-wallet-demo:" } } }),
      tx.payment.count({ where: { transactionId: { startsWith: "PW-DEMO-REFUND-" } } }),
      tx.walletTransaction.count({ where: { referenceType: "PAYMENT_WALLET_DEMO" } }),
    ]);
    const refundCount = await tx.paymentRefund.count({ where: { idempotencyKey: { startsWith: "payment-wallet-demo:refund:" } } });
    return { bookingCount, paymentCount, refundCount, customerWalletCount, financeCreated, completedPaymentTimestampsUpdated: completedDemoPayments.length, demoCommissionRuleId: demoRule.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120_000 });
  return fixtures;
}

async function main() {
  const dashboardDemo = await importDashboardDemoData();
  const paymentWallet = await addPaymentWalletFixtures();
  console.log(JSON.stringify({
    seeded: true,
    dashboardDemo,
    paymentWallet,
    note: "Refund fixtures are marked as development test data; no Razorpay refund or payout request is sent.",
  }, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
