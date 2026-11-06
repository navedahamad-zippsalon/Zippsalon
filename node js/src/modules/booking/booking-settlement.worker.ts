import { prisma } from "../../infrastructure/database/prisma";
import { retryPendingSettlements, runAutomaticSettlements } from "./booking-finance.service";

let running = false;
const tick = async () => {
  if (running) return;
  running = true;
  try {
    await runAutomaticSettlements();
    await retryPendingSettlements();
  } catch (error) {
    console.error("booking_settlement_worker_error", error);
  } finally {
    running = false;
  }
};

const timer = setInterval(() => void tick(), 5_000);
void tick();

const shutdown = async () => {
  clearInterval(timer);
  await prisma.$disconnect();
  process.exit(0);
};

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
