import { prisma } from "../../../infrastructure/database/prisma";
import { WhatsAppTemplateCategory } from "@prisma/client";
import { calculateWhatsAppCharge } from "./billing";

export const currentPricing = async (category: WhatsAppTemplateCategory, at = new Date()) => prisma.whatsAppPricing.findFirst({
  where: { provider: process.env.WHATSAPP_PROVIDER ?? "meta", messageCategory: category, active: true, effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] },
  orderBy: { effectiveFrom: "desc" },
});

export const pricingRates = (pricing: { costPerMessage?: number; vendorPricePerMessage?: number; providerCostPerMessage?: number } | null) => ({
  vendorPricePerMessage: pricing?.vendorPricePerMessage ?? pricing?.costPerMessage ?? 0,
  providerCostPerMessage: pricing?.providerCostPerMessage ?? 0,
});

export const calculateWhatsAppFinancials = (billableMessages: number, providerCostRate: number, vendorPriceRate: number, campaignCharge = 0) => {
  const providerCost = Number((billableMessages * providerCostRate).toFixed(2));
  const vendorCharge = calculateWhatsAppCharge(billableMessages, vendorPriceRate, campaignCharge);
  return {
    providerCost,
    vendorCharge,
    adminMargin: Number((vendorCharge - providerCost).toFixed(2)),
    providerCostRate,
    vendorPriceRate,
    warning: vendorPriceRate < providerCostRate
      ? "Vendor price is lower than provider cost. This campaign may result in negative margin."
      : null,
  };
};
