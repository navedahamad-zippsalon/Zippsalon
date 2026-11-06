import { prisma } from "../../../infrastructure/database/prisma";
import { enqueue } from "./queue";

export const processCampaign = async (campaignId: string) => {
  const campaign = await prisma.whatsAppCampaign.findUnique({ where: { id: campaignId }, include: { template: true } });
  if (!campaign || ["CANCELLED", "PAUSED", "COMPLETED"].includes(campaign.status)) return;
  if (campaign.status === "SCHEDULED" && campaign.scheduledAt && campaign.scheduledAt > new Date()) return;
  const claimed = await prisma.whatsAppCampaign.updateMany({
    where: { id: campaignId, status: { in: ["QUEUED", "SCHEDULED"] } },
    data: { status: "PROCESSING", startedAt: new Date() },
  });
  if (!claimed.count) return;
  const pricingSnapshot = campaign.pricingSnapshot as {
    providerCostPerMessage?: number;
    vendorPricePerMessage?: number;
    perMessageRate?: number;
  } | null;
  const providerCostPerMessage = pricingSnapshot?.providerCostPerMessage ?? 0;
  const vendorPricePerMessage = pricingSnapshot?.vendorPricePerMessage ?? pricingSnapshot?.perMessageRate ?? 0;
  let cursor: string | undefined;
  while (true) {
    const recipients = await prisma.whatsAppCampaignRecipient.findMany({
      where: { campaignId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: 200,
    });
    if (!recipients.length) break;
    cursor = recipients[recipients.length - 1].id;
    const existing = await prisma.whatsAppMessage.findMany({
      where: { campaignId, contactId: { in: recipients.map((recipient) => recipient.contactId) } },
      select: { id: true, contactId: true, status: true },
    });
    const existingContactIds = new Set(existing.map((message) => message.contactId));
    const missing = recipients.filter((recipient) => !existingContactIds.has(recipient.contactId));
    if (missing.length) {
      await prisma.whatsAppMessage.createMany({
        data: missing.map((recipient) => ({
          vendorId: campaign.vendorId,
          salonId: campaign.salonId,
          branchId: campaign.branchId,
          campaignId,
          contactId: recipient.contactId,
          customerId: recipient.customerId,
          connectionId: campaign.connectionId,
          templateId: campaign.templateId,
          direction: "OUTBOUND",
          messageType: "TEMPLATE",
          phoneNumber: recipient.phoneNumberSnapshot,
          templatePayload: campaign.templatePayload ?? {},
          messageCategory: campaign.template.category,
          unitCost: recipient.unitCost,
          providerCostSnapshot: providerCostPerMessage,
          vendorPriceSnapshot: vendorPricePerMessage,
          vendorCharge: vendorPricePerMessage,
          currency: recipient.currency,
        })),
        skipDuplicates: true,
      });
    }
    const messages = await prisma.whatsAppMessage.findMany({
      where: { campaignId, contactId: { in: recipients.map((recipient) => recipient.contactId) }, status: "QUEUED" },
      select: { id: true },
    });
    for (const message of messages) await enqueue("message", { type: "message", id: message.id });
  }
};
