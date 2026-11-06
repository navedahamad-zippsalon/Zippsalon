import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requirePermissionOrRoles } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { dashboardStatsQuerySchema } from '../../validators/dashboard';

const router = Router();
const allowDashboard = requirePermissionOrRoles('dashboard.view', 'ADMIN', 'SUPER_ADMIN');

/**
 * @swagger
 * /api/v1/dashboard:
 *   get:
 *     summary: Get dashboard KPIs, revenue, services, and reviews
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, week, month, year, custom] }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [today, yesterday, 7d, 30d, 90d, thisWeek, thisMonth, lastMonth, thisYear, custom] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: salonId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dashboard data scoped to the authenticated user's salons and branches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         todayRevenue: { type: number }
 *                         monthlyRevenue: { type: number }
 *                     revenueOverview:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string }
 *                           revenue: { type: number }
 *                     serviceRevenue:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           serviceId: { type: string, nullable: true }
 *                           serviceName: { type: string }
 *                           revenue: { type: number }
 *                           percentage: { type: number }
 *                     reviewSummary:
 *                       type: object
 *                       properties:
 *                         averageRating: { type: number }
 *                         totalReviews: { type: integer }
 *                         distribution: { type: object, additionalProperties: { type: integer } }
 *                     recentReviews: { type: array, items: { type: object } }
 *       400: { description: Invalid date range or query }
 *       403: { description: Insufficient permission or requested salon/branch is outside the user's scope }
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get detailed dashboard statistics
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard statistics and revenue trends }
 * /api/v1/dashboard/filters:
 *   get:
 *     summary: Get dashboard filters within the user's authorized scope
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Available dashboard filters }
 * /api/v1/dashboard/filter-options:
 *   get:
 *     summary: Get dashboard filter options
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Available dashboard filter options }
 * /api/v1/dashboard/export:
 *   get:
 *     summary: Export dashboard bookings as CSV
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: CSV export }
 */
router.get('/stats', authenticate, allowDashboard, validate({ query: dashboardStatsQuerySchema }), dashboardController.getStats);
router.get('/filters', authenticate, allowDashboard, validate({ query: dashboardStatsQuerySchema }), dashboardController.getFilters);
// Consolidated aliases used by the current admin/vendor dashboard clients.  Keep
// the original endpoints above intact for existing consumers.
router.get('/', authenticate, allowDashboard, validate({ query: dashboardStatsQuerySchema }), dashboardController.getDashboard);
router.get('/filter-options', authenticate, allowDashboard, validate({ query: dashboardStatsQuerySchema }), dashboardController.getFilters);
router.get('/export', authenticate, requirePermissionOrRoles('dashboard.export', 'ADMIN', 'SUPER_ADMIN'), validate({ query: dashboardStatsQuerySchema }), dashboardController.export);

export default router;
