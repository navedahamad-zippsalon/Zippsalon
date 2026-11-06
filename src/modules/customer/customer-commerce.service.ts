import { AdvertisementActionType, AdvertisementDurationUnit, AdvertisementMediaType, AdvertisementStatus, AdvertisementTargetAudience, AdvertisementTargetingMode, BookingStatus, CouponDiscountType, Prisma, ReviewStatus, WalletTransactionStatus, WalletTransactionType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

const activeCouponWhere = (now = new Date()) => ({ isActive: true, startAt: { lte: now }, endAt: { gte: now } });
const couponInclude = { vendorAssignments: { include: { vendor: { select: { id: true, firstName: true, lastName: true, email: true } } } }, salonAssignments: { include: { salon: { select: { id: true, name: true, ownerId: true } } } }, branchAssignments: { include: { branch: { select: { id: true, name: true, parentId: true, ownerId: true } } } }, serviceAssignments: { include: { service: { select: { id: true, name: true, salonId: true } } } }, redemptions: { select: { id: true, customerId: true, bookingId: true, amount: true, redeemedAt: true } } };

const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
const couponAssignments = (coupon: any) => ({
  vendors: coupon.vendorAssignments?.map((item: any) => item.vendor) ?? [],
  salons: coupon.salonAssignments?.map((item: any) => item.salon) ?? [],
  branches: coupon.branchAssignments?.map((item: any) => item.branch) ?? [],
  services: coupon.serviceAssignments?.map((item: any) => item.service) ?? [],
});

async function validateCouponScope(ownerId: string, ownerType: "ADMIN" | "VENDOR", input: any) {
  const vendorIds = ids(input.vendorIds);
  const salonIds = ids(input.salonIds ?? (input.salonId ? [input.salonId] : []));
  const branchIds = ids(input.branchIds ?? (input.branchId ? [input.branchId] : []));
  const serviceIds = ids(input.serviceIds ?? (input.serviceId ? [input.serviceId] : []));
  if (ownerType === "VENDOR" && vendorIds.some((id) => id !== ownerId)) throw { status: 403, message: "A vendor may only assign its own coupons" };
  const effectiveVendorIds = ownerType === "VENDOR" ? [ownerId] : vendorIds;
  const [vendors, salons, branches, services] = await Promise.all([
    effectiveVendorIds.length ? prisma.user.findMany({ where: { id: { in: effectiveVendorIds }, roles: { some: { role: { name: "VENDOR" } } } }, select: { id: true } }) : Promise.resolve([]),
    salonIds.length ? prisma.salon.findMany({ where: { id: { in: salonIds } }, select: { id: true, ownerId: true, parentId: true } }) : Promise.resolve([]),
    branchIds.length ? prisma.salon.findMany({ where: { id: { in: branchIds } }, select: { id: true, ownerId: true, parentId: true } }) : Promise.resolve([]),
    serviceIds.length ? prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, salonId: true, salon: { select: { ownerId: true } } } }) : Promise.resolve([]),
  ]);
  if (vendors.length !== effectiveVendorIds.length || salons.length !== salonIds.length || branches.length !== branchIds.length || services.length !== serviceIds.length) throw { status: 400, message: "One or more coupon assignments do not exist" };
  const allowedVendors = new Set(effectiveVendorIds);
  if (effectiveVendorIds.length && salons.some((salon: any) => !allowedVendors.has(salon.ownerId))) throw { status: 400, message: "Selected salon does not belong to a selected vendor" };
  if (effectiveVendorIds.length && branches.some((branch: any) => !allowedVendors.has(branch.ownerId))) throw { status: 400, message: "Selected branch does not belong to a selected vendor" };
  if (effectiveVendorIds.length && services.some((service: any) => !allowedVendors.has(service.salon.ownerId))) throw { status: 400, message: "Selected service does not belong to a selected vendor" };
  if (ownerType === "VENDOR" && salons.some((salon: any) => salon.ownerId !== ownerId && !allowedVendors.has(salon.ownerId))) throw { status: 403, message: "Salon is outside your vendor scope" };
  if (ownerType === "VENDOR" && branches.some((branch: any) => branch.ownerId !== ownerId)) throw { status: 403, message: "Branch is outside your vendor scope" };
  const salonSet = new Set(salonIds);
  if (branches.some((branch: any) => !branch.parentId || (salonIds.length > 0 && !salonSet.has(branch.parentId)))) throw { status: 400, message: "Every branch must belong to a selected salon" };
  if (services.some((service: any) => salonIds.length > 0 && !salonSet.has(service.salonId))) throw { status: 400, message: "Every service must belong to a selected salon" };
  if (ownerType === "VENDOR" && services.some((service: any) => !salons.some((salon: any) => salon.id === service.salonId && salon.ownerId === ownerId))) throw { status: 403, message: "Service is outside your vendor scope" };
  return { vendorIds: effectiveVendorIds, salonIds, branchIds, serviceIds };
}

export async function listCoupons(customerId: string, salonId?: string, serviceId?: string, branchId?: string, amount?: number, vendorId?: string) {
  const now = new Date();
  if (salonId && !vendorId) vendorId = (await prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true, parent: { select: { ownerId: true } } } }))?.parent?.ownerId ?? (await prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true } }))?.ownerId;
  const coupons = await prisma.coupon.findMany({ where: { ...activeCouponWhere(now), ...(vendorId ? { OR: [{ ownerType: "ADMIN" }, { ownerId: vendorId, ownerType: "VENDOR" }, { vendorAssignments: { some: { vendorId } } }] } : {}) }, include: couponInclude, orderBy: { endAt: "asc" } });
  return coupons.filter((coupon: any) => isCouponApplicable(coupon, { salonId, branchId, serviceIds: serviceId ? [serviceId] : [], amount, vendorId })).map((coupon: any) => ({ ...coupon, assignments: couponAssignments(coupon), usageCount: coupon.redemptions.length }));
}

export async function validateCoupon(customerId: string, input: { code: string; salonId: string; branchId?: string; serviceIds?: string[]; amount: number; bookingAmount?: number; vendorId?: string }) {
  const amount = Number(input.amount ?? input.bookingAmount);
  if (!Number.isFinite(amount) || amount < 0) throw { status: 400, message: "A valid booking amount is required" };
  const contextSalon = await prisma.salon.findUnique({ where: { id: input.salonId }, select: { id: true, ownerId: true, parentId: true } });
  if (!contextSalon) throw { status: 400, code: "COUPON_NOT_APPLICABLE", message: "Salon is not valid" };
  const vendorId = input.vendorId ?? contextSalon.ownerId;
  if (input.branchId) { const branch = await prisma.salon.findUnique({ where: { id: input.branchId }, select: { parentId: true } }); if (!branch || branch.parentId !== input.salonId) throw { status: 400, code: "COUPON_NOT_APPLICABLE", message: "Branch does not belong to this salon" }; }
  if (input.serviceIds?.length) { const serviceCount = await prisma.service.count({ where: { id: { in: input.serviceIds }, salonId: input.salonId, isActive: true } }); if (serviceCount !== input.serviceIds.length) throw { status: 400, code: "COUPON_NOT_APPLICABLE", message: "Service does not belong to this salon" }; }
  const coupon = await prisma.coupon.findFirst({ where: { code: String(input.code).trim().toUpperCase(), ...activeCouponWhere() }, include: couponInclude });
  if (!coupon || !isCouponApplicable(coupon, { ...input, amount, vendorId })) throw { status: 400, code: "COUPON_NOT_APPLICABLE", message: "Coupon is not applicable" };
  if (amount < coupon.minimumOrderAmount) throw { status: 400, code: "COUPON_MINIMUM_NOT_MET", message: "Booking amount is below the coupon minimum" };
  const [usage, customerUsage] = await Promise.all([prisma.couponRedemption.count({ where: { couponId: coupon.id } }), prisma.couponRedemption.count({ where: { couponId: coupon.id, customerId } })]);
  if (coupon.usageLimit !== null && usage >= coupon.usageLimit) throw { status: 400, code: "COUPON_USAGE_LIMIT", message: "Coupon usage limit reached" };
  if (coupon.usagePerCustomer !== null && customerUsage >= coupon.usagePerCustomer) throw { status: 400, code: "COUPON_CUSTOMER_LIMIT", message: "Coupon usage limit reached for this customer" };
  const raw = coupon.discountType === CouponDiscountType.PERCENTAGE ? amount * coupon.discountValue / 100 : coupon.discountValue;
  const discount = Math.min(raw, coupon.maximumDiscount ?? raw, amount);
  return { coupon: { id: coupon.id, code: coupon.code, title: coupon.title, discountType: coupon.discountType, discountValue: coupon.discountValue }, subtotal: amount, originalAmount: amount, discount, discountAmount: discount, total: amount - discount, finalAmount: amount - discount };
}

function isCouponApplicable(coupon: any, context: { salonId?: string; branchId?: string; serviceIds?: string[]; amount?: number; vendorId?: string }) {
  const vendors = coupon.vendorAssignments?.map((item: any) => item.vendorId) ?? [];
  const salons = coupon.salonAssignments?.map((item: any) => item.salonId) ?? [];
  const branches = coupon.branchAssignments?.map((item: any) => item.branchId) ?? [];
  const services = coupon.serviceAssignments?.map((item: any) => item.serviceId) ?? [];
  if (vendors.length && context.vendorId && !vendors.includes(context.vendorId)) return false;
  if (coupon.ownerType === "VENDOR" && (!context.vendorId || (coupon.ownerId !== context.vendorId && !vendors.includes(context.vendorId)))) return false;
  if (salons.length && (!context.salonId || !salons.includes(context.salonId))) return false;
  if (coupon.salonId && coupon.salonId !== context.salonId) return false;
  if (branches.length && (!context.branchId || !branches.includes(context.branchId))) return false;
  if (coupon.branchId && coupon.branchId !== context.branchId) return false;
  const requestedServices = context.serviceIds ?? [];
  if (services.length && !services.some((id: string) => requestedServices.includes(id))) return false;
  if (coupon.serviceId && !requestedServices.includes(coupon.serviceId)) return false;
  return true;
}

export async function createReview(customerId: string, input: { bookingId: string; rating: number; comment?: string; staffId?: string }) {
  const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, customerId, status: BookingStatus.DONE as never }, select: { id: true, salonId: true, branchId: true, staffId: true } });
  if (!booking) throw { status: 403, code: "REVIEW_BOOKING_REQUIRED", message: "Only completed bookings can be reviewed" };
  if (input.staffId && input.staffId !== booking.staffId) throw { status: 400, message: "Staff member was not part of this booking" };
  return prisma.review.create({ data: { customerId, bookingId: booking.id, salonId: booking.salonId, branchId: booking.branchId, staffId: input.staffId ?? booking.staffId, rating: input.rating, comment: input.comment, status: ReviewStatus.PUBLISHED } });
}

export async function reviewsForSalon(salonId: string) { return prisma.review.findMany({ where: { salonId, status: ReviewStatus.PUBLISHED }, orderBy: { createdAt: "desc" }, include: { customer: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { firstName: true, lastName: true } } } } } }); }
export async function reviewsForStaff(staffId: string) { return prisma.review.findMany({ where: { staffId, status: ReviewStatus.PUBLISHED }, orderBy: { createdAt: "desc" }, include: { customer: { select: { id: true, firstName: true, lastName: true } } } }); }
export async function updateReview(customerId: string, id: string, input: { rating?: number; comment?: string }) { const result = await prisma.review.updateMany({ where: { id, customerId }, data: input }); if (!result.count) throw { status: 404, message: "Review not found" }; return prisma.review.findUnique({ where: { id } }); }
export async function deleteReview(customerId: string, id: string) { const result = await prisma.review.updateMany({ where: { id, customerId }, data: { status: ReviewStatus.DELETED } }); if (!result.count) throw { status: 404, message: "Review not found" }; return { deleted: true }; }

export async function wallet(customerId: string) { return prisma.customerWallet.findUnique({ where: { customerId }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } } }); }
export async function walletTransactions(customerId: string) { return prisma.walletTransaction.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 100 }); }

export async function referral(customerId: string) { return prisma.customerReferral.findMany({ where: { OR: [{ referrerCustomerId: customerId }, { referredCustomerId: customerId }] }, orderBy: { createdAt: "desc" } }); }
export async function createReferral(customerId: string) { const config = await prisma.referralConfig.findFirst({ orderBy: { createdAt: "desc" } }); if (!config?.campaignActive) throw { status: 400, code: "REFERRAL_CAMPAIGN_INACTIVE", message: "Referral campaign is inactive" }; return prisma.customerReferral.create({ data: { referrerCustomerId: customerId, referralCode: `${customerId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, rewardAmount: config.rewardAmount } }); }
export async function validateReferral(code: string) { const referral = await prisma.customerReferral.findUnique({ where: { referralCode: code.trim().toUpperCase() } }); if (!referral) throw { status: 404, message: "Referral code not found" }; return referral; }
export async function applyReferral(customerId: string, code: string) { const config = await prisma.referralConfig.findFirst({ orderBy: { createdAt: "desc" } }); const referral = await prisma.customerReferral.findUnique({ where: { referralCode: code.trim().toUpperCase() } }); if (!config?.campaignActive || !referral || referral.referrerCustomerId === customerId || referral.referredCustomerId || config.rewardAmount <= 0) throw { status: 400, message: "Referral code cannot be applied" }; return prisma.$transaction(async (tx) => { const updated = await tx.customerReferral.update({ where: { id: referral.id }, data: { referredCustomerId: customerId, status: "REWARDED", rewardAmount: config.rewardAmount, rewardStatus: "PAID" } }); for (const recipientId of [referral.referrerCustomerId, customerId]) { const wallet = await tx.customerWallet.upsert({ where: { customerId: recipientId }, update: { balance: { increment: config.rewardAmount } }, create: { customerId: recipientId, balance: config.rewardAmount } }); await tx.walletTransaction.create({ data: { walletId: wallet.id, customerId: recipientId, amount: config.rewardAmount, type: "REFERRAL_REWARD", referenceType: "CustomerReferral", referenceId: referral.id, description: "Referral reward", status: "COMPLETED" } }); } return updated; }); }

const advertisementInclude = { salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, service: { select: { id: true, name: true, basePrice: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } };
const advertisementAdminInclude = { ...advertisementInclude, pincodes: { select: { pincode: true }, orderBy: { pincode: "asc" as const } } };
const advertisementHasExpired = (status: AdvertisementStatus, endAt: Date | null, now: Date) =>
  (status === AdvertisementStatus.ACTIVE || status === AdvertisementStatus.SCHEDULED) && endAt !== null && endAt <= now;
const advertisementHasStarted = (startAt: Date | null, now: Date) => startAt === null || startAt <= now;
const advertisementStatusAt = (status: AdvertisementStatus, startAt: Date | null, endAt: Date | null, now: Date) => {
  if (status !== AdvertisementStatus.ACTIVE && status !== AdvertisementStatus.SCHEDULED) return status;
  if (advertisementHasExpired(status, endAt, now)) return AdvertisementStatus.EXPIRED;
  return advertisementHasStarted(startAt, now) ? AdvertisementStatus.ACTIVE : AdvertisementStatus.SCHEDULED;
};

const advertisementAdminView = <T extends { status: AdvertisementStatus; startAt: Date | null; endAt: Date | null; targetingMode: AdvertisementTargetingMode }>(advertisement: T, now = new Date()) => ({
  ...advertisement,
  status: advertisementStatusAt(advertisement.status, advertisement.startAt, advertisement.endAt, now),
  targetType: advertisement.targetingMode,
  targetPincodes: "pincodes" in advertisement && Array.isArray(advertisement.pincodes)
    ? advertisement.pincodes.map((item: { pincode: string }) => item.pincode)
    : [],
});

export function calculateAdvertisementEndAt(startAt: Date, durationValue: number, durationUnit: AdvertisementDurationUnit): Date {
  if (!Number.isInteger(durationValue) || durationValue <= 0 || Number.isNaN(startAt.getTime())) {
    throw { status: 400, message: "A valid start date and positive integer duration are required" };
  }
  const endAt = new Date(startAt);
  if (durationUnit === AdvertisementDurationUnit.DAYS) {
    endAt.setUTCDate(endAt.getUTCDate() + durationValue);
    return endAt;
  }

  const dayOfMonth = endAt.getUTCDate();
  endAt.setUTCDate(1);
  if (durationUnit === AdvertisementDurationUnit.MONTHS) endAt.setUTCMonth(endAt.getUTCMonth() + durationValue);
  else endAt.setUTCFullYear(endAt.getUTCFullYear() + durationValue);
  const lastDayOfTargetMonth = new Date(Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth() + 1, 0)).getUTCDate();
  endAt.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return endAt;
}

const audienceFromLegacy = (targetType?: string | null): AdvertisementTargetAudience => {
  if (targetType?.toUpperCase().includes("CUSTOMER")) return AdvertisementTargetAudience.CUSTOMER;
  if (targetType?.toUpperCase().includes("VENDOR")) return AdvertisementTargetAudience.VENDOR;
  return AdvertisementTargetAudience.BOTH;
};

const advertisementData = (input: any, ownerId: string, existing?: any) => {
  const mediaUrl = input.mediaUrl !== undefined ? input.mediaUrl : (input.mediaUrl ?? input.media ?? input.image ?? existing?.mediaUrl ?? existing?.media ?? existing?.image ?? null);
  const mediaType = input.mediaType ?? existing?.mediaType ?? (mediaUrl ? AdvertisementMediaType.IMAGE : AdvertisementMediaType.TEXT);
  const actionEnabled = input.actionEnabled ?? existing?.actionEnabled ?? Boolean(input.actionUrl ?? input.ctaText ?? existing?.actionUrl ?? existing?.ctaText);
  const actionButtonName = input.actionButtonName !== undefined ? input.actionButtonName : (input.ctaText ?? existing?.actionButtonName ?? existing?.ctaText ?? null);
  const actionUrl = input.actionUrl !== undefined ? input.actionUrl : (input.targetId ?? existing?.actionUrl ?? existing?.targetId ?? null);
  const actionType = input.actionType ?? existing?.actionType ?? (actionUrl ? AdvertisementActionType.URL : AdvertisementActionType.NONE);
  const legacyAudience = input.targetType === "ALL" || input.targetType === "PINCODE" ? existing?.targetAudience : input.targetType;
  const targetAudience = input.targetAudience ?? existing?.targetAudience ?? audienceFromLegacy(legacyAudience ?? existing?.targetType);
  const displayOrder = input.displayOrder ?? input.priority ?? existing?.displayOrder ?? existing?.priority ?? 0;
  const targetingMode = input.targetingMode ?? (input.targetType === "ALL" || input.targetType === "PINCODE" ? input.targetType : existing?.targetingMode ?? AdvertisementTargetingMode.ALL);
  const durationValue = input.durationValue ?? existing?.durationValue ?? null;
  const durationUnit = input.durationUnit ?? existing?.durationUnit ?? null;
  let startAt = input.startAt !== undefined ? (input.startAt ? new Date(input.startAt) : null) : existing?.startAt ?? null;
  let endAt: Date | null;
  if (durationValue !== null && durationUnit) {
    if (!startAt) startAt = new Date();
    endAt = calculateAdvertisementEndAt(startAt, Number(durationValue), durationUnit);
  } else {
    endAt = input.endAt !== undefined ? (input.endAt ? new Date(input.endAt) : null) : existing?.endAt ?? null;
  }
  return {
    title: input.title ?? existing?.title,
    description: input.description !== undefined ? input.description : existing?.description,
    mediaType,
    mediaUrl,
    thumbnailUrl: input.thumbnailUrl !== undefined ? input.thumbnailUrl : existing?.thumbnailUrl ?? null,
    actionEnabled: Boolean(actionEnabled),
    actionButtonName,
    actionType,
    actionUrl,
    targetAudience,
    status: input.status ?? existing?.status ?? AdvertisementStatus.DRAFT,
    startAt,
    endAt,
    targetingMode,
    durationValue,
    durationUnit,
    displayOrder: Number(displayOrder),
    image: input.image ?? existing?.image ?? mediaUrl,
    media: input.media ?? existing?.media ?? mediaUrl,
    targetType: targetingMode === AdvertisementTargetingMode.PINCODE || targetingMode === AdvertisementTargetingMode.ALL
      ? targetingMode
      : input.targetType ?? existing?.targetType ?? targetAudience,
    targetId: input.targetId ?? existing?.targetId ?? null,
    salonId: input.salonId !== undefined ? input.salonId : existing?.salonId ?? null,
    branchId: input.branchId !== undefined ? input.branchId : existing?.branchId ?? null,
    serviceId: input.serviceId !== undefined ? input.serviceId : existing?.serviceId ?? null,
    ctaText: actionButtonName,
    priority: Number(displayOrder),
    ...(existing ? { updatedById: ownerId } : { createdById: ownerId }),
  };
};

const validateAdvertisementBusinessRules = (data: any) => {
  if ((data.durationValue == null) !== (data.durationUnit == null)) throw { status: 400, message: "durationValue and durationUnit must be provided together" };
  if (data.durationValue != null && (!Number.isInteger(data.durationValue) || data.durationValue <= 0)) throw { status: 400, message: "durationValue must be a positive integer" };
  if ([AdvertisementMediaType.IMAGE, AdvertisementMediaType.VIDEO].includes(data.mediaType) && !data.mediaUrl) throw { status: 400, message: "mediaUrl is required for image and video advertisements" };
  if (data.actionEnabled && (!data.actionButtonName || data.actionType === AdvertisementActionType.NONE || !data.actionUrl)) throw { status: 400, message: "Action button name, action type, and action URL are required when actionEnabled is true" };
  if (data.startAt && data.endAt && data.startAt >= data.endAt) throw { status: 400, message: "endAt must be after startAt" };
};

export async function advertisements(audience: "CUSTOMER" | "VENDOR" = "CUSTOMER", userId?: string) {
  const now = new Date();
  const [customerAddress, vendorLocations] = userId ? await Promise.all([
    audience === "CUSTOMER"
      ? prisma.customerAddress.findFirst({ where: { customerId: userId, isDefault: true }, select: { postalCode: true }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve(null),
    audience === "VENDOR"
      ? prisma.salon.findMany({ where: { ownerId: userId }, select: { address: { select: { pincode: true } } } })
      : Promise.resolve([]),
  ]) : [null, []];
  const postalCodes = [...new Set([
    ...(customerAddress?.postalCode ? [customerAddress.postalCode.trim()] : []),
    ...vendorLocations.map((salon: any) => salon.address?.pincode?.trim()).filter(Boolean),
  ])];
  return prisma.advertisement.findMany({
    where: {
      deletedAt: null,
      status: { in: [AdvertisementStatus.ACTIVE, AdvertisementStatus.SCHEDULED] },
      targetAudience: { in: [audience as AdvertisementTargetAudience, AdvertisementTargetAudience.BOTH] },
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        { OR: [{ targetingMode: AdvertisementTargetingMode.ALL }, ...(postalCodes.length ? [{ targetingMode: AdvertisementTargetingMode.PINCODE, pincodes: { some: { pincode: { in: postalCodes } } } }] : [])] },
      ],
    },
    orderBy: [{ displayOrder: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: advertisementInclude,
  });
}

export async function listAddresses(customerId: string) { return prisma.customerAddress.findMany({ where: { customerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }); }
export async function createAddress(customerId: string, input: any) { return prisma.$transaction(async (tx) => { if (input.isDefault) await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } }); return tx.customerAddress.create({ data: { ...input, customerId } }); }); }
export async function updateAddress(customerId: string, id: string, input: any) { return prisma.$transaction(async (tx) => { if (input.isDefault) await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } }); const result = await tx.customerAddress.updateMany({ where: { id, customerId }, data: input }); if (!result.count) throw { status: 404, message: "Address not found" }; return tx.customerAddress.findUnique({ where: { id } }); }); }
export async function deleteAddress(customerId: string, id: string) { const result = await prisma.customerAddress.deleteMany({ where: { id, customerId } }); if (!result.count) throw { status: 404, message: "Address not found" }; return { deleted: true }; }
export async function setDefaultAddress(customerId: string, id: string) { return prisma.$transaction(async (tx) => { await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } }); const result = await tx.customerAddress.updateMany({ where: { id, customerId }, data: { isDefault: true } }); if (!result.count) throw { status: 404, message: "Address not found" }; return tx.customerAddress.findUnique({ where: { id } }); }); }

export async function creditWallet(customerId: string, amount: number, type: WalletTransactionType, description: string, referenceId?: string) { if (!(amount > 0)) throw { status: 400, message: "Amount must be positive" }; return prisma.$transaction(async (tx) => { const wallet = await tx.customerWallet.upsert({ where: { customerId }, update: { balance: { increment: amount } }, create: { customerId, balance: amount } }); return tx.walletTransaction.create({ data: { walletId: wallet.id, customerId, amount, type, description, referenceId, status: WalletTransactionStatus.COMPLETED } }); }); }

export async function listOwnedCoupons(ownerId?: string, ownerType?: "ADMIN" | "VENDOR", query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const and: any[] = [];
  const where: any = ownerType === "ADMIN" ? {} : { ownerId, ownerType: "VENDOR" };
  if (query.search) and.push({ OR: [{ code: { contains: String(query.search).trim().toUpperCase(), mode: "insensitive" } }, { title: { contains: String(query.search), mode: "insensitive" } }] });
  if (query.status === "ACTIVE") where.isActive = true;
  if (query.status === "INACTIVE" || query.status === "ARCHIVED") where.isActive = false;
  if (query.discountType) where.discountType = query.discountType;
  if (query.vendorId) and.push({ OR: [{ ownerId: query.vendorId }, { vendorAssignments: { some: { vendorId: query.vendorId } } }] });
  if (query.salonId) and.push({ OR: [{ salonId: query.salonId }, { salonAssignments: { some: { salonId: query.salonId } } }] });
  if (query.branchId) and.push({ OR: [{ branchId: query.branchId }, { branchAssignments: { some: { branchId: query.branchId } } }] });
  if (query.startDate) where.startAt = { gte: new Date(query.startDate) };
  if (query.endDate || query.expiryDate) where.endAt = { lte: new Date(query.endDate ?? query.expiryDate) };
  if (query.expired === "true" || query.expired === true) where.endAt = { lt: new Date() };
  if (and.length) where.AND = and;
  const [items, total] = await Promise.all([prisma.coupon.findMany({ where, include: couponInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.coupon.count({ where })]);
  const mapped = items.map((coupon: any) => ({ ...coupon, assignments: couponAssignments(coupon), usageCount: coupon.redemptions.length }));
  return query.page || query.limit ? { items: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } : mapped;
}
export async function saveCoupon(ownerId: string, ownerType: "ADMIN" | "VENDOR", input: any, id?: string) {
  const discountValue = Number(input.discountValue); const minimum = Number(input.minimumOrderAmount ?? 0); const maximum = input.maximumDiscount == null ? null : Number(input.maximumDiscount); const usageLimit = input.usageLimit == null ? null : Number(input.usageLimit); const perCustomer = input.usagePerCustomer == null ? null : Number(input.usagePerCustomer); const startAt = new Date(input.startAt); const endAt = new Date(input.endAt);
  if (!input.code || !input.title || !Object.values(CouponDiscountType).includes(input.discountType) || !Number.isFinite(discountValue) || discountValue <= 0 || (input.discountType === CouponDiscountType.PERCENTAGE && discountValue > 100) || minimum < 0 || (maximum !== null && (maximum < 0 || !Number.isFinite(maximum))) || (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 0)) || (perCustomer !== null && (!Number.isInteger(perCustomer) || perCustomer < 0)) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt > endAt) throw { status: 400, message: "Invalid coupon data" };
  const assignments = await validateCouponScope(ownerId, ownerType, input); const existing = id ? await prisma.coupon.findUnique({ where: { id }, include: { redemptions: { select: { id: true } } } }) : null;
  if (id && (!existing || (ownerType === "VENDOR" && existing.ownerId !== ownerId))) throw { status: 404, message: "Coupon not found" };
  if (input.isActive && endAt < new Date()) throw { status: 400, message: "Expired coupons cannot be activated" };
  const data = { code: String(input.code).trim().toUpperCase(), title: input.title, description: input.description, ownerType: existing?.ownerType ?? ownerType, ownerId: existing?.ownerId ?? ownerId, salonId: assignments.salonIds.length === 1 ? assignments.salonIds[0] : null, branchId: assignments.branchIds.length === 1 ? assignments.branchIds[0] : null, serviceId: assignments.serviceIds.length === 1 ? assignments.serviceIds[0] : null, discountType: input.discountType, discountValue, minimumOrderAmount: minimum, maximumDiscount: maximum, usageLimit, usagePerCustomer: perCustomer, startAt, endAt, isActive: Boolean(input.isActive) };
  const coupon = await prisma.$transaction(async (tx) => { const saved = id ? await tx.coupon.update({ where: { id }, data }) : await tx.coupon.create({ data }); await tx.couponVendor.deleteMany({ where: { couponId: saved.id } }); await tx.couponSalon.deleteMany({ where: { couponId: saved.id } }); await tx.couponBranch.deleteMany({ where: { couponId: saved.id } }); await tx.couponService.deleteMany({ where: { couponId: saved.id } }); if (assignments.vendorIds.length) await tx.couponVendor.createMany({ data: assignments.vendorIds.map((vendorId) => ({ couponId: saved.id, vendorId })) }); if (assignments.salonIds.length) await tx.couponSalon.createMany({ data: assignments.salonIds.map((salonId) => ({ couponId: saved.id, salonId })) }); if (assignments.branchIds.length) await tx.couponBranch.createMany({ data: assignments.branchIds.map((branchId) => ({ couponId: saved.id, branchId })) }); if (assignments.serviceIds.length) await tx.couponService.createMany({ data: assignments.serviceIds.map((serviceId) => ({ couponId: saved.id, serviceId })) }); return saved; });
  return prisma.coupon.findUnique({ where: { id: coupon.id }, include: couponInclude });
}
export async function setCouponStatus(ownerId: string | undefined, id: string, isActive: boolean, ownerType: "ADMIN" | "VENDOR" = "VENDOR") { const coupon = await prisma.coupon.findFirst({ where: { id, ...(ownerType === "VENDOR" ? { ownerId, ownerType: "VENDOR" } : {}) } }); if (!coupon) throw { status: 404, message: "Coupon not found" }; if (isActive && coupon.endAt < new Date()) throw { status: 400, message: "Expired coupons cannot be activated" }; return prisma.coupon.update({ where: { id }, data: { isActive } }); }
export async function deleteCoupon(ownerId: string | undefined, id: string, ownerType: "ADMIN" | "VENDOR" = "VENDOR") { await setCouponStatus(ownerId, id, false, ownerType); return { archived: true }; }
export async function listOwnedAdvertisements(_ownerId: string, query: any = {}) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit ?? query.pageSize) || 20));
  const now = new Date();
  const and: any[] = [];
  const requestedTargetType = String(query.targetType ?? "").toUpperCase();
  const requestedTargetingMode = query.targetingMode ?? (requestedTargetType === "ALL" || requestedTargetType === "PINCODE" ? requestedTargetType : undefined);
  const requestedAudience = query.targetAudience ?? (["CUSTOMER", "CUSTOMERS", "VENDOR", "VENDORS", "BOTH"].includes(requestedTargetType)
    ? requestedTargetType.replace(/S$/, "")
    : undefined);

  if (query.status === "EXPIRED") {
    and.push({ OR: [{ status: AdvertisementStatus.EXPIRED }, { status: { in: [AdvertisementStatus.ACTIVE, AdvertisementStatus.SCHEDULED] }, endAt: { lte: now } }] });
  } else if (query.status === "SCHEDULED") {
    and.push({ OR: [
      { status: AdvertisementStatus.SCHEDULED, startAt: { gt: now }, OR: [{ endAt: null }, { endAt: { gt: now } }] },
      { status: AdvertisementStatus.ACTIVE, startAt: { gt: now }, OR: [{ endAt: null }, { endAt: { gt: now } }] },
    ] });
  } else if (query.status === "ACTIVE") {
    and.push({
      status: { in: [AdvertisementStatus.ACTIVE, AdvertisementStatus.SCHEDULED] },
      AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }],
    });
  } else if (query.status) {
    and.push({ status: query.status });
  }

  if (requestedAudience) and.push({ targetAudience: requestedAudience });
  if (requestedTargetingMode) and.push({ targetingMode: requestedTargetingMode });
  if (query.mediaType ?? query.type) and.push({ mediaType: query.mediaType ?? query.type });
  if (query.pincode) and.push({ pincodes: { some: { pincode: query.pincode } } });
  if (query.startDate) and.push({ startAt: { gte: new Date(query.startDate) } });
  if (query.endDate) and.push({ endAt: { lte: new Date(query.endDate) } });
  if (query.search) {
    const search = String(query.search).trim();
    const mediaTypeSearch = Object.values(AdvertisementMediaType).includes(search.toUpperCase() as AdvertisementMediaType)
      ? [{ mediaType: search.toUpperCase() }]
      : [];
    const idSearch = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search)
      ? [{ id: search }]
      : [];
    and.push({ OR: [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { targetType: { contains: search, mode: "insensitive" } },
      { pincodes: { some: { pincode: { contains: search } } } },
      ...idSearch,
      ...mediaTypeSearch,
    ] });
  }
  const where: any = { deletedAt: null, ...(and.length ? { AND: and } : {}) };
  const sortOrder: Prisma.SortOrder = query.sortOrder === "desc" ? "desc" : "asc";
  const orderBy: Prisma.AdvertisementOrderByWithRelationInput[] = [];
  switch (query.sortBy) {
    case "createdAt": orderBy.push({ createdAt: sortOrder }); break;
    case "updatedAt": orderBy.push({ updatedAt: sortOrder }); break;
    case "startAt": orderBy.push({ startAt: sortOrder }); break;
    case "endAt": orderBy.push({ endAt: sortOrder }); break;
    case "title": orderBy.push({ title: sortOrder }); break;
    case "status": orderBy.push({ status: sortOrder }); break;
    case "displayOrder": orderBy.push({ displayOrder: sortOrder }); break;
    default: orderBy.push({ displayOrder: "asc" });
  }
  if (query.sortBy !== "createdAt") orderBy.push({ createdAt: "desc" });
  const [items, total] = await Promise.all([prisma.advertisement.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: advertisementAdminInclude }), prisma.advertisement.count({ where })]);
  return { items: items.map((item) => advertisementAdminView(item, now)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
}
export async function getAdvertisement(id: string) {
  const advertisement = await prisma.advertisement.findUnique({ where: { id }, include: advertisementAdminInclude });
  if (!advertisement) throw { status: 404, message: "Advertisement not found" };
  return advertisementAdminView(advertisement);
}
export async function saveAdvertisement(ownerId: string, input: any, id?: string) {
  const existing = id ? await prisma.advertisement.findUnique({ where: { id }, include: { pincodes: { select: { pincode: true } } } }) : undefined;
  if (id && !existing) throw { status: 404, message: "Advertisement not found" };
  const data = advertisementData(input, ownerId, existing);
  validateAdvertisementBusinessRules(data);
  const mode = data.targetingMode as AdvertisementTargetingMode;
  const requestedPincodes = input.pincodes === undefined ? existing?.pincodes?.map((item: any) => item.pincode) ?? [] : [...new Set(input.pincodes.map((value: string) => value.trim()))];
  if (mode === AdvertisementTargetingMode.PINCODE && (!requestedPincodes.length || requestedPincodes.some((value: string) => !/^\d{6}$/.test(value)))) {
    throw { status: 400, message: "PINCODE targeting requires one or more valid six-digit pincodes" };
  }
  const relationUpdate = { deleteMany: {}, ...(mode === AdvertisementTargetingMode.PINCODE ? { create: requestedPincodes.map((pincode: string) => ({ pincode })) } : {}) };
  const saved = await prisma.$transaction(async (tx) => id
    ? tx.advertisement.update({ where: { id }, data: { ...data, pincodes: relationUpdate } })
    : tx.advertisement.create({ data: { ...data, createdById: ownerId, pincodes: mode === AdvertisementTargetingMode.PINCODE ? { create: requestedPincodes.map((pincode: string) => ({ pincode })) } : undefined } }));
  return getAdvertisement(saved.id);
}
export async function setAdvertisementStatus(ownerId: string, id: string, status: AdvertisementStatus) {
  const result = await prisma.advertisement.update({ where: { id }, data: { status, updatedById: ownerId } });
  return getAdvertisement(result.id);
}
export async function deleteAdvertisement(ownerId: string, id: string) { const result = await prisma.advertisement.update({ where: { id }, data: { status: AdvertisementStatus.ARCHIVED, deletedAt: new Date(), updatedById: ownerId } }); return result; }
export async function reorderAdvertisements(ownerId: string, items: Array<{ id: string; displayOrder: number }>) { return prisma.$transaction(items.map((item) => prisma.advertisement.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder, priority: item.displayOrder, updatedById: ownerId } }))); }
