import { Router } from 'express';
import { authenticate, authorizeRoles, rejectCustomerAccount } from '../../common/middleware/auth.middleware';
import { APP_CONSTANTS } from '../../common/constants/app.constants';
import { inventoryController } from './inventory.controller';
import { requirePermissionOrRoles } from '../../common/middleware/permission.middleware';
import multer from 'multer';

const router = Router();
const vendor = authorizeRoles(APP_CONSTANTS.ROLES.VENDOR);
const admin = authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN');
// Salon-stock access is decided from salon ownership in the service.  Do not
// gate it on VENDOR: vendors must never acquire stock write access by role.
const catalogManager = authorizeRoles(APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN', APP_CONSTANTS.ROLES.VENDOR);
const inventoryImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 8 } });

router.use(authenticate, rejectCustomerAccount);
router.use(requirePermissionOrRoles('inventory.view', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN', APP_CONSTANTS.ROLES.VENDOR));

/**
 * @swagger
 * tags:
 *   - name: Inventory - Vendor
 *     description: Vendor-owned product, listing, and stock operations
 *   - name: Inventory - Admin
 *     description: Admin inventory search, approval, reporting, and low-stock operations
 *   - name: Inventory - Catalog
 *     description: Inventory categories and brands
 * components:
 *   schemas:
 *     InventoryVariant:
 *       type: object
 *       required: [name, sku]
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, example: 500ml }
 *         sku: { type: string, example: SHMP-500 }
 *         barcode: { type: string }
 *         costPrice: { type: number, minimum: 0 }
 *         mrp: { type: number, minimum: 0 }
 *         sellingPrice: { type: number, minimum: 0 }
 *         volume: { type: number, minimum: 0 }
 *         volumeUnit: { type: string, example: ML }
 *         stock: { type: integer, minimum: 0 }
 *         reorderLevel: { type: integer, minimum: 0 }
 *     InventoryProductCreate:
 *       type: object
 *       required: [name, salonId, variants]
 *       properties:
 *         name: { type: string, example: Professional Shampoo }
 *         description: { type: string }
 *         shortDescription: { type: string }
 *         categoryId: { type: string, format: uuid, nullable: true }
 *         brandId: { type: string, format: uuid, nullable: true }
 *         productType: { type: string, enum: [RETAIL, CONSUMABLE, PROFESSIONAL, SERVICE_PRODUCT, OTHER] }
 *         gstRate: { type: number, minimum: 0, maximum: 100 }
 *         hsnCode: { type: string }
 *         salonId: { type: string, format: uuid }
 *         branchId: { type: string, format: uuid, nullable: true }
 *         vendorPrice: { type: number, minimum: 0 }
 *         listingSellingPrice: { type: number, minimum: 0 }
 *         discount: { type: number, minimum: 0, maximum: 100 }
 *         variants: { type: array, items: { $ref: '#/components/schemas/InventoryVariant' } }
 *     InventoryStockUpdate:
 *       type: object
 *       properties:
 *         quantity: { type: integer, minimum: 0 }
 *         reservedQuantity: { type: integer, minimum: 0 }
 *         reorderLevel: { type: integer, minimum: 0 }
 */

/**
 * @swagger
 * /api/v1/inventory/vendor/products:
 *   post:
 *     tags: [Inventory - Vendor]
 *     summary: Create a vendor product and listing
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { $ref: '#/components/schemas/InventoryProductCreate' } }
 *     responses:
 *       201: { description: Product created in PENDING approval state }
 *       409: { description: Duplicate SKU or listing }
 *   get:
 *     tags: [Inventory - Vendor]
 *     summary: List the authenticated vendor's products
 *     security: [{ bearerAuth: [] }]
 *     parameters: &inventoryFilters
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED] } }
 *       - { in: query, name: categoryId, schema: { type: string, format: uuid } }
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: stockStatus, schema: { type: string, enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK] } }
 *       - { in: query, name: listingStatus, schema: { type: string, enum: [PENDING, ACTIVE, INACTIVE, ARCHIVED, REJECTED] } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [name, price, createdAt, updatedAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *       - { in: query, name: startDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: endDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: Paginated vendor products }
 */
router.post('/vendor/products', vendor, requirePermissionOrRoles('inventory.create', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.create);
router.get('/vendor/products', vendor, inventoryController.vendorList);
router.post('/vendor/products/images', vendor, inventoryImageUpload.array('images', 8), inventoryController.uploadImages);

/**
 * @swagger
 * /api/v1/inventory/vendor/products/{id}:
 *   get:
 *     tags: [Inventory - Vendor]
 *     summary: Get one vendor product listing
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Product listing }, 404: { description: Listing not found } }
 *   put:
 *     tags: [Inventory - Vendor]
 *     summary: Update an owned product listing
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       content:
 *         application/json: { schema: { $ref: '#/components/schemas/InventoryProductCreate' } }
 *     responses: { 200: { description: Listing updated }, 409: { description: Duplicate SKU } }
 *   delete:
 *     tags: [Inventory - Vendor]
 *     summary: Archive an owned product
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Product archived } }
 */
router.get('/vendor/products/:id', vendor, inventoryController.vendorGet);
router.put('/vendor/products/:id', vendor, requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.vendorUpdate);
router.delete('/vendor/products/:id', vendor, requirePermissionOrRoles('inventory.delete', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.vendorDelete);
router.patch('/vendor/products/:id/status', vendor, requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.vendorStatus);

/**
 * @swagger
 * /api/v1/inventory/vendor/stock:
 *   get:
 *     tags: [Inventory - Vendor]
 *     summary: List stock for the authenticated vendor
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: productId, schema: { type: string, format: uuid } }
 *       - { in: query, name: categoryId, schema: { type: string, format: uuid } }
 *       - { in: query, name: stockStatus, schema: { type: string, enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [quantity, name, createdAt, updatedAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *       - { in: query, name: startDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: endDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses: { 200: { description: Paginated stock records } }
 */
router.get('/vendor/stock', vendor, inventoryController.stock);
router.put('/vendor/stock/:id', vendor, requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.updateVendorStock);

/**
 * @swagger
 * /api/v1/inventory/vendor/stock/{id}:
 *   put:
 *     tags: [Inventory - Vendor]
 *     summary: Update owned stock
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { $ref: '#/components/schemas/InventoryStockUpdate' } }
 *     responses: { 200: { description: Stock updated }, 400: { description: Invalid or negative stock } }
 */
router.get('/salon/products', inventoryController.salonProducts);
router.get('/salon/stock', inventoryController.salonStock);
router.post('/salon/stock', requirePermissionOrRoles('inventory.create', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.createSalonStock);
router.put('/salon/stock/:id', requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.updateSalonStock);
router.delete('/salon/stock/:id', requirePermissionOrRoles('inventory.delete', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.removeSalonStock);

/**
 * @swagger
 * /api/v1/inventory/categories:
 *   get:
 *     tags: [Inventory - Catalog]
 *     summary: List product categories
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE, ARCHIVED] } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [name, createdAt, updatedAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses: { 200: { description: Category tree } }
 *   post:
 *     tags: [Inventory - Catalog]
 *     summary: Create a product category (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [name], properties: { name: { type: string }, slug: { type: string }, description: { type: string }, parentId: { type: string, format: uuid } } } } } }
 *     responses: { 201: { description: Category created } }
 * /api/v1/inventory/brands:
 *   get:
 *     tags: [Inventory - Catalog]
 *     summary: List product brands
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Brand list } }
 *   post:
 *     tags: [Inventory - Catalog]
 *     summary: Create a product brand (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [name], properties: { name: { type: string }, slug: { type: string }, description: { type: string } } } } } }
 *     responses: { 201: { description: Brand created } }
 */
router.get('/categories', inventoryController.categories);
router.get('/categories/:id', inventoryController.categoryGet);
router.post('/categories', catalogManager, requirePermissionOrRoles('inventory.create', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.createCategory);
router.put('/categories/:id', catalogManager, requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.updateCategory);
router.delete('/categories/:id', catalogManager, requirePermissionOrRoles('inventory.delete', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.deleteCategory);
router.get('/brands', inventoryController.brands);
router.post('/brands', catalogManager, requirePermissionOrRoles('inventory.create', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.createBrand);
router.put('/brands/:id', catalogManager, requirePermissionOrRoles('inventory.edit', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.updateBrand);
router.delete('/brands/:id', catalogManager, requirePermissionOrRoles('inventory.delete', APP_CONSTANTS.ROLES.ADMIN, 'SUPER_ADMIN'), inventoryController.deleteBrand);

/**
 * @swagger
 * /api/v1/inventory/admin/products:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: Search and filter all inventory products
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string }, description: Product, variant, brand, or category search }
 *       - { in: query, name: sku, schema: { type: string } }
 *       - { in: query, name: barcode, schema: { type: string } }
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: categoryId, schema: { type: string, format: uuid } }
 *       - { in: query, name: brandId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: listingStatus, schema: { type: string } }
 *       - { in: query, name: productType, schema: { type: string } }
 *       - { in: query, name: stockStatus, schema: { type: string, enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK] } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [name, price, stock, sku, createdAt, updatedAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *       - { in: query, name: startDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: endDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses: { 200: { description: Paginated admin product list } }
 */
router.get('/admin/products', admin, inventoryController.adminList);

/**
 * @swagger
 * /api/v1/inventory/admin/products/{id}:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: Get an inventory product
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Product details }, 404: { description: Product not found } }
 * /api/v1/inventory/admin/vendors/{vendorId}/products:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: List products for a vendor
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: vendorId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Vendor product list } }
 * /api/v1/inventory/admin/salons/{salonId}/products:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: List products for a salon
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: salonId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Salon product list } }
 * /api/v1/inventory/admin/branches/{branchId}/products:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: List products for a branch
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: branchId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Branch product list } }
 */
router.get('/admin/products/:id', admin, inventoryController.adminGet);
router.get('/admin/vendors/:vendorId/products', admin, inventoryController.adminVendor);
router.get('/admin/salons/:salonId/products', admin, inventoryController.adminSalon);
router.get('/admin/branches/:branchId/products', admin, inventoryController.adminBranch);

/**
 * @swagger
 * /api/v1/inventory/admin/listings/{id}/approval:
 *   patch:
 *     tags: [Inventory - Admin]
 *     summary: Approve or reject a vendor listing
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [status], properties: { status: { type: string, enum: [APPROVED, REJECTED] } } } } } }
 *     responses: { 200: { description: Listing status updated } }
 * /api/v1/inventory/admin/product-stats/{type}:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: Get inventory product aggregates
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: type, required: true, schema: { type: string, enum: [salons, vendors, salon-vendor] } }]
 *     responses: { 200: { description: Product statistics } }
 * /api/v1/inventory/admin/low-stock:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: List products at or below reorder level
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: Low-stock records } }
 */
router.patch('/admin/listings/:id/approval', admin, inventoryController.approve);
router.get('/admin/dashboard-stats', admin, inventoryController.dashboardStats);
router.get('/vendor/product-stats', vendor, inventoryController.dashboardStats);
/**
 * @swagger
 * /api/v1/inventory/reports:
 *   get:
 *     tags: [Inventory - Admin]
 *     summary: Get inventory report aggregates within the caller's authorized scope
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: vendorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: salonId, schema: { type: string, format: uuid } }
 *       - { in: query, name: branchId, schema: { type: string, format: uuid } }
 *       - { in: query, name: categoryId, schema: { type: string, format: uuid } }
 *       - { in: query, name: stockStatus, schema: { type: string, enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK] } }
 *       - { in: query, name: startDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: endDate, schema: { type: string, format: date-time } }
 *     responses: { 200: { description: Filtered inventory counts, stock value, and movement aggregates } }
 */
router.get('/reports', inventoryController.report);
router.get('/admin/product-stats/:type', admin, inventoryController.stats);
router.get('/admin/low-stock', admin, inventoryController.lowStock);

export default router;
