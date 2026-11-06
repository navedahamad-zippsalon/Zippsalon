import { BookingStatus, BookingMedium, BookingSource, PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { acquireLock, releaseLock } from '../../infrastructure/redis/cache';
import { gstService } from '../gst/gst.service';
import { createClient as createRazorpayClient } from '../payment-gateway/razorpay.service';
import crypto from 'crypto';
import { normalizeEnumToken, normalizeFilterValue, normalizePagination } from '../../common/utils/filter-utils';
import { cancelBookingFinance, recordEligibleBookingFinance } from './booking-finance.service';
import { hasSalonPermission } from '../../common/utils/permission.util';
import { isVendorUser } from '../../common/utils/role.util';

type BookingActor = { userId: string; roles: string[] };
type BookingPriceItem = { price: number | string; quantity?: number };

const calculateBookingSubtotal = (items: BookingPriceItem[]) =>
  items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity ?? 1), 0);

const isBookingAdmin = (roles: string[]) => roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
const bookingStatuses = Object.values(BookingStatus) as string[];
const paymentStatuses = Object.values(PaymentStatus) as string[];
const bookingSortFields = new Set(['bookingDate', 'createdAt', 'updatedAt', 'finalAmount', 'status']);

async function resolveBookingLocation(
  salonId: string,
  branchId: string | null | undefined,
  vendorId: string | undefined,
  actor?: BookingActor,
) {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      parentId: true,
      ownerId: true,
      isActive: true,
      owner: { select: { id: true, isActive: true, roles: { select: { role: { select: { name: true } } } } } },
    },
  });
  if (!salon) throw { status: 404, code: 'SALON_NOT_FOUND', message: 'Salon not found' };
  if (salon.parentId || !salon.isActive) {
    throw { status: 400, code: 'INVALID_BOOKING_SALON', message: 'Select an active main Salon' };
  }
  if (!salon.owner.isActive || !salon.owner.roles.some(({ role }) => role.name === 'VENDOR')) {
    throw { status: 400, code: 'INVALID_VENDOR_SALON_RELATIONSHIP', message: 'The selected Salon does not belong to an active Vendor' };
  }

  const admin = actor ? isBookingAdmin(actor.roles) : false;
  const vendorUser = !admin && (actor ? isVendorUser(actor.roles) : false);
  if (admin && vendorId) {
    const vendor = await prisma.user.findFirst({
      where: { id: vendorId, isActive: true, roles: { some: { role: { name: 'VENDOR' } } } },
      select: { id: true },
    });
    if (!vendor) throw { status: 400, code: 'INVALID_VENDOR', message: 'Select an active Vendor' };
    if (vendor.id !== salon.ownerId) {
      throw { status: 400, code: 'INVALID_VENDOR_SALON_RELATIONSHIP', message: 'The selected Salon does not belong to the selected Vendor' };
    }
  }
  if (vendorUser && vendorId && vendorId !== actor!.userId) {
    throw { status: 403, code: 'VENDOR_ACCESS_DENIED', message: 'You cannot create or move a booking for another Vendor.' };
  }
  if (vendorUser && salon.ownerId !== actor!.userId) {
    throw { status: 403, code: 'SALON_ACCESS_DENIED', message: 'You do not have access to this salon.' };
  }
  if (actor && !admin && !vendorUser && !await hasSalonPermission(salonId, actor.userId, actor.roles)) {
    throw { status: 403, code: 'SALON_ACCESS_DENIED', message: 'You do not have access to this salon.' };
  }

  let branch: { id: string; parentId: string | null; isActive: boolean } | null = null;
  if (branchId) {
    branch = await prisma.salon.findUnique({
      where: { id: branchId },
      select: { id: true, parentId: true, isActive: true },
    });
    if (!branch || branch.parentId !== salon.id) {
      throw {
        status: admin || !vendorUser ? 400 : 403,
        code: admin || !vendorUser ? 'INVALID_SALON_BRANCH_RELATIONSHIP' : 'BRANCH_ACCESS_DENIED',
        message: admin || !vendorUser ? 'The selected Branch does not belong to the selected Salon' : 'You do not have access to this branch.',
      };
    }
    if (!branch.isActive) throw { status: 400, code: 'INACTIVE_BOOKING_BRANCH', message: 'The selected Branch is inactive' };
    if (actor && !admin && !vendorUser && !await hasSalonPermission(branch.id, actor.userId, actor.roles)) {
      throw { status: 403, code: 'BRANCH_ACCESS_DENIED', message: 'You do not have access to this branch.' };
    }
  }

  return { salonId: salon.id, branchId: branch?.id ?? null, vendorId: salon.ownerId };
}

async function validateBookingItemLocations(
  salonId: string,
  branchId: string | null,
  items: Array<{ serviceId?: string; comboId?: string }>,
) {
  const allowedSalonIds = [salonId, ...(branchId ? [branchId] : [])];
  for (const item of items) {
    if (item.serviceId && item.comboId) {
      throw { status: 400, code: 'INVALID_BOOKING_ITEM', message: 'A booking item cannot reference both a Service and a Combo' };
    }

    if (item.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: item.serviceId }, select: { salonId: true } });
      if (!service || !allowedSalonIds.includes(service.salonId)) {
        throw { status: 400, code: 'INVALID_BOOKING_SERVICE_SCOPE', message: 'The selected Service is not available at this Salon or Branch' };
      }
    }
    if (item.comboId) {
      const combo = await prisma.combo.findUnique({ where: { id: item.comboId }, select: { salonId: true } });
      if (!combo || !allowedSalonIds.includes(combo.salonId)) {
        throw { status: 400, code: 'INVALID_BOOKING_COMBO_SCOPE', message: 'The selected Combo is not available at this Salon or Branch' };
      }
    }
  }
}

export async function assertBookingAccess(bookingId: string, actor: BookingActor, action: string) {
  if (isBookingAdmin(actor.roles)) return;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      salonId: true,
      salon: { select: { ownerId: true, parent: { select: { ownerId: true } } } },
    },
  });
  if (!booking) throw { status: 404, message: 'Booking not found' };
  const vendorId = booking.salon.parent?.ownerId ?? booking.salon.ownerId;
  if (isVendorUser(actor.roles)) {
    if (vendorId !== actor.userId) throw { status: 404, message: 'Booking not found' };
    return;
  }
  if (!await hasSalonPermission(booking.salonId, actor.userId, actor.roles)) {
    throw { status: 403, code: 'BOOKING_ACCESS_DENIED', message: `You do not have permission to ${action} this booking.` };
  }
}

const bookingStatusAliases: Record<string, string> = {
  done: 'DONE',
  completed: 'DONE',
  complete: 'DONE',
  pending: 'PENDING',
  'pending-payment': 'PENDING',
  'pending_payment': 'PENDING',
  'pending payment': 'PENDING',
  confirmed: 'CONFIRMED',
  checkedin: 'CHECKED_IN',
  'checked-in': 'CHECKED_IN',
  'checked_in': 'CHECKED_IN',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  'no-show': 'NO_SHOW',
  no_show: 'NO_SHOW',
  noshow: 'NO_SHOW',
  today: 'TODAY',
};

const paymentStatusAliases: Record<string, string> = {
  pending: 'PENDING',
  'pending-payment': 'PENDING',
  'pending_payment': 'PENDING',
  'pending payment': 'PENDING',
  completed: 'COMPLETED',
  complete: 'COMPLETED',
  failed: 'FAILED',
  refunded: 'REFUNDED',
};

export const bookingService = {
  async getAllBookings(salonId?: string, params: any = {}, ownerId?: string, exportAll = false, ownerIsVendor = false) {
    const normalizedSearch = normalizeFilterValue(params.search ?? params.q ?? '');
    const rawStatus = normalizeFilterValue(params.status);
    const normalizedStatus = rawStatus ? normalizeEnumToken(rawStatus, bookingStatusAliases) : undefined;
    const normalizedCustomerId = normalizeFilterValue(params.customerId);
    const normalizedStaffId = normalizeFilterValue(params.staffId);
    const normalizedVenueId = normalizeFilterValue(salonId && salonId !== 'all' ? salonId : params.salonId);
    const normalizedVendorId = ownerIsVendor ? undefined : normalizeFilterValue(params.vendorId);
    const normalizedBranchId = normalizeFilterValue(params.branchId);
    const normalizedServiceId = normalizeFilterValue(params.serviceId);
    const rawBookingSource = normalizeFilterValue(params.bookingSource ?? params.source);
    const normalizedBookingSource = rawBookingSource?.toUpperCase();
    const bookingSource = normalizedBookingSource === BookingSource.APP
      ? BookingSource.APP
      : normalizedBookingSource === BookingSource.WEB ? BookingSource.WEB : undefined;
    if (normalizedBookingSource && !bookingSource) {
      throw { status: 400, code: 'INVALID_BOOKING_SOURCE', message: 'Booking source must be APP or WEB.' };
    }
    const normalizedCountry = normalizeFilterValue(params.country);
    const normalizedCity = normalizeFilterValue(params.city);
    const normalizedState = normalizeFilterValue(params.state);
    const startDateRaw = normalizeFilterValue(params.startDate ?? params.dateFrom);
    const endDateRaw = normalizeFilterValue(params.endDate ?? params.dateTo);
    const startDateObj = startDateRaw ? new Date(startDateRaw) : undefined;
    let endDateObj = endDateRaw ? new Date(endDateRaw) : undefined;
    if ((startDateObj && Number.isNaN(startDateObj.getTime())) || (endDateObj && Number.isNaN(endDateObj.getTime()))) {
      throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'Enter a valid booking date range.' };
    }
    if (endDateObj && /^\d{4}-\d{2}-\d{2}$/.test(String(endDateRaw).trim())) {
      endDateObj = new Date(endDateObj.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    if (startDateObj && endDateObj && startDateObj > endDateObj) {
      throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'The start date must be before the end date.' };
    }

    const { page, limit, skip } = normalizePagination(params.page, params.limit, { page: 1, limit: 10 });
    const requestedSortField = normalizeFilterValue(params.sortBy);
    const sortField = requestedSortField && bookingSortFields.has(requestedSortField) ? requestedSortField : 'bookingDate';
    const sortOrder = String(params.sortOrder ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    if (requestedSortField && !bookingSortFields.has(requestedSortField)) {
      throw { status: 400, code: 'INVALID_BOOKING_SORT', message: 'The selected booking sort field is not supported.' };
    }
    if (normalizedStatus && normalizedStatus !== 'TODAY' && !bookingStatuses.includes(normalizedStatus)) {
      throw { status: 400, code: 'INVALID_BOOKING_STATUS', message: 'The selected booking status is not supported.' };
    }

    if (ownerId) {
      const allowedSalons = await prisma.salon.findMany({
        where: {
          OR: [
            { ownerId },
            { parent: { ownerId } },
          ],
        },
        select: { id: true, parentId: true, ownerId: true },
      });
      const allowedSalonIds = new Set(allowedSalons.map((salon) => salon.id));
      const allowedRootSalonIds = new Set(allowedSalons.filter((salon) => !salon.parentId).map((salon) => salon.id));

      if (normalizedVenueId && !allowedSalonIds.has(normalizedVenueId)) {
        throw Object.assign(new Error('You do not have access to this salon'), { status: 403, code: 'SALON_ACCESS_DENIED' });
      }

      if (normalizedBranchId) {
        const branch = await prisma.salon.findUnique({
          where: { id: normalizedBranchId },
          select: { id: true, parentId: true, ownerId: true },
        });

        if (!branch) {
          throw { status: 404, message: 'Branch not found' };
        }

        const branchAllowed = (!ownerIsVendor && branch.ownerId === ownerId) || (branch.parentId && allowedRootSalonIds.has(branch.parentId));
        if (!branchAllowed) {
          throw Object.assign(new Error('You do not have access to this branch'), { status: 403, code: 'BRANCH_ACCESS_DENIED' });
        }

        if (normalizedVenueId && branch.parentId && branch.parentId !== normalizedVenueId) {
          throw { status: 400, message: 'Selected branch does not belong to the selected salon' };
        }
      }
    }

    const where: any = {
      ...(normalizedStatus && normalizedStatus !== 'TODAY' ? { status: normalizedStatus } : {}),
      ...(normalizedCustomerId ? { customerId: normalizedCustomerId } : {}),
      ...(normalizedStaffId ? { staffId: normalizedStaffId } : {}),
      ...(normalizedServiceId ? { services: { some: { serviceId: normalizedServiceId } } } : {}),
      ...(bookingSource ? { bookingSource } : {}),
      ...(normalizedSearch ? { OR: [
        { id: { contains: normalizedSearch, mode: 'insensitive' } },
        { customer: { firstName: { contains: normalizedSearch, mode: 'insensitive' } } },
        { customer: { lastName: { contains: normalizedSearch, mode: 'insensitive' } } },
        { customer: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
        { customer: { phone: { contains: normalizedSearch, mode: 'insensitive' } } },
        { staff: { user: { firstName: { contains: normalizedSearch, mode: 'insensitive' } } } },
        { staff: { user: { lastName: { contains: normalizedSearch, mode: 'insensitive' } } } },
        { services: { some: { name: { contains: normalizedSearch, mode: 'insensitive' } } } },
      ] } : {}),
    };
    const bookingDateFilters: any[] = [];
    if (startDateObj || endDateObj) {
      bookingDateFilters.push({
        bookingDate: {
          ...(startDateObj && { gte: startDateObj }),
          ...(endDateObj && { lte: endDateObj }),
        },
      });
    }
    if (normalizedStatus === 'TODAY') {
      bookingDateFilters.push({
        bookingDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      });
    }
    if (bookingDateFilters.length === 1) where.bookingDate = bookingDateFilters[0].bookingDate;
    if (bookingDateFilters.length > 1) where.AND = bookingDateFilters;

    if (normalizedBranchId) {
      where.branchId = normalizedBranchId;
    } else if (normalizedVenueId) {
      const venue = await prisma.salon.findUnique({
        where: { id: normalizedVenueId },
        select: { id: true, parentId: true },
      });
      if (venue?.parentId) {
        where.branchId = venue.id;
      } else {
        where.salonId = venue ? venue.id : normalizedVenueId;
      }
    }

    if (ownerId) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { salon: { ownerId } },
            { salon: { parent: { ownerId } } },
            ...(!ownerIsVendor ? [{ branch: { ownerId } }] : []),
          ],
        },
      ];
    }

    if (normalizedCountry || normalizedCity || normalizedState || normalizedVendorId) {
      where.AND = [
        ...(where.AND ?? []),
        {
          salon: {
            ...(normalizedVendorId ? { OR: [{ ownerId: normalizedVendorId }, { parent: { ownerId: normalizedVendorId } }] } : {}),
            ...((normalizedCountry || normalizedCity || normalizedState) ? { address: { ...(normalizedCountry && { country: { equals: normalizedCountry, mode: 'insensitive' } }), ...(normalizedCity && { city: { equals: normalizedCity, mode: 'insensitive' } }), ...(normalizedState && { state: { equals: normalizedState, mode: 'insensitive' } }) } } : {}),
          },
        },
      ];
    }

    for (const [fromKey, toKey, field] of [
      ['createdFrom', 'createdTo', 'createdAt'],
      ['updatedFrom', 'updatedTo', 'updatedAt'],
    ] as const) {
      const from = params[fromKey] ? new Date(params[fromKey]) : undefined;
      let to = params[toKey] ? new Date(params[toKey]) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
        throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'Enter a valid booking date range.' };
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(params[toKey]).trim())) {
        to = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
      }
      if (from && to && from > to) {
        throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'The start date must be before the end date.' };
      }
      if (from || to) where[field] = { ...(from && { gte: from }), ...(to && { lte: to }) };
    }
    if (params.paymentStatus) {
      const rawPaymentStatus = normalizeFilterValue(params.paymentStatus);
      const paymentStatus = rawPaymentStatus ? normalizeEnumToken(rawPaymentStatus, paymentStatusAliases) : undefined;
      if (paymentStatus && !paymentStatuses.includes(paymentStatus)) {
        throw { status: 400, code: 'INVALID_PAYMENT_STATUS', message: 'The selected payment status is not supported.' };
      }
      if (paymentStatus) where.payments = { some: { status: paymentStatus } };
    }

    // Prepare scoped stats filter (reflects salon, branch, vendor scope before status/date/pagination filtering)
    const statsScope: any = {};
    if (where.salonId) statsScope.salonId = where.salonId;
    if (where.branchId) statsScope.branchId = where.branchId;
    if (where.salon) statsScope.salon = where.salon;
    if (where.AND) statsScope.AND = where.AND;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [bookings, total, todayBookings, pendingCount, completedCount, unpaidAmounts] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { salon: { select: { id: true, name: true, parentId: true, owner: { select: { id: true, firstName: true, lastName: true } }, parent: { select: { id: true, name: true, owner: { select: { id: true, firstName: true, lastName: true } } } } } }, branch: { select: { id: true, name: true, parentId: true } }, customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }, staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } }, services: true },
        ...(exportAll ? {} : { skip, take: limit }),
        orderBy: { [sortField]: sortOrder },
      }),
      prisma.booking.count({ where }),
      prisma.booking.count({
        where: { ...statsScope, bookingDate: { gte: todayStart, lte: todayEnd } }
      }),
      prisma.booking.count({
        where: { ...statsScope, status: 'PENDING' }
      }),
      prisma.booking.count({
        where: { ...statsScope, status: 'DONE' }
      }),
      prisma.booking.aggregate({
        where: {
          ...statsScope,
          status: { not: 'CANCELLED' },
          totalPaid: { lt: prisma.booking.fields.finalAmount },
        },
        _sum: { finalAmount: true, totalPaid: true },
      }),
    ]);

    const pendingPayment = Number(
      Math.max(Number(unpaidAmounts._sum.finalAmount ?? 0) - Number(unpaidAmounts._sum.totalPaid ?? 0), 0).toFixed(2)
    );

    return {
      bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
      },
      stats: {
        todayBookings,
        pending: pendingCount,
        completed: completedCount,
        pendingPayment,
      },
    };
  },

  async getBookingFilterOptions(actor: BookingActor, params: any = {}) {
    const admin = isBookingAdmin(actor.roles);
    const vendor = !admin && isVendorUser(actor.roles);
    const selectedVendorId = admin
      ? normalizeFilterValue(params.vendorId)
      : vendor ? actor.userId : undefined;
    const selectedSalonId = normalizeFilterValue(params.salonId);
    const selectedBranchId = normalizeFilterValue(params.branchId);
    const selectedStaffId = normalizeFilterValue(params.staffId);
    const selectedServiceId = normalizeFilterValue(params.serviceId);
    const selectedStatus = normalizeFilterValue(params.status);
    const selectedPaymentStatus = normalizeFilterValue(params.paymentStatus);
    const search = normalizeFilterValue(params.search);
    const { page, limit, skip } = normalizePagination(params.page, params.limit, { page: 1, limit: 100 });

    if (selectedVendorId) {
      const validVendor = await prisma.user.findFirst({
        where: {
          id: selectedVendorId,
          isActive: true,
          roles: { some: { role: { name: { contains: 'VENDOR', mode: 'insensitive' } } } },
        },
        select: { id: true },
      });
      if (!validVendor) throw { status: 400, code: 'INVALID_VENDOR', message: 'Select an active Vendor.' };
    }

    const rootSalonWhere: any = { parentId: null };
    if (selectedVendorId) rootSalonWhere.ownerId = selectedVendorId;
    if (!admin && !vendor) {
      rootSalonWhere.OR = [
        { ownerId: actor.userId },
        { staff: { some: { userId: actor.userId, isActive: true } } },
      ];
    }
    const rootSalons = await prisma.salon.findMany({
      where: rootSalonWhere,
      select: { id: true, name: true, ownerId: true },
      orderBy: { name: 'asc' },
    });
    const rootSalonIds = rootSalons.map(({ id }) => id);
    if (selectedSalonId && !rootSalonIds.includes(selectedSalonId)) {
      throw { status: 403, code: 'SALON_ACCESS_DENIED', message: 'The selected Salon is outside your booking scope.' };
    }

    const branchWhere: any = {
      parentId: { in: selectedSalonId ? [selectedSalonId] : rootSalonIds },
      isActive: true,
    };
    if (selectedSalonId && selectedBranchId) branchWhere.id = selectedBranchId;
    const branches = rootSalonIds.length
      ? await prisma.salon.findMany({ where: branchWhere, select: { id: true, name: true, parentId: true }, orderBy: { name: 'asc' } })
      : [];
    if (selectedBranchId && !branches.some(({ id }) => id === selectedBranchId)) {
      throw { status: 403, code: 'BRANCH_ACCESS_DENIED', message: 'The selected Branch is outside your booking scope.' };
    }

    const locationIds = selectedBranchId
      ? [selectedBranchId]
      : selectedSalonId
        ? [selectedSalonId, ...branches.filter(({ parentId }) => parentId === selectedSalonId).map(({ id }) => id)]
        : [...rootSalonIds, ...branches.map(({ id }) => id)];
    const bookingClauses: any[] = [];
    if (vendor) {
      bookingClauses.push({
        OR: [
          { salon: { ownerId: actor.userId } },
          { salon: { parent: { ownerId: actor.userId } } },
        ],
      });
    } else if (!admin) {
      bookingClauses.push({
        OR: [
          { salon: { ownerId: actor.userId } },
          { salon: { parent: { ownerId: actor.userId } } },
          { salon: { staff: { some: { userId: actor.userId, isActive: true } } } },
          { salon: { parent: { staff: { some: { userId: actor.userId, isActive: true } } } } },
        ],
      });
    } else if (selectedVendorId) {
      bookingClauses.push({ salon: { ownerId: selectedVendorId } });
    }

    if (selectedSalonId) bookingClauses.push({ salonId: selectedSalonId });
    if (selectedBranchId) bookingClauses.push({ branchId: selectedBranchId });
    if (selectedStaffId) bookingClauses.push({ staffId: selectedStaffId });
    if (selectedServiceId) bookingClauses.push({ services: { some: { serviceId: selectedServiceId } } });
    const source = normalizeFilterValue(params.bookingSource ?? params.source)?.toUpperCase();
    if (source && source !== BookingSource.APP && source !== BookingSource.WEB) {
      throw { status: 400, code: 'INVALID_BOOKING_SOURCE', message: 'Booking source must be APP or WEB.' };
    }
    if (source) bookingClauses.push({ bookingSource: source });
    if (selectedStatus) {
      const status = normalizeEnumToken(selectedStatus, bookingStatusAliases);
      if (!status || (status !== 'TODAY' && !bookingStatuses.includes(status))) {
        throw { status: 400, code: 'INVALID_BOOKING_STATUS', message: 'The selected booking status is not supported.' };
      }
      if (status === 'TODAY') {
        bookingClauses.push({
          bookingDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        });
      } else {
        bookingClauses.push({ status });
      }
    }
    if (selectedPaymentStatus) {
      const status = normalizeEnumToken(selectedPaymentStatus, paymentStatusAliases);
      if (!status || !paymentStatuses.includes(status)) {
        throw { status: 400, code: 'INVALID_PAYMENT_STATUS', message: 'The selected payment status is not supported.' };
      }
      bookingClauses.push({ payments: { some: { status } } });
    }
    const startRaw = normalizeFilterValue(params.startDate ?? params.dateFrom);
    const endRaw = normalizeFilterValue(params.endDate ?? params.dateTo);
    const start = startRaw ? new Date(startRaw) : undefined;
    let end = endRaw ? new Date(endRaw) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'Enter a valid booking date range.' };
    }
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(String(endRaw))) end = new Date(end.getTime() + 86_400_000 - 1);
    if (start && end && start > end) {
      throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'The start date must be before the end date.' };
    }
    if (start || end) bookingClauses.push({ bookingDate: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } });
    for (const [fromKey, toKey, field] of [
      ['createdFrom', 'createdTo', 'createdAt'],
      ['updatedFrom', 'updatedTo', 'updatedAt'],
    ] as const) {
      const from = params[fromKey] ? new Date(params[fromKey]) : undefined;
      let to = params[toKey] ? new Date(params[toKey]) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
        throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'Enter a valid booking date range.' };
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(params[toKey]).trim())) {
        to = new Date(to.getTime() + 86_400_000 - 1);
      }
      if (from && to && from > to) {
        throw { status: 400, code: 'INVALID_BOOKING_DATE_RANGE', message: 'The start date must be before the end date.' };
      }
      if (from || to) bookingClauses.push({ [field]: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    }
    const scopedBookings = bookingClauses.length ? { AND: bookingClauses } : {};
    const vendorOptionsWhere: any = {
      isActive: true,
      roles: { some: { role: { name: { contains: 'VENDOR', mode: 'insensitive' } } } },
      ...(search ? { OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const salonOptionsWhere: any = {
      id: { in: rootSalonIds },
      isActive: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const filteredBranches = branches
      .filter(({ parentId, name }) => (!selectedSalonId || parentId === selectedSalonId)
        && (!search || name.toLowerCase().includes(search.toLowerCase())));

    const [vendors, vendorTotal, salonOptions, salonTotal, staffOptions, serviceOptions, customers] = await Promise.all([
      admin
        ? prisma.user.findMany({
            where: vendorOptionsWhere,
            select: { id: true, firstName: true, lastName: true, email: true },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            skip,
            take: limit,
          })
        : [],
      admin ? prisma.user.count({ where: vendorOptionsWhere }) : 0,
      prisma.salon.findMany({
        where: salonOptionsWhere,
        select: { id: true, name: true, ownerId: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.salon.count({ where: salonOptionsWhere }),
      locationIds.length
        ? prisma.salonStaff.findMany({
            where: { salonId: { in: locationIds }, isActive: true, ...(search ? { user: { OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ] } } : {}) },
            select: { id: true, salonId: true, user: { select: { firstName: true, lastName: true } } },
            orderBy: { user: { firstName: 'asc' } },
            skip,
            take: limit,
          })
        : [],
      locationIds.length
        ? prisma.service.findMany({
            where: { salonId: { in: locationIds }, isActive: true, ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) },
            select: { id: true, name: true, salonId: true },
            orderBy: { name: 'asc' },
            skip,
            take: limit,
          })
        : [],
      prisma.user.findMany({
        where: {
          customerBookings: { some: scopedBookings },
          ...(search ? { OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ] } : {}),
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      vendors: vendors.map(({ id, firstName, lastName, email }) => ({ id, name: `${firstName} ${lastName ?? ''}`.trim(), email })),
      salons: salonOptions,
      branches: filteredBranches.slice(skip, skip + limit),
      staff: staffOptions.map(({ id, salonId, user }) => ({ id, salonId, name: `${user.firstName} ${user.lastName ?? ''}`.trim() })),
      services: serviceOptions,
      customers: customers.map(({ id, firstName, lastName, email, phone }) => ({ id, name: `${firstName} ${lastName ?? ''}`.trim(), email, phone })),
      statuses: bookingStatuses,
      paymentStatuses,
      pagination: {
        page,
        limit,
        totals: { vendors: vendorTotal, salons: salonTotal, branches: filteredBranches.length },
      },
    };
  },

  async getBookingById(id: string, actor?: BookingActor) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: { include: { user: true } },
        services: {
          include: {
            service: true,
            combo: true,
          },
        },
        payments: true,
        salon: { include: { owner: { select: { id: true, firstName: true, lastName: true } }, parent: { select: { id: true, name: true, ownerId: true } } } },
        branch: { select: { id: true, name: true, parentId: true } },
      },
    });
    if (booking && actor && !isBookingAdmin(actor.roles)) {
      await assertBookingAccess(id, actor, 'view');
    }
    return booking;
  },

  async createBooking(salonId: string, payload: any, actor?: BookingActor, medium: BookingMedium = BookingMedium.ONLINE) {
    const { 
      customerId, 
      customerData, 
      staffId, 
      branchId,
      bookingDate, 
      notes, 
      items, 
      discount = 0,
      coupon,
      payment 
    } = payload;
    const taxType = payload.taxType === 'IGST' ? 'IGST' : 'CGST_SGST';

    if (!salonId) throw { status: 400, message: "Salon is required" };
    if (actor && payload.salonId && payload.salonId !== salonId) {
      const vendorUser = !isBookingAdmin(actor.roles) && isVendorUser(actor.roles);
      throw {
        status: vendorUser ? 403 : 400,
        code: vendorUser ? 'SALON_ACCESS_DENIED' : 'INVALID_BOOKING_SALON',
        message: vendorUser ? 'You do not have access to this salon.' : 'salonId must match the selected Salon path.',
      };
    }
    const location = actor
      ? await resolveBookingLocation(salonId, branchId, payload.vendorId, actor)
      : null;
    const effectiveSalonId = location?.salonId ?? salonId;
    const effectiveBranchId = location?.branchId ?? branchId ?? null;
    if (!bookingDate || Number.isNaN(new Date(bookingDate).getTime())) {
      throw { status: 400, message: "A valid booking date is required" };
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw { status: 400, message: "At least one service is required" };
    }
    if (location) await validateBookingItemLocations(effectiveSalonId, effectiveBranchId, items);
    if (items.some((item: any) => !item?.name
      || !Number.isFinite(Number(item.price))
      || Number(item.price) < 0
      || !Number.isInteger(Number(item.quantity ?? 1))
      || Number(item.quantity ?? 1) < 1)) {
      throw { status: 400, message: "Each booking service must include a name and valid non-negative price" };
    }
    if (Number(discount) < 0 || Number(discount) > 100 || !Number.isFinite(Number(discount))) {
      throw { status: 400, message: "Discount must be a number between 0 and 100" };
    }
    if (payment && (Number(payment.amount) < 0 || !Number.isFinite(Number(payment.amount)))) {
      throw { status: 400, message: "Payment amount must be a valid non-negative number" };
    }
    if (payment && Number(payment.amount) > 0 && !Object.values(PaymentMethod).includes(payment.method)) {
      throw { status: 400, message: "A valid payment method is required when payment amount is greater than zero" };
    }

    let finalCustomerId = customerId;

    if (!finalCustomerId && customerData) {
      const searchConditions: any[] = [];
      if (customerData.phone) searchConditions.push({ phone: customerData.phone });
      if (customerData.email) searchConditions.push({ email: customerData.email });

      let user = null;
      if (searchConditions.length > 0) {
        user = await prisma.user.findFirst({
          where: {
            OR: searchConditions,
          },
        });
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            email: customerData.email || `${customerData.phone}@guest.zippsalon.local`,
            phone: customerData.phone,
            countryCode: customerData.countryCode || '+91',
            password: 'Customer@123',
            source: 'ADMIN',
          },
        });
      }

      finalCustomerId = user.id;
    }

    if (!finalCustomerId) throw { status: 400, message: "Customer is required" };

    const selectedStaffId = staffId;

    const [salon, branch, staff] = await Promise.all([
      location ? Promise.resolve({ id: location.salonId }) : prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } }),
      location
        ? Promise.resolve(location.branchId ? { id: location.branchId, parentId: location.salonId } : null)
        : branchId ? prisma.salon.findUnique({ where: { id: branchId }, select: { id: true, parentId: true } }) : Promise.resolve(null),
      selectedStaffId
        ? prisma.salonStaff.findUnique({ where: { id: selectedStaffId }, select: { id: true, salonId: true, isActive: true } })
        : prisma.salonStaff.findFirst({ where: { salonId: effectiveSalonId, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, salonId: true, isActive: true } }),
    ]);
    if (!salon) throw { status: 404, message: "Salon not found" };
    if (effectiveBranchId && (!branch || branch.parentId !== effectiveSalonId)) throw { status: 400, message: "Selected branch does not belong to this salon" };
    const validStaffSalonIds = location ? [effectiveSalonId, ...(effectiveBranchId ? [effectiveBranchId] : [])] : [effectiveSalonId];
    if (!staff || (location && !staff.isActive) || !validStaffSalonIds.includes(staff.salonId)) {
      throw { status: 400, message: "Selected staff member does not belong to this salon" };
    }

    const totalAmount = calculateBookingSubtotal(items);
    const couponDiscount = coupon ? Number(coupon.discountAmount) : 0;
    const discountPercent = coupon ? (totalAmount > 0 ? couponDiscount / totalAmount * 100 : 0) : Number(discount);
    const amountPaid = (payment && payment.amount > 0) ? Number(payment.amount) : 0;

    // Get GST configuration for the salon
    const gstConfig = await gstService.getOrCreateGSTConfig(effectiveSalonId);

    // Calculate GST
    const gstCalculation = gstService.applyGSTToBooking(
      totalAmount,
      discountPercent,
      gstConfig.cgstRate,
      gstConfig.sgstRate,
      gstConfig.igstRate,
      taxType,
      gstConfig.isActive
    );
    if (amountPaid > gstCalculation.finalAmount) throw { status: 400, message: "Payment amount cannot exceed the final booking amount" };

    const parsedDate = new Date(bookingDate).toISOString();
    const lockKey = `lock:booking:staff:${staff.id}:date:${parsedDate}`;
    const locked = await acquireLock(lockKey, 10000);
    if (!locked) {
      throw { status: 409, message: "This slot is currently being booked by another customer. Please try again." };
    }

    try {
      return await prisma.$transaction(async (tx) => {
        if (coupon) {
          const currentCoupon = await tx.coupon.findUnique({ where: { id: coupon.coupon.id }, select: { isActive: true, startAt: true, endAt: true, usageLimit: true, usagePerCustomer: true } });
          if (!currentCoupon || !currentCoupon.isActive || currentCoupon.startAt > new Date() || currentCoupon.endAt < new Date()) throw { status: 400, code: "COUPON_NOT_APPLICABLE", message: "Coupon is no longer applicable" };
          const [usage, customerUsage] = await Promise.all([tx.couponRedemption.count({ where: { couponId: coupon.coupon.id } }), tx.couponRedemption.count({ where: { couponId: coupon.coupon.id, customerId: finalCustomerId } })]);
          if (currentCoupon.usageLimit !== null && usage >= currentCoupon.usageLimit) throw { status: 400, code: "COUPON_USAGE_LIMIT", message: "Coupon usage limit reached" };
          if (currentCoupon.usagePerCustomer !== null && customerUsage >= currentCoupon.usagePerCustomer) throw { status: 400, code: "COUPON_CUSTOMER_LIMIT", message: "Coupon usage limit reached for this customer" };
        }
        await tx.salonCustomer.upsert({
          where: { salonId_userId: { salonId: effectiveSalonId, userId: finalCustomerId } },
          create: { salonId: effectiveSalonId, userId: finalCustomerId },
          update: {},
        });

        const booking = await tx.booking.create({
          data: {
            salonId: effectiveSalonId,
            branchId: effectiveBranchId,
            customerId: finalCustomerId,
            staffId: staff.id,
            gstConfigurationId: gstConfig.id,
            bookingDate: new Date(bookingDate),
            totalAmount,
            discount: discountPercent,
            discountAmount: gstCalculation.discountAmount,
            taxableAmount: gstCalculation.taxableAmount,
            cgstAmount: gstCalculation.cgstAmount,
            sgstAmount: gstCalculation.sgstAmount,
            igstAmount: gstCalculation.igstAmount,
            totalTaxAmount: gstCalculation.totalTaxAmount,
            finalAmount: gstCalculation.finalAmount,
            totalPaid: amountPaid,
            notes,
            couponId: coupon?.coupon?.id ?? null,
            status: BookingStatus.CONFIRMED,
            medium,
            bookingSource: medium === BookingMedium.APP
              ? BookingSource.APP
              : medium === BookingMedium.ONLINE ? BookingSource.WEB : null,
            services: {
              create: items.map((item: any) => ({
                serviceId: item.serviceId,
                comboId: item.comboId,
                name: item.name,
                price: Number(item.price),
                quantity: Number(item.quantity ?? 1),
              })),
            },
          },
        });

        if (amountPaid > 0) {
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              amount: amountPaid,
              method: payment.method as PaymentMethod,
              status: PaymentStatus.COMPLETED,
              completedAt: new Date(),
              transactionId: payment.transactionId,
            },
          });
        }
        await recordEligibleBookingFinance(tx, booking.id);
        if (coupon) await tx.couponRedemption.create({ data: { couponId: coupon.coupon.id, customerId: finalCustomerId, bookingId: booking.id, amount: couponDiscount } });

        return tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            services: true,
            payments: true,
            customer: true,
            gstConfig: true,
            salon: { select: { id: true, name: true, owner: { select: { id: true, firstName: true, lastName: true } } } },
            branch: { select: { id: true, name: true, parentId: true } },
          },
        });
      }, { isolationLevel: "Serializable" });
    } finally {
      await releaseLock(lockKey);
    }
  },

  async updateBooking(id: string, payload: any, actor?: BookingActor) {
    if (payload.bookingDate !== undefined
      && (typeof payload.bookingDate !== 'string' || Number.isNaN(new Date(payload.bookingDate).getTime()))) {
      throw { status: 400, code: 'INVALID_BOOKING_DATE', message: 'Enter a valid booking date and time.' };
    }
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        gstConfig: true,
        salon: { select: { id: true, ownerId: true, parentId: true } },
      },
    });
    if (!booking) throw { status: 404, message: "Booking not found" };

    if (actor) await assertBookingAccess(id, actor, 'update');

    const locationWasRequested = payload.vendorId !== undefined
      || payload.salonId !== undefined
      || payload.branchId !== undefined;
    const nextSalonId = payload.salonId ?? booking.salonId;
    const nextBranchId = payload.branchId !== undefined
      ? payload.branchId
      : payload.salonId && payload.salonId !== booking.salonId ? null : booking.branchId;
    const location = locationWasRequested
      ? await resolveBookingLocation(nextSalonId, nextBranchId, payload.vendorId, actor)
      : null;
    if (location || payload.items !== undefined) {
      const bookingItems: Array<{ serviceId?: string | null; comboId?: string | null }> = payload.items ?? await prisma.bookingService.findMany({
        where: { bookingId: id },
        select: { serviceId: true, comboId: true, name: true, price: true, quantity: true },
      });
      await validateBookingItemLocations(location?.salonId ?? booking.salonId, location?.branchId ?? booking.branchId, bookingItems.map(({ serviceId, comboId }) => ({
        serviceId: serviceId ?? undefined,
        comboId: comboId ?? undefined,
      })));
    }

    const requestedTotalAmount = payload.totalAmount === undefined ? undefined : Number(payload.totalAmount);
    const items = payload.items as Array<{ serviceId?: string; comboId?: string; name: string; price: number | string; quantity?: number }> | undefined;
    if (items?.some((item) => !item.name.trim()
      || !Number.isFinite(Number(item.price))
      || Number(item.price) < 0
      || !Number.isInteger(Number(item.quantity ?? 1))
      || Number(item.quantity ?? 1) < 1)) {
      throw { status: 400, code: 'INVALID_BOOKING_ITEM', message: 'Each booking service must include a name, valid price, and positive whole-number quantity.' };
    }
    const itemsTotalAmount = items ? calculateBookingSubtotal(items) : undefined;
    const totalAmount = itemsTotalAmount ?? requestedTotalAmount;
    const discount = payload.discount === undefined ? undefined : Number(payload.discount);
    if (totalAmount !== undefined && (!Number.isFinite(totalAmount) || totalAmount < 0)) {
      throw { status: 400, code: 'INVALID_BOOKING_AMOUNT', message: 'Enter a valid non-negative booking amount.' };
    }
    if (discount !== undefined && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
      throw { status: 400, code: 'INVALID_BOOKING_DISCOUNT', message: 'Discount must be a number between 0 and 100.' };
    }
    let updateData: Record<string, any> = {};
    for (const field of ['status', 'bookingDate', 'staffId', 'notes'] as const) {
      if (payload[field] !== undefined) updateData[field] = payload[field];
    }
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (discount !== undefined) updateData.discount = discount;
    if (location) {
      updateData.salonId = location.salonId;
      updateData.branchId = location.branchId;
    }

    return prisma.$transaction(async (tx) => {
      const locationChanged = Boolean(location && (location.salonId !== booking.salonId || location.branchId !== booking.branchId));
      if (locationChanged) {
        const [payments, finance] = await Promise.all([
          tx.payment.count({ where: { bookingId: id } }),
          tx.bookingFinancialTransaction.findUnique({ where: { bookingId: id }, select: { id: true } }),
        ]);
        if (payments > 0 || finance) {
          throw { status: 409, code: 'BOOKING_UPDATE_NOT_ALLOWED', message: 'A booking with payment or financial records cannot be moved to another location.' };
        }
      }
      let gstConfig = booking.gstConfig;
      if (location && location.salonId !== booking.salonId) {
        gstConfig = await tx.gSTConfiguration.upsert({
          where: { salonId: location.salonId },
          create: {
            salonId: location.salonId,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 18,
            isActive: true,
          },
          update: {},
        });
        updateData.gstConfigurationId = gstConfig.id;
      } else if (!gstConfig && (totalAmount !== undefined || discount !== undefined)) {
        gstConfig = await tx.gSTConfiguration.upsert({
          where: { salonId: location?.salonId ?? booking.salonId },
          create: {
            salonId: location?.salonId ?? booking.salonId,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 18,
            isActive: true,
          },
          update: {},
        });
      }
      if (totalAmount !== undefined || discount !== undefined || locationChanged && location?.salonId !== booking.salonId) {
        const calculatedAmount = totalAmount ?? booking.totalAmount;
        const discountPercent = discount ?? booking.discount;
        const gstCalculation = gstService.applyGSTToBooking(
          calculatedAmount,
          discountPercent,
          gstConfig?.cgstRate ?? 9,
          gstConfig?.sgstRate ?? 9,
          gstConfig?.igstRate ?? 18,
          payload.taxType === 'IGST' || (payload.taxType === undefined && booking.igstAmount > 0) ? 'IGST' : 'CGST_SGST',
          gstConfig?.isActive ?? true
        );
        updateData = {
          ...updateData,
          totalAmount: calculatedAmount,
          discount: discountPercent,
          discountAmount: gstCalculation.discountAmount,
          taxableAmount: gstCalculation.taxableAmount,
          cgstAmount: gstCalculation.cgstAmount,
          sgstAmount: gstCalculation.sgstAmount,
          igstAmount: gstCalculation.igstAmount,
          totalTaxAmount: gstCalculation.totalTaxAmount,
          finalAmount: gstCalculation.finalAmount,
        };
        if (gstCalculation.finalAmount < Number(booking.totalPaid)) {
          throw { status: 409, code: 'BOOKING_AMOUNT_BELOW_PAID', message: 'The updated booking total cannot be less than the amount already paid.' };
        }
      }
      if (payload.staffId !== undefined || location) {
        const staffId = payload.staffId ?? booking.staffId;
        const allowedSalonIds = [location?.salonId ?? booking.salonId, ...(location?.branchId ?? booking.branchId ? [location?.branchId ?? booking.branchId!] : [])];
        if (staffId) {
          const staff = await tx.salonStaff.findUnique({ where: { id: staffId }, select: { salonId: true, isActive: true } });
          if (!staff || !staff.isActive || !allowedSalonIds.includes(staff.salonId)) {
            throw { status: 400, code: 'INVALID_BOOKING_STAFF_SCOPE', message: 'The selected Staff member is not active at this Salon or Branch.' };
          }
        }
      }
      if (items) {
        await tx.bookingService.deleteMany({ where: { bookingId: id } });
        await tx.bookingService.createMany({
          data: items.map((item) => ({
            bookingId: id,
            serviceId: item.serviceId ?? null,
            comboId: item.comboId ?? null,
            name: item.name.trim(),
            price: Number(item.price),
            quantity: Number(item.quantity ?? 1),
          })),
        });
      }
      const updated = await tx.booking.update({
        where: { id },
        data: updateData,
        include: {
          services: true,
          payments: true,
          gstConfig: true,
          salon: { select: { id: true, name: true, owner: { select: { id: true, firstName: true, lastName: true } } } },
          branch: { select: { id: true, name: true, parentId: true } },
        },
      });
      if (payload.status === BookingStatus.CANCELLED || payload.status === BookingStatus.NO_SHOW) await cancelBookingFinance(id, tx);
      return updated;
    });
  },

  async addPayment(bookingId: string, payload: any, actor?: BookingActor) {
    if (actor) await assertBookingAccess(bookingId, actor, 'add a payment to');
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw { status: 400, message: "Payment amount must be a valid positive number" };
    if (payload.method === PaymentMethod.RAZORPAY) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, salonId: true, finalAmount: true, totalPaid: true } });
      if (!booking) throw { status: 404, message: "Booking not found" };
      if (amount > Number(booking.finalAmount) - Number(booking.totalPaid)) throw { status: 400, message: "Payment exceeds the booking balance" };
      const { client, config } = await createRazorpayClient();
      const order = await client.orders.create({ amount: Math.round(amount * 100), currency: "INR", receipt: `booking_${booking.id}`, notes: { bookingId, salonId: booking.salonId, environment: config.environment } });
      const payment = await prisma.payment.create({ data: { bookingId, amount, method: PaymentMethod.RAZORPAY, status: PaymentStatus.PENDING, transactionId: order.id } });
      return { payment, checkout: { keyId: config.keyId, orderId: order.id, amount: order.amount, currency: order.currency } };
    }
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { finalAmount: true, totalPaid: true } });
      if (!booking) throw { status: 404, message: "Booking not found" };
      if (amount > Number(booking.finalAmount) - Number(booking.totalPaid)) throw { status: 400, message: "Payment exceeds the booking balance" };
      const payment = await tx.payment.create({
        data: {
          bookingId,
          amount,
          method: payload.method as PaymentMethod,
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          transactionId: payload.transactionId,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          totalPaid: { increment: amount }
        }
      });

      await recordEligibleBookingFinance(tx, bookingId);
      return payment;
    });
  },

  async verifyRazorpayPayment(bookingId: string, payload: any, actor?: BookingActor) {
    if (actor) await assertBookingAccess(bookingId, actor, 'verify payment for');
    const { config } = await createRazorpayClient();
    const payment = await prisma.payment.findFirst({ where: { bookingId, transactionId: payload.razorpayOrderId, method: PaymentMethod.RAZORPAY } });
    if (!payment) throw { status: 404, message: "Booking payment transaction not found" };
    const expected = crypto.createHmac("sha256", config.keySecret).update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`).digest("hex");
    const supplied = Buffer.from(payload.razorpaySignature);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), supplied)) throw { status: 400, code: "PAYMENT_VERIFICATION_FAILED", message: "Payment signature verification failed" };
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } }, data: { status: PaymentStatus.COMPLETED, completedAt: new Date(), failureReason: null, transactionId: payload.razorpayPaymentId } });
      if (claimed.count) await tx.booking.update({ where: { id: bookingId }, data: { totalPaid: { increment: payment.amount } } });
      await recordEligibleBookingFinance(tx, bookingId);
      return tx.payment.findUnique({ where: { id: payment.id } });
    });
  },

  async cancelBooking(id: string, actor?: BookingActor) {
    if (actor) await assertBookingAccess(id, actor, 'cancel');
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });
      await cancelBookingFinance(id, tx);
      return booking;
    });
  },
};
