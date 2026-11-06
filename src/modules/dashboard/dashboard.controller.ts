import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { dashboardService } from './dashboard.service';
import { getEffectivePermissions } from '../rbac/rbac.service';

export const dashboardController = {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dashboardService.getStats(req.query as any, req.user);
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },
  async getFilters(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await dashboardService.getFilters(req.query as any, req.user) }); } catch (error) { next(error); }
  },
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const result = await dashboardService.getDashboard(req.query as any, user);
      if (user.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role))) {
        res.json({ success: true, data: result });
        return;
      }

      const locationId = typeof req.query.branchId === 'string'
        ? req.query.branchId
        : typeof req.query.salonId === 'string' ? req.query.salonId : user.salonId;
      const permissions = new Set(await getEffectivePermissions(user.userId, locationId));
      const summary = result.dashboardSummary;
      const canViewRevenue = permissions.has('dashboard.revenue.view') || permissions.has('dashboard.view');
      const canViewExpenses = permissions.has('expenses.view');
      const canViewAppointments = permissions.has('bookings.view');
      const canViewCustomers = permissions.has('customers.view');
      res.json({
        success: true,
        data: {
          ...result,
          dashboardSummary: {
            ...summary,
            today: {
              ...summary.today,
              salesAmount: canViewRevenue ? summary.today.salesAmount : null,
              cashCollected: canViewRevenue ? summary.today.cashCollected : null,
              upiCollected: canViewRevenue ? summary.today.upiCollected : null,
              appointmentCount: canViewAppointments ? summary.today.appointmentCount : null,
              completedAppointmentCount: canViewAppointments ? summary.today.completedAppointmentCount : null,
            },
            month: {
              ...summary.month,
              salesAmount: canViewRevenue ? summary.month.salesAmount : null,
              previousComparableSalesAmount: canViewRevenue ? summary.month.previousComparableSalesAmount : null,
              salesChangePercentage: canViewRevenue ? summary.month.salesChangePercentage : null,
              expenseAmount: canViewExpenses ? summary.month.expenseAmount : null,
              expenseCategories: canViewExpenses ? summary.month.expenseCategories : [],
              approximateProfit: canViewRevenue && canViewExpenses ? summary.month.approximateProfit : null,
              customerCount: canViewCustomers ? summary.month.customerCount : null,
              inactiveCustomerCount: canViewCustomers ? summary.month.inactiveCustomerCount : null,
            },
          },
        },
      });
    } catch (error: any) {
      error.code ??= 'DASHBOARD_FETCH_ERROR';
      next(error);
    }
  },
  async export(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rows = await dashboardService.exportBookings(req.query as any, req.user);
      const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const headers = ['Vendor Name', 'Salon Name', 'Branch Name', 'City', 'Booking Number', 'Customer Name', 'Service', 'Staff', 'Date', 'Amount', 'Payment Status', 'Booking Status'];
      const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
      res.type('text/csv').attachment(`dashboard-${new Date().toISOString().slice(0, 10)}.csv`).send(csv);
    } catch (error) { next(error); }
  }
};
