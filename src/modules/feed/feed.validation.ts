import { z } from "zod";

const mediaSchema = z.object({
  url: z.string().trim().min(1),
  type: z.enum(["IMAGE", "VIDEO"]),
  thumbnailUrl: z.string().trim().optional(),
  fileName: z.string().trim().optional(),
  mimeType: z.string().trim().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const postSchema = z.object({
  caption: z.string().trim().max(2200).optional().nullable(),
  salonId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  visibility: z.enum(["PUBLIC", "SALON", "BRANCH", "PRIVATE"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  media: z.array(mediaSchema).optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
});
export const storySchema = z.object({
  caption: z.string().trim().max(2200).optional().nullable(),
  salonId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  media: z.array(mediaSchema).length(1).optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
  mediaId: z.string().uuid().optional(),
});
export const commentSchema = z.object({ message: z.string().trim().min(1).max(500) });
export const reportSchema = z.object({
  reason: z.enum(["SPAM", "INAPPROPRIATE", "COPYRIGHT", "HARASSMENT", "OTHER"]),
  description: z.string().trim().max(2000).optional(),
});
export const shareSchema = z.object({
  platform: z.enum(["NATIVE", "COPY_LINK", "WHATSAPP", "FACEBOOK", "X", "LINKEDIN", "INSTAGRAM", "OTHER"]).default("COPY_LINK"),
});
export const feedAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  vendorId: z.string().uuid().optional(),
  salonId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  countryId: z.string().trim().min(1).max(120).optional(),
  cityId: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "DRAFT", "PUBLISHED", "ARCHIVED", "DELETED", "REJECTED"]).optional(),
  search: z.string().trim().max(120).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).passthrough().superRefine((query, context) => {
  const fromDate = query.fromDate ?? query.startDate;
  const toDate = query.toDate ?? query.endDate;
  if (fromDate && toDate && fromDate > toDate) {
    context.addIssue({ code: "custom", path: ["toDate"], message: "toDate must be on or after fromDate" });
  }
});

export const feedFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  countryId: z.string().trim().min(1).max(120).optional(),
  cityId: z.string().trim().min(1).max(120).optional(),
  vendorId: z.string().uuid().optional(),
  salonId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
}).strict();

export const adminPostUpdateSchema = postSchema.partial().omit({ salonId: true }).extend({
  salonId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]).optional(),
});
export const adminStoryUpdateSchema = z.object({
  caption: z.string().trim().max(2200).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PUBLISHED", "ARCHIVED", "DELETED", "REJECTED"]).optional(),
}).strict();
export type FeedMediaInput = z.infer<typeof mediaSchema>;
