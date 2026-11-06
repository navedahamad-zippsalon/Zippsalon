import { Request, Response, NextFunction } from "express";
import { BookingMedium } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { getUserPermissions, getMenus } from "../rbac/rbac.service";
import { bookingService } from "../booking/booking.service";
import * as commerce from "./customer-commerce.service";

const userId = (req: Request) => (req as any).user.userId as string;
const send = (res: Response, data: unknown) => res.json({ success: true, data });
const allowedSalons = async (id: string) => prisma.salonCustomer.findMany({ where: { userId: id, salon: { isActive: true } }, select: { salonId: true, salon: { select: { id: true, name: true, parentId: true, ownerId: true, address: true } } } });
const requestedSalon = async (id: string, salonId?: string) => {
  const mappings = await allowedSalons(id);
  const selected = salonId ? mappings.find((item) => item.salonId === salonId) : mappings[0];
  if (!selected) throw { status: 403, message: "You are not associated with this salon." };
  return selected.salon;
};

const publicSalonSelect = {
  id: true, name: true, description: true, ownerId: true, parentId: true, timings: true, isActive: true,
  address: true, images: true, contacts: true,
} as const;
const publicStaffSelect = {
  id: true, salonId: true, role: true, isActive: true,
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;
const serviceSelect = {
  id: true, salonId: true, name: true, description: true, basePrice: true, baseDuration: true, isActive: true,
  category: { select: { id: true, name: true } }, images: { select: { id: true, url: true } },
} as const;
const fullName = (user: { firstName: string; lastName: string | null }) => `${user.firstName} ${user.lastName ?? ""}`.trim();
const salonView = (salon: any) => ({
  ...salon,
  logo: salon.images?.[0]?.url ?? null,
  coverImage: salon.images?.[0]?.url ?? null,
  city: salon.address?.city ?? null,
  phone: salon.contacts?.find((contact: any) => contact.isPrimary)?.phone ?? salon.contacts?.[0]?.phone ?? null,
  whatsapp: salon.contacts?.find((contact: any) => contact.isWhatsapp)?.phone ?? null,
  website: null,
  rating: null,
  reviewCount: 0,
  isOpen: salon.isActive,
});
const bookingView = (booking: any) => ({
  id: booking.id,
  bookingNumber: booking.id,
  medium: booking.medium,
  salon: booking.salon ? { id: booking.salon.id, name: booking.salon.name, image: booking.salon.images?.[0]?.url ?? null } : null,
  branch: booking.branch ? { id: booking.branch.id, name: booking.branch.name } : null,
  services: booking.services.map((item: any) => ({ id: item.serviceId ?? item.comboId, name: item.name, price: item.price, duration: item.service?.baseDuration ?? item.combo?.duration ?? null })),
  staff: booking.staff ? { id: booking.staff.id, name: fullName(booking.staff.user), image: null } : null,
  bookingDate: booking.bookingDate, startTime: booking.bookingDate, endTime: booking.bookingDate,
  subtotal: booking.totalAmount, discount: booking.discountAmount, tax: booking.totalTaxAmount, total: booking.finalAmount,
  paymentStatus: booking.payments?.some((payment: any) => payment.status === "COMPLETED") ? "COMPLETED" : "PENDING",
  bookingStatus: booking.status,
});

export async function home(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = userId(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const city = req.query.city ? String(req.query.city) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const salonWhere: any = { isActive: true, ...(city ? { address: { city: { equals: city, mode: "insensitive" } } } : {}), ...(category ? { services: { some: { isActive: true, OR: [{ categoryId: category }, { category: { name: { equals: category, mode: "insensitive" } } }] } } } : {}) };
    if (search) salonWhere.OR = [{ name: { contains: search, mode: "insensitive" } }, { address: { city: { contains: search, mode: "insensitive" } } }];
    const [customer, nextBooking, categories, salons, posts, stories, favorites, upcomingBookings, pastBookings, cancelledBookings, advertisements, offers] = await Promise.all([
      prisma.user.findUnique({ where: { id: customerId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true } }),
      prisma.booking.findFirst({ where: { customerId, bookingDate: { gte: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, orderBy: { bookingDate: "asc" }, include: { salon: { include: { images: true } }, branch: true, staff: { include: { user: true } }, services: { include: { service: true, combo: true } }, payments: true } }),
      prisma.serviceCategory.findMany({ where: { isActive: true, services: { some: { isActive: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.salon.findMany({ where: salonWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: publicSalonSelect }),
      prisma.feedPost.findMany({ where: { status: "PUBLISHED", ...(search ? { caption: { contains: search, mode: "insensitive" } } : {}) }, orderBy: { createdAt: "desc" }, take: limit, include: { media: true, vendor: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, likes: { where: { userId: customerId }, select: { id: true } }, _count: { select: { likes: true, comments: true, shares: true } } } }),
      prisma.feedStory.findMany({ where: { status: "PUBLISHED", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: limit, include: { media: true, vendor: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, views: { where: { userId: customerId }, select: { id: true } } } }),
      prisma.customerFavoriteSalon.count({ where: { customerId } }),
      prisma.booking.count({ where: { customerId, bookingDate: { gte: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } }),
      prisma.booking.count({ where: { customerId, bookingDate: { lt: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } }),
      prisma.booking.count({ where: { customerId, status: { in: ["CANCELLED", "NO_SHOW"] } } }),
      commerce.advertisements("CUSTOMER", customerId),
      commerce.listCoupons(customerId),
    ]);
    const customerWallet = await commerce.wallet(customerId); const referrals = await commerce.referral(customerId);
    return res.json({ success: true, data: { customer, location: { city: city ?? null, latitude: req.query.lat ? Number(req.query.lat) : null, longitude: req.query.lng ? Number(req.query.lng) : null, radius: req.query.radius ? Number(req.query.radius) : null }, nextBooking: nextBooking ? bookingView(nextBooking) : null, categories, advertisements, offers, vendorStories: stories.filter((story: any) => !story.staffId), staffStories: stories.filter((story: any) => Boolean(story.staffId)), nearbySalons: salons.map(salonView), vendorPosts: posts.filter((post: any) => !post.staffId), staffPosts: posts.filter((post: any) => Boolean(post.staffId)), trendingStyles: [], counts: { upcomingBookings, pastBookings, cancelledBookings, favorites, walletBalance: customerWallet?.balance ?? null, referrals: referrals.length } } });
  } catch (error) { next(error); }
}

export async function salonDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = userId(req); const salonId = String(req.params.salonId);
    const salon = await prisma.salon.findFirst({ where: { id: salonId, isActive: true }, select: { ...publicSalonSelect, branches: { where: { isActive: true }, select: publicSalonSelect }, services: { where: { isActive: true }, select: serviceSelect }, combos: { where: { isActive: true }, include: { items: { include: { service: true } } } }, staff: { where: { isActive: true }, select: publicStaffSelect }, feedPosts: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20, include: { media: true } }, feedStories: { where: { status: "PUBLISHED", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, include: { media: true } }, favoriteCustomers: { where: { customerId }, select: { id: true } }, bookings: { where: { customerId }, select: { id: true, status: true } }, reviews: { where: { status: "PUBLISHED" }, include: { customer: { select: { id: true, firstName: true, lastName: true } }, staff: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: "desc" } } } });
    if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
    const reviewCount = salon.reviews.length; const rating = reviewCount ? salon.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount : null;
    return res.json({ success: true, data: { salon: { ...salonView(salon), rating, reviewCount }, branches: salon.branches.map(salonView), services: salon.services, packages: salon.combos, staff: salon.staff.map((staff: any) => ({ ...staff, name: fullName(staff.user), avatar: null, designation: staff.role, specialization: null, rating: null, reviewCount: 0, services: [] })), gallery: salon.images, offers: await commerce.listCoupons(customerId, salonId), posts: salon.feedPosts, stories: salon.feedStories, reviews: salon.reviews, customerState: { isFavorite: salon.favoriteCustomers.length > 0, hasVisited: salon.bookings.some((booking: any) => booking.status === "DONE"), canReview: salon.bookings.some((booking: any) => booking.status === "DONE") } } });
  } catch (error) { next(error); }
}

export async function favorites(req: Request, res: Response, next: NextFunction) { try { const rows = await prisma.customerFavoriteSalon.findMany({ where: { customerId: userId(req) }, orderBy: { createdAt: "desc" }, include: { salon: { select: publicSalonSelect } } }); return res.json({ success: true, data: rows.map((row: any) => ({ ...salonView(row.salon), favoritedAt: row.createdAt })) }); } catch (error) { next(error); } }
export async function addFavorite(req: Request, res: Response, next: NextFunction) { try { const salonId = String(req.params.salonId); const salon = await prisma.salon.findFirst({ where: { id: salonId, isActive: true }, select: { id: true } }); if (!salon) return res.status(404).json({ success: false, message: "Salon not found" }); const favorite = await prisma.customerFavoriteSalon.upsert({ where: { customerId_salonId: { customerId: userId(req), salonId } }, update: {}, create: { customerId: userId(req), salonId } }); return res.status(201).json({ success: true, data: favorite }); } catch (error) { next(error); } }
export async function removeFavorite(req: Request, res: Response, next: NextFunction) { try { await prisma.customerFavoriteSalon.deleteMany({ where: { customerId: userId(req), salonId: String(req.params.salonId) } }); return res.json({ success: true, data: { removed: true } }); } catch (error) { next(error); } }

export async function profileDashboard(req: Request, res: Response, next: NextFunction) { try { const customerId = userId(req); const [customer, bookings, favoritesCount, walletData, referralData, addressData, couponCount] = await Promise.all([prisma.user.findUnique({ where: { id: customerId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, gender: true, dob: true } }), prisma.booking.findMany({ where: { customerId }, orderBy: { bookingDate: "desc" }, include: { salon: { include: { images: true } }, branch: true, staff: { include: { user: true } }, services: { include: { service: true, combo: true } }, payments: true } }), prisma.customerFavoriteSalon.count({ where: { customerId } }), commerce.wallet(customerId), commerce.referral(customerId), commerce.listAddresses(customerId), prisma.couponRedemption.count({ where: { customerId } })]); const upcoming = bookings.filter((booking) => booking.bookingDate >= new Date() && !["CANCELLED", "NO_SHOW"].includes(booking.status)); return res.json({ success: true, data: { customer, upcomingBookings: upcoming.map(bookingView), pastBookings: bookings.filter((booking) => !upcoming.includes(booking)).map(bookingView), cancelledBookings: bookings.filter((booking) => ["CANCELLED", "NO_SHOW"].includes(booking.status)).map(bookingView), visitsCount: bookings.filter((booking) => booking.status === "DONE").length, favoriteSalonsCount: favoritesCount, walletBalance: walletData?.balance ?? null, referralCount: referralData.length, couponCount, savedAddresses: addressData, preferences: {} } }); } catch (error) { next(error); } }

export async function availability(req: Request, res: Response, next: NextFunction) {
  try {
    const salonId = String(req.params.salonId); const date = String(req.query.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: "date must use YYYY-MM-DD" });
    const serviceIds = String(req.query.serviceIds ?? "").split(",").filter(Boolean);
    const duration = serviceIds.length ? (await prisma.service.aggregate({ where: { id: { in: serviceIds }, salonId, isActive: true }, _sum: { baseDuration: true } }))._sum.baseDuration ?? 30 : 30;
    const staffId = req.query.staffId && req.query.staffId !== "ANY_AVAILABLE" ? String(req.query.staffId) : undefined;
    const bookings = await prisma.booking.findMany({ where: { salonId, ...(req.query.branchId ? { branchId: String(req.query.branchId) } : {}), ...(staffId ? { staffId } : {}), bookingDate: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, include: { services: { include: { service: true, combo: true } } } });
    const blocked = bookings.map((booking) => { const length = booking.services.reduce((total, item) => total + (item.service?.baseDuration ?? item.combo?.duration ?? 0), 0) || 30; return { start: booking.bookingDate.getTime(), end: booking.bookingDate.getTime() + length * 60000 }; });
    const slots: Array<{ start: string; end: string; available: boolean }> = [];
    for (let minutes = 9 * 60; minutes <= 18 * 60 - duration; minutes += 30) { const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; const endMinutes = minutes + duration; const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`; const startAt = new Date(`${date}T${start}:00.000Z`).getTime(); const endAt = new Date(`${date}T${end}:00.000Z`).getTime(); slots.push({ start, end, available: !blocked.some((booking) => startAt < booking.end && endAt > booking.start) }); }
    return res.json({ success: true, data: { salonId, branchId: req.query.branchId ?? null, serviceIds, staffId: staffId ?? "ANY_AVAILABLE", date, durationMinutes: duration, slots } });
  } catch (error) { next(error); }
}

export async function me(req: Request, res: Response, next: NextFunction) { try { const user = await prisma.user.findUnique({ where: { id: userId(req) }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, gender: true, dob: true } }); if (!user) return res.status(404).json({ success: false, message: "Customer not found" }); return send(res, { ...user, accountType: "CUSTOMER" }); } catch (e) { next(e); } }
export async function updateMe(req: Request, res: Response, next: NextFunction) { try { const user = await prisma.user.update({ where: { id: userId(req) }, data: { firstName: req.body.firstName, lastName: req.body.lastName, gender: req.body.gender, dob: req.body.dob ? new Date(req.body.dob) : undefined }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, countryCode: true, gender: true, dob: true } }); return send(res, { ...user, accountType: "CUSTOMER" }); } catch (e) { next(e); } }
export async function permissions(req: Request, res: Response, next: NextFunction) { try { return send(res, await getUserPermissions(userId(req))); } catch (e) { next(e); } }
export async function menu(req: Request, res: Response, next: NextFunction) { try { const p = await getUserPermissions(userId(req)); return send(res, await getMenus(["CUSTOMER"], p, false, true)); } catch (e) { next(e); } }
export async function salons(req: Request, res: Response, next: NextFunction) { try { return send(res, (await allowedSalons(userId(req))).map((item) => item.salon)); } catch (e) { next(e); } }
export async function branches(req: Request, res: Response, next: NextFunction) { try { return send(res, (await allowedSalons(userId(req))).map((item) => item.salon).filter((salon) => salon.parentId)); } catch (e) { next(e); } }
export async function services(req: Request, res: Response, next: NextFunction) { try { const salon = await requestedSalon(userId(req), req.query.salonId as string | undefined); const items = await prisma.service.findMany({ where: { salonId: salon.id, isActive: true }, select: { id: true, name: true, description: true, basePrice: true, baseDuration: true, category: { select: { id: true, name: true } }, images: { select: { url: true } } }, orderBy: { name: "asc" } }); return send(res, items); } catch (e) { next(e); } }
export async function products(req: Request, res: Response, next: NextFunction) { try { const salon = await requestedSalon(userId(req), req.query.salonId as string | undefined); const items = await prisma.product.findMany({ where: { status: "ACTIVE", listings: { some: { salonId: salon.id, ...(req.query.branchId ? { branchId: String(req.query.branchId) } : {}), isListed: true, listingStatus: "ACTIVE" } } }, select: { id: true, name: true, description: true, shortDescription: true, productType: true, images: { select: { url: true, altText: true, isPrimary: true } }, category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } }, variants: { select: { id: true, name: true, sellingPrice: true, sku: true } } }, orderBy: { name: "asc" } }); return send(res, items); } catch (e) { next(e); } }
export async function bookings(req: Request, res: Response, next: NextFunction) { try { const rows = await prisma.booking.findMany({ where: { customerId: userId(req), ...(req.query.salonId ? { salonId: String(req.query.salonId) } : {}) }, include: { salon: { include: { images: true } }, branch: true, staff: { include: { user: true } }, services: { include: { service: true, combo: true } }, payments: true }, orderBy: { bookingDate: "desc" } }); return send(res, rows.map(bookingView)); } catch (e) { next(e); } }
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = userId(req); const salonId = String(req.body.salonId); const salon = await requestedSalon(customerId, salonId);
    const branchId = req.body.branchId ? String(req.body.branchId) : undefined;
    if (branchId) {
      const branch = await prisma.salon.findFirst({ where: { id: branchId, parentId: salon.id, isActive: true }, select: { id: true } });
      if (!branch) return res.status(400).json({ success: false, message: "Selected branch does not belong to this salon" });
    }
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    const serviceIds = requestedItems.map((item: any) => item.serviceId).filter(Boolean);
    const comboIds = requestedItems.map((item: any) => item.comboId).filter(Boolean);
    const [services, combos] = await Promise.all([
      prisma.service.findMany({ where: { id: { in: serviceIds }, salonId: salon.id, isActive: true }, select: { id: true, name: true, basePrice: true } }),
      prisma.combo.findMany({ where: { id: { in: comboIds }, salonId: salon.id, isActive: true }, select: { id: true, name: true, price: true } }),
    ]);
    const serviceById = new Map(services.map((service) => [service.id, service])); const comboById = new Map(combos.map((combo) => [combo.id, combo]));
    if (!requestedItems.length || requestedItems.some((item: any) => (item.serviceId && !serviceById.has(item.serviceId)) || (item.comboId && !comboById.has(item.comboId)) || (!item.serviceId && !item.comboId))) return res.status(400).json({ success: false, message: "Select active services or packages from this salon" });
    const items = requestedItems.map((item: any) => { const catalogItem: any = item.serviceId ? serviceById.get(item.serviceId) : comboById.get(item.comboId); return { serviceId: item.serviceId, comboId: item.comboId, name: catalogItem.name, price: item.serviceId ? catalogItem.basePrice : catalogItem.price }; });
    const bookingAmount = items.reduce((sum: number, item: any) => sum + Number(item.price), 0);
    const coupon = req.body.couponCode ? await commerce.validateCoupon(customerId, { code: String(req.body.couponCode), vendorId: salon.ownerId, salonId: salon.id, branchId, serviceIds, amount: bookingAmount }) : undefined;
    const result = await bookingService.createBooking(salon.id, { ...req.body, discount: 0, branchId, items, customerId, coupon, staffId: req.body.staffId === "ANY_AVAILABLE" ? undefined : req.body.staffId }, undefined, BookingMedium.APP);
    return res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
}
export async function cancelBooking(req: Request, res: Response, next: NextFunction) { try { const booking = await prisma.booking.findFirst({ where: { id: String(req.params.id), customerId: userId(req) } }); if (!booking) return res.status(404).json({ success: false, message: "Booking not found" }); const result = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }); return send(res, result); } catch (e) { next(e); } }
export async function customerCoupons(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.listCoupons(userId(req), req.query.salonId as string | undefined, req.query.serviceId as string | undefined, req.query.branchId as string | undefined, req.query.bookingAmount ? Number(req.query.bookingAmount) : undefined, req.query.vendorId as string | undefined)); } catch (e) { next(e); } }
export async function validateCoupon(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.validateCoupon(userId(req), req.body)); } catch (e) { next(e); } }
export async function customerReviews(req: Request, res: Response, next: NextFunction) { try { const result = req.query.staffId ? await commerce.reviewsForStaff(String(req.query.staffId)) : await commerce.reviewsForSalon(String(req.params.salonId)); return send(res, result); } catch (e) { next(e); } }
export async function createCustomerReview(req: Request, res: Response, next: NextFunction) { try { return res.status(201).json({ success: true, data: await commerce.createReview(userId(req), req.body) }); } catch (e) { next(e); } }
export async function updateCustomerReview(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.updateReview(userId(req), String(req.params.id), req.body)); } catch (e) { next(e); } }
export async function deleteCustomerReview(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.deleteReview(userId(req), String(req.params.id))); } catch (e) { next(e); } }
export async function customerWallet(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.wallet(userId(req))); } catch (e) { next(e); } }
export async function customerWalletTransactions(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.walletTransactions(userId(req))); } catch (e) { next(e); } }
export async function customerReferral(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.referral(userId(req))); } catch (e) { next(e); } }
export async function createCustomerReferral(req: Request, res: Response, next: NextFunction) { try { return res.status(201).json({ success: true, data: await commerce.createReferral(userId(req)) }); } catch (e) { next(e); } }
export async function validateCustomerReferral(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.validateReferral(String(req.body.code))); } catch (e) { next(e); } }
export async function applyCustomerReferral(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.applyReferral(userId(req), String(req.body.code))); } catch (e) { next(e); } }
export async function customerAdvertisements(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.advertisements("CUSTOMER", userId(req))); } catch (e) { next(e); } }
export async function audienceAdvertisements(req: Request, res: Response, next: NextFunction) { try { const currentUser = (req as any).user; const audience = currentUser?.roles?.includes("VENDOR") ? "VENDOR" : "CUSTOMER"; return send(res, await commerce.advertisements(audience, currentUser?.userId)); } catch (e) { next(e); } }
export async function customerAddresses(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.listAddresses(userId(req))); } catch (e) { next(e); } }
export async function createCustomerAddress(req: Request, res: Response, next: NextFunction) { try { return res.status(201).json({ success: true, data: await commerce.createAddress(userId(req), req.body) }); } catch (e) { next(e); } }
export async function updateCustomerAddress(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.updateAddress(userId(req), String(req.params.id), req.body)); } catch (e) { next(e); } }
export async function deleteCustomerAddress(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.deleteAddress(userId(req), String(req.params.id))); } catch (e) { next(e); } }
export async function defaultCustomerAddress(req: Request, res: Response, next: NextFunction) { try { return send(res, await commerce.setDefaultAddress(userId(req), String(req.params.id))); } catch (e) { next(e); } }
