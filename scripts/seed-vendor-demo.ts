import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { ensureDefaultVendorSubscription } from "../src/modules/subscription/subscription.service";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";

// Deliberately additive: this script never clears or replaces existing data.
// It is for a local/demo database only and can be run repeatedly.
if (process.env.NODE_ENV === "production") {
  throw new Error("seed:vendor-demo refuses to run in production");
}

const prisma = new PrismaClient();
const email = "vendor@example.com";
const password = "Vendor@123";

const menuDefinitions = [
  ["Dashboard", "/dashboard", "LayoutDashboard", "dashboard.view"],
  ["Salons", "/salons", "Store", "salons.view"],
  ["Branches", "/branch", "GitBranch", "branch.view"],
  ["Staff", "/staff", "Users", "staff.view"],
  ["Services", "/services", "Scissors", "services.view"],
  ["Categories", "/categories", "Tags", "categories.view"],
  ["Customers", "/customers", "UserRound", "customers.view"],
  ["Bookings", "/bookings", "Calendar", "bookings.view"],
  ["Inventory", "/inventory", "Package", "inventory.view"],
  ["Feed", "/feed", "Newspaper", "feed.view"],
  ["WhatsApp", "/whatsapp", "MessageCircle", "whatsapp.view"],
  ["Subscription", "/subscriptions", "CreditCard", "subscriptions.view"],
  ["Settings", "/settings", "Settings", "settings.view"],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await prisma.$transaction(async (tx) => {
    const vendor = await tx.user.upsert({
      where: { email },
      update: { firstName: "Demo", lastName: "Vendor", phone: "9000000002", countryCode: "+91", password: passwordHash, isActive: true, source: "WEBSITE" },
      create: { firstName: "Demo", lastName: "Vendor", email, phone: "9000000002", countryCode: "+91", password: passwordHash, isActive: true, source: "WEBSITE" },
    });
    const vendorRole = await tx.role.upsert({ where: { name: "VENDOR" }, update: {}, create: { name: "VENDOR" } });
    await tx.userRole.upsert({ where: { userId_roleId: { userId: vendor.id, roleId: vendorRole.id } }, update: {}, create: { userId: vendor.id, roleId: vendorRole.id } });

    let salon = await tx.salon.findFirst({ where: { ownerId: vendor.id, parentId: null }, orderBy: { createdAt: "asc" } });
    if (!salon) {
      salon = await tx.salon.create({ data: { name: "Zipp Salon Demo", ownerId: vendor.id, isActive: true, isProfileCompleted: true, timings: {} } });
    } else if (!salon.isActive) {
      salon = await tx.salon.update({ where: { id: salon.id }, data: { isActive: true } });
    }

    const category = await tx.serviceCategory.upsert({ where: { name: "Demo Salon Services" }, update: { isActive: true }, create: { name: "Demo Salon Services", isActive: true } });
    const serviceData = [["Classic Haircut", 499, 45], ["Hair Spa", 999, 60], ["Signature Facial", 1499, 75]] as const;
    const services = [];
    for (const [name, basePrice, baseDuration] of serviceData) {
      let service = await tx.service.findFirst({ where: { salonId: salon.id, name } });
      if (!service) service = await tx.service.create({ data: { salonId: salon.id, name, basePrice, baseDuration, categoryId: category.id, createdById: vendor.id } });
      services.push(service);
    }

    const customer = await tx.user.upsert({
      where: { email: "customer.demo@zippsalon.local" },
      update: { isActive: true },
      create: { firstName: "Demo", lastName: "Customer", email: "customer.demo@zippsalon.local", phone: "9000000004", countryCode: "+91", password: passwordHash, isActive: true },
    });
    await tx.salonCustomer.upsert({ where: { salonId_userId: { salonId: salon.id, userId: customer.id } }, update: {}, create: { salonId: salon.id, userId: customer.id } });

    const bookingNote = "vendor-demo-booking";
    let booking = await tx.booking.findFirst({ where: { salonId: salon.id, customerId: customer.id, notes: bookingNote } });
    if (!booking) {
      booking = await tx.booking.create({ data: { salonId: salon.id, customerId: customer.id, bookingDate: new Date(), totalAmount: services[0].basePrice, taxableAmount: services[0].basePrice, finalAmount: services[0].basePrice, totalPaid: services[0].basePrice, status: "CONFIRMED", notes: bookingNote, services: { create: { serviceId: services[0].id, name: services[0].name, price: services[0].basePrice } }, payments: { create: { amount: services[0].basePrice, method: "CASH", status: "COMPLETED", transactionId: "vendor-demo-payment" } } } });
    }

    for (let order = 0; order < menuDefinitions.length; order += 1) {
      const [label, path, icon, action] = menuDefinitions[order];
      const permission = await tx.permission.upsert({ where: { action }, update: {}, create: { action, description: `Access ${label}` } });
      await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: permission.id } }, update: {}, create: { roleId: vendorRole.id, permissionId: permission.id } });
      let menu = await tx.menu.findFirst({ where: { path, parentId: null } });
      if (!menu) menu = await tx.menu.create({ data: { label, path, icon, order, showInSidebar: true } });
      await tx.menuPermission.upsert({ where: { menuId_permissionId: { menuId: menu.id, permissionId: permission.id } }, update: {}, create: { menuId: menu.id, permissionId: permission.id } });
    }

    const subscription = await ensureDefaultVendorSubscription(vendor.id, salon.id, tx);
    return { vendorId: vendor.id, salonId: salon.id, serviceCount: services.length, bookingId: booking.id, subscriptionId: subscription.id };
  });

  await Promise.all([cacheInvalidate("rbac:perms:v3:*"), cacheInvalidate("menus:v5:*")]);
  console.log(JSON.stringify({ seeded: true, email, password, ...result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
