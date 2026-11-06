import { ExpensePaymentMethod, ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { isPureCustomerUser, isVendorUser } from "../../common/utils/role.util";
import type { ExpenseListQuery, ExpensePayload, ExpenseUpdate } from "../../validators/expenses";

export type ExpenseUser = { userId: string; roles: string[] };

type ExpenseScope = {
  vendorIds: string[];
  rootSalonIds: string[];
  accessibleSalonIds: string[];
  branchId?: string;
  selectedSalonId?: string;
};
type ExpenseScopeQuery = Pick<ExpenseListQuery, "vendorId" | "salonId" | "branchId">
  & Partial<Pick<ExpenseListQuery, "countryId" | "cityId">>;

const isAdmin = (user: ExpenseUser) => user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
const fail = (status: number, messageKey: string): never => { throw Object.assign(new Error(messageKey), { status, messageKey }); };
const numeric = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0);

function dateBounds(query: Pick<ExpenseListQuery, "startDate" | "endDate" | "month" | "year">) {
  let start: Date | undefined;
  let end: Date | undefined;
  if (query.startDate || query.endDate) {
    start = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : undefined;
    end = query.endDate ? new Date(`${query.endDate}T00:00:00.000Z`) : undefined;
  } else if (query.year && query.month) {
    start = new Date(Date.UTC(query.year, query.month - 1, 1));
    end = new Date(Date.UTC(query.year, query.month, 0));
  } else if (query.year) {
    start = new Date(Date.UTC(query.year, 0, 1));
    end = new Date(Date.UTC(query.year, 11, 31));
  }
  return { start, end };
}

async function resolveScope(query: ExpenseScopeQuery, user: ExpenseUser): Promise<ExpenseScope> {
  const admin = isAdmin(user);
  const vendor = isVendorUser(user.roles);
  if (!admin && isPureCustomerUser(user.roles)) fail(403, "errors.customer_account_restricted");
  if (!admin && vendor && query.vendorId && query.vendorId !== user.userId) {
    fail(403, "expenses.vendor_access_denied");
  }
  const vendorId = admin ? query.vendorId : vendor ? user.userId : undefined;
  let salonWhere: Prisma.SalonWhereInput;
  if (admin) {
    salonWhere = vendorId ? { OR: [{ ownerId: vendorId, parentId: null }, { parent: { ownerId: vendorId } }] } : {};
  } else if (vendor) {
    salonWhere = { OR: [{ ownerId: user.userId, parentId: null }, { parent: { ownerId: user.userId } }] };
  } else {
    salonWhere = { OR: [
      { staff: { some: { userId: user.userId, isActive: true } } },
      { branches: { some: { staff: { some: { userId: user.userId, isActive: true } } } } },
    ] };
  }
  if (query.countryId || query.cityId) {
    salonWhere = {
      AND: [
        salonWhere,
        { address: { is: {
          ...(query.countryId ? { country: { equals: query.countryId, mode: "insensitive" } } : {}),
          ...(query.cityId ? { city: { equals: query.cityId, mode: "insensitive" } } : {}),
        } } },
      ],
    };
  }
  const salons = await prisma.salon.findMany({
    where: salonWhere,
    select: { id: true, ownerId: true, parentId: true },
  });
  const accessibleSalonIds = salons.map(({ id }) => id);
  const roots = salons.filter(({ parentId }) => parentId === null);
  let rootSalonIds = roots.map(({ id }) => id);
  let selectedSalonId: string | undefined;
  let branchId = query.branchId || undefined;

  if (query.salonId) {
    const selected = salons.find(({ id }) => id === query.salonId) ?? fail(403, "expenses.salon_access_denied");
    selectedSalonId = selected.parentId ?? selected.id;
    if (selected.parentId) {
      if (branchId && branchId !== selected.id) return fail(400, "expenses.branch_mismatch");
      branchId = selected.id;
    }
    rootSalonIds = rootSalonIds.includes(selectedSalonId) ? [selectedSalonId] : [];
  }

  if (branchId) {
    const branch = salons.find(({ id, parentId }) => id === branchId && parentId) ?? fail(403, "expenses.branch_access_denied");
    if (selectedSalonId && branch.parentId !== selectedSalonId) return fail(400, "expenses.branch_mismatch");
    selectedSalonId = branch.parentId ?? undefined;
    rootSalonIds = rootSalonIds.includes(selectedSalonId || "") ? [selectedSalonId!] : [];
  }

  if (!admin && user.roles.includes("STAFF") && !rootSalonIds.length) {
    rootSalonIds = [...new Set(salons.map(({ parentId, id }) => parentId ?? id))];
  }
  const vendorIds = [...new Set(roots.filter(({ id }) => rootSalonIds.includes(id)).map(({ ownerId }) => ownerId))];
  return { vendorIds, rootSalonIds, accessibleSalonIds, branchId, selectedSalonId };
}

function dateWhere(start?: Date, end?: Date): Prisma.DateTimeFilter<"Expense"> | undefined {
  if (!start && !end) return undefined;
  return { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
}

function expenseWhere(query: ExpenseListQuery, scope: ExpenseScope): Prisma.ExpenseWhereInput {
  const { start, end } = dateBounds(query);
  const search = query.search?.trim();
  const matchingPaymentMethods = Object.values(ExpensePaymentMethod).filter((method) => method.toLowerCase().includes(search?.toLowerCase() ?? ""));
  return {
    deletedAt: null,
    status: query.status ?? ExpenseStatus.ACTIVE,
    salonId: { in: scope.rootSalonIds },
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as ExpensePaymentMethod } : {}),
    ...(dateWhere(start, end) ? { expenseDate: dateWhere(start, end) } : {}),
    ...(search ? { OR: [
      { note: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
      ...(matchingPaymentMethods.length ? [{ paymentMethod: { in: matchingPaymentMethods } }] : []),
      { category: { name: { contains: search, mode: "insensitive" } } },
    ] } : {}),
  };
}

function categoryWhere(scope: ExpenseScope): Prisma.ExpenseCategoryWhereInput {
  return { isActive: true, deletedAt: null, OR: [{ vendorId: null }, { vendorId: { in: scope.vendorIds } }] };
}

const expenseInclude = {
  category: { select: { id: true, name: true } },
  salon: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  creator: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude;

export const expensesService = {
  async scope(query: ExpenseScopeQuery, user: ExpenseUser) {
    return resolveScope(query, user);
  },

  async list(query: ExpenseListQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const where = expenseWhere(query, scope);
    const [rows, total, aggregate] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: query.sortBy === "category"
          ? [{ category: { name: query.sortOrder } }, { expenseDate: "desc" }]
          : { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    return {
      data: rows,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      summary: { totalExpenses: numeric(aggregate._sum.amount) },
      filters: query,
    };
  },

  async get(id: string, query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const expense = await prisma.expense.findFirst({
      where: { id, deletedAt: null, status: ExpenseStatus.ACTIVE, salonId: { in: scope.rootSalonIds }, ...(scope.branchId ? { branchId: scope.branchId } : {}) },
      include: expenseInclude,
    });
    return expense ?? fail(404, "expenses.not_found");
  },

  async categories(query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    return prisma.expenseCategory.findMany({
      where: categoryWhere(scope),
      select: { id: true, name: true, vendorId: true, isActive: true },
      orderBy: { name: "asc" },
    });
  },

  async filters(query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const salons = await prisma.salon.findMany({
      where: { id: { in: scope.accessibleSalonIds } },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    });
    return {
      salons: salons.filter(({ parentId }) => parentId === null),
      branches: salons.filter(({ parentId }) => parentId !== null),
    };
  },

  async createCategory(name: string, query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const vendorId = isAdmin(user) ? null : scope.vendorIds[0];
    if (!isAdmin(user) && !vendorId) fail(400, "expenses.vendor_required");
    return prisma.expenseCategory.create({ data: { name, vendorId } });
  },

  async updateCategory(id: string, data: { name?: string; isActive?: boolean }, query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const category = await prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null, ...(!isAdmin(user) ? { vendorId: { in: scope.vendorIds } } : {}) },
    });
    if (!category) return fail(404, "expenses.category_not_found");
    return prisma.expenseCategory.update({ where: { id }, data });
  },

  async deleteCategory(id: string, query: ExpenseScopeQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const category = await prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null, ...(!isAdmin(user) ? { vendorId: { in: scope.vendorIds } } : {}) },
    });
    if (!category) return fail(404, "expenses.category_not_found");
    const used = await prisma.expense.count({ where: { categoryId: id, deletedAt: null } });
    if (used) return fail(409, "expenses.category_in_use");
    return prisma.expenseCategory.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  },

  async create(data: ExpensePayload, user: ExpenseUser) {
    const scope = await resolveScope({ salonId: data.salonId, branchId: data.branchId ?? undefined }, user);
    if (!scope.vendorIds.length || !scope.rootSalonIds.length) return fail(400, "expenses.salon_required");
    const category = await prisma.expenseCategory.findFirst({ where: { id: data.categoryId, ...categoryWhere(scope) } });
    if (!category) return fail(400, "expenses.invalid_category");
    return prisma.expense.create({
      data: {
        salonId: scope.rootSalonIds[0],
        branchId: scope.branchId,
        categoryId: data.categoryId,
        expenseDate: new Date(`${data.expenseDate}T00:00:00.000Z`),
        amount: new Prisma.Decimal(data.amount.toFixed(2)),
        paymentMethod: data.paymentMethod,
        note: data.note || null,
        description: data.description || null,
        referenceNumber: data.referenceNumber || null,
        receiptUrl: data.receiptUrl || null,
        createdBy: user.userId,
      },
      include: expenseInclude,
    });
  },

  async update(id: string, data: ExpenseUpdate, user: ExpenseUser) {
    const existing = await this.get(id, {}, user);
    let scope: ExpenseScope | undefined;
    const hasSalon = Object.prototype.hasOwnProperty.call(data, "salonId");
    const hasBranch = Object.prototype.hasOwnProperty.call(data, "branchId");
    if (hasSalon || hasBranch) {
      scope = await resolveScope({
        salonId: hasSalon ? data.salonId ?? undefined : existing.salonId,
        branchId: hasBranch ? data.branchId ?? undefined : hasSalon ? undefined : existing.branchId ?? undefined,
      }, user);
    }
    const categoryScope = scope ?? (data.categoryId ? await resolveScope({ salonId: existing.salonId, branchId: existing.branchId ?? undefined }, user) : undefined);
    if (data.categoryId && categoryScope) {
      const category = await prisma.expenseCategory.findFirst({
        where: { id: data.categoryId, OR: [{ vendorId: null }, { vendorId: { in: categoryScope.vendorIds } }], isActive: true, deletedAt: null },
      });
      if (!category) return fail(400, "expenses.invalid_category");
    }
    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.expenseDate ? { expenseDate: new Date(`${data.expenseDate}T00:00:00.000Z`) } : {}),
        ...(data.amount !== undefined ? { amount: new Prisma.Decimal(data.amount.toFixed(2)) } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.note !== undefined ? { note: data.note || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.referenceNumber !== undefined ? { referenceNumber: data.referenceNumber || null } : {}),
        ...(data.receiptUrl !== undefined ? { receiptUrl: data.receiptUrl || null } : {}),
        ...(scope ? { salonId: scope.rootSalonIds[0], branchId: scope.branchId ?? null } : {}),
        updatedBy: user.userId,
      },
      include: expenseInclude,
    });
  },

  async delete(id: string, user: ExpenseUser) {
    await this.get(id, {}, user);
    return prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.VOID, deletedAt: new Date(), updatedBy: user.userId },
    });
  },

  async analytics(query: ExpenseListQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const where = expenseWhere({ ...query, page: 1, limit: 100, sortBy: "expenseDate", sortOrder: "asc" }, scope);
    const { start, end } = dateBounds(query);
    const [total, grouped, trendRows] = await Promise.all([
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["expenseDate"], where, _sum: { amount: true }, orderBy: { expenseDate: "asc" } }),
    ]);
    const categoryIds = grouped.map(({ categoryId }) => categoryId);
    const categories = await prisma.expenseCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } });
    const names = new Map(categories.map(({ id, name }) => [id, name]));
    const totalExpenses = numeric(total._sum.amount);
    const categoryBreakdown = grouped.map(({ categoryId, _sum }) => {
      const amount = numeric(_sum.amount);
      return { categoryId, name: names.get(categoryId) ?? "", amount, percentage: totalExpenses ? amount / totalExpenses * 100 : 0 };
    }).sort((left, right) => right.amount - left.amount);
    const expenseTrend = trendRows.map((row) => ({
      date: row.expenseDate.toISOString().slice(0, 10),
      amount: numeric(row._sum.amount),
    }));
    return {
      totalExpenses,
      expenseCount: total._count._all,
      categoryBreakdown,
      expenseTrend,
      filters: { ...query, startDate: start?.toISOString().slice(0, 10), endDate: end?.toISOString().slice(0, 10) },
    };
  },

  async export(query: ExpenseListQuery, user: ExpenseUser) {
    const scope = await resolveScope(query, user);
    const where = expenseWhere(query, scope);
    const rows = await prisma.expense.findMany({
      where,
      include: { category: { select: { name: true } }, salon: { select: { name: true } }, branch: { select: { name: true } }, creator: { select: { firstName: true, lastName: true } } },
      orderBy: { expenseDate: "desc" },
    });
    const quote = (value: unknown) => {
      const text = String(value ?? "");
      const safe = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    return [
      ["Expense Date", "Category", "Amount", "Payment Method", "Note", "Salon", "Branch", "Created By"].map(quote).join(","),
      ...rows.map((row) => [
        row.expenseDate.toISOString().slice(0, 10), row.category.name, row.amount.toString(),
        row.paymentMethod, row.note, row.salon.name, row.branch?.name,
        `${row.creator.firstName} ${row.creator.lastName ?? ""}`.trim(),
      ].map(quote).join(",")),
    ].join("\r\n");
  },
};
