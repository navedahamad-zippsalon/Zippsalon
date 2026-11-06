import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma";
import { ensureDefaultVendorSubscription } from "../subscription/subscription.service";

const DEMO_VENDOR_EMAILS = [
  "glowstudio.demo@zippsalon.test",
  "urbancuts.demo@zippsalon.test",
  "zippbeauty.demo@zippsalon.test",
] as const;

const DEMO_VENDORS = [
  {
    email: "glowstudio.demo@zippsalon.test",
    firstName: "Glow",
    lastName: "Studio",
    salonName: "Glow Studio",
    city: "Delhi",
    state: "Delhi",
    branchNames: ["Connaught Place", "Dwarka"],
    serviceNames: ["Signature Haircut", "Glow Facial", "Hair Spa Ritual"],
  },
  {
    email: "urbancuts.demo@zippsalon.test",
    firstName: "Urban",
    lastName: "Cuts",
    salonName: "Urban Cuts",
    city: "Mumbai",
    state: "Maharashtra",
    branchNames: ["Andheri", "Powai"],
    serviceNames: ["Executive Beard Trim", "Skin Boost Facial", "Deluxe Hair Styling"],
  },
  {
    email: "zippbeauty.demo@zippsalon.test",
    firstName: "Zipp",
    lastName: "Beauty",
    salonName: "Zipp Beauty Studio",
    city: "Bengaluru",
    state: "Karnataka",
    branchNames: ["Indiranagar", "Koramangala"],
    serviceNames: ["Hair Cut & Style", "Facial", "Hair Color", "Spa & Massage", "Hair Spa", "Manicure", "Pedicure", "Cleanup", "Threading", "Bridal Makeup", "Keratin Treatment"],
  },
] as const;

const DEMO_CUSTOMER_EMAILS = [
  "demo.customer.one@zippsalon.test",
  "demo.customer.two@zippsalon.test",
  "demo.customer.three@zippsalon.test",
  "demo.customer.four@zippsalon.test",
] as const;

const ZIPPBEAUTY_SERVICE_DEFINITIONS = [
  { name: "Hair Cut & Style", price: 800, duration: 45 },
  { name: "Hair Color", price: 1800, duration: 90 },
  { name: "Facial", price: 1200, duration: 60 },
  { name: "Spa & Massage", price: 1500, duration: 60 },
  { name: "Hair Wash", price: 400, duration: 20 },
  { name: "Hair Treatment", price: 2200, duration: 75 },
  { name: "Manicure", price: 700, duration: 40 },
  { name: "Pedicure", price: 900, duration: 50 },
  { name: "Bridal Makeup", price: 5000, duration: 180 },
  { name: "Threading", price: 250, duration: 20 },
] as const;

const ZIPPBEAUTY_STAFF_DEFINITIONS = [
  { firstName: "Ravi", lastName: "Kumar", role: "Senior Stylist" },
  { firstName: "Sunita", lastName: "Devi", role: "Beautician" },
  { firstName: "Amit", lastName: "Singh", role: "Junior Stylist" },
  { firstName: "Neha", lastName: "Kapoor", role: "Senior Beautician" },
  { firstName: "Pooja", lastName: "Sharma", role: "Hair Specialist" },
  { firstName: "Rahul", lastName: "Verma", role: "Massage Therapist" },
  { firstName: "Simran", lastName: "Kaur", role: "Makeup Artist" },
  { firstName: "Anjali", lastName: "Gupta", role: "Nail Artist" },
] as const;

const ZIPPBEAUTY_CUSTOMERS = [
  { firstName: "Neha", lastName: "Verma", email: "neha.verma@zippsalon.test" },
  { firstName: "Kavita", lastName: "Singh", email: "kavita.singh@zippsalon.test" },
  { firstName: "Simran", lastName: "Kaur", email: "simran.kaur@zippsalon.test" },
  { firstName: "Rahul", lastName: "Mehta", email: "rahul.mehta@zippsalon.test" },
  { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@zippsalon.test" },
  { firstName: "Ananya", lastName: "Gupta", email: "ananya.gupta@zippsalon.test" },
  { firstName: "Riya", lastName: "Kapoor", email: "riya.kapoor@zippsalon.test" },
  { firstName: "Sneha", lastName: "Malhotra", email: "sneha.malhotra@zippsalon.test" },
  { firstName: "Pooja", lastName: "Verma", email: "pooja.verma@zippsalon.test" },
  { firstName: "Meera", lastName: "Joshi", email: "meera.joshi@zippsalon.test" },
  { firstName: "Arjun", lastName: "Sethi", email: "arjun.sethi@zippsalon.test" },
  { firstName: "Aditi", lastName: "Nair", email: "aditi.nair@zippsalon.test" },
] as const;

function demoPasswordHash() {
  return bcrypt.hash("Demo@12345", 10);
}

function demoPincode() {
  return String(110000 + Math.floor(Math.random() * 90000)).slice(0, 6);
}

function buildDemoPhone(seed: number) {
  return `9${String(seed + 1000000000).slice(1, 10)}`;
}

function clampDate(date: Date, hour = 11) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function dateWithOffset(daysAgo: number, hour = 11) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function ensureRole(name: string, tx: Prisma.TransactionClient) {
  return tx.role.upsert({
    where: { name },
    update: { isActive: true },
    create: { name, isActive: true },
  });
}

async function ensureUser(tx: Prisma.TransactionClient, email: string, firstName: string, lastName: string, phone: string, source: "WEBSITE" | "CUSTOMER" | "ADMIN" = "WEBSITE") {
  const password = await demoPasswordHash();
  return tx.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      phone,
      countryCode: "+91",
      isActive: true,
      source,
      password,
    },
    create: {
      firstName,
      lastName,
      email,
      phone,
      countryCode: "+91",
      password,
      isActive: true,
      source,
    },
  });
}

async function ensureUserRole(tx: Prisma.TransactionClient, userId: string, roleName: string) {
  const role = await ensureRole(roleName, tx);
  await tx.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
  return role;
}

async function ensureSalon(tx: Prisma.TransactionClient, ownerId: string, name: string, city: string, state: string, country = "India", parentId?: string | null) {
  let salon = await tx.salon.findFirst({
    where: { ownerId, parentId: parentId ?? null, name },
  });

  if (!parentId) {
    const roots = await tx.salon.findMany({
      where: { ownerId, parentId: null },
      select: { id: true, name: true, isActive: true },
    });
    const preferredRoot = roots.find((row) => row.name === name) ?? roots.find((row) => row.name.toLowerCase().includes(name.toLowerCase())) ?? roots[0];
    if (preferredRoot && !salon && roots.length > 1) {
      const staleRoots = roots.filter((row) => row.id !== preferredRoot.id);
      for (const staleRoot of staleRoots) {
        await tx.salon.update({
          where: { id: staleRoot.id },
          data: { isActive: false, isProfileCompleted: false },
        });
      }
    }
    if (preferredRoot && !salon) {
      salon = await tx.salon.findUnique({ where: { id: preferredRoot.id } });
    }
  }

  if (!salon) {
    salon = await tx.salon.create({
      data: {
        name,
        ownerId,
        parentId: parentId ?? null,
        isActive: true,
        isMain: !parentId,
        isProfileCompleted: true,
        timings: {
          monday: { open: "09:00", close: "21:00", isOpen: true },
          tuesday: { open: "09:00", close: "21:00", isOpen: true },
          wednesday: { open: "09:00", close: "21:00", isOpen: true },
          thursday: { open: "09:00", close: "21:00", isOpen: true },
          friday: { open: "09:00", close: "21:00", isOpen: true },
          saturday: { open: "10:00", close: "22:00", isOpen: true },
          sunday: { open: "10:00", close: "20:00", isOpen: false },
        },
        address: {
          create: {
            line1: `${name} Demo Road`,
            city,
            state,
            country,
            pincode: demoPincode(),
          },
        },
        contacts: {
          create: [
            {
              phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
              countryCode: "+91",
              email: `${name.toLowerCase().replace(/\s+/g, "")}@zippsalon.test`,
              isPrimary: true,
              isWhatsapp: true,
            },
          ],
        },
      },
    });
  } else {
    salon = await tx.salon.update({
      where: { id: salon.id },
      data: {
        isActive: true,
        isProfileCompleted: true,
        isMain: !parentId,
      },
    });
  }

  await tx.address.upsert({
    where: { salonId: salon.id },
    update: {
      line1: `${name} Demo Road`,
      city,
      state,
      country,
      pincode: demoPincode(),
    },
    create: {
      salonId: salon.id,
      line1: `${name} Demo Road`,
      city,
      state,
      country,
      pincode: demoPincode(),
    },
  });

  return salon;
}

async function ensureServiceCategory(tx: Prisma.TransactionClient, salonId: string, name = "Signature Services") {
  return tx.serviceCategory.upsert({
    where: { name },
    update: { isActive: true },
    create: { name, isActive: true },
  });
}

async function ensureService(tx: Prisma.TransactionClient, salonId: string, createdById: string, name: string, price: number, duration: number, categoryId?: string) {
  let service = await tx.service.findFirst({ where: { salonId, name } });

  if (!service) {
    service = await tx.service.create({
      data: {
        salonId,
        name,
        description: `${name} service for the demo dataset`,
        categoryId,
        basePrice: price,
        baseDuration: duration,
        isActive: true,
        createdById,
        updatedById: createdById,
      },
    });
  } else {
    service = await tx.service.update({
      where: { id: service.id },
      data: {
        basePrice: price,
        baseDuration: duration,
        isActive: true,
        updatedById: createdById,
      },
    });
  }

  return service;
}

async function ensureStaffMember(tx: Prisma.TransactionClient, salonId: string, createdById: string, email: string, firstName: string, lastName: string, role: string, staffRoleName: string) {
  const user = await ensureUser(tx, email, firstName, lastName, buildDemoPhone(Math.abs(email.length + salonId.length + createdById.length)), "ADMIN");
  await ensureUserRole(tx, user.id, "STAFF");

  const resolvedStaffRoleName = (staffRoleName ?? "Demo Stylist").trim() || "Demo Stylist";
  const staffRole = await tx.staffRole.upsert({
    where: { salonId_name: { salonId, name: resolvedStaffRoleName } },
    update: {},
    create: { salonId, name: resolvedStaffRoleName, description: `${resolvedStaffRoleName} role` },
  });

  const staff = await tx.salonStaff.upsert({
    where: { userId_salonId: { userId: user.id, salonId } },
    update: { role, staffRoleId: staffRole.id, isActive: true },
    create: {
      userId: user.id,
      salonId,
      role,
      staffRoleId: staffRole.id,
      isActive: true,
      createdById,
    },
  });

  return { user, staff };
}

async function ensureCustomer(tx: Prisma.TransactionClient, email: string, firstName: string, lastName: string, phone: string, salonId: string) {
  const user = await ensureUser(tx, email, firstName, lastName, phone, "CUSTOMER");
  await ensureUserRole(tx, user.id, "CUSTOMER");
  await tx.salonCustomer.upsert({
    where: { salonId_userId: { salonId, userId: user.id } },
    update: {},
    create: { salonId, userId: user.id },
  });
  return user;
}

async function ensureReview(tx: Prisma.TransactionClient, bookingId: string, customerId: string, salonId: string, branchId: string | null, staffId: string | null, rating: number, comment: string) {
  await tx.review.upsert({
    where: { customerId_bookingId: { customerId, bookingId } },
    update: { rating, comment, status: "PUBLISHED", salonId, branchId, staffId },
    create: { customerId, bookingId, salonId, branchId, staffId, rating, comment, status: "PUBLISHED" },
  });
}

async function seedZippBeautyDemoData(tx: Prisma.TransactionClient, vendorUser: any, salon: any) {
  const branchDefinitions = [
    { name: "Main Branch", city: "Delhi", state: "Delhi", isActive: true },
    { name: "Dwarka Branch", city: "Delhi", state: "Delhi", isActive: true },
    { name: "Rohini Branch", city: "Delhi", state: "Delhi", isActive: true },
  ] as const;

  const branchIds: string[] = [];
  for (const branchDef of branchDefinitions) {
    const branch = await ensureSalon(tx, vendorUser.id, branchDef.name, branchDef.city, branchDef.state, "India", salon.id);
    await tx.salon.update({ where: { id: branch.id }, data: { isActive: branchDef.isActive } });
    branchIds.push(branch.id);
  }

  const serviceIds: string[] = [];
  const category = await ensureServiceCategory(tx, salon.id, "Zipp Beauty Essentials");
  for (const serviceDef of ZIPPBEAUTY_SERVICE_DEFINITIONS) {
    const service = await ensureService(tx, salon.id, vendorUser.id, serviceDef.name, serviceDef.price, serviceDef.duration, category.id);
    serviceIds.push(service.id);
  }

  const staffIds: string[] = [];
  for (const [index, staffDef] of ZIPPBEAUTY_STAFF_DEFINITIONS.entries()) {
    const branchId = branchIds[index % branchIds.length];
    const email = `zippbeauty.${staffDef.firstName.toLowerCase()}.${staffDef.lastName.toLowerCase()}@zippsalon.test`;
    const staffResult = await ensureStaffMember(tx, branchId, vendorUser.id, email, staffDef.firstName, staffDef.lastName, staffDef.role, "Demo Stylist");
    staffIds.push(staffResult.staff.id);
  }

  const customerRecords: Array<{ id: string; email: string }> = [];
  for (const [index, customer] of ZIPPBEAUTY_CUSTOMERS.entries()) {
    const user = await ensureCustomer(tx, customer.email, customer.firstName, customer.lastName, buildDemoPhone(index + 100), salon.id);
    customerRecords.push({ id: user.id, email: user.email });
  }

  const today = new Date();
  const appointmentTimes = [9, 9.5, 10, 10.5, 11.5, 12.5, 14, 15, 16.5, 18];
  for (let index = 0; index < appointmentTimes.length; index += 1) {
    const customer = customerRecords[index % customerRecords.length];
    const branchId = branchIds[index % branchIds.length];
    const staffId = staffIds[index % staffIds.length];
    const serviceId = serviceIds[index % serviceIds.length];
    const service = await tx.service.findUnique({ where: { id: serviceId }, select: { name: true, basePrice: true } });
    const appointmentDate = clampDate(today, appointmentTimes[index]);
    const bookingKey = `zippbeauty:today:${index}`;
    const existingBooking = await tx.booking.findFirst({ where: { notes: bookingKey } });
    const booking = existingBooking ?? await tx.booking.create({
      data: {
        salonId: salon.id,
        branchId,
        customerId: customer.id,
        staffId,
        bookingDate: appointmentDate,
        status: index % 3 === 0 ? "PENDING" : index % 3 === 1 ? "CONFIRMED" : "DONE",
        medium: "IN_SALON",
        totalAmount: service?.basePrice ?? 1000,
        discount: 0,
        discountAmount: 0,
        taxableAmount: service?.basePrice ?? 1000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
        finalAmount: service?.basePrice ?? 1000,
        totalPaid: index % 3 === 2 ? (service?.basePrice ?? 1000) : 0,
        notes: bookingKey,
        services: {
          create: [{
            serviceId,
            name: service?.name ?? "Service",
            price: service?.basePrice ?? 1000,
          }],
        },
        payments: {
          create: [{
            amount: index % 3 === 2 ? (service?.basePrice ?? 1000) : 0,
            method: index % 2 === 0 ? "UPI" : "CARD",
            status: index % 3 === 2 ? "COMPLETED" : "PENDING",
            transactionId: `zippbeauty-today-${index}`,
          }],
        },
      },
    });

    if (index % 2 === 0) {
      await ensureReview(tx, booking.id, customer.id, salon.id, branchId, staffId, 4 + (index % 2), "Excellent service and courteous staff.");
    }
  }

  const historicalServiceCatalog = [
    { name: "Hair Cut & Style", price: 800 },
    { name: "Facial", price: 1200 },
    { name: "Hair Color", price: 1800 },
    { name: "Spa & Massage", price: 1500 },
    { name: "Hair Treatment", price: 2200 },
    { name: "Manicure", price: 700 },
    { name: "Pedicure", price: 900 },
    { name: "Bridal Makeup", price: 5000 },
  ] as const;

  const serviceLookup = new Map<string, { id: string; name: string; basePrice: number }>();
  for (const serviceDef of historicalServiceCatalog) {
    const service = await tx.service.findFirst({
      where: { salonId: salon.id, name: serviceDef.name },
      select: { id: true, name: true, basePrice: true },
    });
    if (service) serviceLookup.set(serviceDef.name, service);
  }

  for (let dayOffset = 1; dayOffset <= 30; dayOffset += 1) {
    const bookingCountForDay = 4 + (dayOffset % 3);
    for (let slot = 0; slot < bookingCountForDay; slot += 1) {
      const bookingKey = `zippbeauty:history:${dayOffset}:${slot}`;
      const existing = await tx.booking.findFirst({ where: { notes: bookingKey } });
      if (existing) continue;

      const customer = customerRecords[(dayOffset + slot) % customerRecords.length];
      const branchId = branchIds[(dayOffset + slot) % branchIds.length];
      const staffId = staffIds[(dayOffset * 2 + slot) % staffIds.length];
      const chosenServiceIndexes = new Set<number>();
      for (let offset = 0; offset < 3; offset += 1) {
        chosenServiceIndexes.add((dayOffset + slot + offset) % historicalServiceCatalog.length);
      }
      const services = Array.from(chosenServiceIndexes)
        .map((index) => historicalServiceCatalog[index])
        .map((serviceDef) => {
          const match = serviceLookup.get(serviceDef.name) ?? { id: serviceIds[(dayOffset + slot + Math.random() * 10) % serviceIds.length], name: serviceDef.name, basePrice: serviceDef.price };
          return { ...match, name: serviceDef.name, basePrice: serviceDef.price };
        });
      const amount = services.reduce((sum, service) => sum + (service.basePrice ?? 0), 0);
      const bookingDate = dateWithOffset(dayOffset, 10 + ((slot + dayOffset) % 8));
      const booking = await tx.booking.create({
        data: {
          salonId: salon.id,
          branchId,
          customerId: customer.id,
          staffId,
          bookingDate,
          status: "DONE",
          medium: slot % 2 === 0 ? "ONLINE" : "IN_SALON",
          totalAmount: amount,
          discount: slot % 5 === 0 ? 150 : 0,
          discountAmount: slot % 5 === 0 ? 150 : 0,
          taxableAmount: amount,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTaxAmount: 0,
          finalAmount: amount,
          totalPaid: amount,
          notes: bookingKey,
          services: {
            create: services.map((service) => ({
              serviceId: service.id,
              name: service.name,
              price: service.basePrice,
            })),
          },
          payments: {
            create: [{
              amount,
              method: slot % 3 === 0 ? "UPI" : slot % 3 === 1 ? "CARD" : "CASH",
              status: "COMPLETED",
              transactionId: `zippbeauty-history-${dayOffset}-${slot}`,
            }],
          },
        },
      });

      await ensureReview(tx, booking.id, customer.id, salon.id, branchId, staffId, 4 + (slot % 2), "Good experience and professional service.");
    }
  }

  return {
    vendorId: vendorUser.id,
    salonId: salon.id,
    branchIds,
    serviceIds,
    staffIds,
    customerIds: customerRecords.map((item) => item.id),
  };
}

function bookingDate(offsetDays: number, hour = 11) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

export async function importDashboardDemoData() {
  if (process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("Demo import is not allowed in production."), { status: 403 });
  }

  if (process.env.ALLOW_DEMO_DATA_IMPORT !== "true") {
    throw Object.assign(new Error("Demo data import is disabled. Set ALLOW_DEMO_DATA_IMPORT=true."), { status: 403 });
  }

  return prisma.$transaction(async (tx) => {
    const vendorRole = await ensureRole("VENDOR", tx);
    const staffRole = await ensureRole("STAFF", tx);
    const customerRole = await ensureRole("CUSTOMER", tx);

    const vendorSummaries: Array<{ email: string; vendorId: string; salonId: string; branchIds: string[]; bookingCount: number }> = [];

    for (const vendorDef of DEMO_VENDORS) {
      const vendorUser = await ensureUser(tx, vendorDef.email, vendorDef.firstName, vendorDef.lastName, `90${String(Math.random()).slice(2, 10)}`, "WEBSITE");
      await ensureUserRole(tx, vendorUser.id, vendorRole.name);
      await ensureUserRole(tx, vendorUser.id, staffRole.name);
      await ensureUserRole(tx, vendorUser.id, customerRole.name);

      const salon = await ensureSalon(tx, vendorUser.id, vendorDef.salonName, vendorDef.city, vendorDef.state, "India", null);
      await ensureDefaultVendorSubscription(vendorUser.id, salon.id, tx);

      const branchIds: string[] = [];
      if (vendorDef.email === "zippbeauty.demo@zippsalon.test") {
        const zippSummary = await seedZippBeautyDemoData(tx, vendorUser, salon);
        vendorSummaries.push({
          email: vendorDef.email,
          vendorId: vendorUser.id,
          salonId: salon.id,
          branchIds: zippSummary.branchIds,
          bookingCount: 80,
        });
        continue;
      }

      for (const branchName of vendorDef.branchNames) {
        const branch = await ensureSalon(tx, vendorUser.id, `${vendorDef.salonName} - ${branchName}`, vendorDef.city, vendorDef.state, "India", salon.id);
        branchIds.push(branch.id);
      }

      const category = await ensureServiceCategory(tx, salon.id, `${vendorDef.salonName} Essentials`);
      const serviceIds: string[] = [];
      for (const [index, serviceName] of vendorDef.serviceNames.entries()) {
        const service = await tx.service.findFirst({ where: { salonId: salon.id, name: serviceName } });
        const record = service ?? await tx.service.create({
          data: {
            salonId: salon.id,
            name: serviceName,
            description: `${serviceName} service from ${vendorDef.salonName}`,
            categoryId: category.id,
            basePrice: 899 + index * 299,
            baseDuration: 45 + index * 15,
            isActive: true,
            createdById: vendorUser.id,
            updatedById: vendorUser.id,
          },
        });
        serviceIds.push(record.id);
      }

      const staffMembers: Array<{ id: string }> = [];
      for (let index = 0; index < 3; index += 1) {
        const email = `generic.staff.${vendorDef.email.split("@")[0]}.${index}@zippsalon.test`;
        const firstName = ["Aarav", "Vikram", "Nisha"][index] ?? `Stylist${index + 1}`;
        const result = await ensureStaffMember(tx, salon.id, vendorUser.id, email, firstName, "Demo", "Stylist", "Stylist");
        staffMembers.push({ id: result.staff.id });
      }

      for (const [branchIndex, branchId] of branchIds.entries()) {
        for (let index = 0; index < 2; index += 1) {
          const email = `generic.branch.staff.${branchIndex}.${index}@zippsalon.test`;
          const firstName = ["Meera", "Rahul", "Neha", "Kabir"][branchIndex + index] ?? `BranchStylist${index + 1}`;
          const result = await ensureStaffMember(tx, branchId, vendorUser.id, email, firstName, "Demo", "Stylist", "Stylist");
          staffMembers.push({ id: result.staff.id });
        }
      }

      const customers: Array<{ id: string }> = [];
      for (const [index, email] of DEMO_CUSTOMER_EMAILS.entries()) {
        const customer = await ensureCustomer(tx, email, `Demo${index + 1}`, `Customer`, `99${String(index + 1000000000).slice(1, 10)}`, salon.id);
        customers.push({ id: customer.id });
      }

      let bookingCount = 0;
      const statuses = ["DONE", "CONFIRMED", "PENDING", "CANCELLED", "NO_SHOW"] as const;
      for (let index = 0; index < 8; index += 1) {
        const customer = customers[index % customers.length];
        const branchId = index % 2 === 0 ? branchIds[0] ?? salon.id : branchIds[1] ?? salon.id;
        const staffId = staffMembers[index % staffMembers.length]?.id;
        const serviceId = serviceIds[index % serviceIds.length];
        const status = statuses[index % statuses.length];
        const bookingMarker = `demo-import:${vendorDef.email}:${index}`;

        let booking = await tx.booking.findFirst({ where: { notes: bookingMarker } });
        if (!booking) {
          const amount = 899 + (index * 149);
          booking = await tx.booking.create({
            data: {
              salonId: salon.id,
              branchId,
              customerId: customer.id,
              staffId,
              bookingDate: bookingDate(-(index * 4) + 2, 11 + (index % 3)),
              status,
              medium: index % 2 === 0 ? "ONLINE" : "IN_SALON",
              totalAmount: amount,
              discount: 0,
              discountAmount: 0,
              taxableAmount: amount,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 0,
              totalTaxAmount: 0,
              finalAmount: amount,
              totalPaid: status === "DONE" || status === "CONFIRMED" ? amount : 0,
              notes: bookingMarker,
              services: {
                create: [{
                  serviceId,
                  name: (await tx.service.findUnique({ where: { id: serviceId }, select: { name: true } }))?.name ?? "Service",
                  price: amount,
                }],
              },
              payments: {
                create: [{
                  amount: status === "DONE" || status === "CONFIRMED" ? amount : 0,
                  method: index % 3 === 0 ? "UPI" : (index % 3 === 1 ? "CARD" : "CASH"),
                  status: status === "DONE" || status === "CONFIRMED" ? "COMPLETED" : status === "PENDING" ? "PENDING" : "FAILED",
                  transactionId: `${bookingMarker}-payment`,
                }],
              },
            },
          });
        }

        if (status === "DONE") {
          await ensureReview(tx, booking.id, customer.id, salon.id, branchId, staffId, 4 + (index % 2), "Excellent service and professional care.");
        }

        bookingCount += 1;
      }

      vendorSummaries.push({
        email: vendorDef.email,
        vendorId: vendorUser.id,
        salonId: salon.id,
        branchIds,
        bookingCount,
      });
    }

    return {
      imported: true,
      vendorEmails: DEMO_VENDOR_EMAILS,
      vendors: vendorSummaries,
      customerEmails: DEMO_CUSTOMER_EMAILS,
    };
  }, { timeout: 120_000 });
}
