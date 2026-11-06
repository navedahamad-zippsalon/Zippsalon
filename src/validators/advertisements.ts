import { z } from "zod";

const blankToUndefined = (value: unknown) => typeof value === "string" && !value.trim() ? undefined : value;
const enumValue = <T extends [string, ...string[]]>(values: T, aliases: Record<string, string> = {}) =>
  z.preprocess((value) => {
    const normalized = blankToUndefined(value);
    if (typeof normalized !== "string") return normalized;
    const upper = normalized.trim().toUpperCase();
    return aliases[upper] ?? upper;
  }, z.enum(values).optional());
const optionalText = (schema: z.ZodTypeAny) => z.preprocess(blankToUndefined, schema.optional());
const booleanValue = z.preprocess((value) => {
  const valueWithoutBlank = blankToUndefined(value);
  if (typeof valueWithoutBlank === "string") {
    const normalized = valueWithoutBlank.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return valueWithoutBlank;
}, z.boolean().optional());
const dateValue = z.preprocess(blankToUndefined, z.coerce.date().nullable().optional());
const pincodeValues = z.preprocess(
  (value) => {
    const values = typeof value === "string" ? value.split(/[\s,;]+/) : value;
    if (!Array.isArray(values)) return values;
    return values.flatMap((item) => typeof item === "string" ? item.split(/[\s,;]+/) : [item])
      .map((pincode) => typeof pincode === "string" ? pincode.trim() : typeof pincode === "number" && Number.isInteger(pincode) ? String(pincode) : pincode)
      .filter((pincode) => pincode !== "");
  },
  z.array(z.string().regex(/^\d{6}$/, "Pincodes must be exactly 6 digits"))
    .transform((pincodes) => [...new Set(pincodes)])
    .optional(),
);

const normalizeAdvertisementPayload = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const value = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...value };
  const setAlias = (target: string, aliases: string[]) => {
    if (normalized[target] !== undefined && normalized[target] !== null && blankToUndefined(normalized[target]) !== undefined) return;
    const alias = aliases.find((key) => normalized[key] !== undefined);
    if (alias) normalized[target] = normalized[alias];
  };

  if (normalized.mediaType === undefined) {
    const mediaAlias = ["advertisementType", "type"].find((key) =>
      typeof normalized[key] === "string" && ["IMAGE", "VIDEO", "TEXT"].includes((normalized[key] as string).trim().toUpperCase()),
    );
    if (mediaAlias) normalized.mediaType = normalized[mediaAlias];
  }
  setAlias("mediaUrl", ["video", "image", "media"]);
  setAlias("description", ["textContent", "content"]);
  setAlias("startAt", ["startDate"]);
  setAlias("endAt", ["endDate"]);
  setAlias("pincodes", ["targetPincodes", "targetPincode"]);
  setAlias("durationValue", ["duration"]);
  if (normalized.pincodes === null) normalized.pincodes = undefined;

  for (const field of ["mediaType", "targetType", "targetingMode", "targetAudience", "durationUnit", "status", "actionType"]) {
    if (typeof normalized[field] === "string") normalized[field] = (normalized[field] as string).trim().toUpperCase();
  }
  if (typeof normalized.targetType === "string") {
    const targetAliases: Record<string, string> = {
      ALL_LOCATIONS: "ALL",
      ALL_INDIA: "ALL",
      SELECTED_PINCODES: "PINCODE",
      PINCODED: "PINCODE",
    };
    normalized.targetType = targetAliases[normalized.targetType as string] ?? normalized.targetType;
  }
  if (typeof normalized.targetingMode === "string") {
    const modeAliases: Record<string, string> = {
      ALL_LOCATIONS: "ALL",
      ALL_INDIA: "ALL",
      SELECTED_PINCODES: "PINCODE",
      PINCODED: "PINCODE",
    };
    normalized.targetingMode = modeAliases[normalized.targetingMode as string] ?? normalized.targetingMode;
  }
  if (typeof normalized.targetAudience === "string") {
    const audienceAliases: Record<string, string> = {
      ALL_LOCATIONS: "BOTH",
      ALL_INDIA: "BOTH",
      CUSTOMERS: "CUSTOMER",
      VENDORS: "VENDOR",
    };
    normalized.targetAudience = audienceAliases[normalized.targetAudience as string] ?? normalized.targetAudience;
  }
  if (typeof normalized.durationUnit === "string") {
    const durationAliases: Record<string, string> = { DAY: "DAYS", MONTH: "MONTHS", YEAR: "YEARS" };
    normalized.durationUnit = durationAliases[normalized.durationUnit as string] ?? normalized.durationUnit;
  }
  return normalized;
};

const advertisementFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  mediaType: enumValue(["IMAGE", "VIDEO", "TEXT"]),
  mediaUrl: optionalText(z.string().trim().min(1).nullable()),
  thumbnailUrl: optionalText(z.string().trim().min(1).nullable()),
  actionEnabled: booleanValue,
  actionButtonName: optionalText(z.string().trim().max(100).nullable()),
  actionType: enumValue(["URL", "DEEP_LINK", "SERVICE", "SALON", "BOOKING", "NONE"]),
  actionUrl: optionalText(z.string().trim().max(1000).nullable()),
  targetAudience: enumValue(["CUSTOMER", "VENDOR", "BOTH"], { ALL: "BOTH", CUSTOMERS: "CUSTOMER", VENDORS: "VENDOR" }),
  targetingMode: enumValue(["ALL", "PINCODE"]),
  pincodes: pincodeValues,
  durationValue: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  durationUnit: enumValue(["DAYS", "MONTHS", "YEARS"], { DAY: "DAYS", MONTH: "MONTHS", YEAR: "YEARS" }),
  status: enumValue(["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED", "ARCHIVED"]),
  startAt: dateValue,
  endAt: dateValue,
  displayOrder: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).optional()),
  image: z.string().optional(),
  media: z.string().optional(),
  targetType: optionalText(z.string().trim()),
  targetId: optionalText(z.string().trim()),
  salonId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  ctaText: z.string().optional(),
  priority: z.coerce.number().int().optional(),
}).passthrough();

const validateCreateAdvertisement = (value: z.infer<typeof advertisementFields>, context: z.RefinementCtx) => {
  if ((value.durationValue === undefined) !== (value.durationUnit === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["durationUnit"], message: "durationValue and durationUnit must be provided together" });
  }
  const targetingMode = value.targetingMode ?? (value.targetType === "PINCODE" ? "PINCODE" : "ALL");
  if (targetingMode === "PINCODE" && !value.pincodes?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["pincodes"], message: "At least one pincode is required for PINCODE targeting" });
  }
  const mediaUrl = value.mediaUrl ?? value.media ?? value.image;
  if ((value.mediaType === "IMAGE" || value.mediaType === "VIDEO") && !mediaUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mediaUrl"], message: "mediaUrl is required for image and video advertisements" });
  }
  if (value.actionEnabled && (!value.actionButtonName || value.actionType === "NONE" || !value.actionUrl)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["actionUrl"], message: "Action button name, action type, and action URL are required when actionEnabled is true" });
  }
  if (value.startAt && value.endAt && value.startAt >= value.endAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endAt"], message: "endAt must be after startAt" });
  }
};

export const advertisementSchema = z.preprocess(normalizeAdvertisementPayload, advertisementFields).superRefine(validateCreateAdvertisement);

export const updateAdvertisementSchema = z.preprocess(normalizeAdvertisementPayload, advertisementFields.partial().passthrough()).superRefine((value, context) => {
  if ((value.targetingMode === "PINCODE" || value.targetType === "PINCODE") && value.pincodes !== undefined && !value.pincodes.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["pincodes"], message: "At least one pincode is required for PINCODE targeting" });
  }
});
export const advertisementStatusSchema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED", "ARCHIVED"]) });

export const advertisementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED", "ARCHIVED"]).optional(),
  targetAudience: z.enum(["CUSTOMER", "VENDOR", "BOTH"]).optional(),
  targetType: z.enum(["ALL", "PINCODE", "CUSTOMER", "CUSTOMERS", "VENDOR", "VENDORS", "BOTH"]).optional(),
  targetingMode: z.enum(["ALL", "PINCODE"]).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "TEXT"]).optional(),
  type: z.enum(["IMAGE", "VIDEO", "TEXT"]).optional(),
  sortBy: z.enum(["displayOrder", "createdAt", "updatedAt", "startAt", "endAt", "title", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).passthrough();

export const reorderAdvertisementsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.coerce.number().int().min(0) })).min(1),
});

export type AdvertisementInput = z.infer<typeof advertisementSchema>;
