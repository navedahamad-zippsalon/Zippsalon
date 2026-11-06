import "dotenv/config";
import redis from "../../../infrastructure/redis/redis";
import logger from "../../../infrastructure/logger/logger";
import { prisma } from "../../../infrastructure/database/prisma";
import { processCampaign } from "./campaign.worker";
import { processMessage } from "./message.worker";
import { dequeue, enqueue, retryDelay } from "./queue";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let stopping = false;
let lastRecovery = 0;

const errorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) return String((error as { code?: unknown }).code ?? "WORKER_ERROR");
  return "WORKER_ERROR";
};

async function recoverCampaignJobs() {
  const now = new Date();
  const staleQueueCutoff = new Date(now.getTime() - 30000);
  const staleProcessingCutoff = new Date(now.getTime() - 10 * 60000);
  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: {
      OR: [
        { status: "SCHEDULED", scheduledAt: { lte: now } },
        { status: "QUEUED", updatedAt: { lte: staleQueueCutoff } },
        { status: "PROCESSING", startedAt: { lte: staleProcessingCutoff } },
      ],
    },
    select: { id: true, status: true },
    take: 50,
    orderBy: { updatedAt: "asc" },
  });
  for (const campaign of campaigns) {
    const reclaimed = await prisma.whatsAppCampaign.updateMany({
      where: { id: campaign.id, status: campaign.status, ...(campaign.status === "SCHEDULED" ? { scheduledAt: { lte: now } } : {}) },
      data: { status: "QUEUED", startedAt: null },
    });
    if (!reclaimed.count) continue;
    try {
      await enqueue("campaign", { type: "campaign", id: campaign.id });
    } catch (error) {
      await prisma.whatsAppCampaign.updateMany({
        where: { id: campaign.id, status: "QUEUED" },
        data: { status: campaign.status === "SCHEDULED" ? "SCHEDULED" : "QUEUED", startedAt: null },
      });
      logger.error("whatsapp_campaign_recovery_enqueue_failed", { campaignId: campaign.id, code: errorCode(error) });
    }
  }
}

async function failStaleSubmissions() {
  const cutoff = new Date(Date.now() - 10 * 60000);
  const messages = await prisma.whatsAppMessage.findMany({
    where: { status: "SUBMITTED", providerMessageId: null, submittedAt: { lt: cutoff } },
    select: { id: true, campaignId: true, contactId: true },
    take: 100,
    orderBy: { submittedAt: "asc" },
  });
  for (const message of messages) {
    await prisma.$transaction(async (tx) => {
      const failed = await tx.whatsAppMessage.updateMany({
        where: { id: message.id, status: "SUBMITTED", providerMessageId: null, submittedAt: { lt: cutoff } },
        data: {
          status: "FAILED",
          failureCode: "WHATSAPP_SUBMISSION_OUTCOME_UNKNOWN",
          failureReason: "Provider submission outcome is unknown; the message was not resent to avoid duplicate delivery.",
          failedAt: new Date(),
        },
      });
      if (!failed.count || !message.campaignId || !message.contactId) return;
      const recipient = await tx.whatsAppCampaignRecipient.updateMany({
        where: { campaignId: message.campaignId, contactId: message.contactId, status: "SUBMITTED" },
        data: {
          status: "FAILED",
          failureCode: "WHATSAPP_SUBMISSION_OUTCOME_UNKNOWN",
          failureReason: "Provider submission outcome is unknown.",
          failedAt: new Date(),
        },
      });
      if (!recipient.count) return;
      await tx.whatsAppCampaign.update({
        where: { id: message.campaignId },
        data: { queuedCount: { decrement: 1 }, failedCount: { increment: 1 } },
      });
    });
  }
}

process.once("SIGINT", () => { stopping = true; });
process.once("SIGTERM", () => { stopping = true; });

async function run() {
  if (redis.status === "wait") await redis.connect();
  while (!stopping) {
    if (Date.now() - lastRecovery >= 10000) {
      lastRecovery = Date.now();
      try {
        await recoverCampaignJobs();
        await failStaleSubmissions();
      } catch (error) {
        logger.error("whatsapp_worker_recovery_failed", { code: errorCode(error) });
      }
    }
    const [campaigns, messages] = await Promise.all([
      dequeue("campaign"),
      dequeue("message"),
    ]);
    if (!campaigns.length && !messages.length) {
      await sleep(500);
      continue;
    }
    for (const job of campaigns) {
      try {
        await processCampaign(job.id);
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1;
        logger.error("whatsapp_campaign_job_failed", { campaignId: job.id, attempts, code: errorCode(error) });
        await prisma.whatsAppCampaign.updateMany({ where: { id: job.id, status: "PROCESSING" }, data: { status: "QUEUED", startedAt: null } });
        if (attempts < 4) await enqueue("campaign", { ...job, attempts }, retryDelay(attempts - 1));
      }
    }
    for (const job of messages) {
      try {
        await processMessage(job.id, job.attempts ?? 0);
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1;
        logger.error("whatsapp_message_job_failed", { messageId: job.id, attempts, code: errorCode(error) });
        if (attempts < 4) {
          await enqueue("message", { ...job, attempts }, retryDelay(attempts - 1));
        }
      }
    }
  }
  redis.disconnect();
}

run().catch((error) => {
  logger.error("whatsapp_worker_stopped", { code: errorCode(error) });
  redis.disconnect();
  process.exitCode = 1;
});
