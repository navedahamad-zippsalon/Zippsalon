import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import process from "node:process";

if (process.env.NODE_ENV === "production") {
  throw new Error("Payment & Wallet demo reset refuses to run in production.");
}
if (process.env.ALLOW_PAYMENT_WALLET_DEMO_SEED !== "true") {
  throw new Error("Set ALLOW_PAYMENT_WALLET_DEMO_SEED=true to reset development demo data.");
}

const prisma = new PrismaClient();
const demoBookingNotes = {
  OR: [
    { notes: { startsWith: "demo-import:" } },
    { notes: { startsWith: "zippbeauty:history:" } },
  ],
};

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const financialRows = await tx.bookingFinancialTransaction.findMany({
      where: { booking: demoBookingNotes },
      select: { id: true, settlements: { select: { id: true } } },
    });
    if (financialRows.some(({ settlements }) => settlements.length > 0)) {
      throw new Error("Demo finance has settlement records; refusing to reset records that may have entered payout processing.");
    }
    const financeIds = financialRows.map(({ id }) => id);
    const ledger = financeIds.length
      ? await tx.vendorWalletLedger.findMany({
          where: { bookingFinanceId: { in: financeIds } },
          select: { walletId: true, bucket: true, amount: true },
        })
      : [];
    const deltas = new Map<string, Prisma.Decimal>();
    for (const entry of ledger) {
      const key = `${entry.walletId}:${entry.bucket}`;
      deltas.set(key, (deltas.get(key) ?? new Prisma.Decimal(0)).add(entry.amount));
    }
    const bucketFields = {
      PENDING: "pendingBalance",
      AVAILABLE: "availableBalance",
      PROCESSING: "processingBalance",
      PAID: "paidBalance",
    } as const;
    for (const [key, amount] of deltas) {
      const [walletId, bucket] = key.split(":");
      const field = bucketFields[bucket as keyof typeof bucketFields];
      await tx.vendorWallet.update({ where: { id: walletId }, data: { [field]: { decrement: amount } } });
    }
    if (financeIds.length) {
      await tx.vendorWalletLedger.deleteMany({ where: { bookingFinanceId: { in: financeIds } } });
      await tx.bookingFinancialTransaction.deleteMany({ where: { id: { in: financeIds } } });
    }

    const customerCredits = await tx.walletTransaction.findMany({
      where: { referenceType: "PAYMENT_WALLET_DEMO" },
      select: { customerId: true, amount: true, createdAt: true },
    });
    const customerDeltas = new Map<string, number>();
    for (const credit of customerCredits) {
      customerDeltas.set(credit.customerId, (customerDeltas.get(credit.customerId) ?? 0) + credit.amount);
      const laterTransaction = await tx.walletTransaction.findFirst({
        where: {
          customerId: credit.customerId,
          OR: [{ referenceType: null }, { referenceType: { not: "PAYMENT_WALLET_DEMO" } }],
          createdAt: { gt: credit.createdAt },
        },
        select: { id: true },
      });
      if (laterTransaction) {
        throw new Error(`Customer wallet ${credit.customerId} has transactions after demo credits; refusing to alter a wallet that may have been used.`);
      }
    }
    for (const [customerId, amount] of customerDeltas) {
      await tx.customerWallet.updateMany({ where: { customerId }, data: { balance: { decrement: amount } } });
    }
    await tx.walletTransaction.deleteMany({ where: { referenceType: "PAYMENT_WALLET_DEMO" } });

    const extraBookings = await tx.booking.deleteMany({ where: { notes: { startsWith: "payment-wallet-demo:" } } });
    const demoRule = await tx.bookingCommissionRule.findFirst({ where: { applicableTo: "PAYMENT_WALLET_DEMO" }, select: { id: true } });
    if (demoRule) await tx.bookingCommissionRule.delete({ where: { id: demoRule.id } });

    return {
      financeTransactionsRemoved: financeIds.length,
      walletLedgerEntriesRemoved: ledger.length,
      customerWalletTransactionsRemoved: customerCredits.length,
      refundedDemoBookingsRemoved: extraBookings.count,
      note: "Shared dashboard demo vendors, salons, branches, customers and bookings were preserved.",
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
