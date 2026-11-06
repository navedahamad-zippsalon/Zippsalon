import { z } from "zod";

const nonNegativeInt = z.coerce.number().int().min(0);
const optionalLimit = nonNegativeInt.optional().nullable();

export const billingCycleSchema = z.enum(["MONTHLY", "ANNUAL"]);

export const planSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().regex(/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/).max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  monthlyPrice: nonNegativeInt.default(0),
  annualPrice: nonNegativeInt.default(0),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("INR"),
  monthlyEnabled: z.boolean().default(true),
  annualEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
  badge: z.string().trim().max(80).optional().nullable(),
  highlight: z.boolean().default(false),
  trialDays: nonNegativeInt.default(0),
  maxBranches: optionalLimit,
  maxStaff: optionalLimit,
  maxCustomers: optionalLimit,
  maxBookings: optionalLimit,
  maxStorage: optionalLimit,
  maxBookingsPerMonth: optionalLimit,
  featureTitle: z.string().trim().max(200).optional().nullable(),
  featureDescription: z.string().trim().max(1000).optional().nullable(),
  ctaText: z.string().trim().max(100).optional().nullable(),
  badgeText: z.string().trim().max(100).optional().nullable(),
  monthlyDescription: z.string().trim().max(500).optional().nullable(),
  annualDescription: z.string().trim().max(500).optional().nullable(),
  promotionalText: z.string().trim().max(500).optional().nullable(),
  termsText: z.string().trim().max(1000).optional().nullable(),
  renewalText: z.string().trim().max(500).optional().nullable(),
  features: z.array(z.object({ featureId: z.string().uuid(), enabled: z.boolean(), limits: z.record(z.string(), z.unknown()).optional().nullable(), sortOrder: z.coerce.number().int().default(0) })).optional(),
});

export const featureSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/).max(100),
  displayName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  featureText: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const checkoutSchema = z.object({ planId: z.string().uuid(), billingCycle: billingCycleSchema });
export const changeDummyPlanSchema = checkoutSchema;
export const paymentVerificationSchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
});
export const idParamSchema = z.object({ id: z.string().uuid() });
export const planIdParamSchema = z.object({ planId: z.string().uuid() });
export const subscriptionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  planId: z.string().uuid().optional(),
  billingCycle: billingCycleSchema.optional(),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED", "INACTIVE"]).optional(),
  paymentStatus: z.enum(["CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
}).passthrough();
export const assignSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: billingCycleSchema,
  amount: nonNegativeInt.default(0),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export const extendSubscriptionSchema = z.object({ expiresAt: z.coerce.date() });
export const cancelSubscriptionSchema = z.object({ reason: z.string().trim().max(500).optional() });
export const planMenuAssignmentsSchema = z.object({
  menus: z.array(z.object({ menuId: z.string().uuid(), enabled: z.boolean() })).max(1000),
});
export const planModuleAssignmentsSchema = z.object({
  modules: z.array(z.object({ menuId: z.string().uuid(), moduleId: z.string().uuid(), enabled: z.boolean() })).max(1000),
});
const accessAssignments = z.object({
  menus: z.array(z.object({ menuId: z.string().uuid(), enabled: z.boolean() })).max(1000),
  modules: z.array(z.object({ menuId: z.string().uuid(), moduleId: z.string().uuid(), enabled: z.boolean() })).max(1000),
  permissions: z.array(z.object({ permissionId: z.string().uuid(), enabled: z.boolean() })).max(2000).default([]),
});
export const planAccessSchema = z.object({ vendor: accessAssignments, staff: accessAssignments });
export const accessUserTypeSchema = z.enum(["VENDOR", "STAFF"]);
export const accessControlQuerySchema = z.object({
  planId: z.string().uuid(),
  roleId: z.string().uuid(),
  // Optional for backwards compatibility with the existing matrix UI. When
  // supplied, it must agree with the selected system/staff role.
  userType: accessUserTypeSchema.optional(),
});
export const accessControlSaveSchema = z.object({
  planId: z.string().uuid(),
  roleId: z.string().uuid(),
  userType: accessUserTypeSchema.optional(),
  permissions: z.array(z.object({
    menuId: z.string().uuid(),
    submenuId: z.string().uuid().nullable().optional(),
    moduleId: z.string().uuid().nullable().optional(),
    actions: z.record(z.string(), z.boolean()),
  })).max(5000),
});
