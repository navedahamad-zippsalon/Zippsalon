import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { normalizeCountry } from './country';
import logger from '../../infrastructure/logger/logger';

type DashboardQuery = {
  country?: string; countryId?: string; stateId?: string; cityId?: string; city?: string; salonId?: string; branchId?: string; vendorId?: string;
  status?: 'ACTIVE' | 'INACTIVE'; range?: string; period?: string; startDate?: string; endDate?: string; search?: string;
  serviceId?: string; staffId?: string; bookingStatus?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'DONE' | 'CANCELLED' | 'NO_SHOW';
  paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
};
type DashboardUser = { userId: string; roles: string[] };
type Scope = { salonIds: string[]; branchId?: string };
const BUSINESS_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const admin = (user: DashboardUser) => user.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
const fail = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };

function normalizedDashboardQuery(query: DashboardQuery = {}): DashboardQuery {
  const country = normalizeCountry(query.countryId ?? query.country ?? 'India');
  const periodRange: Record<string, string> = { week: 'thisWeek', month: 'thisMonth', year: 'thisYear', custom: 'custom' };
  return {
    ...query,
    country,
    countryId: country,
    cityId: query.cityId ?? query.city,
    range: query.period ? periodRange[query.period] ?? query.range : query.range,
    status: query.status?.toUpperCase() as DashboardQuery['status'],
    bookingStatus: query.bookingStatus?.toUpperCase() as DashboardQuery['bookingStatus'],
    search: query.search?.trim() || undefined,
  };
}

function dateRange(query: DashboardQuery) {
  const normalized = normalizedDashboardQuery(query);
  const today = businessDayBounds();
  const currentMonth = businessMonthBounds();
  const previousMonth = businessMonthBounds(new Date(currentMonth.start.getTime() - 1));
  const currentYear = businessYearBounds();
  const localToday = localDateParts(today.start);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, weekday: 'short' }).format(today.start);
  const daysSinceMonday = ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 } as Record<string, number>)[weekday] ?? 0;
  const monday = new Date(Date.UTC(localToday.year, localToday.month - 1, localToday.day - daysSinceMonday));
  const weekStart = localMidnightUtc(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
  const start = normalized.startDate ? businessDateBounds(normalized.startDate).start
    : normalized.range === 'yesterday' ? new Date(today.start.getTime() - 86400000)
      : normalized.range === '7d' ? new Date(today.start.getTime() - 6 * 86400000)
        : normalized.range === '30d' ? new Date(today.start.getTime() - 29 * 86400000)
          : normalized.range === '90d' ? new Date(today.start.getTime() - 89 * 86400000)
            : normalized.range === 'thisWeek' ? weekStart
              : normalized.range === 'thisMonth' ? currentMonth.start
                : normalized.range === 'lastMonth' ? previousMonth.start
                  : normalized.range === 'thisYear' ? currentYear.start
                    : today.start;
  const end = normalized.endDate ? businessDateBounds(normalized.endDate).end
    : normalized.range === 'yesterday' ? new Date(today.end.getTime() - 86400000)
      : normalized.range === 'lastMonth' ? new Date(currentMonth.start.getTime() - 1)
        : normalized.range === 'thisWeek' ? today.end
          : normalized.range === 'thisMonth' ? currentMonth.end
            : normalized.range === 'thisYear' ? currentYear.end
              : today.end;
  if (start > end) fail(400, 'startDate must be before endDate');
  return { start, end };
}

async function salonsFor(query: DashboardQuery, user: DashboardUser) {
  const normalized = normalizedDashboardQuery(query);
  if (!admin(user) && user.roles.includes('VENDOR') && normalized.vendorId && normalized.vendorId !== user.userId) fail(403, 'You cannot access another vendor');
  const userScope = admin(user) ? {} : user.roles.includes('VENDOR') ? { OR: [{ ownerId: user.userId }, { parent: { ownerId: user.userId } }] } : { OR: [{ ownerId: user.userId }, { staff: { some: { userId: user.userId, isActive: true } } }, { branches: { some: { staff: { some: { userId: user.userId, isActive: true } } } } }] };
  const vendorScope = normalized.vendorId ? { OR: [{ ownerId: normalized.vendorId }, { parent: { ownerId: normalized.vendorId } }] } : {};
  const where: any = { AND: [userScope, vendorScope], ...(normalized.status ? { isActive: normalized.status === 'ACTIVE' } : {}), ...(normalized.search ? { OR: [{ name: { contains: normalized.search, mode: 'insensitive' } }, { owner: { firstName: { contains: normalized.search, mode: 'insensitive' } } }, { owner: { lastName: { contains: normalized.search, mode: 'insensitive' } } }, { address: { city: { contains: normalized.search, mode: 'insensitive' } } }, { parent: { name: { contains: normalized.search, mode: 'insensitive' } } }] } : {}) };
  if (normalized.countryId || normalized.cityId || normalized.stateId) {
    where.address = {
      ...(normalized.countryId ? { country: { equals: normalized.countryId, mode: 'insensitive' } } : {}),
      ...(normalized.cityId ? { city: { equals: normalized.cityId, mode: 'insensitive' } } : {}),
      ...(normalized.stateId ? { state: { equals: normalized.stateId, mode: 'insensitive' } } : {}),
    };
  }
  const all = await prisma.salon.findMany({ where, select: { id: true, name: true, ownerId: true, parentId: true, isActive: true, address: { select: { city: true, state: true, country: true } }, owner: { select: { firstName: true, lastName: true } } } });

  const selected = query.salonId ? all.find((salon) => salon.id === query.salonId) : undefined;
  if (query.salonId && !selected) fail(403, 'Salon is outside your scope');
  if (query.branchId) {
    const branch = all.find((salon) => salon.id === query.branchId && Boolean(salon.parentId));
    if (!branch) fail(403, 'Branch is outside your scope');
    if (query.salonId && branch?.parentId !== query.salonId) fail(400, 'Branch does not belong to the selected salon');
  }
  const selectedSalon = selected?.parentId ? all.find((salon) => salon.id === selected.parentId) : selected;
  const vendorRootIds = normalized.vendorId ? all.filter((salon) => !salon.parentId && salon.ownerId === normalized.vendorId).map((salon) => salon.id) : [];
  const rootScopeIds = selectedSalon
    ? [selectedSalon.id, ...all.filter((salon) => salon.parentId === selectedSalon.id).map((salon) => salon.id)]
    : (normalized.vendorId && vendorRootIds.length > 0 ? vendorRootIds.flatMap((rootId) => [rootId, ...all.filter((salon) => salon.parentId === rootId).map((salon) => salon.id)]) : all.filter((salon) => !salon.parentId).map((salon) => salon.id));
  const salonIds = [...new Set(rootScopeIds)];
  return { all, salonIds, branchId: query.branchId ?? (selected?.parentId ? selected.id : undefined) };
}

function bookingWhere(query: DashboardQuery, scope: Scope, start: Date, end: Date): any {
  return { salonId: { in: scope.salonIds }, ...(scope.branchId ? { branchId: scope.branchId } : {}), bookingDate: { gte: start, lte: end }, ...(query.bookingStatus ? { status: query.bookingStatus } : {}), ...(query.paymentStatus ? { payments: { some: { status: query.paymentStatus } } } : {}), ...(query.staffId ? { staffId: query.staffId } : {}), ...(query.serviceId ? { services: { some: { serviceId: query.serviceId } } } : {}) };
}

function revenueBookingWhere(query: DashboardQuery, scope: Scope): Prisma.BookingWhereInput {
  return {
    salonId: { in: scope.salonIds },
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
    status: { notIn: ['CANCELLED', 'NO_SHOW'], ...(query.bookingStatus ? { equals: query.bookingStatus } : {}) },
    ...(query.staffId ? { staffId: query.staffId } : {}),
    ...(query.serviceId ? { services: { some: { serviceId: query.serviceId } } } : {}),
  };
}

async function paymentTotals(query: DashboardQuery, scope: Scope, start: Date, end: Date) {
  const where: Prisma.PaymentWhereInput = { createdAt: { gte: start, lte: end }, booking: revenueBookingWhere(query, scope) };
  const [paid, pending, refunded] = await Promise.all([
    prisma.payment.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, status: 'REFUNDED' }, _sum: { amount: true } }),
  ]);
  return { paid: paid._sum?.amount ?? 0, pending: pending._sum?.amount ?? 0, refunded: refunded._sum?.amount ?? 0 };
}

export const dashboardService = {
  async getStats(query: DashboardQuery = {}, user: DashboardUser = { userId: '', roles: [] }) {
    const normalized = normalizedDashboardQuery(query);
    const { start, end } = dateRange(normalized);
    const selected = await salonsFor(normalized, user);
    const scope: Scope = { salonIds: selected.salonIds, branchId: selected.branchId };
    const where = bookingWhere(normalized, scope, start, end);
    const salonIds = selected.salonIds;
    if (!salonIds.length) return emptyStats(query);
    const locationIds = scope.branchId ? [scope.branchId] : selected.all.filter((salon) => !salon.parentId ? salonIds.includes(salon.id) : salonIds.includes(salon.parentId)).map((salon) => salon.id);

    const reviewWhere = { salonId: { in: salonIds }, ...(scope.branchId ? { branchId: scope.branchId } : {}), status: 'PUBLISHED' as const, createdAt: { gte: start, lte: end } };
    const [bookingCounts, payments, customers, staff, services, reviews, rating, reviewDistribution, upcoming, recentBookings, recentReviews, attendance, bookingTrend, revenueTrend, topServices, topStaff, branchPerformance] = await Promise.all([
      prisma.booking.groupBy({ by: ['status'], where, _count: { _all: true } }),
      paymentTotals(normalized, scope, start, end),
      prisma.booking.groupBy({ by: ['customerId'], where }).then((rows) => rows.length),
      prisma.salonStaff.count({ where: { salonId: { in: locationIds }, isActive: true, ...(query.staffId ? { id: query.staffId } : {}) } }),
      prisma.service.count({ where: { salonId: { in: locationIds }, isActive: true, ...(query.serviceId ? { id: query.serviceId } : {}) } }),
      prisma.review.count({ where: reviewWhere }),
      prisma.review.aggregate({ where: reviewWhere, _avg: { rating: true } }),
      prisma.review.groupBy({ by: ['rating'], where: reviewWhere, _count: { _all: true } }),
      prisma.booking.findMany({ where: { ...bookingWhere(query, scope, businessDayBounds().start, businessDayBounds().end), status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } }, select: { id: true, bookingDate: true, status: true, finalAmount: true, customer: { select: { firstName: true, lastName: true } }, services: { select: { name: true } } }, orderBy: { bookingDate: 'asc' }, take: 5 }),
      prisma.booking.findMany({ where, select: { id: true, bookingDate: true, finalAmount: true, status: true, totalPaid: true, customer: { select: { firstName: true, lastName: true } }, salon: { select: { name: true, owner: { select: { firstName: true, lastName: true } } } }, branch: { select: { name: true } }, staff: { select: { user: { select: { firstName: true, lastName: true } } } }, services: { select: { name: true } }, payments: { select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { bookingDate: 'desc' }, take: 10 }),
      prisma.review.findMany({ where: reviewWhere, select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { firstName: true, lastName: true } }, salon: { select: { name: true, owner: { select: { firstName: true, lastName: true } } } }, branch: { select: { name: true } }, staff: { select: { user: { select: { firstName: true, lastName: true } } } }, booking: { select: { services: { select: { name: true }, take: 1 } } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.attendance.groupBy({ by: ['status'], where: { staff: { salonId: { in: locationIds } }, date: new Date(new Date().toISOString().slice(0, 10)) }, _count: true }),
      trendBookings(query, scope, start, end),
      trendRevenue(query, scope, start, end),
      servicesRanking(where),
      staffRanking(where),
      branchesRanking(scope, start, end, query),
    ]);
    const counts = Object.fromEntries(bookingCounts.map((row) => [row.status, row._count._all]));
    const total = bookingCounts.reduce((sum, row) => sum + row._count._all, 0);
    const distribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    for (const row of reviewDistribution) {
      if (row.rating >= 1 && row.rating <= 5) distribution[String(row.rating) as keyof typeof distribution] = row._count._all;
    }
    const reviewSummary = { averageRating: rating._avg.rating ?? 0, totalReviews: reviews, distribution };
    const summary = { revenue: payments.paid, bookings: total, customers, staff, services, reviews, averageRating: reviewSummary.averageRating, appointments: total, revenueLegacy: payments.paid, totalRevenue: payments.paid, totalBookings: total, totalCustomers: customers, totalStaff: staff, totalServices: services };
    const attendanceResult = attendance.reduce((result: Record<string, number>, row) => { result[row.status.toLowerCase()] = row._count; return result; }, { present: 0, absent: 0, half_day: 0 });
    return { filters: query, summary, reviewSummary, bookingAnalytics: { total, completed: counts.DONE ?? 0, confirmed: counts.CONFIRMED ?? 0, pending: counts.PENDING ?? 0, cancelled: counts.CANCELLED ?? 0, noShow: counts.NO_SHOW ?? 0, checkedIn: counts.CHECKED_IN ?? 0 }, revenueAnalytics: { total: payments.paid + payments.pending, paid: payments.paid, pending: payments.pending, refunded: payments.refunded }, bookingTrend, revenueTrend, topServices, topStaff, branchPerformance, recentBookings: recentBookings.map((booking) => ({ bookingNumber: booking.id, customerName: `${booking.customer.firstName} ${booking.customer.lastName ?? ''}`.trim(), vendorName: `${booking.salon.owner.firstName} ${booking.salon.owner.lastName ?? ''}`.trim(), salonName: booking.salon.name, branchName: booking.branch?.name ?? null, serviceName: booking.services.map((service) => service.name).join(', '), staffName: `${booking.staff?.user.firstName ?? ''} ${booking.staff?.user.lastName ?? ''}`.trim() || null, date: booking.bookingDate, amount: booking.finalAmount, paymentStatus: booking.payments[0]?.status ?? 'PENDING', bookingStatus: booking.status, id: booking.id, bookingDate: booking.bookingDate, finalAmount: booking.finalAmount, status: booking.status })), recentReviews: recentReviews.map((review) => ({ id: review.id, customerName: `${review.customer.firstName} ${review.customer.lastName ?? ''}`.trim(), vendorName: `${review.salon.owner.firstName} ${review.salon.owner.lastName ?? ''}`.trim(), salonName: review.salon.name, branchName: review.branch?.name ?? null, serviceName: review.booking.services[0]?.name ?? null, staffName: review.staff ? `${review.staff.user.firstName} ${review.staff.user.lastName ?? ''}`.trim() : null, rating: review.rating, comment: review.comment, review: review.comment, createdAt: review.createdAt })), inventory: await inventorySummary(scope), upcoming, attendance: attendanceResult };
  },
  /**
   * Frontend-oriented consolidated view.  It deliberately reuses getStats and
   * the same scope resolver so a vendor cannot obtain another vendor's rows by
   * changing any query parameter.
   */
  async getDashboard(query: DashboardQuery = {}, user: DashboardUser = { userId: '', roles: [] }) {
    const startedAt = Date.now();
    const normalized = normalizedDashboardQuery({ ...query, range: query.range ?? 'thisMonth' });
    const stats = await this.getStats(normalized, user);
    const selected = await salonsFor(normalized, user);
    const scope: Scope = { salonIds: selected.salonIds, branchId: selected.branchId };
    if (!scope.salonIds.length) return dashboardContract(stats, {}, [], [], []);

    const { start, end } = dateRange(normalized);
    const today = businessDayBounds();
    const month = businessMonthBounds();
    const filteredWhere = bookingWhere(normalized, scope, start, end);
    const todayWhere = bookingWhere(normalized, scope, today.start, today.end);
    const [todayCounts, monthPayments, todayPayments, recentCustomerBookings, todaySchedule, staffDetails, paidServiceRevenue] = await Promise.all([
      prisma.booking.groupBy({ by: ['status'], where: todayWhere, _count: { _all: true } }),
      paymentTotals(normalized, scope, month.start, month.end),
      paymentTotals(normalized, scope, today.start, today.end),
      prisma.booking.findMany({
        where: filteredWhere,
        distinct: ['customerId'],
        orderBy: { bookingDate: 'desc' },
        take: 10,
        select: { customerId: true, bookingDate: true, customer: { select: { firstName: true, lastName: true } }, services: { select: { name: true }, take: 1 } },
      }),
      prisma.booking.findMany({
        where: { ...todayWhere, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
        orderBy: { bookingDate: 'asc' }, take: 10,
        select: { id: true, bookingDate: true, finalAmount: true, status: true, customer: { select: { firstName: true, lastName: true } }, salon: { select: { name: true } }, branch: { select: { name: true } }, staff: { select: { user: { select: { firstName: true, lastName: true } } } }, services: { select: { name: true }, take: 1 } },
      }),
      prisma.salonStaff.findMany({ where: { id: { in: stats.topStaff.map((item: any) => item.staffId).filter(Boolean) } }, select: { id: true, role: true } }),
      serviceRevenue(normalized, scope, start, end),
    ]);
    const todayStatus = Object.fromEntries(todayCounts.map((row) => [row.status, row._count._all]));
    const staffRoles = new Map(staffDetails.map((staff) => [staff.id, staff.role]));
    const kpis = {
      todayRevenue: todayPayments.paid,
      monthlyRevenue: monthPayments.paid,
      todayAppointments: todayCounts.reduce((sum, row) => sum + row._count._all, 0),
      pendingAppointments: todayStatus.PENDING ?? 0,
      completedAppointments: todayStatus.DONE ?? 0,
      pendingPayments: stats.revenueAnalytics.pending,
      totalCustomers: stats.summary.customers,
      newCustomers: stats.summary.customers,
      totalBookings: stats.summary.totalBookings,
      cancelledBookings: stats.bookingAnalytics.cancelled,
      customerRetention: retentionPercent(stats.bookingAnalytics.total, stats.summary.customers),
    };
    const statsWithRevenueSummary = {
      ...stats,
      summary: { ...stats.summary, todayRevenue: todayPayments.paid, monthlyRevenue: monthPayments.paid },
    };
    const result = dashboardContract(statsWithRevenueSummary, kpis, recentCustomerBookings.map((booking) => ({
      customerId: booking.customerId,
      name: `${booking.customer.firstName} ${booking.customer.lastName ?? ''}`.trim(),
      serviceName: booking.services[0]?.name ?? null,
      lastVisit: booking.bookingDate.toISOString().slice(0, 10),
      customerType: 'REGULAR',
    })), todaySchedule.map((booking) => ({
      bookingId: booking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName ?? ''}`.trim(),
      serviceName: booking.services[0]?.name ?? null,
      staffName: booking.staff ? `${booking.staff.user.firstName} ${booking.staff.user.lastName ?? ''}`.trim() : null,
      time: booking.bookingDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }),
      amount: booking.finalAmount ?? 0,
      status: booking.status.toLowerCase(),
      salonName: booking.salon.name,
      branchName: booking.branch?.name ?? null,
    })), stats.topStaff.map((item: any) => ({ ...item, bookings: item.bookingCount ?? 0, designation: staffRoles.get(item.staffId) ?? null })), paidServiceRevenue);
    if (process.env.NODE_ENV !== 'production') logger.debug('dashboard_query', { filters: normalized, roles: user.roles, vendorId: user.roles.includes('VENDOR') ? user.userId : undefined, salonCount: scope.salonIds.length, branchId: scope.branchId, durationMs: Date.now() - startedAt });
    return result;
  },
  async getFilters(query: DashboardQuery = {}, user: DashboardUser = { userId: '', roles: [] }) {
    const normalized = normalizedDashboardQuery(query);
    const selected = await salonsFor({ ...normalized, salonId: undefined, branchId: undefined }, user);
    const countryName = normalizeCountry(normalized.countryId ?? normalized.country ?? 'India');
    const countrySalons = selected.all.filter((salon) => normalizeCountry(salon.address?.country ?? undefined) === countryName);
    const citySalons = normalized.cityId ? countrySalons.filter((salon) => salon.address?.city === normalized.cityId) : countrySalons;
    const vendorRootIds = new Set(citySalons.filter((salon) => !salon.parentId && salon.ownerId === normalized.vendorId).map((salon) => salon.id));
    const vendorSalons = normalized.vendorId ? citySalons.filter((salon) => salon.ownerId === normalized.vendorId || (salon.parentId ? vendorRootIds.has(salon.parentId) : false)) : citySalons;
    const salonScope = normalized.salonId ? vendorSalons.filter((salon) => salon.id === normalized.salonId || salon.parentId === normalized.salonId) : vendorSalons;
    const vendorIds = [...new Set(citySalons.filter((salon) => !salon.parentId).map((salon) => salon.ownerId))];
    const vendors = vendorIds.length ? await prisma.user.findMany({ where: { id: { in: vendorIds }, roles: { some: { role: { name: 'VENDOR' } } } }, select: { id: true, firstName: true, lastName: true, email: true } }) : [];
    const countries = [{ id: 'India', name: 'India' }];
    // Derive cities from the already authorized salon set; querying every
    // address here would disclose other vendors' operating locations.
    const cities = [...new Set(salonScope.map((salon) => salon.address?.city).filter(Boolean) as string[])].map((city) => ({ id: city, name: city }));
    const vendorList = vendors.map((vendor) => ({ id: vendor.id, name: `${vendor.firstName} ${vendor.lastName ?? ''}`.trim() || vendor.email || 'Vendor', email: vendor.email ?? null }));
    const salonsList = vendorSalons.filter((salon) => !salon.parentId).map((salon) => ({ id: salon.id, name: salon.name, city: salon.address?.city ?? null, vendorId: salon.ownerId, status: salon.isActive ? 'ACTIVE' : 'INACTIVE' }));
    const branchesList = vendorSalons.filter((salon) => Boolean(salon.parentId) && (normalized.salonId ? salon.parentId === normalized.salonId : true)).map((salon) => ({ id: salon.id, name: salon.name, city: salon.address?.city ?? null, salonId: salon.parentId ?? null, vendorId: salon.ownerId ?? null, status: salon.isActive ? 'ACTIVE' : 'INACTIVE' }));
    const parentIds = normalized.salonId ? [normalized.salonId] : vendorSalons.filter((salon) => !salon.parentId).map((salon) => salon.id);
    return { countries, cities, vendors: vendorList, salons: salonsList, branches: branchesList, statuses: ['active', 'inactive'], statusOptions: ['ACTIVE', 'INACTIVE'], selectedCountry: normalized.countryId, selectedCity: normalized.cityId, selectedVendor: normalized.vendorId, selectedSalon: normalized.salonId, selectedBranch: normalized.branchId, selectedStatus: normalized.status?.toLowerCase() };
  },
  async exportBookings(query: DashboardQuery = {}, user: DashboardUser = { userId: '', roles: [] }) {
    const result = await this.getStats(query, user);
    return result.recentBookings.map((booking) => [booking.bookingNumber, booking.salonName, booking.branchName, '', booking.bookingNumber, booking.customerName, booking.serviceName, booking.staffName, booking.date, booking.amount, booking.paymentStatus, booking.bookingStatus]);
  },
};

function bookingSqlFilters(query: DashboardQuery, alias = 'b') {
  return Prisma.sql`${query.bookingStatus ? Prisma.sql`AND ${Prisma.raw(`"${alias}"."status"`)} = CAST(${query.bookingStatus} AS "BookingStatus")` : Prisma.empty} ${query.staffId ? Prisma.sql`AND ${Prisma.raw(`"${alias}"."staffId"`)} = ${query.staffId}` : Prisma.empty} ${query.serviceId ? Prisma.sql`AND EXISTS (SELECT 1 FROM "BookingService" bs_filter WHERE bs_filter."bookingId" = ${Prisma.raw(`"${alias}"."id"`)} AND bs_filter."serviceId" = ${query.serviceId})` : Prisma.empty} ${query.paymentStatus ? Prisma.sql`AND EXISTS (SELECT 1 FROM "Payment" p_filter WHERE p_filter."bookingId" = ${Prisma.raw(`"${alias}"."id"`)} AND p_filter."status" = CAST(${query.paymentStatus} AS "PaymentStatus"))` : Prisma.empty}`;
}

async function trendBookings(query: DashboardQuery, scope: Scope, start: Date, end: Date) {
  const yearly = query.period === 'year' || query.range === 'thisYear';
  const dateBucket = yearly
    ? Prisma.sql`TO_CHAR(DATE_TRUNC('month', b."bookingDate"), 'YYYY-MM')`
    : Prisma.sql`TO_CHAR(DATE_TRUNC('day', b."bookingDate"), 'YYYY-MM-DD')`;
  return prisma.$queryRaw<Array<{ date: string; bookings: number; completed: number; confirmed: number; cancelled: number; pending: number; noShow: number }>>(Prisma.sql`SELECT ${dateBucket} AS date, COUNT(*)::int AS bookings, COUNT(*) FILTER (WHERE b.status = 'DONE')::int AS completed, COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int AS confirmed, COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS cancelled, COUNT(*) FILTER (WHERE b.status = 'PENDING')::int AS pending, COUNT(*) FILTER (WHERE b.status = 'NO_SHOW')::int AS "noShow" FROM "Booking" b WHERE b."salonId" IN (${Prisma.join(scope.salonIds)}) AND b."bookingDate" >= ${start} AND b."bookingDate" <= ${end} ${scope.branchId ? Prisma.sql`AND b."branchId" = ${scope.branchId}` : Prisma.empty} ${bookingSqlFilters(query)} GROUP BY 1 ORDER BY 1`);
}

async function trendRevenue(query: DashboardQuery, scope: Scope, start: Date, end: Date) {
  const yearly = query.period === 'year' || query.range === 'thisYear';
  const dateBucket = yearly
    ? Prisma.sql`TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM')`
    : Prisma.sql`TO_CHAR(DATE_TRUNC('day', p."createdAt"), 'YYYY-MM-DD')`;
  return prisma.$queryRaw<Array<{ date: string; revenue: number }>>(Prisma.sql`SELECT ${dateBucket} AS date, COALESCE(SUM(p.amount), 0)::float AS revenue FROM "Payment" p JOIN "Booking" b ON b.id = p."bookingId" WHERE p.status = 'COMPLETED' AND b.status NOT IN ('CANCELLED', 'NO_SHOW') AND p."createdAt" >= ${start} AND p."createdAt" <= ${end} AND b."salonId" IN (${Prisma.join(scope.salonIds)}) ${scope.branchId ? Prisma.sql`AND b."branchId" = ${scope.branchId}` : Prisma.empty} ${bookingSqlFilters({ ...query, paymentStatus: undefined })} GROUP BY 1 ORDER BY 1`);
}

async function serviceRevenue(query: DashboardQuery, scope: Scope, start: Date, end: Date) {
  const rows = await prisma.$queryRaw<Array<{ serviceId: string | null; serviceName: string; bookingCount: number; revenue: number }>>(Prisma.sql`
    WITH paid_bookings AS (
      SELECT b.id AS "bookingId", SUM(p.amount)::float AS revenue
      FROM "Booking" b
      JOIN "Payment" p ON p."bookingId" = b.id AND p.status = 'COMPLETED'
      WHERE b."salonId" IN (${Prisma.join(scope.salonIds)})
        AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
        AND p."createdAt" >= ${start} AND p."createdAt" <= ${end}
        ${scope.branchId ? Prisma.sql`AND b."branchId" = ${scope.branchId}` : Prisma.empty}
        ${bookingSqlFilters({ ...query, paymentStatus: undefined })}
      GROUP BY b.id
    ),
    service_totals AS (
      SELECT bs."bookingId", SUM(bs.price)::float AS "totalPrice"
      FROM "BookingService" bs
      JOIN paid_bookings pb ON pb."bookingId" = bs."bookingId"
      GROUP BY bs."bookingId"
    )
    SELECT bs."serviceId", bs.name AS "serviceName",
      COUNT(DISTINCT bs."bookingId")::int AS "bookingCount",
      COALESCE(SUM(CASE WHEN st."totalPrice" > 0 THEN pb.revenue * bs.price / st."totalPrice" ELSE 0 END), 0)::float AS revenue
    FROM "BookingService" bs
    JOIN paid_bookings pb ON pb."bookingId" = bs."bookingId"
    JOIN service_totals st ON st."bookingId" = bs."bookingId"
    WHERE (${query.serviceId ? Prisma.sql`bs."serviceId" = ${query.serviceId}` : Prisma.sql`TRUE`})
    GROUP BY bs."serviceId", bs.name
    ORDER BY revenue DESC, bs.name ASC
  `);
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  return rows.map((row) => ({
    ...row,
    revenue: Number(row.revenue) || 0,
    percentage: totalRevenue > 0 ? Math.round((Number(row.revenue) / totalRevenue) * 10000) / 100 : 0,
  }));
}

async function servicesRanking(where: any) {
  const rows = await prisma.bookingService.groupBy({ by: ['serviceId', 'name'], where: { booking: where, serviceId: { not: null } }, _count: { _all: true }, _sum: { price: true }, orderBy: { _count: { bookingId: 'desc' } }, take: 10 });
  return rows.map((row) => ({ serviceId: row.serviceId, serviceName: row.name, bookingCount: row._count._all, revenue: row._sum.price ?? 0 }));
}

async function staffRanking(where: any) {
  const rows = await prisma.booking.groupBy({ by: ['staffId'], where: { ...where, staffId: { not: null } }, _count: { _all: true }, _sum: { finalAmount: true }, orderBy: { _count: { id: 'desc' } }, take: 10 });
  const staff = await prisma.salonStaff.findMany({ where: { id: { in: rows.map((row) => row.staffId as string) } }, select: { id: true, user: { select: { firstName: true, lastName: true } } } });
  const ratings = await prisma.review.groupBy({ by: ['staffId'], where: { staffId: { in: rows.map((row) => row.staffId as string) } }, _avg: { rating: true } });
  const names = new Map(staff.map((member) => [member.id, `${member.user.firstName} ${member.user.lastName ?? ''}`.trim()]));
  const averages = new Map(ratings.map((row) => [row.staffId, row._avg.rating ?? 0]));
  return rows.map((row) => ({ staffId: row.staffId, staffName: names.get(row.staffId as string), bookingCount: row._count._all, revenue: row._sum.finalAmount ?? 0, rating: averages.get(row.staffId) ?? 0 }));
}

async function branchesRanking(scope: Scope, start: Date, end: Date, query: DashboardQuery) {
  return prisma.$queryRaw<Array<{ branchId: string; branchName: string; salonId: string; salonName: string; bookings: number; completedBookings: number; revenue: number; customers: number; reviews: number; averageRating: number }>>(Prisma.sql`WITH booking_agg AS (SELECT b."branchId", b."salonId", COUNT(*)::int AS bookings, COUNT(*) FILTER (WHERE b.status = 'DONE')::int AS "completedBookings", COUNT(DISTINCT b."customerId")::int AS customers FROM "Booking" b WHERE b."salonId" IN (${Prisma.join(scope.salonIds)}) AND b."branchId" IS NOT NULL AND b."bookingDate" >= ${start} AND b."bookingDate" <= ${end} ${scope.branchId ? Prisma.sql`AND b."branchId" = ${scope.branchId}` : Prisma.empty} ${bookingSqlFilters(query)} GROUP BY b."branchId", b."salonId"), revenue_agg AS (SELECT b."branchId", b."salonId", COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'COMPLETED'), 0)::float AS revenue FROM "Booking" b LEFT JOIN "Payment" p ON p."bookingId" = b.id WHERE b."salonId" IN (${Prisma.join(scope.salonIds)}) AND b."branchId" IS NOT NULL AND b."bookingDate" >= ${start} AND b."bookingDate" <= ${end} ${scope.branchId ? Prisma.sql`AND b."branchId" = ${scope.branchId}` : Prisma.empty} ${bookingSqlFilters(query)} GROUP BY b."branchId", b."salonId"), review_agg AS (SELECT r."branchId", r."salonId", COUNT(*)::int AS reviews, COALESCE(AVG(r.rating), 0)::float AS "averageRating" FROM "Review" r WHERE r."salonId" IN (${Prisma.join(scope.salonIds)}) AND r."branchId" IS NOT NULL AND r."createdAt" >= ${start} AND r."createdAt" <= ${end} GROUP BY r."branchId", r."salonId") SELECT br.id AS "branchId", br.name AS "branchName", s.id AS "salonId", s.name AS "salonName", COALESCE(ba.bookings, 0)::int AS bookings, COALESCE(ba."completedBookings", 0)::int AS "completedBookings", COALESCE(ra.revenue, 0)::float AS revenue, COALESCE(ba.customers, 0)::int AS customers, COALESCE(rva.reviews, 0)::int AS reviews, COALESCE(rva."averageRating", 0)::float AS "averageRating" FROM "Salon" br JOIN "Salon" s ON s.id = br."parentId" LEFT JOIN booking_agg ba ON ba."branchId" = br.id AND ba."salonId" = s.id LEFT JOIN revenue_agg ra ON ra."branchId" = br.id AND ra."salonId" = s.id LEFT JOIN review_agg rva ON rva."branchId" = br.id AND rva."salonId" = s.id WHERE s.id IN (${Prisma.join(scope.salonIds)}) ${scope.branchId ? Prisma.sql`AND br.id = ${scope.branchId}` : Prisma.empty} ORDER BY bookings DESC`);
}

function localDateParts(reference: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function localMidnightUtc(year: number, month: number, day: number) {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
    guess += target - represented;
  }
  return new Date(guess);
}

function localDayBounds(year: number, month: number, day: number) {
  const start = localMidnightUtc(year, month, day);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return { start, end: new Date(localMidnightUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()).getTime() - 1) };
}

function businessDayBounds(reference = new Date()) {
  const { year, month, day } = localDateParts(reference);
  return localDayBounds(year, month, day);
}

function businessDateBounds(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return fail(400, 'Dates must use YYYY-MM-DD');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return fail(400, 'Dates must be valid calendar dates');
  }
  return localDayBounds(year, month, day);
}

function businessMonthBounds(reference = new Date()) {
  const { year, month } = localDateParts(reference);
  const start = localMidnightUtc(year, month, 1);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return { start, end: new Date(localMidnightUtc(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1).getTime() - 1) };
}

function businessYearBounds(reference = new Date()) {
  const { year } = localDateParts(reference);
  const start = localMidnightUtc(year, 1, 1);
  return { start, end: new Date(localMidnightUtc(year + 1, 1, 1).getTime() - 1) };
}

function retentionPercent(bookings: number, customers: number) {
  if (!customers) return 0;
  // A customer with more than one visit is retained.  The ratio is bounded so
  // every empty or sparse data set remains safe for presentation.
  return Math.max(0, Math.min(100, Math.round(((bookings - customers) / customers) * 100)));
}

function dashboardContract(stats: any, kpiOverrides: Record<string, number>, recentCustomers: any[] = [], todaySchedule: any[] = [], topPerformers: any[] = [], serviceRevenue: any[] = []) {
  const kpis = {
    todayRevenue: 0, monthlyRevenue: 0, todayAppointments: 0, pendingAppointments: 0,
    completedAppointments: 0, customerRetention: 0, totalCustomers: 0, newCustomers: 0,
    totalBookings: 0, cancelledBookings: 0, pendingPayments: 0, ...kpiOverrides,
  };
  const bookingByDate = new Map<string, any>((stats.bookingTrend ?? []).map((item: any) => [item.date, item]));
  const revenueOverview = (stats.revenueTrend ?? []).map((item: any) => ({ date: item.date, revenue: Number(item.revenue) || 0, bookings: bookingByDate.get(item.date)?.bookings ?? 0 }));
  return {
    ...stats,
    kpis,
    revenueOverview,
    serviceRevenue,
    reviewSummary: stats.reviewSummary ?? { averageRating: 0, totalReviews: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } },
    todaySchedule,
    topPerformers,
    recentCustomers,
    recentReviews: (stats.recentReviews ?? []).map((review: any) => ({
      ...review, reviewId: review.id, date: review.createdAt,
    })),
    branchPerformance: (stats.branchPerformance ?? []).map((branch: any) => ({
      ...branch,
      cancelledBookings: branch.cancelledBookings ?? 0,
      status: branch.status ?? 'ACTIVE',
    })),
    inventorySummary: stats.inventory ?? { totalProducts: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 },
  };
}

async function inventorySummary(scope: Scope) {
  if (!scope.salonIds.length) return { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 };
  const rows = await prisma.$queryRaw<Array<{ totalProducts: number; totalStock: number; lowStock: number; outOfStock: number; inventoryValue: number }>>(Prisma.sql`SELECT COUNT(DISTINCT vp."productId")::int AS "totalProducts", COALESCE(SUM(s.quantity - s."reservedQuantity"), 0)::int AS "totalStock", COUNT(DISTINCT CASE WHEN s.quantity - s."reservedQuantity" > 0 AND s.quantity - s."reservedQuantity" <= s."reorderLevel" THEN vp."productId" END)::int AS "lowStock", COUNT(DISTINCT CASE WHEN s.quantity - s."reservedQuantity" <= 0 THEN vp."productId" END)::int AS "outOfStock", COALESCE(SUM((s.quantity - s."reservedQuantity") * pv."costPrice"), 0)::float AS "inventoryValue" FROM "InventoryStock" s JOIN "VendorProduct" vp ON vp.id = s."vendorProductId" JOIN "ProductVariant" pv ON pv.id = s."variantId" WHERE s."salonId" IN (${Prisma.join(scope.salonIds)}) ${scope.branchId ? Prisma.sql`AND s."branchId" = ${scope.branchId}` : Prisma.empty}`);
  return rows[0] ?? { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 };
}

function emptyStats(query: DashboardQuery) { return { filters: query, summary: { revenue: 0, bookings: 0, customers: 0, staff: 0, services: 0, reviews: 0, averageRating: 0, appointments: 0, totalRevenue: 0, totalBookings: 0, totalCustomers: 0, totalStaff: 0, totalServices: 0 }, reviewSummary: { averageRating: 0, totalReviews: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } }, bookingAnalytics: { total: 0, completed: 0, confirmed: 0, pending: 0, cancelled: 0, noShow: 0, checkedIn: 0 }, revenueAnalytics: { total: 0, paid: 0, pending: 0, refunded: 0 }, bookingTrend: [], revenueTrend: [], topServices: [], topStaff: [], branchPerformance: [], recentBookings: [], recentReviews: [], inventory: { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 }, upcoming: [], attendance: { present: 0, absent: 0, half_day: 0 } }; }
