-- Preserve existing inventory data while adding the missing inventory indexes.
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "salonId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ProductBrand" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "ProductBrand" ADD COLUMN IF NOT EXISTS "salonId" TEXT;
-- Backfill corrected relation columns from the original inventory migration.
UPDATE "Product" SET "categoryId" = COALESCE("categoryId", "productCategoryId") WHERE "productCategoryId" IS NOT NULL;
UPDATE "Product" SET "brandId" = COALESCE("brandId", "productBrandId") WHERE "productBrandId" IS NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey') THEN ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_brandId_fkey') THEN ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_vendorId_fkey') THEN ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_salonId_fkey') THEN ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_branchId_fkey') THEN ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductBrand_vendorId_fkey') THEN ALTER TABLE "ProductBrand" ADD CONSTRAINT "ProductBrand_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductBrand_salonId_fkey') THEN ALTER TABLE "ProductBrand" ADD CONSTRAINT "ProductBrand_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE; END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ProductCategory_vendorId_idx" ON "ProductCategory"("vendorId");
CREATE INDEX IF NOT EXISTS "ProductCategory_salonId_idx" ON "ProductCategory"("salonId");
CREATE INDEX IF NOT EXISTS "ProductCategory_branchId_idx" ON "ProductCategory"("branchId");
CREATE INDEX IF NOT EXISTS "ProductBrand_vendorId_idx" ON "ProductBrand"("vendorId");
CREATE INDEX IF NOT EXISTS "ProductBrand_salonId_idx" ON "ProductBrand"("salonId");
CREATE INDEX IF NOT EXISTS "InventoryStock_vendorProductId_idx" ON "InventoryStock"("vendorProductId");
