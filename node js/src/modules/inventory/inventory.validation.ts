import { z } from 'zod';

const nonNegative = z.number().finite().min(0);
const rate = z.number().finite().min(0).max(100);

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().optional().default(''),
  sku: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  barcode: z.string().trim().optional(),
  variantCode: z.string().trim().optional(),
  costPrice: nonNegative.optional().default(0),
  mrp: nonNegative.optional().default(0),
  sellingPrice: nonNegative,
  weight: nonNegative.optional(),
  weightUnit: z.string().trim().optional(),
  volume: nonNegative.optional(),
  volumeUnit: z.string().trim().optional(),
  stock: z.number().int().min(0).optional().default(0),
  reorderLevel: z.number().int().min(0).optional().default(0),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  productType: z.enum(['RETAIL', 'CONSUMABLE', 'PROFESSIONAL', 'SERVICE_PRODUCT', 'OTHER']).optional(),
  gstRate: rate.optional().default(0),
  hsnCode: z.string().trim().optional(),
  salonId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  listingStatus: z.enum(['PENDING', 'ACTIVE']).optional().default('PENDING'),
  vendorPrice: nonNegative.optional().default(0),
  listingSellingPrice: nonNegative.optional().default(0),
  discount: rate.optional().default(0),
  images: z.array(z.object({
    url: z.string().trim().min(1),
    altText: z.string().trim().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
  })).optional().default([]),
  variants: z.array(variantSchema).min(1),
});

const updateVariantSchema = variantSchema.extend({
  name: z.string().trim().optional(),
  costPrice: nonNegative.optional(),
  mrp: nonNegative.optional(),
  stock: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

const productImageSchema = z.object({
  url: z.string().trim().min(1),
  altText: z.string().trim().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ salonId: true, branchId: true, vendorPrice: true, listingSellingPrice: true, discount: true })
  .extend({ gstRate: rate.optional(), variants: z.array(updateVariantSchema).optional(), images: z.array(productImageSchema).optional() })
  .partial();

export const categorySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  parentId: z.string().uuid().optional().nullable(),
  salonId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  salonId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const stockSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  reservedQuantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});
