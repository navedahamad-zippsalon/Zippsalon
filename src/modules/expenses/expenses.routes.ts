import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware";
import { requireAnyPermissionOrRoles, requirePermission } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  expenseCategoryPayloadSchema,
  expenseIdSchema,
  expenseListQuerySchema,
  expensePayloadSchema,
  expenseUpdateSchema,
} from "../../validators/expenses";
import { expensesController } from "./expenses.controller";

const router = Router();

router.use(authenticate);
router.get("/overview", requirePermission("expenses.view"), validate({ query: expenseListQuerySchema }), expensesController.overview);
router.get("/export", requirePermission("expenses.list"), validate({ query: expenseListQuerySchema }), expensesController.export);
router.get("/filters", requirePermission("expenses.view"), validate({ query: expenseListQuerySchema }), expensesController.filters);
router.get("/categories", requirePermission("expenses.categories.view"), validate({ query: expenseListQuerySchema }), expensesController.categories);
router.post("/categories", requirePermission("expenses.categories.create"), validate({ body: expenseCategoryPayloadSchema, query: expenseListQuerySchema }), expensesController.createCategory);
router.patch("/categories/:id", requirePermission("expenses.categories.update"), validate({ params: expenseIdSchema, body: expenseCategoryPayloadSchema.partial(), query: expenseListQuerySchema }), expensesController.updateCategory);
router.delete("/categories/:id", requirePermission("expenses.categories.delete"), validate({ params: expenseIdSchema, query: expenseListQuerySchema }), expensesController.deleteCategory);
router.get("/", requireAnyPermissionOrRoles(["expenses.view", "expenses.list"]), validate({ query: expenseListQuerySchema }), expensesController.list);
router.post("/", requirePermission("expenses.create"), validate({ body: expensePayloadSchema }), expensesController.create);
router.get("/:id", requirePermission("expenses.view"), validate({ params: expenseIdSchema, query: expenseListQuerySchema }), expensesController.get);
router.patch("/:id", requirePermission("expenses.update"), validate({ params: expenseIdSchema, body: expenseUpdateSchema }), expensesController.update);
router.delete("/:id", requirePermission("expenses.delete"), validate({ params: expenseIdSchema }), expensesController.delete);

export default router;
