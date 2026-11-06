import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, ListingStatus, ProductStatus, ProductType, InventoryEntityStatus } from "@prisma/client";
const prisma = new PrismaClient();

const items = [
  ["Shampoo", "HAIR_CARE", 350, 599], ["Conditioner", "HAIR_CARE", 320, 549], ["Hair Serum", "HAIR_CARE", 450, 799], ["Hair Mask", "HAIR_CARE", 500, 899],
  ["Face Wash", "SKIN_CARE", 180, 299], ["Cleanser", "SKIN_CARE", 220, 399], ["Moisturizer", "SKIN_CARE", 280, 499], ["Sunscreen", "SKIN_CARE", 350, 599],
  ["Hair Color", "SALON_CONSUMABLES", 250, 450], ["Wax", "SALON_CONSUMABLES", 180, 350], ["Disposable Gloves", "SALON_CONSUMABLES", 80, 150],
  ["Hair Dryer", "TOOLS", 1800, 2999], ["Hair Straightener", "TOOLS", 2200, 3999], ["Professional Hair Brush", "TOOLS", 450, 799],
] as const;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function main() {
  const environment = (globalThis as any).process?.env ?? {};
  if (environment.NODE_ENV === "production" && environment.ALLOW_CUSTOMER_DUMMY_SEED !== "true") throw new Error("Refusing customer inventory dummy seed in production.");
  const vendors = await prisma.user.findMany({ where: { roles: { some: { role: { name: "VENDOR" } } }, ownedSalons: { some: { isActive: true } } }, select: { id: true, ownedSalons: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true, branches: { where: { isActive: true }, take: 2, select: { id: true } } } } }, take: 3 });
  let created = 0;
  const customerRole = await prisma.role.upsert({ where: { name: "CUSTOMER" }, update: {}, create: { name: "CUSTOMER" } });
  for (const vendor of vendors) {
    const salon = vendor.ownedSalons[0]; if (!salon) continue;
    const locations = [salon.id, ...salon.branches.map((branch) => branch.id)];
    for (let index = 0; index < 3; index += 1) {
      const email = `customer${index + 1}.${vendor.id.slice(0, 6)}@example.com`;
      const customer = await prisma.user.upsert({ where: { email }, update: { source: "CUSTOMER", isActive: true }, create: { firstName: "Demo", lastName: `Customer ${index + 1}`, email, phone: `90000${vendor.id.replace(/-/g, "").slice(0, 5)}${index}`, countryCode: "+91", password: await bcrypt.hash("Customer@123", 10), source: "CUSTOMER", isActive: true } });
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: customer.id, roleId: customerRole.id } }, update: {}, create: { userId: customer.id, roleId: customerRole.id } });
      await prisma.salonCustomer.upsert({ where: { salonId_userId: { salonId: locations[index % locations.length], userId: customer.id } }, update: {}, create: { salonId: locations[index % locations.length], userId: customer.id } });
    }
    for (const [name, categoryName, costPrice, sellingPrice] of items) {
      const category = await prisma.productCategory.upsert({ where: { slug: slug(categoryName) }, update: { status: InventoryEntityStatus.ACTIVE }, create: { name: categoryName.replace(/_/g, " "), slug: slug(categoryName), status: InventoryEntityStatus.ACTIVE, vendorId: vendor.id, salonId: salon.id, createdById: vendor.id } });
      const brand = await prisma.productBrand.upsert({ where: { slug: "zipp-professional" }, update: {}, create: { name: "Zipp Professional", slug: "zipp-professional", vendorId: vendor.id, salonId: salon.id, status: InventoryEntityStatus.ACTIVE } });
      const product = await prisma.product.upsert({ where: { slug: `${slug(name)}-${vendor.id.slice(0, 8)}` }, update: { status: ProductStatus.ACTIVE, categoryId: category.id, brandId: brand.id }, create: { name, slug: `${slug(name)}-${vendor.id.slice(0, 8)}`, description: `Professional ${name.toLowerCase()} for salon and customer use.`, productType: categoryName === "SALON_CONSUMABLES" ? ProductType.CONSUMABLE : ProductType.RETAIL, status: ProductStatus.ACTIVE, categoryId: category.id, brandId: brand.id } });
      const variant = await prisma.productVariant.upsert({ where: { sku: `DUMMY-${vendor.id.slice(0, 8)}-${slug(name).toUpperCase()}` }, update: { status: ProductStatus.ACTIVE, costPrice, sellingPrice, mrp: sellingPrice }, create: { productId: product.id, name: "Standard", sku: `DUMMY-${vendor.id.slice(0, 8)}-${slug(name).toUpperCase()}`, costPrice, sellingPrice, mrp: sellingPrice, status: ProductStatus.ACTIVE } });
      for (const locationId of locations) {
        const branchId = locationId === salon.id ? null : locationId;
        const listingWhere = { vendorId: vendor.id, productId: product.id, salonId: salon.id, branchId };
        const existingListing = await prisma.vendorProduct.findFirst({ where: listingWhere });
        const listing = existingListing ? await prisma.vendorProduct.update({ where: { id: existingListing.id }, data: { isListed: true, listingStatus: ListingStatus.ACTIVE, vendorPrice: costPrice, sellingPrice } }) : await prisma.vendorProduct.create({ data: { ...listingWhere, isListed: true, listingStatus: ListingStatus.ACTIVE, vendorPrice: costPrice, sellingPrice } });
        const stockWhere = { vendorProductId: listing.id, variantId: variant.id, salonId: locationId, branchId };
        const existingStock = await prisma.inventoryStock.findFirst({ where: stockWhere });
        if (existingStock) await prisma.inventoryStock.update({ where: { id: existingStock.id }, data: { quantity: 25, reorderLevel: 5 } });
        else await prisma.inventoryStock.create({ data: { ...stockWhere, quantity: 25, reorderLevel: 5 } });
        created += 1;
      }
    }
  }
  console.log(JSON.stringify({ vendors: vendors.length, listingsOrStocksProcessed: created }, null, 2));
}
main().catch((error) => { console.error(error); (globalThis as any).process.exitCode = 1; }).finally(() => prisma.$disconnect());
