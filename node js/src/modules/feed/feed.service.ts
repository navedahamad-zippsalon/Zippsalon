import { prisma } from "../../infrastructure/database/prisma";
import { FeedMediaInput } from "./feed.validation";
import { env } from "../../config/env";

const cleanCaption = (value?: string | null) => value ? value.replace(/<[^>]*>/g, "").trim() : null;
const admin = (roles: string[]) => roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
const feedPublicUrl = () => (env.APP_BASE_URL ?? env.APP_PUBLIC_URL).replace(/\/+$/, "");

async function findStaffRecord(userId: string, salonId: string, branchId?: string | null) {
  const assignments = await prisma.salonStaff.findMany({
    where: { userId, isActive: true },
    select: { id: true, salonId: true, userId: true, salon: { select: { id: true, parentId: true, ownerId: true, parent: { select: { id: true, ownerId: true } } } } },
  });
  const assignment = assignments.find((item) => item.salon.parentId
    ? item.salon.parentId === salonId && item.salon.id === branchId
    : item.salon.id === salonId && !branchId);
  if (!assignment) throw { status: 403, message: "Staff can only create feed content for their assigned salon or branch" };
  return assignment;
}

function staffFeedLocation(staffRecord: Awaited<ReturnType<typeof findStaffRecord>>) {
  const salonId = staffRecord.salon.parentId ?? staffRecord.salon.id;
  return {
    salonId,
    branchId: staffRecord.salon.parentId ? staffRecord.salon.id : null,
    vendorId: staffRecord.salon.parent?.ownerId ?? staffRecord.salon.ownerId,
  };
}

async function canManageStaffContent(userId: string, staffId: string | null, roles: string[]) {
  if (!roles.includes("STAFF") || !staffId) return false;
  return Boolean(await prisma.salonStaff.findFirst({ where: { id: staffId, userId, isActive: true }, select: { id: true } }));
}

async function assertLocation(userId: string, salonId: string, branchId?: string | null) {
  const salon = await prisma.salon.findFirst({ where: { id: salonId, OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] }, select: { id: true } });
  if (!salon) throw { status: 403, message: "Vendor is not authorized for this salon" };
  if (branchId) {
    const branch = await prisma.salon.findFirst({ where: { id: branchId, parentId: salonId, OR: [{ ownerId: userId }, { parent: { ownerId: userId } }] }, select: { id: true } });
    if (!branch) throw { status: 403, message: "Vendor is not authorized for this branch" };
  }
}

function validateMedia(media: FeedMediaInput[], story = false) {
  if (story && media.length !== 1) throw { status: 400, message: "A story must contain exactly one media item" };
  if (!story && media.length > 10) throw { status: 400, message: "A post supports at most 10 images" };
  const videos = media.filter((item) => item.type === "VIDEO");
  if (videos.length > 1 || (videos.length === 1 && media.length !== 1)) throw { status: 400, message: "A video post must contain exactly one video" };
}

const mediaData = (items: FeedMediaInput[]) => items.map((item, index) => ({ postId: undefined, storyId: undefined, type: item.type, url: item.url, thumbnailUrl: item.thumbnailUrl ?? null, fileName: item.fileName ?? null, mimeType: item.mimeType ?? null, fileSize: item.fileSize ?? null, width: item.width ?? null, height: item.height ?? null, durationSeconds: item.durationSeconds ?? null, sortOrder: item.sortOrder ?? index }));
const postInclude = { media: true, likes: { select: { userId: true } }, vendor: { select: { id: true, firstName: true, lastName: true } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, _count: { select: { likes: true, comments: true, views: true, shares: true } } };

export async function createPost(userId: string, roles: string[], input: any) {
  const media = input.media ?? [];
  validateMedia(media);

  const staffRecord = roles.includes("STAFF") ? await findStaffRecord(userId, input.salonId, input.branchId) : null;
  const location = staffRecord ? staffFeedLocation(staffRecord) : { salonId: input.salonId, branchId: input.branchId ?? null, vendorId: userId };
  if (!staffRecord) await assertLocation(userId, location.salonId, location.branchId);

  const status = input.status ?? "PUBLISHED";

  return prisma.$transaction(async (tx) => tx.feedPost.create({
    data: {
      vendorId: location.vendorId,
      staffId: staffRecord?.id ?? null,
      createdBy: userId,
      salonId: location.salonId,
      branchId: location.branchId,
      caption: cleanCaption(input.caption),
      visibility: input.visibility ?? "PUBLIC",
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      media: { create: mediaData(media) },
    },
    include: postInclude,
  }));
}

export async function listPosts(userId: string | undefined, query: any, roles: string[]) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const vendorScope = userId && roles.includes("VENDOR") && !admin(roles) ? { vendorId: userId } : {};
  const where: any = { status: query.status ?? "PUBLISHED", ...vendorScope, ...(query.vendorId && !vendorScope.vendorId ? { vendorId: query.vendorId } : {}), ...(query.salonId ? { salonId: query.salonId } : {}), ...(query.branchId ? { branchId: query.branchId } : {}) };
  if (query.search) where.OR = [{ caption: { contains: query.search, mode: "insensitive" } }, { vendor: { firstName: { contains: query.search, mode: "insensitive" } } }, { vendor: { lastName: { contains: query.search, mode: "insensitive" } } }, { salon: { name: { contains: query.search, mode: "insensitive" } } }];
  if (!admin(roles)) { where.status = query.status === "DRAFT" ? "DRAFT" : "PUBLISHED"; }
  const [items, total] = await Promise.all([prisma.feedPost.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: postInclude }), prisma.feedPost.count({ where })]);
  return { page, limit, total, items: items.map((item: any) => ({ ...item, likeCount: item._count.likes, commentCount: item._count.comments, viewCount: item._count.views, shareCount: item._count.shares, isLiked: Boolean(userId && item.likes?.some((like: any) => like.userId === userId)) })) };
}

export async function getPost(id: string, userId?: string) {
  const post: any = await prisma.feedPost.findFirst({ where: { id, status: { not: "DELETED" } }, include: { ...postInclude, likes: { where: { userId }, select: { id: true } } } });
  if (!post) throw { status: 404, message: "Feed post not found" };
  return { ...post, likeCount: post._count.likes, commentCount: post._count.comments, viewCount: post._count.views, shareCount: post._count.shares, isLiked: post.likes.length > 0 };
}

export async function updatePost(userId: string, id: string, input: any, roles: string[]) {
  const post = await prisma.feedPost.findUnique({ where: { id }, select: { vendorId: true, staffId: true, salonId: true, branchId: true } });
  if (!post) throw { status: 404, message: "Feed post not found" };
  if (post.vendorId !== userId && !admin(roles) && !await canManageStaffContent(userId, post.staffId, roles)) throw { status: 403, message: "You can only manage your own post" };
  const salonId = input.salonId ?? post.salonId;
  const branchId = input.branchId !== undefined ? input.branchId : post.branchId;
  if (!admin(roles) && (input.salonId !== undefined || input.branchId !== undefined)) {
    if (roles.includes("STAFF") && (salonId !== post.salonId || branchId !== post.branchId)) throw { status: 403, message: "Staff cannot move feed content to another salon or branch" };
    if (!roles.includes("STAFF")) await assertLocation(userId, salonId, branchId);
  }
  const data: any = { ...(input.caption !== undefined ? { caption: cleanCaption(input.caption) } : {}), ...(input.salonId ? { salonId: input.salonId } : {}), ...(input.branchId !== undefined ? { branchId: input.branchId } : {}), ...(input.visibility ? { visibility: input.visibility } : {}), ...(input.status ? { status: input.status } : {}) };
  return prisma.feedPost.update({ where: { id }, data, include: { media: true } });
}
export async function deletePost(userId: string, id: string, roles: string[]) { const post = await prisma.feedPost.findUnique({ where: { id }, select: { vendorId: true, staffId: true } }); if (!post) throw { status: 404, message: "Feed post not found" }; if (post.vendorId !== userId && !admin(roles) && !await canManageStaffContent(userId, post.staffId, roles)) throw { status: 403, message: "Forbidden" }; return prisma.feedPost.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } }); }
export async function archivePost(userId: string, id: string) { const post = await prisma.feedPost.findFirst({ where: { id, vendorId: userId } }); if (!post) throw { status: 404, message: "Feed post not found" }; return prisma.feedPost.update({ where: { id }, data: { status: "ARCHIVED" } }); }

export async function createStory(userId: string, roles: string[], input: any) {
  validateMedia(input.media, true);

  const staffRecord = roles.includes("STAFF") ? await findStaffRecord(userId, input.salonId, input.branchId) : null;
  const location = staffRecord ? staffFeedLocation(staffRecord) : { salonId: input.salonId, branchId: input.branchId ?? null, vendorId: userId };
  if (!staffRecord) await assertLocation(userId, location.salonId, location.branchId);

  const now = new Date();
  return prisma.$transaction((tx) => tx.feedStory.create({
    data: {
      vendorId: location.vendorId,
      staffId: staffRecord?.id ?? null,
      createdBy: userId,
      salonId: location.salonId,
      branchId: location.branchId,
      caption: cleanCaption(input.caption),
      status: "PUBLISHED",
      publishedAt: now,
      expiresAt: new Date(now.getTime() + 86400000),
      media: { create: mediaData(input.media) },
    },
    include: { media: true },
  }));
}
export async function updateStory(userId: string, id: string, input: any, roles: string[]) {
  const story = await prisma.feedStory.findUnique({ where: { id }, select: { vendorId: true, staffId: true, salonId: true, branchId: true } });
  if (!story) throw { status: 404, message: "Story not found" };
  if (story.vendorId !== userId && !admin(roles) && !await canManageStaffContent(userId, story.staffId, roles)) throw { status: 403, message: "You can only manage your own story" };

  const data: any = {
    ...(input.caption !== undefined ? { caption: cleanCaption(input.caption) } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  if (!admin(roles) && (input.salonId || input.branchId)) {
    if (roles.includes("STAFF") && ((input.salonId && input.salonId !== story.salonId) || (input.branchId !== undefined && input.branchId !== story.branchId))) throw { status: 403, message: "Staff cannot move feed content to another salon or branch" };
    if (roles.includes("STAFF")) return prisma.feedStory.update({ where: { id }, data, include: { media: true } });
    await assertLocation(userId, input.salonId ?? story.salonId, input.branchId ?? story.branchId);
    if (input.salonId) data.salonId = input.salonId;
    if (input.branchId !== undefined) data.branchId = input.branchId;
  }

  return prisma.feedStory.update({ where: { id }, data, include: { media: true } });
}
export async function listStories(userId?: string, roles: string[] = []) {
  const vendorScope = userId && roles.includes("VENDOR") && !admin(roles) ? { vendorId: userId } : {};
  return prisma.feedStory.findMany({ where: { status: "PUBLISHED", expiresAt: { gt: new Date() }, ...vendorScope }, orderBy: { createdAt: "desc" }, include: { media: true, vendor: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, views: { where: userId ? { userId } : undefined, select: { userId: true } } } }).then((stories) => stories.map((story) => ({ ...story, viewed: story.views.length > 0 })));
}
export async function getStory(id: string, userId?: string) { const story = await prisma.feedStory.findFirst({ where: { id, status: "PUBLISHED", expiresAt: { gt: new Date() } }, include: { media: true, vendor: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, views: { where: userId ? { userId } : undefined, select: { id: true } }, _count: { select: { views: true } } } }); if (!story) throw { status: 404, message: "Story has expired." }; return { ...story, viewed: story.views.length > 0 }; }
export async function deleteStory(userId: string, id: string, roles: string[]) { const story = await prisma.feedStory.findUnique({ where: { id }, select: { vendorId: true, staffId: true } }); if (!story) throw { status: 404, message: "Story not found" }; if (story.vendorId !== userId && !admin(roles) && !await canManageStaffContent(userId, story.staffId, roles)) throw { status: 403, message: "Forbidden" }; return prisma.feedStory.update({ where: { id }, data: { status: "DELETED" } }); }

export async function toggleLike(userId: string, postId: string, remove = false) { const existing = await prisma.feedPostLike.findUnique({ where: { postId_userId: { postId, userId } } }); if (existing || remove) { if (existing) await prisma.feedPostLike.delete({ where: { id: existing.id } }); return { liked: false }; } await prisma.feedPostLike.create({ data: { postId, userId } }); return { liked: true }; }
export async function comments(postId: string) { return prisma.feedComment.findMany({ where: { postId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, firstName: true, lastName: true } } } }); }
export async function addComment(userId: string, postId: string, message: string) { return prisma.feedComment.create({ data: { userId, postId, message: cleanCaption(message)! }, include: { user: { select: { id: true, firstName: true, lastName: true } } } }); }
export async function editComment(userId: string, id: string, message: string) { const comment = await prisma.feedComment.findFirst({ where: { id, userId } }); if (!comment) throw { status: 404, message: "Comment not found" }; return prisma.feedComment.update({ where: { id }, data: { message: cleanCaption(message) ?? "" } }); }
export async function deleteComment(userId: string, id: string, roles: string[]) { const comment = await prisma.feedComment.findUnique({ where: { id }, select: { userId: true } }); if (!comment || (comment.userId !== userId && !admin(roles))) throw { status: 404, message: "Comment not found" }; return prisma.feedComment.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } }); }
export async function view(userId: string, postId: string) { await prisma.feedPostView.upsert({ where: { postId_userId: { postId, userId } }, update: {}, create: { postId, userId } }); return { viewed: true }; }
export async function storyView(userId: string, storyId: string) { await prisma.feedStoryView.upsert({ where: { storyId_userId: { storyId, userId } }, update: {}, create: { storyId, userId } }); return getStory(storyId); }
export async function share(userId: string, postId: string, platform: any, roles: string[] = []) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { vendorId: true, status: true } });
  if (!post || post.status === "DELETED") throw { status: 404, message: "Feed post not found" };
  if (roles.includes("VENDOR") && !admin(roles) && post.vendorId !== userId) throw { status: 403, message: "You can only share your own post" };
  const item = await prisma.feedShare.create({ data: { userId, postId, channel: platform } });
  return { item, shareUrl: `${feedPublicUrl()}/feed/post/${postId}` };
}
export async function report(userId: string, postId: string, input: any) { return prisma.feedReport.create({ data: { postId, reporterUserId: userId, reason: input.reason, details: input.description } }); }
const adminVendor = { select: { id: true, firstName: true, lastName: true, email: true, phone: true } };
const adminStaff = { select: { id: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } } };
const adminSalon = { select: { id: true, name: true, ownerId: true, parentId: true, address: { select: { country: true, city: true } } } };
const pageInfo = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0, hasNextPage: page * limit < total, hasPreviousPage: page > 1 });
const adminStatus = (status?: string) => status === "ACTIVE" ? "PUBLISHED" : status === "INACTIVE" || status === "EXPIRED" ? "ARCHIVED" : status;
const addressFilter = (query: any) => {
  const country = query.countryId ?? query.country;
  const city = query.cityId ?? query.city;
  return country || city ? { address: { is: { ...(country ? { country: { equals: country, mode: "insensitive" as const } } : {}), ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}) } } } : {};
};
const adminDateFilter = (query: any) => {
  const start = query.fromDate ?? query.startDate;
  const end = query.toDate ?? query.endDate;
  return start || end ? { createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {};
};

async function assertAdminFilterHierarchy(query: any) {
  const country = query.countryId ?? query.country;
  const city = query.cityId ?? query.city;
  const addressMatches = country || city
    ? { address: { is: { ...(country ? { country: { equals: country, mode: "insensitive" as const } } : {}), ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}) } } }
    : {};

  if (country || city) {
    const address = await prisma.address.findFirst({
      where: { ...(country ? { country: { equals: country, mode: "insensitive" } } : {}), ...(city ? { city: { equals: city, mode: "insensitive" } } : {}) },
      select: { id: true },
    });
    if (!address) throw { status: 400, message: country && city ? "City does not belong to country" : country ? "Country not found" : "City not found" };
  }

  if (query.salonId) {
    const salon = await prisma.salon.findUnique({ where: { id: query.salonId }, select: { id: true, ownerId: true, parentId: true, address: { select: { country: true, city: true } } } });
    if (!salon || salon.parentId || (query.vendorId && salon.ownerId !== query.vendorId)) {
      throw { status: 400, message: "Salon does not belong to vendor" };
    }
    if ((country && salon.address?.country.toLocaleLowerCase() !== country.toLocaleLowerCase())
      || (city && salon.address?.city.toLocaleLowerCase() !== city.toLocaleLowerCase())) {
      throw { status: 400, message: "Salon does not belong to the selected country and city" };
    }
  }

  if (query.vendorId && (city || country || !query.salonId)) {
    const salon = await prisma.salon.findFirst({ where: { ownerId: query.vendorId, parentId: null, ...addressMatches }, select: { id: true } });
    if (!salon) throw { status: 400, message: city || country ? "Vendor does not operate in the selected country and city" : "Vendor does not own a salon" };
  }

  if (query.branchId) {
    const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { id: true, parentId: true, ownerId: true } });
    if (!branch?.parentId || (query.salonId && branch.parentId !== query.salonId)) {
      throw { status: 400, message: "Branch does not belong to salon" };
    }
    if (query.vendorId && branch.ownerId !== query.vendorId) {
      throw { status: 400, message: "Branch does not belong to vendor" };
    }
    if ((city || country) && !await prisma.salon.findFirst({ where: { id: branch.parentId, ...addressMatches }, select: { id: true } })) {
      throw { status: 400, message: "Branch does not belong to the selected country and city" };
    }
  }

  if (query.staffId) {
    const staff = await prisma.salonStaff.findUnique({ where: { id: query.staffId }, select: { salonId: true, salon: { select: { parentId: true, ownerId: true } } } });
    const expectedSalonId = query.branchId ?? query.salonId;
    const expectedSalon = expectedSalonId ? await prisma.salon.findUnique({ where: { id: expectedSalonId }, select: { id: true, parentId: true } }) : null;
    const matchesLocation = staff && expectedSalonId && (
      staff.salonId === expectedSalonId
      || (expectedSalon?.parentId === null && staff.salon.parentId === expectedSalonId)
    );
    if (!staff || (expectedSalonId && !matchesLocation)) {
      throw { status: 400, message: query.branchId ? "Staff does not belong to branch" : "Staff does not belong to salon" };
    }
    if (query.vendorId && staff.salon.ownerId !== query.vendorId) throw { status: 400, message: "Staff does not belong to vendor" };
    if ((city || country) && !await prisma.salon.findFirst({ where: { id: staff.salon.parentId ?? staff.salonId, ...addressMatches }, select: { id: true } })) {
      throw { status: 400, message: "Staff does not belong to the selected country and city" };
    }
  }
}

function adminFeedWhere(query: any, kind: "post" | "story") {
  const status = query.status;
  if ((kind === "post" && status === "EXPIRED") || (kind === "story" && status === "DRAFT")) {
    throw { status: 400, message: `${status} status is not supported for ${kind}s` };
  }
  const where: any = {
    ...(status === "EXPIRED" && kind === "story"
      ? { status: "PUBLISHED", expiresAt: { lte: new Date() } }
      : status === "ACTIVE" && kind === "story"
        ? { status: "PUBLISHED", expiresAt: { gt: new Date() } }
        : adminStatus(status) ? { status: adminStatus(status) } : {}),
    ...(query.vendorId ? { vendorId: query.vendorId } : {}),
    ...(query.salonId ? { salonId: query.salonId } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.staffId ? { staffId: query.staffId } : {}),
    ...(Object.keys(addressFilter(query)).length ? { salon: addressFilter(query) } : {}),
    ...adminDateFilter(query),
  };
  if (query.search) {
    const contains = { contains: query.search, mode: "insensitive" as const };
    const staffTerms = query.search.split(/\s+/).filter(Boolean);
    where.OR = [
      { caption: contains },
      { salon: { name: contains } },
      { branch: { is: { name: contains } } },
      { staff: { is: { user: { is: { AND: staffTerms.map((term: string) => ({ OR: [{ firstName: optionWhere(term) }, { lastName: optionWhere(term) }, { email: optionWhere(term) }] })) } } } } },
    ];
  }
  return where;
}

const ownership = (item: any) => ({
  ...item,
  status: item.status === "PUBLISHED" ? (item.expiresAt && item.expiresAt <= new Date() ? "EXPIRED" : "ACTIVE") : item.status === "ARCHIVED" ? "INACTIVE" : item.status,
  lifecycleStatus: item.status,
  country: item.salon.address ? { id: item.salon.address.country, name: item.salon.address.country } : null,
  city: item.salon.address ? { id: item.salon.address.city, name: item.salon.address.city, countryId: item.salon.address.country } : null,
  staff: item.staff ? { id: item.staff.id, name: [item.staff.user.firstName, item.staff.user.lastName].filter(Boolean).join(" "), userId: item.staff.user.id } : null,
  mediaType: item.media.some((media: any) => media.type === "VIDEO") ? "VIDEO" : "IMAGE",
  likesCount: item._count?.likes ?? 0,
  commentsCount: item._count?.comments ?? 0,
});
export async function adminPosts(query: any) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  await assertAdminFilterHierarchy(query);
  const where = adminFeedWhere(query, "post");
  const [items, total] = await Promise.all([
    prisma.feedPost.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { media: true, vendor: adminVendor, staff: adminStaff, salon: adminSalon, branch: { select: { id: true, name: true, parentId: true } }, _count: { select: { likes: true, comments: true, views: true, shares: true, reports: true } } } }),
    prisma.feedPost.count({ where }),
  ]);
  return { items: items.map(ownership), pagination: pageInfo(page, limit, total) };
}
export async function adminStories(query: any) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  await assertAdminFilterHierarchy(query);
  const where = adminFeedWhere(query, "story");
  const [items, total] = await Promise.all([
    prisma.feedStory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { media: true, vendor: adminVendor, staff: adminStaff, salon: adminSalon, branch: { select: { id: true, name: true, parentId: true } }, _count: { select: { views: true, reports: true } } } }),
    prisma.feedStory.count({ where }),
  ]);
  return { items: items.map(ownership), pagination: pageInfo(page, limit, total) };
}
export async function reports() { return prisma.feedReport.findMany({ orderBy: { createdAt: "desc" }, include: { post: { select: { id: true, salonId: true, branchId: true, caption: true, status: true } }, story: { select: { id: true, salonId: true, branchId: true, caption: true, status: true } }, reporter: adminVendor, resolvedBy: adminVendor } }); }
export async function adminDeletePost(actorId: string, id: string) {
  return prisma.$transaction(async (tx) => { const post = await tx.feedPost.findUnique({ where: { id }, select: { id: true, salonId: true, branchId: true } }); if (!post) throw { status: 404, message: "Feed post not found" }; const deleted = await tx.feedPost.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date(), deletedBy: actorId } }); await tx.feedAdminAudit.create({ data: { actorId, action: "DELETE", targetType: "POST", targetId: id, salonId: post.salonId, branchId: post.branchId } }); return deleted; });
}
export async function adminDeleteStory(actorId: string, id: string) {
  return prisma.$transaction(async (tx) => { const story = await tx.feedStory.findUnique({ where: { id }, select: { id: true, salonId: true, branchId: true } }); if (!story) throw { status: 404, message: "Story not found" }; const deleted = await tx.feedStory.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date(), deletedBy: actorId } }); await tx.feedAdminAudit.create({ data: { actorId, action: "DELETE", targetType: "STORY", targetId: id, salonId: story.salonId, branchId: story.branchId } }); return deleted; });
}
export async function adminPostDetails(id: string) {
  const post = await prisma.feedPost.findUnique({ where: { id }, include: { media: true, vendor: adminVendor, staff: adminStaff, salon: adminSalon, branch: { select: { id: true, name: true, parentId: true } }, _count: { select: { likes: true, comments: true, views: true, shares: true, reports: true } } } });
  if (!post) throw { status: 404, message: "Feed post not found" };
  return ownership(post);
}
export async function adminStoryDetails(id: string) {
  const story = await prisma.feedStory.findUnique({ where: { id }, include: { media: true, vendor: adminVendor, staff: adminStaff, salon: adminSalon, branch: { select: { id: true, name: true, parentId: true } }, _count: { select: { views: true, reports: true } } } });
  if (!story) throw { status: 404, message: "Story not found" };
  return ownership(story);
}

export async function adminUpdatePost(actorId: string, id: string, input: any) {
  const post = await prisma.feedPost.findUnique({ where: { id }, select: { salonId: true, branchId: true } });
  if (!post) throw { status: 404, message: "Feed post not found" };
  const salonId = input.salonId ?? post.salonId;
  const branchId = input.branchId === undefined ? post.branchId : input.branchId;
  if (branchId) { const branch = await prisma.salon.findFirst({ where: { id: branchId, parentId: salonId }, select: { id: true } }); if (!branch) throw { status: 400, message: "Branch does not belong to salon" }; }
  const updated = await prisma.feedPost.update({ where: { id }, data: { ...(input.caption !== undefined ? { caption: cleanCaption(input.caption) } : {}), ...(input.status ? { status: adminStatus(input.status) as any } : {}), ...(input.visibility ? { visibility: input.visibility } : {}), ...(input.salonId ? { salonId } : {}), ...(input.branchId !== undefined ? { branchId } : {}) } });
  await prisma.feedAdminAudit.create({ data: { actorId, action: "UPDATE", targetType: "POST", targetId: id, salonId: updated.salonId, branchId: updated.branchId } });
  return adminPostDetails(id);
}
export async function adminUpdateStory(actorId: string, id: string, input: any) {
  const story = await prisma.feedStory.findUnique({ where: { id }, select: { salonId: true, branchId: true } });
  if (!story) throw { status: 404, message: "Story not found" };
  await prisma.feedStory.update({ where: { id }, data: { ...(input.caption !== undefined ? { caption: cleanCaption(input.caption) } : {}), ...(input.status ? { status: adminStatus(input.status) as any } : {}) } });
  await prisma.feedAdminAudit.create({ data: { actorId, action: "UPDATE", targetType: "STORY", targetId: id, salonId: story.salonId, branchId: story.branchId } });
  return adminStoryDetails(id);
}

const optionPage = async (finder: () => Promise<any[]>, counter: () => Promise<number>, query: any) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Number(query.limit) || 10);
  const [data, total] = await Promise.all([finder(), counter()]);
  return { data, pagination: pageInfo(page, limit, total) };
};
const optionWhere = (search?: string) => search ? { contains: search, mode: "insensitive" as const } : undefined;
const emptyOptionPage = (query: any) => ({ data: [], pagination: pageInfo(Number(query.page) || 1, Math.min(100, Number(query.limit) || 10), 0) });

export async function adminFilterOptions(type: string, query: any, validateHierarchy = true) {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Number(query.limit) || 10);
  const skip = (page - 1) * limit;
  const search = optionWhere(query.search);
  if (validateHierarchy && (query.countryId || query.cityId || query.vendorId || query.salonId || query.branchId || query.staffId)) {
    await assertAdminFilterHierarchy(query);
  }

  if (type === "countries") {
    const where = search ? { country: search } : {};
    return optionPage(
      () => prisma.address.findMany({ distinct: ["country"], where, orderBy: { country: "asc" }, skip, take: limit, select: { country: true } }).then(rows => rows.map(row => ({ id: row.country, name: row.country }))),
      () => prisma.address.groupBy({ by: ["country"], where, _count: true }).then(rows => rows.length),
      query,
    );
  }
  if (type === "cities") {
    const where = { ...(query.countryId ? { country: { equals: query.countryId, mode: "insensitive" as const } } : {}), ...(search ? { city: search } : {}) };
    return optionPage(
      () => prisma.address.findMany({ distinct: ["city", "country"], where, orderBy: [{ city: "asc" }, { country: "asc" }], skip, take: limit, select: { city: true, country: true } }).then(rows => rows.map(row => ({ id: row.city, name: row.city, countryId: row.country }))),
      () => prisma.address.groupBy({ by: ["city", "country"], where, _count: true }).then(rows => rows.length),
      query,
    );
  }
  if (type === "vendors") {
    const salonWhere = { parentId: null, ...addressFilter(query), ...(query.salonId ? { id: query.salonId } : {}) };
    const terms = query.search?.split(/\s+/).filter(Boolean) ?? [];
    const where: any = {
      ownedSalons: { some: salonWhere },
      ...(terms.length ? { AND: terms.map((term: string) => ({ OR: [{ firstName: optionWhere(term) }, { lastName: optionWhere(term) }, { email: optionWhere(term) }] })) } : {}),
    };
    return optionPage(
      () => prisma.user.findMany({ where, skip, take: limit, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: adminVendor.select }).then(rows => rows.map(row => ({ id: row.id, name: [row.firstName, row.lastName].filter(Boolean).join(" "), email: row.email }))),
      () => prisma.user.count({ where }),
      query,
    );
  }
  if (type === "salons") {
    const where: any = { parentId: null, ...(query.vendorId ? { ownerId: query.vendorId } : {}), ...addressFilter(query), ...(search ? { name: search } : {}) };
    return optionPage(
      () => prisma.salon.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, select: { id: true, name: true, ownerId: true, address: { select: { city: true, country: true } } } }).then(rows => rows.map(row => ({ id: row.id, name: row.name, vendorId: row.ownerId, cityId: row.address?.city ?? null, countryId: row.address?.country ?? null }))),
      () => prisma.salon.count({ where }),
      query,
    );
  }
  if (type === "branches") {
    if (!query.salonId) return emptyOptionPage(query);
    const where: any = { parentId: query.salonId, ...(search ? { name: search } : {}) };
    return optionPage(
      () => prisma.salon.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }).then(rows => rows.map(row => ({ id: row.id, name: row.name, salonId: row.parentId }))),
      () => prisma.salon.count({ where }),
      query,
    );
  }
  if (type === "staff") {
    if (!query.branchId) return emptyOptionPage(query);
    const terms = query.search?.split(/\s+/).filter(Boolean) ?? [];
    const where: any = {
      salonId: query.branchId,
      ...(terms.length ? { user: { is: { AND: terms.map((term: string) => ({ OR: [{ firstName: optionWhere(term) }, { lastName: optionWhere(term) }, { email: optionWhere(term) }] })) } } } : {}),
    };
    return optionPage(
      () => prisma.salonStaff.findMany({ where, skip, take: limit, orderBy: [{ user: { firstName: "asc" } }, { createdAt: "desc" }], include: { user: { select: { id: true, firstName: true, lastName: true } } } }).then(rows => rows.map(row => ({ id: row.id, name: [row.user.firstName, row.user.lastName].filter(Boolean).join(" "), branchId: row.salonId, userId: row.user.id }))),
      () => prisma.salonStaff.count({ where }),
      query,
    );
  }
  throw { status: 404, message: "Unknown filter type" };
}

export async function adminFilterMetadata(query: any) {
  const optionsQuery = { ...query, page: 1 };
  if (query.countryId || query.cityId || query.vendorId || query.salonId || query.branchId || query.staffId) {
    await assertAdminFilterHierarchy(query);
  }
  const [countries, cities, vendors, salons] = await Promise.all(["countries", "cities", "vendors", "salons"].map(type => adminFilterOptions(type, optionsQuery, false)));
  const [branches, staff] = await Promise.all([
    query.salonId ? adminFilterOptions("branches", optionsQuery, false) : Promise.resolve(emptyOptionPage(optionsQuery)),
    query.branchId ? adminFilterOptions("staff", optionsQuery, false) : Promise.resolve(emptyOptionPage(optionsQuery)),
  ]);
  return {
    countries: countries.data,
    cities: cities.data,
    vendors: vendors.data,
    salons: salons.data,
    branches: branches.data,
    staff: staff.data,
    statuses: [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }],
  };
}
