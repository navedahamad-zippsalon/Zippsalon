import { differenceInCalendarDays, endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "../../infrastructure/database/prisma";
import { dashboardService } from "../dashboard/dashboard.service";
import type { ReportsQuery } from "../../validators/reports";
import { expenseListQuerySchema } from "../../validators/expenses";
import { expensesService } from "../expenses/expenses.service";

type ReportUser = { userId: string; roles: string[] };

function reportDates(query: ReportsQuery) {
    const now = new Date();
    const monthStart = query.year ? `${query.year}-${String(query.month ?? 1).padStart(2, "0")}-01` : undefined;
    const monthEnd = query.year ? new Date(Date.UTC(query.year, query.month ?? 12, 0)).toISOString().slice(0, 10) : undefined;
    const start = query.startDate ? startOfDay(new Date(`${query.startDate}T00:00:00`)) : monthStart ? startOfDay(new Date(`${monthStart}T00:00:00`)) : startOfDay(now);
    const end = query.endDate ? endOfDay(new Date(`${query.endDate}T00:00:00`)) : monthEnd ? endOfDay(new Date(`${monthEnd}T00:00:00`)) : endOfDay(now);
    return { start, end };
}

function previousDates(start: Date, end: Date) {
    const days = differenceInCalendarDays(end, start) + 1;
    const previousEnd = subDays(start, 1);
    return { start: subDays(previousEnd, days - 1), end: previousEnd };
}

function growth(current: number, previous: number) {
    return previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
}

async function enrichBranches(rows: any[]) {
    if (!rows.length) return [];
    const branches = await prisma.salon.findMany({
        where: { id: { in: rows.map((row) => row.branchId) } },
        select: { id: true, owner: { select: { firstName: true, lastName: true } }, _count: { select: { staff: true } } },
    });
    const byId = new Map(branches.map((branch) => [branch.id, branch]));
    return rows.map((row) => {
        const branch = byId.get(row.branchId);
        return {
            branchId: row.branchId,
            branchName: row.branchName,
            salonName: row.salonName,
            vendorName: branch ? `${branch.owner.firstName} ${branch.owner.lastName ?? ""}`.trim() : null,
            revenue: row.revenue ?? 0,
            bookingCount: row.bookings ?? 0,
            customerCount: row.customers ?? 0,
            staffCount: branch?._count.staff ?? 0,
        };
    });
}

export const reportsService = {
    async analytics(query: ReportsQuery, user: ReportUser) {
        const { start, end } = reportDates(query);
        const previous = previousDates(start, end);
        const { status, ...scopeQuery } = query;
        const dashboardQuery = { ...scopeQuery, bookingStatus: status, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
        const previousQuery = { ...dashboardQuery, startDate: previous.start.toISOString().slice(0, 10), endDate: previous.end.toISOString().slice(0, 10) };
        const [current, prior, expenseAnalytics] = await Promise.all([
            dashboardService.getStats(dashboardQuery, user),
            dashboardService.getStats(previousQuery, user),
            expensesService.analytics(expenseListQuerySchema.parse({
                vendorId: query.vendorId,
                salonId: query.salonId,
                branchId: query.branchId,
                countryId: query.countryId,
                cityId: query.cityId,
                startDate: dashboardQuery.startDate,
                endDate: dashboardQuery.endDate,
                month: query.month,
                year: query.year,
            }), user),
        ]);
        const branchPerformance = await enrichBranches(current.branchPerformance);
        const currentSummary = current.summary;
        const priorSummary = prior.summary;
        const currentBookings = current.bookingAnalytics;
        const revenue = currentSummary.revenue ?? 0;
        const totalExpenses = expenseAnalytics.totalExpenses;

        return {
            summary: {
                revenue,
                totalExpenses,
                profit: revenue - totalExpenses,
                previousRevenue: priorSummary.revenue ?? 0,
                revenueGrowthPercent: growth(currentSummary.revenue ?? 0, priorSummary.revenue ?? 0),
                newCustomers: currentSummary.totalCustomers ?? 0,
                customerGrowth: growth(currentSummary.totalCustomers ?? 0, priorSummary.totalCustomers ?? 0),
                retentionRate: null,
                averageOrderValue: currentBookings.total ? (currentSummary.revenue ?? 0) / currentBookings.total : 0,
                totalBookings: currentBookings.total ?? 0,
                completedBookings: currentBookings.completed ?? 0,
                pendingBookings: currentBookings.pending ?? 0,
                cancelledBookings: currentBookings.cancelled ?? 0,
                totalCustomers: currentSummary.totalCustomers ?? 0,
                totalStaff: currentSummary.totalStaff ?? 0,
                totalServices: currentSummary.totalServices ?? 0,
            },
            revenueTrend: current.revenueTrend ?? [],
            expenseTrend: expenseAnalytics.expenseTrend,
            categoryBreakdown: expenseAnalytics.categoryBreakdown,
            bookingTrend: current.bookingTrend ?? [],
            revenueByService: current.topServices ?? [],
            staffPerformance: (current.topStaff ?? []).map((staff: any) => ({ ...staff, role: null, rating: staff.rating > 0 ? staff.rating : null })),
            branchPerformance,
            recentBookings: current.recentBookings ?? [],
            recentReviews: current.recentReviews ?? [],
        };
    },

    async filters(query: ReportsQuery, user: ReportUser) {
        const { status: _status, ...scopeQuery } = query;
        const data = await dashboardService.getFilters(scopeQuery, user);
        return { vendors: data.vendors, salons: data.salons, branches: data.branches, countries: data.countries, cities: data.cities };
    },
};