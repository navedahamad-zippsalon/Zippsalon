import "dotenv/config";
import bcrypt from "bcrypt";
import fs from "node:fs";
import path from "node:path";
import {
  AttendanceStatus,
  AdvertisementDurationUnit,
  AdvertisementMediaType,
  AdvertisementStatus,
  AdvertisementTargetAudience,
  AdvertisementTargetingMode,
  BillingCycle,
  BookingMedium,
  BookingSource,
  BookingStatus,
  CouponDiscountType,
  CouponOwnerType,
  FeedMediaType,
  FeedPostStatus,
  FeedSharePlatform,
  FeedStoryStatus,
  FeedVisibility,
  InventoryEntityStatus,
  InventoryTransactionType,
  ListingStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ProductType,
  PrismaClient,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  UserSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Demo seed is disabled in production. Set ALLOW_DEMO_SEED=true explicitly to override.");
}

function addAdvertisementDuration(startAt: Date, durationValue: number, durationUnit: AdvertisementDurationUnit) {
  const endAt = new Date(startAt);
  if (durationUnit === AdvertisementDurationUnit.DAYS) {
    endAt.setUTCDate(endAt.getUTCDate() + durationValue);
    return endAt;
  }
  const dayOfMonth = endAt.getUTCDate();
  endAt.setUTCDate(1);
  if (durationUnit === AdvertisementDurationUnit.MONTHS) endAt.setUTCMonth(endAt.getUTCMonth() + durationValue);
  else endAt.setUTCFullYear(endAt.getUTCFullYear() + durationValue);
  endAt.setUTCDate(Math.min(dayOfMonth, new Date(Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth() + 1, 0)).getUTCDate()));
  return endAt;
}

function findDemoAdvertisementMedia(extension: ".mp4" | ".jpg" | ".jpeg" | ".png" | ".webp") {
  const mediaDirectory = path.join(process.cwd(), "public", "uploads", "feed");
  if (!fs.existsSync(mediaDirectory)) return null;
  const fileName = fs.readdirSync(mediaDirectory).find((file) => path.extname(file).toLowerCase() === extension);
  return fileName ? `/public/uploads/feed/${fileName}` : null;
}

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const demoPassword = "Demo@12345";
const staffPassword = "Staff@12345";
const customerPassword = "Customer@12345";
const demoMarker = "demo:zippsalon:v1";

const vendorNames = [
  "Glow Studio", "Urban Cuts", "Style Lounge", "Elite Beauty Hub", "The Hair Room",
  "Luxe Salon", "Mirror & Muse", "Signature Styles", "Glam Avenue", "Hair & Beyond",
  "Royal Touch Salon", "Beauty District", "The Style House", "Velvet Beauty", "Prime Salon",
  "Trend Studio", "Aura Salon", "Blush & Bloom", "Classic Cuts", "Zipp Beauty Studio",
];
const vendorSlugs = [
  "glowstudio", "urbancuts", "stylelounge", "elitebeauty", "hairroom", "luxesalon", "mirrormuse",
  "signaturestyles", "glamavenue", "hairbeyond", "royaltouch", "beautydistrict", "stylehouse",
  "velvetbeauty", "primesalon", "trendstudio", "aurasalon", "blushbloom", "classiccuts", "zippbeauty",
];
const demoVendorEmails = vendorSlugs.map((slug) => `${slug}.demo@zippsalon.test`);
const locations = [
  ["India", "Delhi", "New Delhi", "110001", 28.6139, 77.2090],
  ["India", "Maharashtra", "Mumbai", "400001", 19.0760, 72.8777],
  ["India", "Karnataka", "Bengaluru", "560001", 12.9716, 77.5946],
  ["India", "Telangana", "Hyderabad", "500001", 17.3850, 78.4867],
  ["India", "Rajasthan", "Jaipur", "302001", 26.9124, 75.7873],
  ["India", "Gujarat", "Ahmedabad", "380001", 23.0225, 72.5714],
  ["India", "Tamil Nadu", "Chennai", "600001", 13.0827, 80.2707],
  ["India", "West Bengal", "Kolkata", "700001", 22.5726, 88.3639],
] as const;
const serviceCatalog = [
  ["Haircut", "Classic Haircut", "Precision cut, wash and finish", 399, 45],
  ["Haircut", "Premium Haircut", "Consultation-led cut with premium styling", 799, 60],
  ["Hair Styling", "Hair Styling", "Occasion-ready styling and finish", 699, 60],
  ["Hair Styling", "Blow Dry", "Voluminous professional blow dry", 499, 40],
  ["Hair Treatment", "Hair Spa", "Repairing scalp and hair treatment", 1299, 75],
  ["Hair Treatment", "Deep Conditioning", "Nourishing deep conditioning ritual", 899, 60],
  ["Hair Treatment", "Keratin Treatment", "Long-lasting smoothing treatment", 4499, 210],
  ["Hair Color", "Root Touch Up", "Natural, even root colour refresh", 1299, 90],
  ["Hair Color", "Global Hair Color", "Full-length professional colour", 2999, 150],
  ["Hair Color", "Balayage", "Hand-painted dimensional colour", 4999, 180],
  ["Beard & Grooming", "Beard Styling", "Shape, trim and beard finish", 399, 35],
  ["Beard & Grooming", "Premium Beard Grooming", "Hot towel, trim and conditioning", 699, 50],
  ["Facial", "Gold Facial", "Radiance-boosting gold facial", 1499, 75],
  ["Skin Care", "Cleanup", "Quick cleansing and skin refresh", 599, 45],
  ["Skin Care", "Hydrating Facial", "Deep hydration facial treatment", 1199, 60],
  ["Manicure", "Spa Manicure", "Exfoliating manicure with massage", 899, 60],
  ["Pedicure", "Spa Pedicure", "Restorative pedicure and foot massage", 1099, 75],
  ["Nails", "Nail Art", "Custom nail art finish", 799, 60],
  ["Makeup", "Party Makeup", "Polished makeup for special occasions", 2999, 120],
  ["Bridal", "Bridal Makeup", "Bridal consultation and complete makeup", 14999, 240],
  ["Massage", "Head Massage", "Relaxing scalp and head massage", 599, 35],
  ["Spa", "Relaxation Spa", "Calming full-body relaxation session", 2499, 90],
  ["Waxing", "Full Arms Wax", "Gentle full-arms waxing", 699, 40],
  ["Waxing", "Full Legs Wax", "Smooth full-legs waxing", 1199, 60],
  ["Threading", "Eyebrow Threading", "Precise eyebrow shaping", 149, 15],
  ["Threading", "Full Face Threading", "Gentle full-face threading", 499, 30],
  ["Kids", "Kids Haircut", "Comfortable haircut for young guests", 299, 30],
  ["Packages", "Glow & Groom Package", "Haircut, cleanup and head massage", 1799, 105],
] as const;
const categoryNames = ["Haircut", "Hair Styling", "Hair Color", "Hair Treatment", "Beard & Grooming", "Facial", "Skin Care", "Makeup", "Manicure", "Pedicure", "Nails", "Massage", "Spa", "Bridal", "Threading", "Waxing", "Kids", "Packages"];
const inventoryCategoryNames = ["Hair Care", "Hair Styling", "Hair Color", "Hair Treatment", "Shampoo", "Conditioner", "Skin Care", "Facial", "Makeup", "Nail Care", "Beard Care", "Grooming", "Spa", "Beauty Accessories", "Salon Consumables", "Tools & Equipment", "Disposable Items", "Cleaning Supplies"];
const inventoryCatalog = [
  ["Professional Shampoo", "Hair Care", 350, 550, ProductType.RETAIL], ["Moisturizing Shampoo", "Shampoo", 300, 499, ProductType.RETAIL], ["Anti-Dandruff Shampoo", "Shampoo", 280, 475, ProductType.RETAIL], ["Hair Repair Shampoo", "Hair Treatment", 390, 650, ProductType.RETAIL],
  ["Professional Conditioner", "Conditioner", 320, 525, ProductType.RETAIL], ["Deep Repair Conditioner", "Hair Treatment", 420, 699, ProductType.RETAIL], ["Hair Mask", "Hair Treatment", 500, 899, ProductType.RETAIL], ["Hair Serum", "Hair Care", 450, 750, ProductType.RETAIL],
  ["Hair Oil", "Hair Care", 260, 475, ProductType.RETAIL], ["Heat Protection Spray", "Hair Styling", 350, 599, ProductType.RETAIL], ["Hair Styling Cream", "Hair Styling", 290, 499, ProductType.RETAIL], ["Hair Wax", "Hair Styling", 220, 399, ProductType.RETAIL],
  ["Professional Hair Color", "Hair Color", 300, 500, ProductType.PROFESSIONAL], ["Root Touch-Up Color", "Hair Color", 240, 425, ProductType.PROFESSIONAL], ["Blonde Toner", "Hair Color", 275, 475, ProductType.PROFESSIONAL], ["Developer 20 Vol", "Hair Color", 180, 325, ProductType.CONSUMABLE],
  ["Bleaching Powder", "Hair Color", 260, 450, ProductType.CONSUMABLE], ["Color Protection Treatment", "Hair Treatment", 450, 799, ProductType.PROFESSIONAL], ["Facial Cleanser", "Facial", 240, 425, ProductType.RETAIL], ["Face Serum", "Skin Care", 550, 899, ProductType.RETAIL],
  ["Moisturizer", "Skin Care", 300, 525, ProductType.RETAIL], ["Sunscreen", "Skin Care", 350, 599, ProductType.RETAIL], ["Face Mask", "Facial", 180, 325, ProductType.CONSUMABLE], ["Professional Facial Kit", "Facial", 800, 1299, ProductType.PROFESSIONAL],
  ["Makeup Foundation", "Makeup", 650, 999, ProductType.RETAIL], ["Concealer", "Makeup", 300, 499, ProductType.RETAIL], ["Makeup Remover", "Makeup", 220, 399, ProductType.RETAIL], ["Mascara", "Makeup", 280, 475, ProductType.RETAIL],
  ["Nail Polish", "Nail Care", 120, 225, ProductType.RETAIL], ["Gel Nail Polish", "Nail Care", 220, 399, ProductType.RETAIL], ["Nail Polish Remover", "Nail Care", 100, 199, ProductType.CONSUMABLE], ["Nail File", "Beauty Accessories", 35, 79, ProductType.CONSUMABLE],
  ["Beard Oil", "Beard Care", 250, 449, ProductType.RETAIL], ["Beard Balm", "Beard Care", 280, 499, ProductType.RETAIL], ["Shaving Cream", "Grooming", 180, 325, ProductType.RETAIL], ["Grooming Wax", "Grooming", 210, 375, ProductType.RETAIL],
  ["Disposable Gloves", "Disposable Items", 80, 150, ProductType.CONSUMABLE], ["Disposable Towels", "Disposable Items", 140, 249, ProductType.CONSUMABLE], ["Wax Strips", "Salon Consumables", 160, 299, ProductType.CONSUMABLE], ["Cotton Pads", "Salon Consumables", 75, 149, ProductType.CONSUMABLE],
  ["Hair Dryer", "Tools & Equipment", 1500, 2500, ProductType.PROFESSIONAL], ["Hair Straightener", "Tools & Equipment", 2200, 3599, ProductType.PROFESSIONAL], ["Hair Clipper", "Tools & Equipment", 1800, 2999, ProductType.PROFESSIONAL], ["Professional Scissors", "Tools & Equipment", 900, 1699, ProductType.PROFESSIONAL],
  ["Hair Brush", "Beauty Accessories", 250, 449, ProductType.RETAIL], ["Comb Set", "Beauty Accessories", 120, 249, ProductType.RETAIL], ["Surface Sanitizer", "Cleaning Supplies", 180, 325, ProductType.CONSUMABLE], ["Equipment Cleaner", "Cleaning Supplies", 220, 399, ProductType.CONSUMABLE],
] as const;
const captions = [
  "New summer hair collection is here", "Weekend styling offer", "Fresh haircut transformation",
  "Bridal look inspiration", "Hair spa experience", "New salon interior", "Trending hairstyle of the week",
];
const comments = ["Great style!", "Love this look!", "How much does this service cost?", "Can I book this?", "Looks amazing!", "Is this available this weekend?", "Beautiful work!"];
const cities = ["Home", "Office", "Other"];

function dateAt(offsetDays: number, hour: number) {
  const date = new Date(Date.now() + offsetDays * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }

async function seedDemoCoupons() {
  const now = new Date();
  const legacyDemoCodes = ["GLOW20", "STYLE15", "URBAN25", "LUXE30", "HAIR10"];
  await prisma.coupon.deleteMany({ where: { ownerType: CouponOwnerType.VENDOR, code: { in: legacyDemoCodes } } });
  let foundVendors = 0;
  let foundSalons = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let duplicatesPrevented = 0;
  let active = 0;
  let expired = 0;
  let inactive = 0;
  const summaries: Array<{ email: string; salon: string; count: number }> = [];
  const missing: Array<{ email: string; reason: string }> = [];

  for (const email of demoVendorEmails) {
    const vendor = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!vendor) { missing.push({ email, reason: "vendor account could not be resolved" }); continue; }
    foundVendors += 1;
    const salon = await prisma.salon.findFirst({ where: { ownerId: vendor.id, parentId: null, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, ownerId: true, branches: { where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, parentId: true, ownerId: true } } } });
    if (!salon) { missing.push({ email, reason: "active parent salon could not be resolved" }); continue; }
    foundSalons += 1;
    const services = await prisma.service.findMany({ where: { salonId: salon.id, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, salonId: true } });
    const branchIds = salon.branches.map((branch) => branch.id);
    const serviceIds = services.map((service) => service.id);
    const prefix = safeName(salon.name || email.split(".")[0]).toUpperCase();
    const selectedServices = serviceIds.slice(0, Math.min(4, serviceIds.length));
    const selectedBranches = branchIds.slice(0, Math.min(3, branchIds.length));
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(23, 59, 59, 999);
    const definitions = [
      { suffix: "WELCOME10", title: "Welcome Offer", description: "Get 10% off your eligible salon booking.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 10, minimum: 500, maximum: 300, usageLimit: 100, perCustomer: 1, isActive: true, startAt: new Date(now.getTime() - 30 * DAY), endAt: new Date(now.getTime() + 60 * DAY), branchIds: [] as string[], serviceIds: [] as string[] },
      { suffix: "SAVE20", title: "Save 20 Percent", description: "Get 20% off your eligible salon booking.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 20, minimum: 1000, maximum: 500, usageLimit: 200, perCustomer: 2, isActive: true, startAt: new Date(now.getTime() - 20 * DAY), endAt: new Date(now.getTime() + 45 * DAY), branchIds: [] as string[], serviceIds: [] as string[] },
      { suffix: "FLAT300", title: "Flat 300 Off", description: "Get a flat 300 discount on eligible bookings.", discountType: CouponDiscountType.FIXED, discountValue: 300, minimum: 1500, maximum: null, usageLimit: 100, perCustomer: 1, isActive: true, startAt: new Date(now.getTime() - 15 * DAY), endAt: new Date(now.getTime() + 40 * DAY), branchIds: [] as string[], serviceIds: [] as string[] },
      { suffix: "FLAT500", title: "Flat 500 Off", description: "Get a flat 500 discount on eligible branch bookings.", discountType: CouponDiscountType.FIXED, discountValue: 500, minimum: 2500, maximum: null, usageLimit: 100, perCustomer: 1, isActive: branchIds.length > 0, startAt: new Date(now.getTime() - 10 * DAY), endAt: new Date(now.getTime() + 35 * DAY), branchIds: branchIds.length ? [branchIds[0]] : [], serviceIds: [] as string[] },
      { suffix: "WEEKEND15", title: "Weekend Special", description: "Get 15% off selected salon services.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 15, minimum: 800, maximum: 400, usageLimit: 150, perCustomer: 2, isActive: true, startAt: new Date(now.getTime() - 12 * DAY), endAt: new Date(now.getTime() + 30 * DAY), branchIds: selectedBranches, serviceIds: selectedServices },
      { suffix: "NEW25", title: "New Customer Offer", description: "Special 25% discount for eligible new customers.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 25, minimum: 1200, maximum: 600, usageLimit: 50, perCustomer: 1, isActive: true, startAt: new Date(now.getTime() - 8 * DAY), endAt: new Date(now.getTime() + 25 * DAY), branchIds: [], serviceIds: selectedServices },
      { suffix: "RETURN10", title: "Returning Customer Reward", description: "10% off for eligible returning customers.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 10, minimum: 700, maximum: 250, usageLimit: 300, perCustomer: 3, isActive: true, startAt: new Date(now.getTime() - 25 * DAY), endAt: new Date(now.getTime() + 50 * DAY), branchIds: [], serviceIds: [] as string[] },
      { suffix: "EXPIRED", title: "Previous Month Offer", description: "Expired demo coupon for testing expired coupon filtering.", discountType: CouponDiscountType.PERCENTAGE, discountValue: 15, minimum: 500, maximum: 300, usageLimit: 100, perCustomer: 1, isActive: false, startAt: previousMonthStart, endAt: yesterday, branchIds: [], serviceIds: [] as string[] },
    ];
    let salonCount = 0;
    for (const definition of definitions) {
      const code = `${prefix}${definition.suffix}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
      const coupon = await prisma.coupon.upsert({
        where: { code },
        update: { title: definition.title, description: definition.description, ownerType: CouponOwnerType.VENDOR, ownerId: vendor.id, salonId: salon.id, branchId: definition.branchIds.length === 1 ? definition.branchIds[0] : null, serviceId: definition.serviceIds.length === 1 ? definition.serviceIds[0] : null, discountType: definition.discountType, discountValue: definition.discountValue, minimumOrderAmount: definition.minimum, maximumDiscount: definition.maximum, usageLimit: definition.usageLimit, usagePerCustomer: definition.perCustomer, startAt: definition.startAt, endAt: definition.endAt, isActive: definition.isActive },
        create: { code, title: definition.title, description: definition.description, ownerType: CouponOwnerType.VENDOR, ownerId: vendor.id, salonId: salon.id, branchId: definition.branchIds.length === 1 ? definition.branchIds[0] : null, serviceId: definition.serviceIds.length === 1 ? definition.serviceIds[0] : null, discountType: definition.discountType, discountValue: definition.discountValue, minimumOrderAmount: definition.minimum, maximumDiscount: definition.maximum, usageLimit: definition.usageLimit, usagePerCustomer: definition.perCustomer, startAt: definition.startAt, endAt: definition.endAt, isActive: definition.isActive },
      });
      if (existing) { updated += 1; duplicatesPrevented += 1; } else created += 1;
      await prisma.$transaction(async (tx) => {
        await tx.couponVendor.deleteMany({ where: { couponId: coupon.id } });
        await tx.couponSalon.deleteMany({ where: { couponId: coupon.id } });
        await tx.couponBranch.deleteMany({ where: { couponId: coupon.id } });
        await tx.couponService.deleteMany({ where: { couponId: coupon.id } });
        await tx.couponVendor.create({ data: { couponId: coupon.id, vendorId: vendor.id } });
        await tx.couponSalon.create({ data: { couponId: coupon.id, salonId: salon.id } });
        if (definition.branchIds.length) await tx.couponBranch.createMany({ data: definition.branchIds.map((branchId) => ({ couponId: coupon.id, branchId })) });
        if (definition.serviceIds.length) await tx.couponService.createMany({ data: definition.serviceIds.map((serviceId) => ({ couponId: coupon.id, serviceId })) });
      });
      salonCount += 1;
      if (definition.suffix === "EXPIRED") expired += 1; else if (!definition.isActive) inactive += 1; else active += 1;
    }
    if (salonCount !== 8) skipped += 8 - salonCount;
    summaries.push({ email, salon: salon.name, count: salonCount });
  }
  const validation = await prisma.coupon.findMany({ where: { code: { startsWith: "" }, ownerType: CouponOwnerType.VENDOR, vendorAssignments: { some: { vendorId: { in: (await prisma.user.findMany({ where: { email: { in: demoVendorEmails } }, select: { id: true } })).map((user) => user.id) } } } }, include: { salon: { select: { id: true, ownerId: true } }, vendorAssignments: true, salonAssignments: true, branchAssignments: { include: { branch: { select: { parentId: true } } } }, serviceAssignments: { include: { service: { select: { salonId: true } } } } } });
  for (const coupon of validation) {
    if (!coupon.salon || coupon.salon.ownerId !== coupon.ownerId || coupon.salonAssignments.some((assignment) => assignment.salonId !== coupon.salonId) || coupon.branchAssignments.some((assignment) => assignment.branch.parentId !== coupon.salonId) || coupon.serviceAssignments.some((assignment) => assignment.service.salonId !== coupon.salonId)) throw new Error(`Demo coupon validation failed for ${coupon.code}`);
  }
  console.log("\n========================================");
  console.log("ZIPPSALON DEMO COUPON SEED");
  console.log("========================================");
  for (const summary of summaries) console.log(`Vendor: ${summary.email}\nSalon: ${summary.salon}\nCoupons: ${summary.count}\n`);
  for (const item of missing) console.log(`MISSING:\n${item.email}\nReason: ${item.reason}\n`);
  console.log("========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log(`Demo vendors found: ${foundVendors}/20`);
  console.log(`Salons found: ${foundSalons}/20`);
  console.log(`Coupons created: ${created}`);
  console.log(`Coupons updated: ${updated}`);
  console.log(`Coupons skipped: ${skipped}`);
  console.log(`Duplicate coupons prevented: ${duplicatesPrevented}`);
  console.log(`Active coupons: ${active}`);
  console.log(`Expired coupons: ${expired}`);
  console.log(`Inactive coupons: ${inactive}`);
  console.log("========================================\n");
}

async function demoInventoryCategory(name: string, adminId: string) {
  const existing = await prisma.productCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, vendorId: null, salonId: null, branchId: null } });
  if (existing) return prisma.productCategory.update({ where: { id: existing.id }, data: { status: InventoryEntityStatus.ACTIVE } });
  return prisma.productCategory.create({ data: { name, slug: `demo-${safeName(name)}`, description: `${demoMarker} inventory category`, status: InventoryEntityStatus.ACTIVE, createdById: adminId } });
}

async function seedDemoInventory(vendors: Array<{ user: any; salon: any; branches: any[] }>, adminId: string) {
  if (process.env.NODE_ENV === "production") throw new Error("Demo inventory seed is disabled in production.");
  const categories = new Map<string, string>();
  for (const name of inventoryCategoryNames) categories.set(name, (await demoInventoryCategory(name, adminId)).id);
  const brand = await prisma.productBrand.upsert({ where: { slug: "demo-zipp-professional" }, update: { name: "Zipp Professional", status: InventoryEntityStatus.ACTIVE }, create: { name: "Zipp Professional", slug: "demo-zipp-professional", description: `${demoMarker} inventory brand`, status: InventoryEntityStatus.ACTIVE } });
  let productCount = 0;
  let movementCount = 0;
  let normalStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let inactive = 0;
  const perVendor: Array<[string, number]> = [];
  for (let vendorIndex = 0; vendorIndex < vendors.length; vendorIndex += 1) {
    const vendor = vendors[vendorIndex];
    const locations = [vendor.salon, ...vendor.branches];
    let vendorProducts = 0;
    for (let productIndex = 0; productIndex < 20; productIndex += 1) {
      const item = inventoryCatalog[(vendorIndex * 3 + productIndex) % inventoryCatalog.length];
      const [name, categoryName, costPrice, sellingPrice, productType] = item;
      const sku = `DEMO-${vendorSlugs[vendorIndex].slice(0, 8).toUpperCase()}-${String(productIndex + 1).padStart(3, "0")}`;
      const slug = `demo-${vendorSlugs[vendorIndex]}-${safeName(name)}-${productIndex + 1}`;
      const product = await prisma.product.upsert({
        where: { slug },
        update: { name, description: `${name} for ${vendor.salon.name}. ${demoMarker}`, categoryId: categories.get(categoryName)!, brandId: brand.id, productType, status: productIndex === 19 ? ProductStatus.INACTIVE : ProductStatus.ACTIVE },
        create: { name, slug, description: `${name} for ${vendor.salon.name}. ${demoMarker}`, categoryId: categories.get(categoryName)!, brandId: brand.id, productType, status: productIndex === 19 ? ProductStatus.INACTIVE : ProductStatus.ACTIVE },
      });
      const variant = await prisma.productVariant.upsert({ where: { sku }, update: { productId: product.id, name: "Standard", costPrice, mrp: sellingPrice, sellingPrice, status: productIndex === 19 ? ProductStatus.INACTIVE : ProductStatus.ACTIVE }, create: { productId: product.id, name: "Standard", sku, costPrice, mrp: sellingPrice, sellingPrice, status: productIndex === 19 ? ProductStatus.INACTIVE : ProductStatus.ACTIVE } });
      const location = locations[productIndex % locations.length];
      const branchId = location.parentId ? location.id : null;
      const listingWhere = { vendorId: vendor.user.id, productId: product.id, salonId: vendor.salon.id, branchId };
      const listingData = { vendorPrice: costPrice, sellingPrice, discount: productIndex % 7 === 0 ? 10 : 0, isListed: true, listingStatus: productIndex === 19 ? ListingStatus.INACTIVE : ListingStatus.ACTIVE };
      const existingListing = await prisma.vendorProduct.findFirst({ where: listingWhere });
      const listing = existingListing ? await prisma.vendorProduct.update({ where: { id: existingListing.id }, data: listingData }) : await prisma.vendorProduct.create({ data: { ...listingWhere, ...listingData } });
      const quantity = productIndex < 4 ? 50 + vendorIndex * 3 + productIndex * 7 : productIndex < 16 ? 35 + (vendorIndex * 11 + productIndex * 5) % 66 : productIndex < 19 ? 6 + (vendorIndex + productIndex) % 15 : 0;
      const reorderLevel = productIndex < 16 ? 12 + (productIndex % 5) : productIndex === 19 ? 10 : 15;
      const stockWhere = { vendorProductId: listing.id, variantId: variant.id, salonId: vendor.salon.id, branchId };
      const existingStock = await prisma.inventoryStock.findFirst({ where: stockWhere });
      const stock = existingStock ? await prisma.inventoryStock.update({ where: { id: existingStock.id }, data: { quantity, reorderLevel, reservedQuantity: 0 } }) : await prisma.inventoryStock.create({ data: { ...stockWhere, quantity, reorderLevel } });
      const openingMarker = `${demoMarker}:inventory:${vendorIndex}:${productIndex}:opening`;
      if (!(await prisma.inventoryTransaction.findFirst({ where: { stockId: stock.id, note: openingMarker } }))) { await prisma.inventoryTransaction.create({ data: { stockId: stock.id, type: InventoryTransactionType.IN, quantity: Math.max(quantity, 0), note: openingMarker, createdAt: dateAt(-90 + productIndex, 10) } }); movementCount += 1; }
      const adjustmentMarker = `${demoMarker}:inventory:${vendorIndex}:${productIndex}:adjustment`;
      if (!(await prisma.inventoryTransaction.findFirst({ where: { stockId: stock.id, note: adjustmentMarker } }))) { await prisma.inventoryTransaction.create({ data: { stockId: stock.id, type: productIndex % 3 === 0 ? InventoryTransactionType.RETURN : InventoryTransactionType.ADJUSTMENT, quantity: productIndex % 3 === 0 ? 3 : -2, note: adjustmentMarker, createdAt: dateAt(-30 + (productIndex % 20), 14) } }); movementCount += 1; }
      productCount += 1;
      vendorProducts += 1;
      if (quantity === 0) outOfStock += 1; else if (quantity <= reorderLevel) lowStock += 1; else normalStock += 1;
      if (productIndex === 19) inactive += 1;
    }
    perVendor.push([vendor.salon.name, vendorProducts]);
  }
  const validationCounts = await Promise.all(vendors.map((vendor, index) => prisma.vendorProduct.count({ where: { vendorId: vendor.user.id, product: { slug: { startsWith: `demo-${vendorSlugs[index]}-` } } } })));
  if (validationCounts.some((count) => count !== 20)) throw new Error(`Demo inventory validation failed: expected 20 listings per vendor, got ${validationCounts.join(", ")}.`);
  console.log("\n========================================");
  console.log("ZIPP SALON DEMO INVENTORY");
  console.log("========================================");
  console.log(`Vendors: ${vendors.length} | Inventory Products: ${productCount} | Categories: ${inventoryCategoryNames.length} | Suppliers: 0 | Stock Movements: ${movementCount}`);
  console.log("\nPer Vendor:");
  for (const [name, count] of perVendor) console.log(`${name.padEnd(24)} -> ${count}`);
  console.log(`\nNormal Stock: ${normalStock} | Low Stock: ${lowStock} | Out of Stock: ${outOfStock} | Inactive: ${inactive}`);
  console.log("========================================\n");
}

async function role(name: string) {
  return prisma.role.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
}

async function userFor(email: string, data: { firstName: string; lastName: string; phone: string; password: string; source?: UserSource }) {
  return prisma.user.upsert({
    where: { email },
    update: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, isActive: true, source: data.source ?? UserSource.ADMIN },
    create: { ...data, email, countryCode: "+91", isActive: true },
  });
}

async function addRole(userId: string, roleId: string) {
  await prisma.userRole.upsert({ where: { userId_roleId: { userId, roleId } }, update: {}, create: { userId, roleId } });
}

async function salonFor(ownerId: string, parentId: string | null, name: string, location: typeof locations[number], index: number) {
  const [country, state, city, pincode, latitude, longitude] = location;
  const existing = await prisma.salon.findFirst({ where: { ownerId, parentId, name } });
  const data = {
    name, ownerId, parentId, description: `${name} - ${demoMarker}`, avgPrice: 800 + index * 25, avgWaitTime: 15 + index % 20,
    timings: { monday: { open: "09:00", close: "21:00" }, saturday: { open: "10:00", close: "22:00" }, sunday: { open: "10:00", close: "20:00" } },
    isActive: true, isMain: parentId === null, isProfileCompleted: true,
  };
  const salon = existing ? await prisma.salon.update({ where: { id: existing.id }, data }) : await prisma.salon.create({ data: { ...data, address: { create: { line1: `${name} Main Road`, city, state, country, pincode } }, contacts: { create: { phone: `90000${String(index).padStart(5, "0")}`, countryCode: "91", isPrimary: true } } } });
  await prisma.address.upsert({ where: { salonId: salon.id }, update: { line1: `${name} Main Road`, city, state, country, pincode }, create: { salonId: salon.id, line1: `${name} Main Road`, city, state, country, pincode } });
  return salon;
}

async function main() {
  console.log(`${demoMarker} starting; no non-demo records will be deleted`);
  const [vendorRole, staffRole, customerRole, adminRole] = await Promise.all([role("VENDOR"), role("STAFF"), role("CUSTOMER"), role("ADMIN")]);
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const staffHash = await bcrypt.hash(staffPassword, 10);
  const customerHash = await bcrypt.hash(customerPassword, 10);
  const admin = await prisma.user.findFirst({ where: { roles: { some: { roleId: adminRole.id } } }, orderBy: { createdAt: "asc" } }) ?? await userFor("demo-admin@zippsalon.test", { firstName: "Demo", lastName: "Admin", phone: "9000000000", password: passwordHash });
  await addRole(admin.id, adminRole.id);

  // Categories are shared catalogue records. Exact, human-readable names let the
  // existing category filter work while upsert keeps repeat demo runs harmless.
  const categories = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await prisma.serviceCategory.upsert({
      where: { name }, update: { isActive: true }, create: { name, isActive: true },
    });
    categories.set(name, category.id);
  }

  const plans = [
    ["FREE", "Free", 0, 0, 1, 2, 50], ["BASIC", "Basic", 999, 9990, 2, 5, 500],
    ["ADVANCE", "Advance", 2499, 24990, 3, 20, 2500], ["ENTERPRISE", "Enterprise", 4999, 49990, 4, 100, 10000],
  ] as const;
  const planMap = new Map<string, string>();
  for (const [slug, name, monthlyPrice, annualPrice, displayOrder, maxStaff, maxCustomers] of plans) {
    const plan = await prisma.subscriptionPlan.upsert({ where: { slug }, update: { name, monthlyPrice, annualPrice, currency: "INR", isActive: true, displayOrder, maxBranches: 5, maxStaff, maxCustomers, maxBookings: 25000, maxBookingsPerMonth: 25000 }, create: { slug, name, monthlyPrice, annualPrice, currency: "INR", displayOrder, maxBranches: 5, maxStaff, maxCustomers, maxBookings: 25000, maxBookingsPerMonth: 25000, ctaText: `Choose ${name}` } });
    planMap.set(slug, plan.id);
  }

  const vendors: Array<{ user: Awaited<ReturnType<typeof userFor>>; salon: any; branches: any[]; staff: any[]; services: any[] }> = [];
  for (let i = 0; i < vendorNames.length; i += 1) {
    const slug = vendorSlugs[i];
    const vendor = await userFor(`${slug}.demo@zippsalon.test`, { firstName: vendorNames[i].split(" ")[0], lastName: `${vendorNames[i].split(" ").slice(1).join(" ")} Owner`, phone: `91000${String(i).padStart(5, "0")}`, password: passwordHash, source: UserSource.WEBSITE });
    await addRole(vendor.id, vendorRole.id);
    const location = locations[i % locations.length];
    const salon = await salonFor(vendor.id, null, vendorNames[i], location, i);
    const branches: any[] = [];
    const branchCount = i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 2;
    for (let b = 0; b < branchCount; b += 1) branches.push(await salonFor(vendor.id, salon.id, `${vendorNames[i]} - ${b === 0 ? "Main Branch" : "City Center"}`, locations[(i + b + 1) % locations.length], i * 2 + b));
    const staff: any[] = [];
    const staffLocations = [salon, ...branches];
    for (let s = 0; s < 5; s += 1) {
      const staffUser = await userFor(`staff${String(i * 5 + s + 1).padStart(3, "0")}.demo@zippsalon.test`, { firstName: ["Aarav", "Mira", "Kabir", "Anaya", "Rohan"][s], lastName: vendorNames[i].split(" ")[0], phone: `92000${String(i * 5 + s).padStart(5, "0")}`, password: staffHash, source: UserSource.ADMIN });
      await addRole(staffUser.id, staffRole.id);
      const staffSalon = staffLocations[s % staffLocations.length];
      const staffRoleRecord = await prisma.staffRole.upsert({ where: { salonId_name: { salonId: staffSalon.id, name: `${demoMarker}:Stylist` } }, update: {}, create: { salonId: staffSalon.id, name: `${demoMarker}:Stylist`, description: "Demo stylist role" } });
      const record = await prisma.salonStaff.upsert({ where: { userId_salonId: { userId: staffUser.id, salonId: staffSalon.id } }, update: { role: "Stylist", staffRoleId: staffRoleRecord.id, isActive: true }, create: { userId: staffUser.id, salonId: staffSalon.id, role: "Stylist", staffRoleId: staffRoleRecord.id, isActive: true, createdById: vendor.id } });
      await prisma.attendance.upsert({ where: { staffId_date: { staffId: record.id, date: new Date(new Date().toISOString().slice(0, 10)) } }, update: { status: s === 3 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT }, create: { staffId: record.id, date: new Date(new Date().toISOString().slice(0, 10)), status: s === 3 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT, markedById: vendor.id } });
      staff.push(record);
    }
    const services: any[] = [];
    for (let serviceIndex = 0; serviceIndex < 15; serviceIndex += 1) {
      // The rotating catalogue gives every salon a distinct, realistic mix while
      // retaining the hair/grooming staples needed by the booking demo.
      const item = serviceCatalog[(i * 2 + serviceIndex) % serviceCatalog.length];
      const serviceMarker = `${demoMarker}:service:${i}:${serviceIndex}`;
      const existing = await prisma.service.findFirst({
        where: { salonId: salon.id, OR: [{ description: { contains: serviceMarker } }, { name: { contains: `${demoMarker}:${i}:${serviceIndex}` } }] },
      });
      const data = {
        salonId: salon.id,
        name: item[1],
        description: `${item[2]} [${serviceMarker}]`,
        basePrice: item[3] + i * 35 + serviceIndex * 11,
        baseDuration: item[4],
        categoryId: categories.get(item[0]),
        // A small, deterministic inactive set exercises API status filters.
        isActive: serviceIndex % 11 !== 10,
        createdById: vendor.id,
        updatedById: vendor.id,
      };
      const service = existing
        ? await prisma.service.update({ where: { id: existing.id }, data })
        : await prisma.service.create({ data });
      const existingImage = await prisma.serviceImage.findFirst({ where: { serviceId: service.id } });
      if (!existingImage) {
        await prisma.serviceImage.create({
          data: { serviceId: service.id, url: `https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80&service=${i}-${serviceIndex}` },
        });
      }
      services.push(service);
    }
    const planSlug = i < 5 ? "FREE" : i < 11 ? "BASIC" : i < 17 ? "ADVANCE" : "ENTERPRISE";
    const existingSubscription = await prisma.subscription.findFirst({ where: { vendorId: vendor.id, notes: `${demoMarker}:subscription` } });
    const subscriptionData = { vendorId: vendor.id, salonId: salon.id, planId: planMap.get(planSlug)!, billingCycle: BillingCycle.MONTHLY, status: SubscriptionStatus.ACTIVE, amount: plans.find((plan) => plan[0] === planSlug)![2], currency: "INR", startsAt: dateAt(-30, 9), renewsAt: dateAt(335, 9), expiresAt: dateAt(335, 9), isManual: true, notes: `${demoMarker}:subscription` };
    if (existingSubscription) await prisma.subscription.update({ where: { id: existingSubscription.id }, data: subscriptionData }); else await prisma.subscription.create({ data: subscriptionData });
    vendors.push({ user: vendor, salon, branches, staff, services });
  }

  await seedDemoInventory(vendors, admin.id);

  const customer = await prisma.user.findUnique({ where: { email: "navedahamad2016@gmail.com" } }) ?? await userFor("navedahamad2016@gmail.com", { firstName: "Demo", lastName: "Customer", phone: "9890000000", password: customerHash, source: UserSource.CUSTOMER });
  await addRole(customer.id, customerRole.id);
  const demoCustomers = [customer];
  for (let i = 1; i <= 20; i += 1) {
    const demoCustomer = await userFor(`customer${String(i).padStart(2, "0")}.demo@zippsalon.test`, { firstName: `Demo${i}`, lastName: "Customer", phone: `98000${String(i).padStart(5, "0")}`, password: customerHash, source: UserSource.CUSTOMER });
    await addRole(demoCustomer.id, customerRole.id);
    demoCustomers.push(demoCustomer);
  }
  for (let i = 0; i < demoCustomers.length; i += 1) {
    const vendor = vendors[i % vendors.length];
    await prisma.salonCustomer.upsert({ where: { salonId_userId: { salonId: vendor.salon.id, userId: demoCustomers[i].id } }, update: {}, create: { salonId: vendor.salon.id, userId: demoCustomers[i].id } });
  }
  for (let i = 0; i < cities.length; i += 1) {
    const location = locations[i % locations.length];
    const existing = await prisma.customerAddress.findFirst({ where: { customerId: customer.id, label: `${demoMarker}:${cities[i]}` } });
    const address = { customerId: customer.id, label: `${demoMarker}:${cities[i]}`, addressLine1: `${cities[i]} Demo Address`, addressLine2: null, city: location[2], state: location[1], country: location[0], postalCode: location[3], latitude: location[4], longitude: location[5], isDefault: i === 0 };
    if (existing) await prisma.customerAddress.update({ where: { id: existing.id }, data: address }); else await prisma.customerAddress.create({ data: address });
  }
  for (let i = 0; i < 3; i += 1) {
    const vendor = vendors[i * 3];
    await prisma.customerFavoriteSalon.upsert({ where: { customerId_salonId: { customerId: customer.id, salonId: vendor.salon.id } }, update: {}, create: { customerId: customer.id, salonId: vendor.salon.id } });
  }

  const allBookings: any[] = [];
  const bookingStatuses: BookingStatus[] = [BookingStatus.DONE, BookingStatus.DONE, BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.NO_SHOW];
  for (let i = 0; i < vendors.length; i += 1) {
    const vendor = vendors[i];
    for (let b = 0; b < 6; b += 1) {
      const customerRecord = demoCustomers[(i + b) % demoCustomers.length];
      const location = b % 2 === 0 ? vendor.salon : vendor.branches[0] ?? vendor.salon;
      const staff = vendor.staff[b % vendor.staff.length];
      const service = vendor.services[b % vendor.services.length];
      const status = bookingStatuses[(i + b) % bookingStatuses.length];
      const marker = `${demoMarker}:booking:${i}:${b}`;
      let booking = await prisma.booking.findFirst({ where: { notes: marker } });
      const bookingDate = b === 2 ? dateAt(2 + (i % 3), 11) : dateAt(-((i * 3 + b) % 90), 10 + (b % 7));
      const paid = status === BookingStatus.DONE || status === BookingStatus.CONFIRMED ? service.basePrice : 0;
      const data = { salonId: vendor.salon.id, branchId: location.parentId ? location.id : null, customerId: customerRecord.id, staffId: staff.id, bookingDate, status, medium: b % 2 === 0 ? BookingMedium.APP : BookingMedium.ONLINE, bookingSource: b % 2 === 0 ? BookingSource.APP : BookingSource.WEB, totalAmount: service.basePrice, discount: 0, discountAmount: 0, taxableAmount: service.basePrice, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTaxAmount: 0, finalAmount: service.basePrice, totalPaid: paid, notes: marker };
      if (!booking) booking = await prisma.booking.create({ data: { ...data, services: { create: { serviceId: service.id, name: service.name, price: service.basePrice } }, ...(paid ? { payments: { create: { amount: paid, method: PaymentMethod.UPI, status: PaymentStatus.COMPLETED, transactionId: `${marker}:payment` } } } : {}) } });
      else booking = await prisma.booking.update({ where: { id: booking.id }, data });
      allBookings.push({ booking, vendor, service, staff, customer: customerRecord, branch: location.parentId ? location : null });
    }
  }
  const customerBookings = allBookings.filter((item) => item.customer.id === customer.id);
  for (let i = 0; i < customerBookings.length; i += 1) {
    const item = customerBookings[i];
    if (item.booking.status !== BookingStatus.DONE) continue;
    await prisma.review.upsert({ where: { customerId_bookingId: { customerId: customer.id, bookingId: item.booking.id } }, update: { rating: 3 + (i % 3), comment: ["Excellent service", "Very professional", "Great haircut"][i % 3], status: "PUBLISHED" }, create: { customerId: customer.id, bookingId: item.booking.id, salonId: item.vendor.salon.id, branchId: item.branch?.id ?? null, staffId: item.staff.id, rating: 3 + (i % 3), comment: ["Excellent service", "Very professional", "Great haircut"][i % 3] } });
  }

  const wallet = await prisma.customerWallet.upsert({ where: { customerId: customer.id }, update: {}, create: { customerId: customer.id, currency: "INR", balance: 0 } });
  const walletEntries = [[WalletTransactionType.CREDIT, 1000, "Opening balance"], [WalletTransactionType.REFERRAL_REWARD, 500, "Referral reward"], [WalletTransactionType.PROMOTIONAL_REWARD, 250, "Promotional credit"], [WalletTransactionType.DEBIT, 300, "Booking payment"], [WalletTransactionType.CREDIT, 150, "Cashback"], [WalletTransactionType.BOOKING_ADJUSTMENT, -100, "Booking adjustment"]] as const;
  for (let i = 0; i < walletEntries.length; i += 1) {
    const [type, amount, description] = walletEntries[i];
    const marker = `${demoMarker}:wallet:${i}`;
    const existing = await prisma.walletTransaction.findFirst({ where: { walletId: wallet.id, description: marker } });
    if (!existing) await prisma.walletTransaction.create({ data: { walletId: wallet.id, customerId: customer.id, type, amount: Math.abs(amount), referenceType: "DEMO", referenceId: marker, description: marker, status: WalletTransactionStatus.COMPLETED, createdAt: dateAt(-i, 12) } });
  }
  const walletTransactions = await prisma.walletTransaction.findMany({ where: { walletId: wallet.id, status: WalletTransactionStatus.COMPLETED }, select: { type: true, amount: true } });
  const debitTypes = new Set<WalletTransactionType>([WalletTransactionType.DEBIT, WalletTransactionType.BOOKING_ADJUSTMENT, WalletTransactionType.REFUND]);
  const balance = walletTransactions.reduce((total, item) => total + (debitTypes.has(item.type) ? -item.amount : item.amount), 0);
  await prisma.customerWallet.update({ where: { id: wallet.id }, data: { balance } });

  await seedDemoCoupons();

  for (let i = 0; i < 8; i += 1) {
    const referred = demoCustomers[i + 1];
    await prisma.customerReferral.upsert({ where: { referralCode: `DEMOREF${String(i + 1).padStart(2, "0")}` }, update: { referrerCustomerId: customer.id, referredCustomerId: i % 2 === 0 ? referred.id : null, status: i % 2 === 0 ? "REWARDED" : "PENDING", rewardAmount: i % 2 === 0 ? 250 : 0, rewardStatus: i % 2 === 0 ? "PAID" : "PENDING" }, create: { referralCode: `DEMOREF${String(i + 1).padStart(2, "0")}`, referrerCustomerId: customer.id, referredCustomerId: i % 2 === 0 ? referred.id : null, status: i % 2 === 0 ? "REWARDED" : "PENDING", rewardAmount: i % 2 === 0 ? 250 : 0, rewardStatus: i % 2 === 0 ? "PAID" : "PENDING" } });
  }

  let postCount = 0; let storyCount = 0; let likeCount = 0; let commentCount = 0; let viewCount = 0; let shareCount = 0;
  for (let i = 0; i < vendors.length; i += 1) {
    const vendor = vendors[i];
    for (let p = 0; p < 5; p += 1) {
      const marker = `${demoMarker}:post:${i}:${p}`;
      let post = await prisma.feedPost.findFirst({ where: { caption: marker } });
      const branch = vendor.branches[p % vendor.branches.length];
      if (!post) post = await prisma.feedPost.create({ data: { vendorId: vendor.user.id, staffId: vendor.staff[p % vendor.staff.length].id, salonId: vendor.salon.id, branchId: branch.id, caption: marker, visibility: FeedVisibility.PUBLIC, status: FeedPostStatus.PUBLISHED, publishedAt: dateAt(-p, 12), createdBy: vendor.user.id, media: { create: { type: FeedMediaType.IMAGE, url: `https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1080&q=80&demo=${i}-${p}`, fileName: `demo-post-${i}-${p}.jpg`, mimeType: "image/jpeg", width: 1080, height: 1350 } } } });
      const activityUsers = demoCustomers.slice(0, 7 + (p % 5));
      for (const [index, activityUser] of activityUsers.entries()) {
        await prisma.feedPostLike.upsert({ where: { postId_userId: { postId: post.id, userId: activityUser.id } }, update: {}, create: { postId: post.id, userId: activityUser.id, createdAt: dateAt(-index, 13) } }); likeCount += 1;
        await prisma.feedPostView.upsert({ where: { postId_userId: { postId: post.id, userId: activityUser.id } }, update: {}, create: { postId: post.id, userId: activityUser.id, createdAt: dateAt(-index, 14) } }); viewCount += 1;
        const commentMarker = `${marker}:comment:${index}`;
        if (!(await prisma.feedComment.findFirst({ where: { postId: post.id, message: commentMarker } }))) { await prisma.feedComment.create({ data: { postId: post.id, userId: activityUser.id, message: commentMarker } }); commentCount += 1; }
        if (index < p + 1 && !(await prisma.feedShare.findFirst({ where: { postId: post.id, userId: activityUser.id, channel: FeedSharePlatform.COPY_LINK } }))) { await prisma.feedShare.create({ data: { postId: post.id, userId: activityUser.id, channel: FeedSharePlatform.COPY_LINK, createdAt: dateAt(-index, 15) } }); shareCount += 1; }
      }
      postCount += 1;
    }
    for (let s = 0; s < 5; s += 1) {
      const marker = `${demoMarker}:story:${i}:${s}`;
      let story = await prisma.feedStory.findFirst({ where: { caption: marker } });
      const createdAt = dateAt(-s, 16);
      const expiresAt = s === 4 ? dateAt(-1, 16) : dateAt(1, 16);
      if (!story) story = await prisma.feedStory.create({ data: { vendorId: vendor.user.id, staffId: vendor.staff[s % vendor.staff.length].id, salonId: vendor.salon.id, branchId: vendor.branches[s % vendor.branches.length].id, caption: marker, status: FeedStoryStatus.PUBLISHED, publishedAt: createdAt, expiresAt, createdBy: vendor.user.id, createdAt, media: { create: { type: FeedMediaType.IMAGE, url: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1080&q=80&demo=${i}-${s}`, fileName: `demo-story-${i}-${s}.jpg`, mimeType: "image/jpeg", width: 1080, height: 1350 } } } });
      for (const [index, activityUser] of demoCustomers.slice(0, 5 + (s % 4)).entries()) { await prisma.feedStoryView.upsert({ where: { storyId_userId: { storyId: story.id, userId: activityUser.id } }, update: {}, create: { storyId: story.id, userId: activityUser.id, createdAt: dateAt(-index, 17) } }); viewCount += 1; }
      storyCount += 1;
    }
    for (const [staffIndex, staffMember] of vendor.staff.entries()) {
      for (let staffStoryIndex = 0; staffStoryIndex < 2; staffStoryIndex += 1) {
        const marker = `${demoMarker}:staff-story:${i}:${staffIndex}:${staffStoryIndex}`;
        let story = await prisma.feedStory.findFirst({ where: { caption: marker } });
        const createdAt = dateAt(-(staffIndex + staffStoryIndex), 18);
        if (!story) story = await prisma.feedStory.create({ data: { vendorId: vendor.user.id, staffId: staffMember.id, salonId: vendor.salon.id, branchId: vendor.branches[(staffIndex + staffStoryIndex) % vendor.branches.length].id, caption: marker, status: FeedStoryStatus.PUBLISHED, publishedAt: createdAt, expiresAt: dateAt(2, 18), createdBy: vendor.user.id, createdAt, media: { create: { type: FeedMediaType.IMAGE, url: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1080&q=80&staff=${i}-${staffIndex}-${staffStoryIndex}`, fileName: `demo-staff-story-${i}-${staffIndex}-${staffStoryIndex}.jpg`, mimeType: "image/jpeg", width: 1080, height: 1350 } } } });
        for (const [index, activityUser] of demoCustomers.slice(0, 5).entries()) { await prisma.feedStoryView.upsert({ where: { storyId_userId: { storyId: story.id, userId: activityUser.id } }, update: {}, create: { storyId: story.id, userId: activityUser.id, createdAt: dateAt(-index, 19) } }); viewCount += 1; }
        storyCount += 1;
      }
    }
  }

  const demoAdvertisementScenarios: Array<{
    title: string;
    description: string;
    targetingMode: AdvertisementTargetingMode;
    pincodes: string[];
    durationValue: number;
    durationUnit: AdvertisementDurationUnit;
    startOffsetDays: number;
    status: AdvertisementStatus;
    mediaType: AdvertisementMediaType;
    mediaExtension?: ".mp4" | ".jpg" | ".jpeg" | ".png" | ".webp";
    action?: boolean;
  }> = [
    { title: "Diwali Beauty Offer", description: "Save on festive-ready salon services.", targetingMode: "PINCODE", pincodes: ["110001"], durationValue: 30, durationUnit: "DAYS", startOffsetDays: -2, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".jpg", action: true },
    { title: "New Customer Offer", description: "A welcome offer for your first appointment.", targetingMode: "PINCODE", pincodes: ["110002", "110003"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: -1, status: "ACTIVE", mediaType: "TEXT", action: true },
    { title: "Delhi Salon Campaign", description: "Refresh your style at participating Delhi salons.", targetingMode: "PINCODE", pincodes: ["110001", "110005"], durationValue: 3, durationUnit: "MONTHS", startOffsetDays: -1, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".png" },
    { title: "Mumbai Monsoon Campaign", description: "A month of special Mumbai salon offers.", targetingMode: "PINCODE", pincodes: ["400001", "400050"], durationValue: 1, durationUnit: "MONTHS", startOffsetDays: -3, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Bengaluru Hair Care", description: "Annual hair-care savings in Bengaluru.", targetingMode: "PINCODE", pincodes: ["560001", "560002"], durationValue: 1, durationUnit: "YEARS", startOffsetDays: -10, status: "ACTIVE", mediaType: "VIDEO", mediaExtension: ".mp4", action: true },
    { title: "Pan India Offer", description: "Explore offers from salons across India.", targetingMode: "ALL", pincodes: [], durationValue: 1, durationUnit: "MONTHS", startOffsetDays: -1, status: "ACTIVE", mediaType: "TEXT", action: true },
    { title: "Expired Delhi Offer", description: "A completed campaign retained for reporting.", targetingMode: "PINCODE", pincodes: ["110001"], durationValue: 30, durationUnit: "DAYS", startOffsetDays: -60, status: "EXPIRED", mediaType: "TEXT" },
    { title: "Scheduled Festive Campaign", description: "A future campaign that is not yet shown to customers.", targetingMode: "PINCODE", pincodes: ["700001"], durationValue: 14, durationUnit: "DAYS", startOffsetDays: 5, status: "SCHEDULED", mediaType: "IMAGE", mediaExtension: ".webp" },
    { title: "Kolkata Style Week", description: "Limited-time styling packages in Kolkata.", targetingMode: "PINCODE", pincodes: ["700001"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: -2, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Hyderabad Hair Spa", description: "Relax with a premium hair spa experience.", targetingMode: "PINCODE", pincodes: ["500001"], durationValue: 6, durationUnit: "MONTHS", startOffsetDays: -2, status: "ACTIVE", mediaType: "VIDEO", mediaExtension: ".mp4" },
    { title: "Pune Bridal Preview", description: "Plan your bridal beauty consultation.", targetingMode: "PINCODE", pincodes: ["411001"], durationValue: 30, durationUnit: "DAYS", startOffsetDays: -2, status: "ACTIVE", mediaType: "TEXT", action: true },
    { title: "North Delhi Haircut Days", description: "Special prices on selected haircut services.", targetingMode: "PINCODE", pincodes: ["110006", "110005"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: -1, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".jpeg" },
    { title: "All Locations Skincare", description: "Discover skincare services at nearby salons.", targetingMode: "ALL", pincodes: [], durationValue: 3, durationUnit: "MONTHS", startOffsetDays: -1, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Mumbai Premium Styling", description: "Premium styling for special occasions.", targetingMode: "PINCODE", pincodes: ["400050"], durationValue: 2, durationUnit: "MONTHS", startOffsetDays: -2, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".jpg", action: true },
    { title: "Bengaluru Grooming Edit", description: "Modern grooming services in Bengaluru.", targetingMode: "PINCODE", pincodes: ["560002"], durationValue: 30, durationUnit: "DAYS", startOffsetDays: -1, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Chennai Salon Spotlight", description: "Featured services at selected Chennai salons.", targetingMode: "PINCODE", pincodes: ["600001"], durationValue: 1, durationUnit: "YEARS", startOffsetDays: -3, status: "ACTIVE", mediaType: "VIDEO", mediaExtension: ".mp4" },
    { title: "Ahmedabad Color Refresh", description: "Refresh your colour with salon professionals.", targetingMode: "PINCODE", pincodes: ["380001"], durationValue: 15, durationUnit: "DAYS", startOffsetDays: -2, status: "ACTIVE", mediaType: "TEXT", action: true },
    { title: "Jaipur Wedding Season", description: "Wedding-season beauty packages in Jaipur.", targetingMode: "PINCODE", pincodes: ["302001"], durationValue: 3, durationUnit: "MONTHS", startOffsetDays: -2, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".png" },
    { title: "Draft Salon Promotion", description: "A draft campaign for admin review.", targetingMode: "PINCODE", pincodes: ["500001", "700001"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: 2, status: "DRAFT", mediaType: "TEXT" },
    { title: "Inactive Beauty Week", description: "A paused campaign retained in admin history.", targetingMode: "PINCODE", pincodes: ["110002"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: -2, status: "INACTIVE", mediaType: "TEXT" },
    { title: "All India Hair Spa", description: "Discover hair spa services at participating salons nationwide.", targetingMode: "ALL", pincodes: [], durationValue: 6, durationUnit: "MONTHS", startOffsetDays: -2, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Hyderabad Wedding Styling", description: "Wedding styling consultations in Hyderabad.", targetingMode: "PINCODE", pincodes: ["500001"], durationValue: 1, durationUnit: "YEARS", startOffsetDays: -2, status: "ACTIVE", mediaType: "IMAGE", mediaExtension: ".webp", action: true },
    { title: "Delhi Wellness Weekend", description: "A weekend offer on selected wellness services.", targetingMode: "PINCODE", pincodes: ["110003", "110006"], durationValue: 7, durationUnit: "DAYS", startOffsetDays: -1, status: "ACTIVE", mediaType: "TEXT" },
    { title: "Mumbai Bridal Beauty", description: "Book a bridal beauty consultation in Mumbai.", targetingMode: "PINCODE", pincodes: ["400001"], durationValue: 3, durationUnit: "MONTHS", startOffsetDays: -3, status: "ACTIVE", mediaType: "VIDEO", mediaExtension: ".mp4", action: true },
    { title: "Expired Bengaluru Promotion", description: "Past campaign retained in admin history.", targetingMode: "PINCODE", pincodes: ["560001"], durationValue: 30, durationUnit: "DAYS", startOffsetDays: -90, status: "EXPIRED", mediaType: "TEXT" },
  ];
  const imageFallback = findDemoAdvertisementMedia(".jpg") ?? findDemoAdvertisementMedia(".jpeg") ?? findDemoAdvertisementMedia(".png") ?? findDemoAdvertisementMedia(".webp");
  const videoFallback = findDemoAdvertisementMedia(".mp4");

  for (let i = 0; i < demoAdvertisementScenarios.length; i += 1) {
    const vendor = vendors[i % vendors.length];
    const marker = `${demoMarker}:ad:${i}`;
    const scenario = demoAdvertisementScenarios[i];
    const existing = await prisma.advertisement.findFirst({
      where: { createdById: vendor.user.id, OR: [{ title: marker }, { title: scenario.title }] },
    });
    const startAt = dateAt(scenario.startOffsetDays, 0);
    const mediaUrl = scenario.mediaType === AdvertisementMediaType.IMAGE
      ? (scenario.mediaExtension ? findDemoAdvertisementMedia(scenario.mediaExtension) : null) ?? imageFallback
      : scenario.mediaType === AdvertisementMediaType.VIDEO ? videoFallback : null;
    const mediaType = scenario.mediaType !== AdvertisementMediaType.TEXT && !mediaUrl ? AdvertisementMediaType.TEXT : scenario.mediaType;
    const actionEnabled = Boolean(scenario.action);
    const data = {
      title: scenario.title,
      description: scenario.description,
      salonId: vendor.salon.id,
      branchId: vendor.branches[i % vendor.branches.length].id,
      serviceId: vendor.services[i % vendor.services.length].id,
      createdById: vendor.user.id,
      mediaType,
      mediaUrl,
      media: mediaUrl,
      image: mediaType === AdvertisementMediaType.IMAGE ? mediaUrl : null,
      targetAudience: AdvertisementTargetAudience.CUSTOMER,
      targetingMode: scenario.targetingMode,
      targetType: scenario.targetingMode,
      durationValue: scenario.durationValue,
      durationUnit: scenario.durationUnit,
      startAt,
      endAt: addAdvertisementDuration(startAt, scenario.durationValue, scenario.durationUnit),
      status: scenario.status,
      actionEnabled,
      actionButtonName: actionEnabled ? "View offer" : null,
      actionType: actionEnabled ? "DEEP_LINK" as const : "NONE" as const,
      actionUrl: actionEnabled ? "/salons" : null,
      ctaText: actionEnabled ? "View offer" : null,
      priority: i % 5,
      displayOrder: i % 5,
      ...(existing ? {
        updatedById: vendor.user.id,
        pincodes: { deleteMany: {}, ...(scenario.targetingMode === AdvertisementTargetingMode.PINCODE ? { create: scenario.pincodes.map((pincode) => ({ pincode })) } : {}) },
      } : {
        ...(scenario.targetingMode === AdvertisementTargetingMode.PINCODE ? { pincodes: { create: scenario.pincodes.map((pincode) => ({ pincode })) } } : {}),
      }),
    };
    if (existing) await prisma.advertisement.update({ where: { id: existing.id }, data });
    else await prisma.advertisement.create({ data });
  }

  console.log("\n====================================");
  console.log("ZIPP SALON DEMO DATA");
  console.log("====================================");
  console.log(`Vendors: 20 | Salons: ${vendors.length} | Branches: ${vendors.reduce((n, v) => n + v.branches.length, 0)}`);
  console.log(`Staff: ${vendors.reduce((n, v) => n + v.staff.length, 0)} | Services: ${vendors.reduce((n, v) => n + v.services.length, 0)}`);
  console.log(`Bookings: ${allBookings.length} | Posts: ${postCount} | Stories: ${storyCount}`);
  console.log(`Booking sources: Mobile App ${allBookings.filter(({ booking }) => booking.bookingSource === BookingSource.APP).length} | Web ${allBookings.filter(({ booking }) => booking.bookingSource === BookingSource.WEB).length}`);
  console.log(`Likes: ${likeCount} | Comments: ${commentCount} | Shares: ${shareCount} | Views: ${viewCount}`);
  console.log(`Advertisements: ${demoAdvertisementScenarios.length} (active, scheduled, expired, draft, inactive; all/pincode; image/video/text)`);
  console.log("\nVendor password: Demo@12345");
  console.log("Staff password: Staff@12345");
  console.log("Customer: navedahamad2016@gmail.com");
  console.log("Customer password: Customer@12345 (only if the account was created by this seed)");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
