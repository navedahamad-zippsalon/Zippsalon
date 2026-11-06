import { Prisma } from "@prisma/client";
import { prisma } from "../../../infrastructure/database/prisma";
import { providerFor } from "../providers";

const finalizeCampaignIfDone = async (tx: Prisma.TransactionClient, campaignId: string) => {
  const [remaining, campaign] = await Promise.all([
    tx.whatsAppCampaignRecipient.count({ where: { campaignId, status: { in: ["QUEUED", "SUBMITTED"] } } }),
    tx.whatsAppCampaign.findUnique({ where: { id: campaignId }, select: { status: true, totalRecipients: true, failedCount: true } }),
  ]);
  if (!campaign || remaining || !["QUEUED", "PROCESSING"].includes(campaign.status)) return;
  const status = campaign.failedCount >= campaign.totalRecipients
    ? "FAILED"
    : campaign.failedCount > 0 ? "PARTIALLY_COMPLETED" : "COMPLETED";
  await tx.whatsAppCampaign.update({ where: { id: campaignId }, data: { status, completedAt: new Date() } });
};

export const processMessage = async (messageId: string, attempts = 0) => {
  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: messageId },
    include: { template: true, campaign: true },
  });
  if (!message || message.status !== "QUEUED") return;
  if (message.campaign && ["PAUSED", "CANCELLED"].includes(message.campaign.status)) return;

  const claimed = await prisma.$transaction(async (tx) => {
    const updated = await tx.whatsAppMessage.updateMany({
      where: { id: messageId, status: "QUEUED" },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    if (updated.count && message.campaignId && message.contactId) {
      await tx.whatsAppCampaignRecipient.updateMany({
        where: { campaignId: message.campaignId, contactId: message.contactId, status: "SUBMITTED" },
        data: { status: "SUBMITTED" },
      });
    }
    return updated;
  });
  if (!claimed.count) return;

  let providerMessageId: string;
  try {
    const provider = await providerFor(message.connectionId);
    const result = message.messageType === "TEMPLATE" && message.template
      ? await provider.sendTemplateMessage(message.phoneNumber, message.template.name, message.template.language, message.templatePayload)
      : await provider.sendTextMessage(message.phoneNumber, message.messageBody ?? "");
    if (!result.providerMessageId) throw new Error("WHATSAPP_PROVIDER_MESSAGE_ID_MISSING");
    providerMessageId = result.providerMessageId;
  } catch (error: any) {
    const providerStatus = Number(error?.response?.status);
    const retryable = providerStatus === 429 || ["ECONNABORTED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(error?.code);
    const code = String(error?.code ?? (providerStatus ? `HTTP_${providerStatus}` : "WHATSAPP_PROVIDER_ERROR")).slice(0, 200);
    if (retryable && attempts < 3) {
      await prisma.$transaction(async (tx) => {
        await tx.whatsAppMessage.updateMany({
          where: { id: messageId, status: "SUBMITTED", providerMessageId: null },
          data: { status: "QUEUED", submittedAt: null },
        });
        if (message.campaignId && message.contactId) {
          await tx.whatsAppCampaignRecipient.updateMany({
            where: { campaignId: message.campaignId, contactId: message.contactId, status: "SUBMITTED" },
            data: { status: "QUEUED" },
          });
        }
      });
      throw Object.assign(new Error(code), { code });
    }
    await prisma.$transaction(async (tx) => {
      const failed = await tx.whatsAppMessage.updateMany({
        where: { id: messageId, status: "SUBMITTED", providerMessageId: null },
        data: { status: "FAILED", failureCode: code, failureReason: code, failedAt: new Date() },
      });
      if (!failed.count || !message.campaignId || !message.contactId) return;
      const recipient = await tx.whatsAppCampaignRecipient.updateMany({
        where: { campaignId: message.campaignId, contactId: message.contactId, status: "SUBMITTED" },
        data: { status: "FAILED", failureCode: code, failureReason: code, failedAt: new Date() },
      });
      if (!recipient.count) return;
      await tx.whatsAppCampaign.update({
        where: { id: message.campaignId },
        data: { queuedCount: { decrement: 1 }, failedCount: { increment: 1 } },
      });
      await finalizeCampaignIfDone(tx, message.campaignId);
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const snapshot = message.campaign?.pricingSnapshot as {
      providerCostPerMessage?: number;
      vendorPricePerMessage?: number;
      perMessageRate?: number;
      campaignCharge?: number;
    } | null;
    const providerCost = message.providerCostSnapshot;
    const vendorPrice = snapshot?.vendorPricePerMessage ?? snapshot?.perMessageRate ?? message.vendorPriceSnapshot;
    const campaignCharge = snapshot?.campaignCharge ?? 0;
    const adminMargin = vendorPrice - providerCost;
    const accepted = await tx.whatsAppMessage.updateMany({
      where: { id: messageId, status: "SUBMITTED", providerMessageId: null },
      data: {
        status: "SENT",
        providerMessageId,
        sentAt: new Date(),
        providerCost,
        vendorCharge: vendorPrice,
        adminMargin,
      },
    });
    if (!accepted.count) return;

    const inserted = await tx.whatsAppUsageLedger.createMany({
      data: [{
        vendorId: message.vendorId,
        salonId: message.salonId,
        branchId: message.branchId,
        campaignId: message.campaignId,
        messageId: message.id,
        messageCategory: message.messageCategory,
        unitCost: providerCost,
        totalCost: providerCost,
        currency: message.currency,
        status: "PENDING",
        idempotencyKey: `whatsapp-message:${message.id}`,
      }],
      skipDuplicates: true,
    });
    if (!inserted.count) return;

    if (message.campaignId && message.campaign) {
      const billing = await tx.whatsAppCampaignBilling.upsert({
        where: { campaignId: message.campaignId },
        create: {
          campaignId: message.campaignId,
          vendorId: message.vendorId,
          salonId: message.salonId,
          branchId: message.branchId,
          messageCount: 1,
          billableMessageCount: 1,
          perMessageRate: vendorPrice,
          campaignCharge,
          totalCharge: Number((vendorPrice + campaignCharge).toFixed(2)),
          providerCostTotal: providerCost,
          adminMarginTotal: Number((vendorPrice + campaignCharge - providerCost).toFixed(2)),
          currency: message.currency,
          pricingSnapshot: message.campaign.pricingSnapshot ?? { perMessageRate: vendorPrice, vendorPricePerMessage: vendorPrice, providerCostPerMessage: providerCost, campaignCharge, currency: message.currency },
          billingStatus: "CALCULATED",
        },
        update: {
          messageCount: { increment: 1 },
          billableMessageCount: { increment: 1 },
          totalCharge: { increment: vendorPrice },
          providerCostTotal: { increment: providerCost },
          adminMarginTotal: { increment: adminMargin },
          billingStatus: "CALCULATED",
        },
      });
      await tx.whatsAppCampaignRecipient.updateMany({
        where: { campaignId: message.campaignId, contactId: message.contactId ?? undefined, status: "SUBMITTED" },
        data: { status: "SENT", providerMessageId, sentAt: new Date() },
      });
      await tx.whatsAppCampaign.update({
        where: { id: message.campaignId },
        data: {
          queuedCount: { decrement: 1 },
          sentCount: { increment: 1 },
          actualCost: billing.totalCharge,
          providerCostTotal: { increment: providerCost },
          adminMarginTotal: { increment: adminMargin + (billing.messageCount === 1 ? campaignCharge : 0) },
        },
      });
      await finalizeCampaignIfDone(tx, message.campaignId);
    }
  });
};
