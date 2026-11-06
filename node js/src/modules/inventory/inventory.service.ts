import { Prisma, ListingStatus, ProductStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { createProductSchema, updateProductSchema, categorySchema, brandSchema, stockSchema } from './inventory.validation';
import { InventoryQuery, InventoryUser, isAdmin } from './inventory.types';

const pageParams = (query: InventoryQuery) => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) throw { status: 400, message: 'Page must be a positive integer.' };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw { status: 400, message: 'Limit must be an integer between 1 and 100.' };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const stringFields = ['search', 'sku', 'barcode', 'vendorId', 'salonId', 'branchId', 'categoryId', 'brandId', 'productId', 'status', 'listingStatus', 'productType', 'stockStatus', 'sortBy', 'sortOrder', 'startDate', 'endDate'];
  for (const [field, value] of Object.entries(query)) {
    if (!stringFields.includes(field) || value === undefined) continue;
    if (typeof value !== 'string') throw { status: 400, message: `${field} must be a single string value.` };
    if (field === 'search' && value.length > 200) throw { status: 400, message: 'Search must be 200 characters or fewer.' };
    if (!['vendorId', 'salonId', 'branchId', 'categoryId', 'brandId', 'productId'].includes(field) || !value) continue;
    const identifiers = field === 'salonId' ? value.split(',') : [value];
    if (identifiers.some((identifier) => !uuid.test(identifier))) throw { status: 400, message: `${field} must contain valid IDs.` };
  }
  return { page, limit, skip: (page - 1) * limit };
};
type InventorySalonScopeFilter = Array<{ salonId: string | { in: string[] }; branchId?: string }>;
const ensureUuid = (id: string, label = 'ID') => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw { status: 400, message: `Invalid ${label}.` };
  }
};
const validateProductFilters = (query: InventoryQuery) => {
  if (query.status && !Object.values(ProductStatus).includes(query.status as ProductStatus)) throw { status: 400, message: 'Invalid product status.' };
  if (query.listingStatus && !Object.values(ListingStatus).includes(query.listingStatus as ListingStatus)) throw { status: 400, message: 'Invalid listing status.' };
  if (query.productType && !['RETAIL', 'CONSUMABLE', 'PROFESSIONAL', 'SERVICE_PRODUCT', 'OTHER'].includes(query.productType)) throw { status: 400, message: 'Invalid product type.' };
};
const dateRange = (query: InventoryQuery) => {
  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;
  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    throw { status: 400, message: 'Date filters must be valid dates.' };
  }
  if (endDate && query.endDate && /^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) endDate.setUTCHours(23, 59, 59, 999);
  if (startDate && endDate && startDate > endDate) throw { status: 400, message: 'startDate must be before or equal to endDate.' };
  return startDate || endDate ? { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } : undefined;
};
const stockStatus = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = { 'IN_STOCK': 'IN_STOCK', 'LOW_STOCK': 'LOW_STOCK', 'OUT_OF_STOCK': 'OUT_OF_STOCK' };
  const status = aliases[normalized];
  if (!status) throw { status: 400, message: 'stockStatus must be IN_STOCK, LOW_STOCK, or OUT_OF_STOCK.' };
  return status;
};
const orderDirection = (query: InventoryQuery) => {
  const direction = (query.sortOrder || 'desc').toLowerCase();
  if (direction !== 'asc' && direction !== 'desc') throw { status: 400, message: 'sortOrder must be asc or desc.' };
  return direction as Prisma.SortOrder;
};
const orderByListing = (query: InventoryQuery) => {
  const direction = orderDirection(query);
  const fields: Record<string, Prisma.VendorProductOrderByWithRelationInput> = {
    name: { product: { name: direction } },
    price: { sellingPrice: direction },
    createdAt: { createdAt: direction },
    updatedAt: { updatedAt: direction },
  };
  const field = query.sortBy || 'createdAt';
  if (!fields[field]) throw { status: 400, message: 'sortBy must be name, price, createdAt, or updatedAt.' };
  return fields[field];
};
const orderByStock = (query: InventoryQuery): Prisma.InventoryStockOrderByWithRelationInput => {
  const direction = orderDirection(query);
  const fields: Record<string, Prisma.InventoryStockOrderByWithRelationInput> = {
    quantity: { quantity: direction },
    createdAt: { createdAt: direction },
    updatedAt: { updatedAt: direction },
    name: { variant: { product: { name: direction } } },
  };
  const field = query.sortBy || 'updatedAt';
  if (!fields[field]) throw { status: 400, message: 'sortBy must be quantity, name, createdAt, or updatedAt.' };
  return fields[field];
};
async function stockIdsForStatus(status?: string) {
  const normalized = stockStatus(status);
  if (!normalized) return undefined;
  const condition = normalized === 'OUT_OF_STOCK'
    ? Prisma.sql`"quantity" - "reservedQuantity" <= 0`
    : normalized === 'LOW_STOCK'
      ? Prisma.sql`"quantity" - "reservedQuantity" > 0 AND "quantity" - "reservedQuantity" <= "reorderLevel"`
      : Prisma.sql`"quantity" - "reservedQuantity" > "reorderLevel"`;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "InventoryStock" WHERE ${condition}`);
  return rows.map(({ id }) => id);
}
function inventorySqlFilters(query: InventoryQuery, access: { userId: string; admin: boolean; vendor: boolean; salonScope?: Awaited<ReturnType<typeof inventorySalonScope>> }, transactionDate = false) {
  const filters: Prisma.Sql[] = [];
  if (!access.admin) {
    if (access.vendor) filters.push(Prisma.sql`vp."vendorId" = ${access.userId}`);
    else {
      const scopes = access.salonScope?.stockScope ?? [];
      const scoped = scopes.map((scope: any) => {
        const salonFilter = typeof scope.salonId === 'string'
          ? Prisma.sql`vp."salonId" = ${scope.salonId}`
          : Prisma.sql`vp."salonId" IN (${Prisma.join(scope.salonId.in)})`;
        return Prisma.sql`(${salonFilter}${scope.branchId ? Prisma.sql` AND vp."branchId" = ${scope.branchId}` : Prisma.empty})`;
      });
      filters.push(scoped.length ? Prisma.sql`(${Prisma.join(scoped, ' OR ')})` : Prisma.sql`1 = 0`);
      if (query.vendorId) filters.push(Prisma.sql`vp."vendorId" = ${query.vendorId}`);
    }
  } else if (query.vendorId) filters.push(Prisma.sql`vp."vendorId" = ${query.vendorId}`);
  if (query.salonId) filters.push(Prisma.sql`vp."salonId" = ${query.salonId}`);
  if (query.branchId) filters.push(Prisma.sql`vp."branchId" = ${query.branchId}`);
  if (query.categoryId) filters.push(Prisma.sql`p."categoryId" = ${query.categoryId}`);
  if (query.productId) filters.push(Prisma.sql`p."id" = ${query.productId}`);
  if (query.status) filters.push(Prisma.sql`p."status" = ${query.status}`);
  if (query.listingStatus) filters.push(Prisma.sql`vp."listingStatus" = ${query.listingStatus}`);
  if (query.productType) filters.push(Prisma.sql`p."productType" = ${query.productType}`);
  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`(p."name" ILIKE ${search} OR pv."sku" ILIKE ${search} OR pv."barcode" ILIKE ${search} OR pc."name" ILIKE ${search})`);
  }
  if (query.sku) filters.push(Prisma.sql`pv."sku" ILIKE ${`%${query.sku}%`}`);
  if (query.barcode) filters.push(Prisma.sql`pv."barcode" ILIKE ${`%${query.barcode}%`}`);
  if (query.startDate || query.endDate) {
    const column = transactionDate ? Prisma.sql`t."createdAt"` : Prisma.sql`s."updatedAt"`;
    const range = dateRange(query);
    if (range?.gte) filters.push(Prisma.sql`${column} >= ${range.gte}`);
    if (range?.lte) filters.push(Prisma.sql`${column} <= ${range.lte}`);
  }
  const normalizedStockStatus = stockStatus(query.stockStatus);
  if (normalizedStockStatus === 'OUT_OF_STOCK') filters.push(Prisma.sql`s."quantity" - s."reservedQuantity" <= 0`);
  if (normalizedStockStatus === 'LOW_STOCK') filters.push(Prisma.sql`s."quantity" - s."reservedQuantity" > 0 AND s."quantity" - s."reservedQuantity" <= s."reorderLevel"`);
  if (normalizedStockStatus === 'IN_STOCK') filters.push(Prisma.sql`s."quantity" - s."reservedQuantity" > s."reorderLevel"`);
  return filters;
}
async function orderedAdminProductIds(query: InventoryQuery, sortBy: string, direction: Prisma.SortOrder, skip: number, take: number, matchingStockIds?: string[], inventoryScope?: InventorySalonScopeFilter) {
  const filters: Prisma.Sql[] = [];
  if (query.productId) filters.push(Prisma.sql`p.id = ${query.productId}`);
  if (query.status) filters.push(Prisma.sql`p."status" = ${query.status}`);
  if (query.categoryId) filters.push(Prisma.sql`p."categoryId" = ${query.categoryId}`);
  if (query.brandId) filters.push(Prisma.sql`p."brandId" = ${query.brandId}`);
  if (query.productType) filters.push(Prisma.sql`p."productType" = ${query.productType}`);
  const createdAt = dateRange(query);
  if (createdAt?.gte) filters.push(Prisma.sql`p."createdAt" >= ${createdAt.gte}`);
  if (createdAt?.lte) filters.push(Prisma.sql`p."createdAt" <= ${createdAt.lte}`);
  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`(p."name" ILIKE ${search} OR b."name" ILIKE ${search} OR c."name" ILIKE ${search} OR v."name" ILIKE ${search} OR v."sku" ILIKE ${search} OR v."barcode" ILIKE ${search})`);
  }
  if (query.sku || query.barcode) {
    const variants = [
      ...(query.sku ? [Prisma.sql`v."sku" ILIKE ${`%${query.sku}%`}`] : []),
      ...(query.barcode ? [Prisma.sql`v."barcode" ILIKE ${`%${query.barcode}%`}`] : []),
    ];
    filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" vf WHERE vf."productId" = p.id AND ${Prisma.join(variants, ' AND ')})`);
  }
  if (query.vendorId || query.salonId || query.branchId || query.listingStatus || matchingStockIds || inventoryScope) {
    const listingFilters: Prisma.Sql[] = [];
    if (query.vendorId) listingFilters.push(Prisma.sql`l."vendorId" = ${query.vendorId}`);
    if (query.salonId) {
      const salonIds = query.salonId.split(',').map((id) => id.trim()).filter(Boolean);
      listingFilters.push(salonIds.length === 1
        ? Prisma.sql`l."salonId" = ${salonIds[0]}`
        : Prisma.sql`l."salonId" IN (${Prisma.join(salonIds)})`);
    }
    if (query.branchId) listingFilters.push(Prisma.sql`l."branchId" = ${query.branchId}`);
    if (query.listingStatus) listingFilters.push(Prisma.sql`l."listingStatus" = ${query.listingStatus}`);
    if (matchingStockIds) listingFilters.push(Prisma.sql`EXISTS (SELECT 1 FROM "InventoryStock" sf WHERE sf."vendorProductId" = l.id AND sf.id IN (${matchingStockIds.length ? Prisma.join(matchingStockIds) : Prisma.sql`NULL`}))`);
    if (inventoryScope) {
      const scopeFilters = inventoryScope.map((scope) => {
        const salonFilter = typeof scope.salonId === 'string'
          ? Prisma.sql`l."salonId" = ${scope.salonId}`
          : Prisma.sql`l."salonId" IN (${Prisma.join(scope.salonId.in)})`;
        return Prisma.sql`(${salonFilter}${scope.branchId ? Prisma.sql` AND l."branchId" = ${scope.branchId}` : Prisma.empty})`;
      });
      listingFilters.push(scopeFilters.length ? Prisma.sql`(${Prisma.join(scopeFilters, ' OR ')})` : Prisma.sql`1 = 0`);
    }
    filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "VendorProduct" l WHERE l."productId" = p.id AND ${Prisma.join(listingFilters, ' AND ')})`);
  }
  const where = filters.length ? Prisma.join(filters, ' AND ') : Prisma.sql`1 = 1`;
  const order = direction === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const stockOrderFilters: Prisma.Sql[] = [Prisma.sql`sv."productId" = p.id`];
  if (query.vendorId) stockOrderFilters.push(Prisma.sql`sl."vendorId" = ${query.vendorId}`);
  if (query.salonId) {
    const salonIds = query.salonId.split(',').map((id) => id.trim()).filter(Boolean);
    stockOrderFilters.push(salonIds.length === 1
      ? Prisma.sql`sl."salonId" = ${salonIds[0]}`
      : Prisma.sql`sl."salonId" IN (${Prisma.join(salonIds)})`);
  }
  if (query.branchId) stockOrderFilters.push(Prisma.sql`sl."branchId" = ${query.branchId}`);
  if (query.listingStatus) stockOrderFilters.push(Prisma.sql`sl."listingStatus" = ${query.listingStatus}`);
  if (matchingStockIds) stockOrderFilters.push(Prisma.sql`si.id IN (${matchingStockIds.length ? Prisma.join(matchingStockIds) : Prisma.sql`NULL`})`);
  if (inventoryScope) {
    const scopes = inventoryScope.map((scope) => {
      const salonFilter = typeof scope.salonId === 'string'
        ? Prisma.sql`sl."salonId" = ${scope.salonId}`
        : Prisma.sql`sl."salonId" IN (${Prisma.join(scope.salonId.in)})`;
      return Prisma.sql`(${salonFilter}${scope.branchId ? Prisma.sql` AND sl."branchId" = ${scope.branchId}` : Prisma.empty})`;
    });
    stockOrderFilters.push(scopes.length ? Prisma.sql`(${Prisma.join(scopes, ' OR ')})` : Prisma.sql`1 = 0`);
  }
  const stockOrder = Prisma.sql`(SELECT COALESCE(SUM(si."quantity"), 0) FROM "InventoryStock" si JOIN "VendorProduct" sl ON sl.id = si."vendorProductId" JOIN "ProductVariant" sv ON sv.id = si."variantId" WHERE ${Prisma.join(stockOrderFilters, ' AND ')})`;
  const ordering = sortBy === 'price'
    ? Prisma.sql`MIN(v."sellingPrice") ${order} NULLS LAST`
    : sortBy === 'stock'
      ? Prisma.sql`${stockOrder} ${order}`
      : Prisma.sql`MIN(v."sku") ${order} NULLS LAST`;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p.id
    FROM "Product" p
    LEFT JOIN "ProductVariant" v ON v."productId" = p.id
    LEFT JOIN "ProductCategory" c ON c.id = p."categoryId"
    LEFT JOIN "ProductBrand" b ON b.id = p."brandId"
    WHERE ${where}
    GROUP BY p.id
    ORDER BY ${ordering}, MIN(p."name") ASC, p.id ASC
    LIMIT ${take} OFFSET ${skip}
  `);
  return rows.map(({ id }) => id);
}
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniqueSlug = async (model: 'product' | 'category' | 'brand', name: string, slug?: string) => {
  const base = slugify(slug || name) || `product-${Date.now()}`;
  let result = base;
  let suffix = 1;
  const exists = async (candidate: string) => model === 'product'
    ? prisma.product.findUnique({ where: { slug: candidate } })
    : model === 'category'
      ? prisma.productCategory.findUnique({ where: { slug: candidate } })
      : prisma.productBrand.findUnique({ where: { slug: candidate } });
  while (await exists(result)) result = `${base}-${suffix++}`;
  return result;
};

async function assertSalonBranch(salonId: string, branchId?: string | null) {
  ensureUuid(salonId, 'salon ID');
  if (branchId) ensureUuid(branchId, 'branch ID');
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) throw { status: 404, message: 'Salon not found' };
  if (branchId) {
    const branch = await prisma.salon.findUnique({ where: { id: branchId }, select: { parentId: true } });
    if (!branch || branch.parentId !== salonId) throw { status: 400, message: 'Selected branch does not belong to selected salon.' };
  }
}

async function assertProductCatalogAccess(vendorId: string, categoryId: string | null | undefined, brandId: string | null | undefined, salonId: string, branchId: string | null | undefined) {
  if (categoryId) {
    const category = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!category || (category.vendorId && category.vendorId !== vendorId) || (category.salonId && category.salonId !== salonId) || (category.branchId && category.branchId !== branchId)) throw { status: 400, message: 'Selected category is not available for this vendor, salon, and branch.' };
  }
  if (brandId) {
    const brand = await prisma.productBrand.findUnique({ where: { id: brandId } });
    if (!brand || (brand.vendorId && brand.vendorId !== vendorId) || (brand.salonId && brand.salonId !== salonId)) throw { status: 400, message: 'Selected brand is not available for this vendor and salon.' };
  }
}

const productInclude = {
  category: true,
  brand: true,
  variants: true,
  images: true,
  listings: { include: { vendor: { select: { id: true, firstName: true, lastName: true, email: true } }, salon: true, branch: true, stocks: true } },
};

async function assertVendorLocation(vendorId: string, salonId: string, branchId?: string | null) {
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true, ownerId: true } });
  if (!salon) throw { status: 404, message: 'Salon not found' };
  const allowed = salon.ownerId === vendorId || Boolean(await prisma.salon.findFirst({ where: { id: salonId, parent: { ownerId: vendorId } }, select: { id: true } }));
  if (!allowed) throw { status: 403, message: 'Vendor is not authorized for this salon' };
  if (branchId) {
    const branch = await prisma.salon.findUnique({ where: { id: branchId }, select: { id: true, parentId: true, ownerId: true } });
    if (!branch || branch.parentId !== salonId || (branch.ownerId !== vendorId && salon.ownerId !== vendorId)) {
      throw { status: 403, message: 'Vendor is not authorized for this branch' };
    }
  }
}

async function inventorySalonScope(userId: string) {
  const [owned, memberships] = await Promise.all([
    prisma.salon.findMany({ where: { ownerId: userId }, select: { id: true, parentId: true } }),
    prisma.salonStaff.findMany({ where: { userId, isActive: true }, select: { salon: { select: { id: true, parentId: true } } } }),
  ]);
  const ownedSalonIds = owned.filter(({ parentId }) => !parentId).map(({ id }) => id);
  const assignedRootIds = memberships.filter(({ salon }) => !salon.parentId).map(({ salon }) => salon.id);
  const assignedBranchIds = memberships.filter(({ salon }) => salon.parentId).map(({ salon }) => salon.id);
  const assignedBranches = assignedRootIds.length
    ? await prisma.salon.findMany({ where: { parentId: { in: assignedRootIds } }, select: { id: true } })
    : [];
  const salonIds = [...new Set([...owned.map(({ id }) => id), ...assignedBranches.map(({ id }) => id), ...memberships.flatMap(({ salon }) => [salon.id, ...(salon.parentId ? [salon.parentId] : [])])])];
  const stockScope = [
    ...(ownedSalonIds.length ? [{ salonId: { in: ownedSalonIds } }] : []),
    ...owned.filter(({ parentId }) => parentId).flatMap(({ id, parentId }) => [{ salonId: parentId!, branchId: id }, { salonId: id }]),
    ...assignedRootIds.map((salonId) => ({ salonId })),
    ...assignedBranchIds.flatMap((branchId) => {
      const parentId = memberships.find(({ salon }) => salon.id === branchId)?.salon.parentId;
      return parentId ? [{ salonId: parentId, branchId }, { salonId: branchId }] : [];
    }),
  ];
  return { salonIds, stockScope };
}

async function assertInventorySalonAccess(userId: string, salonId: string, branchId?: string | null, admin = false) {
  if (admin) return;
  const scope = await inventorySalonScope(userId);
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true, parentId: true } });
  if (!salon || !scope.salonIds.includes(salonId) && !(salon.parentId && scope.salonIds.includes(salon.parentId))) {
    throw { status: 403, message: 'You are not authorized to access inventory for this salon.' };
  }
  if (branchId && (!scope.salonIds.includes(branchId) && !scope.stockScope.some((item: any) => item.branchId === branchId)
    || !(await prisma.salon.findFirst({ where: { id: branchId, parentId: salon.parentId ? salon.parentId : salonId }, select: { id: true } })))) {
    throw { status: 403, message: 'You are not authorized to access inventory for this branch.' };
  }
}

async function assertCategoryParentAccess(userId: string, parentId: string, admin: boolean) {
  const parent = await prisma.productCategory.findUnique({
    where: { id: parentId },
    select: { vendorId: true, salonId: true, branchId: true },
  });
  if (!parent) throw { status: 400, message: 'Parent category not found.' };
  if (admin) return;
  if (parent.vendorId && parent.vendorId !== userId) throw { status: 403, message: 'You are not authorized to use this parent category.' };
  if (parent.salonId) await assertInventorySalonAccess(userId, parent.salonId, parent.branchId);
}

async function assertVendorListing(vendorId: string, id: string) {
  ensureUuid(id, 'product listing ID');
  const listing = await prisma.vendorProduct.findFirst({ where: { id, vendorId } });
  if (!listing) throw { status: 404, message: 'Product listing not found' };
  return listing;
}

export const inventoryService = {
  async createVendorProduct(vendorId: string, input: unknown) {
    const data = createProductSchema.parse(input);
    await assertVendorLocation(vendorId, data.salonId, data.branchId);
    await assertProductCatalogAccess(vendorId, data.categoryId, data.brandId, data.salonId, data.branchId);
    const slug = await uniqueSlug('product', data.name, data.slug);
    try {
      return await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name: data.name, slug, description: data.description, shortDescription: data.shortDescription,
            categoryId: data.categoryId, brandId: data.brandId, productType: data.productType, gstRate: data.gstRate,
            hsnCode: data.hsnCode,
            variants: { create: data.variants.map(({ id: _id, stock, reorderLevel, ...variant }) => variant) },
            images: { create: data.images },
          },
          include: { variants: true },
        });
        const listing = await tx.vendorProduct.create({
          data: { vendorId, productId: product.id, salonId: data.salonId, branchId: data.branchId, vendorPrice: data.vendorPrice, sellingPrice: data.listingSellingPrice, discount: data.discount, listingStatus: data.listingStatus as ListingStatus, isListed: data.listingStatus === 'ACTIVE' },
        });
        const stockRows = product.variants.map((variant, index) => ({
          vendorProductId: listing.id,
          variantId: variant.id,
          salonId: data.salonId,
          branchId: data.branchId || null,
          quantity: data.variants[index]?.stock || 0,
          reorderLevel: data.variants[index]?.reorderLevel || 0,
        }));
        if (stockRows.length) {
          await tx.inventoryStock.createMany({ data: stockRows });
          const stockWithQuantity = stockRows.filter((stock) => stock.quantity > 0);
          if (stockWithQuantity.length) {
            const stocks = await tx.inventoryStock.findMany({ where: { vendorProductId: listing.id }, select: { id: true, variantId: true } });
            const stockIdByVariant = new Map(stocks.map((stock) => [stock.variantId, stock.id]));
            await tx.inventoryTransaction.createMany({
              data: stockWithQuantity.map((stock) => ({ stockId: stockIdByVariant.get(stock.variantId)!, type: 'IN', quantity: stock.quantity, note: 'Opening stock' })),
            });
          }
        }
        return tx.vendorProduct.findUnique({
          where: { id: listing.id },
          include: { salon: true, branch: true, product: { include: { category: true, brand: true, variants: true, images: true } } },
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002' && String(error.meta?.target).includes('sku')) throw { status: 409, message: 'SKU already exists.' };
      if (error.code === 'P2002') throw { status: 409, message: 'This vendor product listing already exists.' };
      throw error;
    }
  },

  async listVendorProducts(vendorId: string, query: InventoryQuery) {
    const { page, limit, skip } = pageParams(query);
    if (query.vendorId && query.vendorId !== vendorId) throw { status: 403, message: 'You are not authorized to access this vendor inventory.' };
    validateProductFilters(query);
    if (query.salonId) await assertVendorLocation(vendorId, query.salonId, query.branchId);
    if (query.branchId && !query.salonId) {
      const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
      if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
      await assertVendorLocation(vendorId, branch.parentId, query.branchId);
    }
    const createdAt = dateRange(query);
    const matchingStockIds = await stockIdsForStatus(query.stockStatus);
    const where: any = {
      vendorId,
      ...(query.salonId && { salonId: query.salonId }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.listingStatus && { listingStatus: query.listingStatus }),
      ...(createdAt && { createdAt }),
      ...(matchingStockIds && { stocks: { some: { id: { in: matchingStockIds } } } }),
      product: {
        ...(query.status && { status: query.status }),
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.brandId && { brandId: query.brandId }),
        ...(query.productType && { productType: query.productType }),
        ...(query.productId && { id: query.productId }),
      },
    };
    if (query.search) where.product.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { category: { name: { contains: query.search, mode: 'insensitive' } } },
      { variants: { some: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }, { barcode: { contains: query.search, mode: 'insensitive' } }] } } },
    ];
    if (query.sku) where.product.variants = { some: { sku: { contains: query.sku.toUpperCase(), mode: 'insensitive' } } };
    const include: any = { product: { include: { category: true, brand: true, variants: true, images: true } }, salon: true, branch: true, stocks: true };
    const [items, total] = await Promise.all([prisma.vendorProduct.findMany({ where, include, skip, take: limit, orderBy: [orderByListing(query), { id: 'asc' }] }), prisma.vendorProduct.count({ where })]);
    return { items: items.map((listing: any) => ({ ...listing, vendorProductId: listing.id, productId: listing.productId, actions: { canEdit: listing.listingStatus !== 'ARCHIVED', canDelete: listing.listingStatus !== 'ARCHIVED' } })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },

  async getVendorProduct(vendorId: string, id: string) { await assertVendorListing(vendorId, id); return prisma.vendorProduct.findUnique({ where: { id }, include: { salon: true, branch: true, product: { include: { category: true, brand: true, variants: true, images: true } }, stocks: { include: { variant: true, transactions: true } } } }); },

  async updateVendorProduct(vendorId: string, id: string, input: unknown) {
    const listing = await assertVendorListing(vendorId, id);
    const data = updateProductSchema.parse(input);
    if (data.categoryId !== undefined || data.brandId !== undefined) {
      await assertProductCatalogAccess(vendorId, data.categoryId, data.brandId, listing.salonId, listing.branchId);
    }
    try {
      return await prisma.$transaction(async (tx) => {
        const productData: any = { ...data };
        delete productData.variants; delete productData.images; delete productData.slug;
        if (Object.keys(productData).length) await tx.product.update({ where: { id: listing.productId }, data: productData });
        if (data.variants) {
          for (const variantInput of data.variants) {
            const variant = variantInput;
            const existing = variant.id ? await tx.productVariant.findFirst({ where: { productId: listing.productId, id: variant.id } }) : null;
            if (variant.id && !existing) throw { status: 400, message: 'Selected variant does not belong to this product.' };
            const { id: _id, stock: _stock, reorderLevel: _reorderLevel, ...variantData } = variant;
            const savedVariant = existing
              ? await tx.productVariant.update({ where: { id: existing.id }, data: variantData })
              : await tx.productVariant.create({ data: { productId: listing.productId, ...variantData, name: variant.name ?? '' } });
            if (variant.stock !== undefined || variant.reorderLevel !== undefined) {
              const stocks = await tx.inventoryStock.findMany({ where: { vendorProductId: id, variantId: savedVariant.id } });
              if (stocks.length) {
                for (const stock of stocks) {
                  const quantity = variant.stock ?? stock.quantity;
                  if (stock.reservedQuantity > quantity) throw { status: 400, message: 'Stock quantity cannot be lower than reserved quantity.' };
                  await tx.inventoryStock.update({
                    where: { id: stock.id },
                    data: { quantity, ...(variant.reorderLevel !== undefined && { reorderLevel: variant.reorderLevel }) },
                  });
                  if (quantity !== stock.quantity) await tx.inventoryTransaction.create({
                    data: { stockId: stock.id, type: 'ADJUSTMENT', quantity: quantity - stock.quantity, note: 'Stock adjusted while updating product variant' },
                  });
                }
              } else {
                const quantity = variant.stock ?? 0;
                const stock = await tx.inventoryStock.create({
                  data: {
                    vendorProductId: id,
                    variantId: savedVariant.id,
                    salonId: listing.salonId,
                    branchId: listing.branchId,
                    quantity,
                    reorderLevel: variant.reorderLevel ?? 0,
                  },
                });
                if (quantity > 0) await tx.inventoryTransaction.create({
                  data: { stockId: stock.id, type: 'IN', quantity, note: 'Opening stock' },
                });
              }
            }
          }
        }
        if (data.images) { await tx.productImage.deleteMany({ where: { productId: listing.productId } }); await tx.productImage.createMany({ data: data.images.map((image) => ({ ...image, productId: listing.productId })) }); }
        const raw = input as any;
        const listingData: any = {};
        for (const field of ['vendorPrice', 'sellingPrice', 'discount']) if (raw[field] !== undefined) listingData[field] = Number(raw[field]);
        if (listing.listingStatus === ListingStatus.REJECTED) { listingData.listingStatus = ListingStatus.PENDING; listingData.isListed = false; }
        if (Object.keys(listingData).length) await tx.vendorProduct.update({ where: { id }, data: listingData });
        return tx.vendorProduct.findUnique({ where: { id }, include: { product: { include: productInclude }, stocks: true } });
      });
    } catch (error: any) { if (error.code === 'P2002') throw { status: 409, message: 'SKU already exists.' }; throw error; }
  },

  async archiveVendorProduct(vendorId: string, id: string) { await assertVendorListing(vendorId, id); return prisma.vendorProduct.update({ where: { id }, data: { listingStatus: 'ARCHIVED' as ListingStatus, isListed: false } }); },

  async updateVendorProductStatus(vendorId: string, id: string, status: string) {
    await assertVendorListing(vendorId, id);
    if (!['PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      throw { status: 400, message: 'Invalid product status.' };
    }
    return prisma.vendorProduct.update({
      where: { id },
      data: { listingStatus: status as ListingStatus, isListed: status === 'ACTIVE' },
      include: { salon: true, branch: true, product: { include: { category: true, brand: true, variants: true, images: true } } },
    });
  },

  async listAdminProducts(query: InventoryQuery, inventoryScope?: InventorySalonScopeFilter) {
    const { page, limit, skip } = pageParams(query);
    validateProductFilters(query);
    const createdAt = dateRange(query);
    const matchingStockIds = await stockIdsForStatus(query.stockStatus);
    const where: any = { ...(query.status && { status: query.status }), ...(createdAt && { createdAt }) };
    if (query.search) where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { brand: { name: { contains: query.search, mode: 'insensitive' } } },
      { category: { name: { contains: query.search, mode: 'insensitive' } } },
      { variants: { some: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }, { barcode: { contains: query.search, mode: 'insensitive' } }] } } },
    ];
    if (query.sku || query.barcode) where.variants = { some: { ...(query.sku && { sku: { contains: query.sku.toUpperCase(), mode: 'insensitive' } }), ...(query.barcode && { barcode: { contains: query.barcode } }) } };
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.productId) where.id = query.productId;
    if (query.productType) where.productType = query.productType;
    if (query.vendorId || query.salonId || query.branchId || query.listingStatus || matchingStockIds || inventoryScope) {
      const listingWhere: any = {
        ...(query.vendorId && { vendorId: query.vendorId }),
        ...(query.salonId && { salonId: query.salonId.includes(',') ? { in: query.salonId.split(',') } : query.salonId }),
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.listingStatus && { listingStatus: query.listingStatus }),
        ...(matchingStockIds && { stocks: { some: { id: { in: matchingStockIds } } } }),
      };
      where.listings = { some: inventoryScope
        ? { AND: [listingWhere, { OR: inventoryScope }] }
        : listingWhere };
    } else if (inventoryScope) {
      where.listings = { some: { OR: inventoryScope } };
    }
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = orderDirection(query);
    const productSorts: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      name: { name: sortOrder },
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
    };
    if (![...Object.keys(productSorts), 'price', 'stock', 'sku'].includes(sortBy)) throw { status: 400, message: 'sortBy must be name, price, stock, sku, createdAt, or updatedAt.' };
    const [total, orderedIds] = await Promise.all([
      prisma.product.count({ where }),
      ['price', 'stock', 'sku'].includes(sortBy) ? orderedAdminProductIds(query, sortBy, sortOrder, skip, limit, matchingStockIds, inventoryScope) : Promise.resolve(undefined),
    ]);
    let items = await prisma.product.findMany({
      where: { ...where, ...(orderedIds && { id: { in: orderedIds } }) },
      include: productInclude,
      skip: orderedIds ? undefined : skip,
      take: orderedIds ? undefined : limit,
      orderBy: orderedIds ? undefined : [productSorts[sortBy], { id: 'asc' }],
    });
    if (orderedIds) {
      const itemById = new Map(items.map((item) => [item.id, item]));
      items = orderedIds.map((id) => itemById.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    }
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },

  async getAdminProduct(id: string) { ensureUuid(id, 'product ID'); const product = await prisma.product.findUnique({ where: { id }, include: productInclude }); if (!product) throw { status: 404, message: 'Product not found' }; return product; },
  async approveListing(id: string, status: 'APPROVED' | 'REJECTED') { ensureUuid(id, 'product listing ID'); if (!['APPROVED', 'REJECTED'].includes(status)) throw { status: 400, message: 'Status must be APPROVED or REJECTED.' }; const listing = await prisma.vendorProduct.findUnique({ where: { id } }); if (!listing) throw { status: 404, message: 'Product listing not found' }; return prisma.vendorProduct.update({ where: { id }, data: { listingStatus: status === 'APPROVED' ? ListingStatus.ACTIVE : ListingStatus.REJECTED, isListed: status === 'APPROVED' } }); },

  async listCategories(userId: string, query: InventoryQuery, admin: boolean) {
    const { page, limit, skip } = pageParams(query);
    const createdAt = dateRange(query);
    if (query.status && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(query.status)) throw { status: 400, message: 'Invalid category status.' };
    const where: any = {
      ...(query.search && { name: { contains: query.search.trim(), mode: 'insensitive' } }),
      ...(query.status && { status: query.status }),
      ...(createdAt && { createdAt }),
      ...(query.vendorId && { vendorId: query.vendorId }),
    };
    let permittedProductWhere: any;
    if (!admin) {
      if (query.vendorId && query.vendorId !== userId) throw { status: 403, message: 'You are not authorized to access this vendor catalog.' };
      const scope = await inventorySalonScope(userId);
      permittedProductWhere = { OR: [
        { listings: { some: { vendorId: userId } } },
        ...(scope.stockScope.length ? [{ listings: { some: { OR: scope.stockScope } } }] : []),
      ] };
      where.AND = [{ OR: [{ vendorId: null, salonId: null }, { vendorId: userId }, ...(scope.salonIds.length ? [{ salonId: { in: scope.salonIds } }] : [])] }];
    }
    if (query.salonId) {
      await assertInventorySalonAccess(userId, query.salonId, query.branchId, admin);
      where.AND = [...(where.AND || []), { OR: [{ salonId: null }, { salonId: query.salonId }] }];
    }
    if (query.branchId) {
      if (!query.salonId) {
        const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
        if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
        await assertInventorySalonAccess(userId, branch.parentId, query.branchId, admin);
        where.AND = [...(where.AND || []), { OR: [{ salonId: null }, { salonId: branch.parentId }] }];
      }
      where.AND = [...(where.AND || []), { OR: [{ branchId: null }, { branchId: query.branchId }] }];
    }
    const sortBy = query.sortBy || 'name';
    const direction = query.sortOrder ? orderDirection(query) : 'asc';
    if (!['name', 'createdAt', 'updatedAt'].includes(sortBy)) throw { status: 400, message: 'sortBy must be name, createdAt, or updatedAt.' };
    const orderBy = { [sortBy]: direction };
    const [items, total] = await Promise.all([
      prisma.productCategory.findMany({ where, include: { _count: { select: { products: true } }, vendor: { select: { id: true, firstName: true, lastName: true } }, salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } }, skip, take: limit, orderBy: [orderBy, { id: 'asc' }] }),
      prisma.productCategory.count({ where }),
    ]);
    const productCounts = !admin && items.length
      ? await prisma.product.groupBy({ by: ['categoryId'], where: { categoryId: { in: items.map(({ id }) => id) }, ...permittedProductWhere }, _count: { _all: true } })
      : [];
    const productCountByCategory = new Map(productCounts.map(({ categoryId, _count }) => [categoryId, _count._all]));
    return { items: items.map((item: any) => ({ ...item, productCount: admin ? item._count.products : productCountByCategory.get(item.id) ?? 0 })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },
  async getCategory(userId: string, id: string, admin: boolean) {
    ensureUuid(id, 'category ID');
    const scope = admin ? undefined : await inventorySalonScope(userId);
    const productAccess = admin ? undefined : { OR: [
      { listings: { some: { vendorId: userId } } },
      ...((scope?.stockScope.length ?? 0) ? [{ listings: { some: { OR: scope!.stockScope } } }] : []),
    ] };
    const item = await prisma.productCategory.findUnique({ where: { id }, include: { products: admin ? true : { where: productAccess }, vendor: true, salon: true, branch: true } });
    if (!item || (!admin && item.vendorId && item.vendorId !== userId)) throw { status: 404, message: 'Category not found' };
    if (!admin && item.salonId) await assertInventorySalonAccess(userId, item.salonId, item.branchId);
    return item;
  },
  async createCategory(userId: string, input: unknown, admin: boolean) { const data: any = categorySchema.parse(input); if (data.branchId && !data.salonId) throw { status: 400, message: 'A branch must belong to a selected salon.' }; if (data.salonId) { await assertSalonBranch(data.salonId, data.branchId); if (!admin) await assertVendorLocation(userId, data.salonId, data.branchId); } if (data.parentId) await assertCategoryParentAccess(userId, data.parentId, admin); if (!admin) data.vendorId = userId; else if (data.vendorId === undefined) data.vendorId = null; data.createdById = userId; const duplicate = await prisma.productCategory.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, vendorId: data.vendorId ?? null, salonId: data.salonId ?? null, branchId: data.branchId ?? null } }); if (duplicate) throw { status: 409, message: 'Category already exists in this scope.' }; delete data.slug; data.slug = await uniqueSlug('category', data.name); return prisma.productCategory.create({ data }); },
  async updateCategory(userId: string, id: string, input: unknown, admin: boolean) {
    ensureUuid(id, 'category ID');
    const item = await prisma.productCategory.findUnique({ where: { id } });
    if (!item || (!admin && item.vendorId !== userId)) throw { status: 404, message: 'Category not found' };
    const data: any = categorySchema.partial().omit({ vendorId: true }).parse(input);
    if (data.parentId) await assertCategoryParentAccess(userId, data.parentId, admin);
    const salonId = data.salonId === undefined ? item.salonId : data.salonId;
    const branchId = data.salonId === null && data.branchId === undefined ? null : data.branchId === undefined ? item.branchId : data.branchId;
    if (branchId && !salonId) throw { status: 400, message: 'A branch must belong to a selected salon.' };
    if (salonId) {
      await assertSalonBranch(salonId, branchId);
      if (!admin) await assertVendorLocation(userId, salonId, branchId);
    }
    if (data.salonId === null && data.branchId === undefined) data.branchId = null;
    return prisma.productCategory.update({ where: { id }, data });
  },
  async deleteCategory(userId: string, id: string, admin: boolean) { ensureUuid(id, 'category ID'); const item = await prisma.productCategory.findUnique({ where: { id } }); if (!item || (!admin && item.vendorId !== userId)) throw { status: 404, message: 'Category not found' }; return prisma.productCategory.update({ where: { id }, data: { status: 'ARCHIVED' } }); },
  async listBrands(userId: string, query: InventoryQuery, admin: boolean) {
    const { page, limit, skip } = pageParams(query);
    const createdAt = dateRange(query);
    if (query.status && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(query.status)) throw { status: 400, message: 'Invalid brand status.' };
    const where: any = {
      ...(query.search && { name: { contains: query.search.trim(), mode: 'insensitive' } }),
      ...(query.status && { status: query.status }),
      ...(createdAt && { createdAt }),
      ...(query.vendorId && { vendorId: query.vendorId }),
    };
    if (!admin) {
      if (query.vendorId && query.vendorId !== userId) throw { status: 403, message: 'You are not authorized to access this vendor catalog.' };
      const scope = await inventorySalonScope(userId);
      where.AND = [{ OR: [{ vendorId: null, salonId: null }, { vendorId: userId }, ...(scope.salonIds.length ? [{ salonId: { in: scope.salonIds } }] : [])] }];
    }
    if (query.salonId) {
      await assertInventorySalonAccess(userId, query.salonId, query.branchId, admin);
      where.AND = [...(where.AND || []), { OR: [{ salonId: null }, { salonId: query.salonId }] }];
    }
    if (query.branchId && !query.salonId) {
      const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
      if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
      await assertInventorySalonAccess(userId, branch.parentId, query.branchId, admin);
      where.AND = [...(where.AND || []), { OR: [{ salonId: null }, { salonId: branch.parentId }] }];
    }
    const sortBy = query.sortBy || 'name';
    const direction = query.sortOrder ? orderDirection(query) : 'asc';
    if (!['name', 'createdAt', 'updatedAt'].includes(sortBy)) throw { status: 400, message: 'sortBy must be name, createdAt, or updatedAt.' };
    const [items, total] = await Promise.all([prisma.productBrand.findMany({ where, include: { vendor: { select: { id: true, firstName: true, lastName: true } }, salon: { select: { id: true, name: true } } }, skip, take: limit, orderBy: [{ [sortBy]: direction }, { id: 'asc' }] }), prisma.productBrand.count({ where })]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },
  async createBrand(userId: string, input: unknown, admin: boolean) { const data: any = brandSchema.parse(input); if (data.salonId) { await assertSalonBranch(data.salonId); if (!admin) await assertVendorLocation(userId, data.salonId); } if (!admin) data.vendorId = userId; else if (data.vendorId === undefined) data.vendorId = null; delete data.slug; data.slug = await uniqueSlug('brand', data.name); return prisma.productBrand.create({ data }); },
  async updateBrand(userId: string, id: string, input: unknown, admin: boolean) { ensureUuid(id, 'brand ID'); const item = await prisma.productBrand.findUnique({ where: { id } }); if (!item || (!admin && item.vendorId !== userId)) throw { status: 404, message: 'Brand not found' }; const data = brandSchema.partial().omit({ vendorId: true }).parse(input); if (data.salonId) { await assertSalonBranch(data.salonId); if (!admin) await assertVendorLocation(userId, data.salonId); } return prisma.productBrand.update({ where: { id }, data }); },
  async deleteBrand(userId: string, id: string, admin: boolean) { ensureUuid(id, 'brand ID'); const item = await prisma.productBrand.findUnique({ where: { id } }); if (!item || (!admin && item.vendorId !== userId)) throw { status: 404, message: 'Brand not found' }; return prisma.productBrand.update({ where: { id }, data: { status: 'ARCHIVED' } }); },

  async listVendorStock(vendorId: string, query: InventoryQuery) {
    const { page, limit, skip } = pageParams(query);
    validateProductFilters(query);
    if (query.vendorId && query.vendorId !== vendorId) throw { status: 403, message: 'You are not authorized to access this vendor inventory.' };
    const updatedAt = dateRange(query);
    const matchingStockIds = await stockIdsForStatus(query.stockStatus);
    if (query.salonId) await assertVendorLocation(vendorId, query.salonId, query.branchId);
    if (query.branchId && !query.salonId) {
      const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
      if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
      await assertVendorLocation(vendorId, branch.parentId, query.branchId);
    }
    const variantFilter: any = {};
    if (query.search) variantFilter.OR = [
      { sku: { contains: query.search, mode: 'insensitive' } },
      { barcode: { contains: query.search, mode: 'insensitive' } },
      { product: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { category: { name: { contains: query.search, mode: 'insensitive' } } }] } },
    ];
    if (query.sku) variantFilter.sku = { contains: query.sku, mode: 'insensitive' };
    if (query.barcode) variantFilter.barcode = { contains: query.barcode, mode: 'insensitive' };
    const where: any = {
      vendorProduct: {
        vendorId,
        ...(query.listingStatus && { listingStatus: query.listingStatus }),
        ...(query.salonId && { salonId: query.salonId }),
        ...(query.branchId && { branchId: query.branchId }),
        product: {
          ...(query.categoryId && { categoryId: query.categoryId }),
          ...(query.productId && { id: query.productId }),
          ...(query.status && { status: query.status }),
          ...(query.productType && { productType: query.productType }),
        },
      },
      ...(query.salonId && { salonId: query.salonId }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(updatedAt && { updatedAt }),
      ...(matchingStockIds && { id: { in: matchingStockIds } }),
      ...(Object.keys(variantFilter).length && { variant: variantFilter }),
    };
    const [items, total] = await Promise.all([
      prisma.inventoryStock.findMany({ where, include: { variant: { include: { product: { include: { category: true } } } }, vendorProduct: { include: { vendor: { select: { id: true, firstName: true, lastName: true } }, salon: true, branch: true } }, transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }, skip, take: limit, orderBy: [orderByStock(query), { id: 'desc' }] }),
      prisma.inventoryStock.count({ where }),
    ]);
    return { items: items.map((item) => ({ ...item, availableQuantity: item.quantity - item.reservedQuantity, stockStatus: item.quantity - item.reservedQuantity <= 0 ? 'OUT_OF_STOCK' : item.quantity - item.reservedQuantity <= item.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK' })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },
  async listSalonStock(userId: string, query: InventoryQuery, admin: boolean) {
    const { page, limit, skip } = pageParams(query);
    validateProductFilters(query);
    const updatedAt = dateRange(query);
    const matchingStockIds = await stockIdsForStatus(query.stockStatus);
    const scope = admin ? undefined : await inventorySalonScope(userId);
    if (query.salonId) await assertInventorySalonAccess(userId, query.salonId, query.branchId, admin);
    if (query.branchId && !query.salonId) {
      const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
      if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
      await assertInventorySalonAccess(userId, branch.parentId, query.branchId, admin);
    }
    const variantFilter: any = {
      ...(query.productId && { productId: query.productId }),
      ...((query.categoryId || query.status) && { product: {
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.status && { status: query.status }),
        ...(query.productType && { productType: query.productType }),
      } }),
      ...(query.productType && !(query.categoryId || query.status) && { product: { productType: query.productType } }),
    };
    if (query.search) variantFilter.OR = [
      { sku: { contains: query.search, mode: 'insensitive' } },
      { barcode: { contains: query.search, mode: 'insensitive' } },
      { product: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { category: { name: { contains: query.search, mode: 'insensitive' } } }] } },
    ];
    if (query.sku) variantFilter.sku = { contains: query.sku, mode: 'insensitive' };
    if (query.barcode) variantFilter.barcode = { contains: query.barcode, mode: 'insensitive' };
    const vendorProductFilter: any = {
      ...(query.vendorId && { vendorId: query.vendorId }),
      ...(query.listingStatus && { listingStatus: query.listingStatus }),
    };
    const where: any = {
      ...(scope && { OR: scope.stockScope.length ? scope.stockScope : [{ id: { in: [] } }] }),
      ...(query.salonId && { salonId: query.salonId }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(updatedAt && { updatedAt }),
      ...(matchingStockIds && { id: { in: matchingStockIds } }),
      ...(Object.keys(variantFilter).length && { variant: variantFilter }),
      ...(Object.keys(vendorProductFilter).length && { vendorProduct: vendorProductFilter }),
    };
    const [items, total] = await Promise.all([
      prisma.inventoryStock.findMany({ where, include: { variant: { include: { product: { include: { category: true } } } }, vendorProduct: { include: { vendor: { select: { id: true, firstName: true, lastName: true } }, salon: true, branch: true } }, transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }, skip, take: limit, orderBy: [orderByStock(query), { id: 'desc' }] }),
      prisma.inventoryStock.count({ where }),
    ]);
    return { items: items.map((item) => ({ ...item, availableQuantity: item.quantity - item.reservedQuantity, stockStatus: item.quantity - item.reservedQuantity <= 0 ? 'OUT_OF_STOCK' : item.quantity - item.reservedQuantity <= item.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK' })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 && total > 0 } };
  },
  async createSalonStock(userId: string, input: any, admin: boolean) { const { vendorProductId, variantId, salonId, branchId = null, quantity = 0, reorderLevel = 0 } = input; if (!vendorProductId || !variantId || !salonId || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0) throw { status: 400, message: 'vendorProductId, variantId, salonId, quantity, and reorderLevel are required and must be valid' }; ensureUuid(vendorProductId, 'vendor product ID'); ensureUuid(variantId, 'variant ID'); ensureUuid(salonId, 'salon ID'); if (branchId) ensureUuid(branchId, 'branch ID'); await assertInventorySalonAccess(userId, salonId, branchId, admin); await assertSalonBranch(salonId, branchId); const listing = await prisma.vendorProduct.findFirst({ where: { id: vendorProductId, salonId, ...(branchId !== null && { branchId }) } }); if (!listing) throw { status: 404, message: 'Product listing not found for this salon and branch' }; const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId: listing.productId } }); if (!variant) throw { status: 400, message: 'Variant does not belong to the selected product' }; return prisma.$transaction(async (tx) => { const stock = await tx.inventoryStock.upsert({ where: { vendorProductId_variantId_salonId_branchId: { vendorProductId, variantId, salonId, branchId } }, create: { vendorProductId, variantId, salonId, branchId, quantity, reorderLevel }, update: { quantity: { increment: quantity }, reorderLevel } }); if (quantity > 0) await tx.inventoryTransaction.create({ data: { stockId: stock.id, type: 'IN', quantity, note: 'Stock added' } }); return stock; }); },
  async updateSalonStock(userId: string, id: string, input: any, admin: boolean) { ensureUuid(id, 'stock ID'); const data = stockSchema.parse(input); const current = await prisma.inventoryStock.findUnique({ where: { id } }); if (!current) throw { status: 404, message: 'Stock record not found' }; await assertInventorySalonAccess(userId, current.salonId, current.branchId, admin); const quantity = data.quantity ?? current.quantity; const reservedQuantity = data.reservedQuantity ?? current.reservedQuantity; if (reservedQuantity > quantity) throw { status: 400, message: 'Reserved quantity cannot exceed quantity' }; return prisma.$transaction(async (tx) => { const stock = await tx.inventoryStock.update({ where: { id }, data: { quantity, reservedQuantity, ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }) } }); if (quantity !== current.quantity) await tx.inventoryTransaction.create({ data: { stockId: id, type: 'ADJUSTMENT', quantity: quantity - current.quantity, note: 'Stock adjusted' } }); if (reservedQuantity !== current.reservedQuantity) await tx.inventoryTransaction.create({ data: { stockId: id, type: reservedQuantity > current.reservedQuantity ? 'RESERVED' : 'RELEASED', quantity: Math.abs(reservedQuantity - current.reservedQuantity), note: 'Reserved stock updated' } }); return stock; }); },
  async removeSalonStock(userId: string, id: string, admin: boolean) { ensureUuid(id, 'stock ID'); const current = await prisma.inventoryStock.findUnique({ where: { id } }); if (!current) throw { status: 404, message: 'Stock record not found' }; await assertInventorySalonAccess(userId, current.salonId, current.branchId, admin); return prisma.$transaction(async (tx) => { const stock = await tx.inventoryStock.update({ where: { id }, data: { quantity: 0, reservedQuantity: 0 } }); if (current.quantity > 0) await tx.inventoryTransaction.create({ data: { stockId: id, type: 'ADJUSTMENT', quantity: -current.quantity, note: 'Stock removed' } }); if (current.reservedQuantity > 0) await tx.inventoryTransaction.create({ data: { stockId: id, type: 'RELEASED', quantity: current.reservedQuantity, note: 'Reserved stock released when removing stock' } }); return stock; }); },
  async listSalonProducts(userId: string, query: InventoryQuery) {
    const scope = await inventorySalonScope(userId);
    const { page, limit } = pageParams(query);
    if (query.salonId) await assertInventorySalonAccess(userId, query.salonId, query.branchId);
    if (query.branchId && !query.salonId) {
      const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
      if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
      await assertInventorySalonAccess(userId, branch.parentId, query.branchId);
    }
    if (!scope.salonIds.length) return { items: [], pagination: { page, limit, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
    const salonIds = query.salonId ? [query.salonId] : undefined;
    return this.listAdminProducts({ ...query, ...(salonIds && { salonId: salonIds.join(',') }) }, scope.stockScope as InventorySalonScopeFilter);
  },
  async updateStock(vendorId: string, id: string, input: unknown) { const data = stockSchema.parse(input); const stock = await prisma.inventoryStock.findFirst({ where: { id, vendorProduct: { vendorId } } }); if (!stock) throw { status: 404, message: 'Stock record not found' }; if ((data.reservedQuantity ?? stock.reservedQuantity) > (data.quantity ?? stock.quantity)) throw { status: 400, message: 'Reserved quantity cannot exceed quantity' }; return prisma.$transaction(async (tx) => { const updated = await tx.inventoryStock.update({ where: { id }, data }); if (data.quantity !== undefined && data.quantity !== stock.quantity) await tx.inventoryTransaction.create({ data: { stockId: id, type: 'ADJUSTMENT', quantity: data.quantity - stock.quantity, note: 'Stock updated' } }); return updated; }); },

  async lowStock(query: InventoryQuery) { const conditions = [Prisma.sql` s."quantity" - s."reservedQuantity" <= s."reorderLevel"`]; if (query.salonId) conditions.push(Prisma.sql` s."salonId" = ${query.salonId}`); if (query.branchId) conditions.push(Prisma.sql` s."branchId" = ${query.branchId}`); if (query.vendorId) conditions.push(Prisma.sql` vp."vendorId" = ${query.vendorId}`); const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT s.id FROM "InventoryStock" s JOIN "VendorProduct" vp ON vp.id = s."vendorProductId" WHERE ${Prisma.join(conditions, ' AND ')}`); return prisma.inventoryStock.findMany({ where: { id: { in: rows.map((row) => row.id) } }, include: { variant: { include: { product: true } }, vendorProduct: { include: { vendor: { select: { id: true, firstName: true, lastName: true } }, salon: true, branch: true } } } }); },
  async stats(group: 'salons' | 'vendors' | 'salon-vendor', query: InventoryQuery = {}) {
    if (group === 'salon-vendor') {
      const listings = await prisma.vendorProduct.findMany({ where: { ...(query.salonId && { salonId: query.salonId }), ...(query.branchId && { branchId: query.branchId }), ...(query.vendorId && { vendorId: query.vendorId }) }, include: { salon: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, vendor: { select: { id: true, firstName: true, lastName: true } } } });
      const groups = new Map<string, any>();
      for (const listing of listings) {
        const key = `${listing.salonId}:${listing.branchId || ''}:${listing.vendorId}`;
        const row = groups.get(key) || { salonId: listing.salonId, salonName: listing.salon.name, branchId: listing.branchId, branchName: listing.branch?.name || 'Main salon', vendorId: listing.vendorId, vendorName: `${listing.vendor.firstName} ${listing.vendor.lastName || ''}`.trim(), totalProducts: 0, activeProducts: 0, pendingProducts: 0, inactiveProducts: 0 };
        row.totalProducts += 1;
        if (['ACTIVE', 'APPROVED'].includes(listing.listingStatus)) row.activeProducts += 1;
        else if (listing.listingStatus === 'PENDING') row.pendingProducts += 1;
        else row.inactiveProducts += 1;
        groups.set(key, row);
      }
      return Array.from(groups.values());
    }
    const normalized = group === 'salons' ? 'salon' : 'vendor'; const groups: any = normalized === 'salon' ? await prisma.vendorProduct.groupBy({ by: ['salonId', 'listingStatus'], _count: { _all: true } }) : await prisma.vendorProduct.groupBy({ by: ['vendorId', 'listingStatus'], _count: { _all: true } }); const ids: string[] = [...new Set<string>(groups.map((item: any) => normalized === 'vendor' ? item.vendorId : item.salonId))]; const [salons, users] = await Promise.all([prisma.salon.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }), prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })]); const salonMap = new Map(salons.map((item) => [item.id, item.name])); const userMap = new Map(users.map((item) => [item.id, `${item.firstName} ${item.lastName || ''}`.trim()])); const key = normalized === 'vendor' ? 'vendorId' : 'salonId'; return ids.map((id) => { const rows = groups.filter((item: any) => item[key] === id); return { [`${normalized}Id`]: id, [`${normalized}Name`]: normalized === 'vendor' ? userMap.get(id) : salonMap.get(id), totalProducts: rows.reduce((sum: number, row: any) => sum + row._count._all, 0), activeProducts: rows.filter((row: any) => ['ACTIVE', 'APPROVED'].includes(row.listingStatus)).reduce((sum: number, row: any) => sum + row._count._all, 0), pendingProducts: rows.filter((row: any) => row.listingStatus === 'PENDING').reduce((sum: number, row: any) => sum + row._count._all, 0), inactiveProducts: rows.filter((row: any) => row.listingStatus === 'INACTIVE').reduce((sum: number, row: any) => sum + row._count._all, 0) }; }); },
    async inventoryReport(userId: string, query: InventoryQuery, admin = false, vendor = false) {
      const { page, limit, skip } = pageParams(query);
      validateProductFilters(query);
      if (vendor && query.vendorId && query.vendorId !== userId) throw { status: 403, message: 'You are not authorized to access this vendor inventory.' };
      const createdAt = dateRange(query);
      const matchingStockIds = await stockIdsForStatus(query.stockStatus);
      const salonScope = !admin && !vendor ? await inventorySalonScope(userId) : undefined;
      if (!admin && query.salonId) {
        if (vendor) await assertVendorLocation(userId, query.salonId, query.branchId);
        else await assertInventorySalonAccess(userId, query.salonId, query.branchId);
      }
      if (!admin && query.branchId && !query.salonId) {
        const branch = await prisma.salon.findUnique({ where: { id: query.branchId }, select: { parentId: true } });
        if (!branch?.parentId) throw { status: 400, message: 'Selected branch is invalid.' };
        if (vendor) await assertVendorLocation(userId, branch.parentId, query.branchId);
        else await assertInventorySalonAccess(userId, branch.parentId, query.branchId);
      }
      const listingWhere: any = {
        ...(admin
          ? (query.vendorId && { vendorId: query.vendorId })
          : vendor
            ? { vendorId: userId }
            : { ...(query.vendorId && { vendorId: query.vendorId }), OR: (salonScope?.stockScope ?? []).map((scope: any) => ({ salonId: scope.salonId, ...(scope.branchId && { branchId: scope.branchId }) })) }),
        ...(query.salonId && { salonId: query.salonId }),
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.listingStatus && { listingStatus: query.listingStatus }),
        ...(createdAt && { createdAt }),
        ...(matchingStockIds && { stocks: { some: { id: { in: matchingStockIds } } } }),
        product: {
          ...(query.status && { status: query.status }),
          ...(query.productType && { productType: query.productType }),
          ...(query.productId && { id: query.productId }),
          ...(query.categoryId && { categoryId: query.categoryId }),
          ...((query.sku || query.barcode) && { variants: { some: {
            ...(query.sku && { sku: { contains: query.sku, mode: 'insensitive' } }),
            ...(query.barcode && { barcode: { contains: query.barcode } }),
          } } }),
          ...(query.search && { OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { category: { name: { contains: query.search, mode: 'insensitive' } } },
            { variants: { some: { OR: [{ sku: { contains: query.search, mode: 'insensitive' } }, { barcode: { contains: query.search, mode: 'insensitive' } }] } } },
          ] }),
        },
      };
      const reportAccess = { userId, admin, vendor, salonScope };
      const stockFilters = inventorySqlFilters(query, reportAccess);
      const stockFilterSql = stockFilters.length ? Prisma.join(stockFilters, ' AND ') : Prisma.sql`1 = 1`;
      const transactionFilters = inventorySqlFilters(query, reportAccess, true);
      const transactionFilterSql = transactionFilters.length ? Prisma.join(transactionFilters, ' AND ') : Prisma.sql`1 = 1`;
      const reportStockWhere: any = {
        ...(salonScope && { OR: salonScope.stockScope.length ? salonScope.stockScope : [{ id: { in: [] } }] }),
        ...(query.salonId && { salonId: query.salonId }),
        ...(query.branchId && { branchId: query.branchId }),
        ...(createdAt && { updatedAt: createdAt }),
        ...(matchingStockIds && { id: { in: matchingStockIds } }),
        variant: {
          product: {
            ...(query.categoryId && { categoryId: query.categoryId }),
            ...(query.status && { status: query.status }),
            ...(query.productType && { productType: query.productType }),
            ...(query.productId && { id: query.productId }),
            ...(query.search && { OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
              { variants: { some: { OR: [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { barcode: { contains: query.search, mode: 'insensitive' } },
              ] } } },
            ] }),
            ...((query.sku || query.barcode) && { variants: { some: {
              ...(query.sku && { sku: { contains: query.sku, mode: 'insensitive' } }),
              ...(query.barcode && { barcode: { contains: query.barcode } }),
            } } }),
          },
        },
        vendorProduct: {
          ...(admin && query.vendorId && { vendorId: query.vendorId }),
          ...(vendor && { vendorId: userId }),
          ...(query.listingStatus && { listingStatus: query.listingStatus }),
          ...(query.vendorId && !admin && !vendor && { vendorId: query.vendorId }),
        },
      };
      const [totalProducts, uniqueProducts, activeProducts, pendingListings, inactiveProducts, archivedProducts, totalCategories, totalVendors, totalSalons, stockTotals, movement, reportTotal, reportItems] = await Promise.all([
        prisma.vendorProduct.count({ where: listingWhere }),
        prisma.product.count({ where: { listings: { some: listingWhere } } }),
        prisma.vendorProduct.count({ where: { ...listingWhere, listingStatus: ListingStatus.ACTIVE } }),
        prisma.vendorProduct.count({ where: { ...listingWhere, listingStatus: ListingStatus.PENDING } }),
        prisma.vendorProduct.count({ where: { ...listingWhere, listingStatus: ListingStatus.INACTIVE } }),
        prisma.vendorProduct.count({ where: { ...listingWhere, listingStatus: ListingStatus.ARCHIVED } }),
        prisma.productCategory.count({ where: { products: { some: { listings: { some: listingWhere } } } } }),
        prisma.vendorProduct.groupBy({ by: ['vendorId'], where: listingWhere }),
        prisma.vendorProduct.groupBy({ by: ['salonId'], where: listingWhere }),
        prisma.$queryRaw<Array<{ stockRows: bigint; totalStock: bigint; availableStock: bigint; lowStock: bigint; outOfStock: bigint; stockValue: number }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS "stockRows",
            COALESCE(SUM(s."quantity"), 0)::bigint AS "totalStock",
            COALESCE(SUM(s."quantity" - s."reservedQuantity"), 0)::bigint AS "availableStock",
            COUNT(*) FILTER (WHERE s."quantity" - s."reservedQuantity" > 0 AND s."quantity" - s."reservedQuantity" <= s."reorderLevel")::bigint AS "lowStock",
            COUNT(*) FILTER (WHERE s."quantity" - s."reservedQuantity" <= 0)::bigint AS "outOfStock",
            COALESCE(SUM((s."quantity" - s."reservedQuantity") * pv."costPrice"), 0)::float AS "stockValue"
          FROM "InventoryStock" s
          JOIN "VendorProduct" vp ON vp.id = s."vendorProductId"
          JOIN "ProductVariant" pv ON pv.id = s."variantId"
          JOIN "Product" p ON p.id = pv."productId"
          LEFT JOIN "ProductCategory" pc ON pc.id = p."categoryId"
          WHERE ${stockFilterSql}
        `),
        prisma.$queryRaw<Array<{ transactionCount: bigint; stockMovement: number }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS "transactionCount",
            COALESCE(SUM(CASE
              WHEN t."type" = 'OUT' THEN -ABS(t."quantity")
              WHEN t."type" IN ('IN', 'RETURN') THEN ABS(t."quantity")
              WHEN t."type" = 'ADJUSTMENT' THEN t."quantity"
              ELSE 0
            END), 0)::float AS "stockMovement"
          FROM "InventoryTransaction" t
          JOIN "InventoryStock" s ON s.id = t."stockId"
          JOIN "VendorProduct" vp ON vp.id = s."vendorProductId"
          JOIN "ProductVariant" pv ON pv.id = s."variantId"
          JOIN "Product" p ON p.id = pv."productId"
          LEFT JOIN "ProductCategory" pc ON pc.id = p."categoryId"
          WHERE ${transactionFilterSql}
        `),
        prisma.inventoryStock.count({ where: reportStockWhere }),
        prisma.inventoryStock.findMany({
          where: reportStockWhere,
          include: {
            variant: { include: { product: { include: { category: true, brand: true } } } },
            vendorProduct: {
              include: {
                vendor: { select: { id: true, firstName: true, lastName: true } },
                salon: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
              },
            },
          },
          skip,
          take: limit,
          orderBy: [orderByStock(query), { id: 'desc' }],
        }),
      ]);
      const totals = stockTotals[0];
      const movementTotals = movement[0];
      return {
        totalProducts,
        uniqueProducts,
        activeProducts,
        pendingListings,
        inactiveProducts,
        archivedProducts,
        totalCategories,
        totalVendors: totalVendors.length,
        totalSalons: totalSalons.length,
        totalStock: Number(totals?.totalStock ?? 0),
        availableStock: Number(totals?.availableStock ?? 0),
        lowStock: Number(totals?.lowStock ?? 0),
        outOfStock: Number(totals?.outOfStock ?? 0),
        stockValue: Number(totals?.stockValue ?? 0),
        stockMovement: Number(movementTotals?.stockMovement ?? 0),
        transactionCount: Number(movementTotals?.transactionCount ?? 0),
        items: reportItems.map((item) => ({
          ...item,
          availableQuantity: item.quantity - item.reservedQuantity,
          stockStatus: item.quantity - item.reservedQuantity <= 0
            ? 'OUT_OF_STOCK'
            : item.quantity - item.reservedQuantity <= item.reorderLevel
              ? 'LOW_STOCK'
              : 'IN_STOCK',
        })),
        pagination: {
          page,
          limit,
          total: reportTotal,
          totalPages: Math.ceil(reportTotal / limit),
          hasNextPage: page * limit < reportTotal,
          hasPreviousPage: page > 1 && reportTotal > 0,
        },
      };
    },
    async dashboardStats(userId: string, query: InventoryQuery = {}, admin = false, vendor = false) {
      return this.inventoryReport(userId, query, admin, vendor);
    },
};

export { isAdmin };
