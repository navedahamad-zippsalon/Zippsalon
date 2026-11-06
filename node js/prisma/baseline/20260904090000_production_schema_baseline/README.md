# Production Schema Baseline

Status: PREPARED AND TESTED, NOT APPLIED.

## Purpose

The historical migration chain contains a replay defect in `20260901100125_add_salon_is_main`. This baseline is a separate artifact generated from the current verified Prisma datamodel. Existing migration directories and the `_prisma_migrations` table were not changed.

## Audit

- Applied migration count in the configured local database: 17.
- Failed or incomplete rows reported by Prisma: none.
- `Product.brandId`: nullable `TEXT`.
- Product relation: optional `ProductBrand` relation through `brandId`.
- Live `Product_brandId_fkey`: present in the configured database.
- Live database contains existing Product, Brand, Salon, and WhatsApp data.
- Production and staging were not independently accessible from this workspace.

## Root cause

`20260831082546_add_inventory_vendor_products` creates `Product.brandId` but creates only `Product_productBrandId_fkey`. `20260901100125_add_salon_is_main` unconditionally drops `Product_brandId_fkey` before the later repair migration `20260901120000_fix_inventory_vendor_salon_category_stock` can create it. Clean shadow replay therefore fails at that DROP statement.

The applied checksum for the historical migration differs from the current checkout, so the applied migration file must not be rewritten.

## Baseline test

Generated from `prisma/schema.prisma` with:

```text
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Tested against a disposable PostgreSQL 16 container using `prisma db execute`. A subsequent `prisma migrate diff` returned `-- This is an empty migration`, confirming the baseline SQL produces the current Prisma schema.

## Deployment policy

- Existing migrations: preserved unchanged.
- `_prisma_migrations`: not manually edited.
- Production database: not touched.
- Baseline: not applied to production.
- A deployment owner must reconcile the active migration directory with this baseline before adopting it as the production migration root. That process must preserve the old migration archive and record all included migration IDs.
