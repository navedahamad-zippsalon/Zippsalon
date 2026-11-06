import { z } from "zod";

export const scopeSchema = z.object({ salonId: z.string().uuid(), branchId: z.string().uuid().optional() });
export const connectionSchema = scopeSchema.extend({ businessAccountId: z.string().min(1), phoneNumberId: z.string().min(1), accessToken: z.string().min(1), apiVersion: z.string().optional(), displayPhoneNumber: z.string().optional(), verifiedName: z.string().optional() });
export const contactSchema = scopeSchema.extend({ customerId: z.string().uuid().optional(), name: z.string().min(1).max(120), phoneNumber: z.string().min(8), countryCode: z.string().default("+91"), tags: z.any().optional(), metadata: z.any().optional() });
export const templateSchema = z.object({ vendorId: z.string().uuid().optional(), salonId: z.string().uuid().optional(), branchId: z.string().uuid().optional(), name: z.string().min(1), language: z.string().min(2), category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"]), body: z.string().min(1), headerType: z.string().optional(), headerText: z.string().optional(), footerText: z.string().optional(), buttons: z.any().optional(), variables: z.any().optional() });
export const pricingSchema = z.object({ provider: z.string().default("meta"), messageCategory: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"]), costPerMessage: z.number().nonnegative().optional(), vendorPricePerMessage: z.number().nonnegative().optional(), providerCostPerMessage: z.number().nonnegative().default(0), campaignCharge: z.number().nonnegative().default(0), currency: z.string().default("INR"), effectiveFrom: z.coerce.date(), effectiveTo: z.coerce.date().optional(), active: z.boolean().default(true), notes: z.string().max(1000).optional() }).superRefine((pricing, context) => {
  if (pricing.costPerMessage === undefined && pricing.vendorPricePerMessage === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["vendorPricePerMessage"], message: "Vendor selling price is required." });
  }
});
export const campaignSchema = scopeSchema.extend({ vendorId: z.string().uuid().optional(), name: z.string().min(1), description: z.string().optional(), templateId: z.string().uuid(), connectionId: z.string().uuid(), campaignType: z.enum(["SEND_NOW", "SCHEDULED"]), audienceType: z.enum(["ALL", "OPTED_IN", "TAGGED", "CUSTOM"]), scheduledAt: z.coerce.date().optional(), timezone: z.string().optional(), contactIds: z.array(z.string().uuid()).optional(), variables: z.any().optional() }).superRefine((campaign, context) => {
  if (campaign.campaignType === "SCHEDULED" && (!campaign.scheduledAt || campaign.scheduledAt <= new Date())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "Scheduled campaigns require a future scheduledAt value." });
  }
});
export const campaignPreviewSchema = scopeSchema.extend({ templateId: z.string().uuid(), connectionId: z.string().uuid(), audienceType: z.enum(["ALL", "OPTED_IN", "TAGGED", "CUSTOM"]).default("ALL"), contactIds: z.array(z.string().uuid()).optional(), variables: z.any().optional() });
export const sendSchema = z.object({ connectionId: z.string().uuid(), contactId: z.string().uuid(), templateId: z.string().uuid().optional(), variables: z.any().optional(), messageType: z.enum(["TEXT", "TEMPLATE", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO", "INTERACTIVE"]), messageBody: z.string().optional() });
