import { NextFunction, Response } from "express";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { dashboardService } from "../dashboard/dashboard.service";
import { expensesService } from "./expenses.service";
import { expenseListQuerySchema, type ExpenseListQuery } from "../../validators/expenses";

const userOf = (req: AuthRequest) => req.user!;
export const parseExpenseQuery = (req: Pick<AuthRequest, "query">): ExpenseListQuery =>
  expenseListQuerySchema.parse(req.query);
const idOf = (req: AuthRequest): string => {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] ?? "" : id ?? "";
};
const success = (req: AuthRequest, key: string, data: unknown) => ({
  success: true,
  messageKey: key,
  message: req.t?.(key) ?? key,
  data,
});

export const expensesController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.list_loaded", await expensesService.list(parseExpenseQuery(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.record_loaded", await expensesService.get(idOf(req), req.query as never, userOf(req))));
    } catch (error) { next(error); }
  },
  async categories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.categories_loaded", await expensesService.categories(parseExpenseQuery(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async filters(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.filters_loaded", await expensesService.filters(parseExpenseQuery(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await expensesService.createCategory(req.body.name, parseExpenseQuery(req), userOf(req));
      res.status(201).json(success(req, "expenses.category_created", category));
    } catch (error) { next(error); }
  },
  async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.category_updated", await expensesService.updateCategory(idOf(req), req.body, parseExpenseQuery(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.category_deleted", await expensesService.deleteCategory(idOf(req), parseExpenseQuery(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const expense = await expensesService.create(req.body, userOf(req));
      res.status(201).json(success(req, "expenses.created", expense));
    } catch (error) { next(error); }
  },
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.updated", await expensesService.update(idOf(req), req.body, userOf(req))));
    } catch (error) { next(error); }
  },
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(success(req, "expenses.deleted", await expensesService.delete(idOf(req), userOf(req))));
    } catch (error) { next(error); }
  },
  async overview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = parseExpenseQuery(req);
      const expenses = await expensesService.analytics(query, userOf(req));
      const stats = await dashboardService.getStats({
        vendorId: query.vendorId,
        salonId: query.salonId,
        branchId: query.branchId,
        countryId: query.countryId,
        cityId: query.cityId,
        startDate: expenses.filters.startDate,
        endDate: expenses.filters.endDate,
      }, userOf(req));
      const sales = Number(stats.summary.revenue ?? 0);
      res.json(success(req, "expenses.overview_loaded", {
        ...expenses,
        sales,
        profit: sales - expenses.totalExpenses,
      }));
    } catch (error) { next(error); }
  },
  async export(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await expensesService.export(parseExpenseQuery(req), userOf(req));
      res.type("text/csv").attachment("expenses.csv").send(csv);
    } catch (error) { next(error); }
  },
};
