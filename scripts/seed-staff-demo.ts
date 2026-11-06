import "dotenv/config";
import bcrypt from "bcrypt";
import {
  PrismaClient,
  AttendanceStatus,
  BookingStatus,
  BookingMedium,
  PaymentStatus,
  PaymentMethod,
  FeedMediaType,
  FeedVisibility,
  FeedPostStatus,
  FeedCommentStatus
} from "@prisma/client";
import { subDays, addDays } from "date-fns";

if (process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: Refusing to run seed:staff in production environment!");
}

const prisma = new PrismaClient();

export async function seedStaffDemo() {
  console.log("\n============================================================");
  console.log("  ZIPP SALON - SEEDING REALISTIC STAFF DEMO DATA");
  console.log("  Account: stylist@zippsalon.com / Staff@123");
  console.log("============================================================\n");

  const commonPassword = await bcrypt.hash("Staff@123", 10);
  const vendorPassword = await bcrypt.hash("Admin@123", 10);

  // 1. Ensure essential roles exist
  console.log("1. Ensuring system roles...");
  const roleNames = ["ADMIN", "VENDOR", "STAFF", "CUSTOMER"];
  const roles = await Promise.all(
    roleNames.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  // 2. Vendor / Salon Owner
  console.log("2. Ensuring salon owner account...");
  const vendor = await prisma.user.upsert({
    where: { email: "owner@zippsalon.com" },
    update: {
      firstName: "Vikram",
      lastName: "Malhotra",
      phone: "+919810101010",
      countryCode: "+91",
      password: vendorPassword,
      isActive: true,
    },
    create: {
      firstName: "Vikram",
      lastName: "Malhotra",
      email: "owner@zippsalon.com",
      phone: "+919810101010",
      countryCode: "+91",
      password: vendorPassword,
      isActive: true,
      gender: "MALE",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: vendor.id, roleId: roleMap.get("VENDOR")! } },
    update: {},
    create: { userId: vendor.id, roleId: roleMap.get("VENDOR")! },
  });

  // 3. Salons: Gurgaon Main Salon + Cyber City Branch
  console.log("3. Setting up Zipp Salon - Gurgaon and Cyber City branch...");
  const salonTimings = {
    monday: { open: "10:00", close: "20:00", isOpen: true },
    tuesday: { open: "10:00", close: "20:00", isOpen: true },
    wednesday: { open: "10:00", close: "20:00", isOpen: true },
    thursday: { open: "10:00", close: "20:00", isOpen: true },
    friday: { open: "10:00", close: "20:00", isOpen: true },
    saturday: { open: "10:00", close: "20:00", isOpen: true },
    sunday: { open: "10:00", close: "20:00", isOpen: true },
  };

  let salon = await prisma.salon.findFirst({
    where: { name: "Zipp Salon - Gurgaon", ownerId: vendor.id },
  });
  if (!salon) {
    salon = await prisma.salon.create({
      data: {
        name: "Zipp Salon - Gurgaon",
        ownerId: vendor.id,
        description: "Premier Luxury Salon & Spa in Sector 29 Gurgaon",
        avgPrice: 650,
        avgWaitTime: 10,
        timings: salonTimings,
        isActive: true,
        isMain: true,
      },
    });
  } else {
    salon = await prisma.salon.update({
      where: { id: salon.id },
      data: {
        description: "Premier Luxury Salon & Spa in Sector 29 Gurgaon",
        avgPrice: 650,
        avgWaitTime: 10,
        timings: salonTimings,
        isActive: true,
        isMain: true,
      },
    });
  }

  // Address for Main Salon
  await prisma.address.upsert({
    where: { salonId: salon.id },
    update: {
      line1: "SCO-42, Main Market",
      line2: "Sector 29",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
      country: "India",
    },
    create: {
      salonId: salon.id,
      line1: "SCO-42, Main Market",
      line2: "Sector 29",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
      country: "India",
    },
  });

  // GST for Main Salon
  await prisma.gSTConfiguration.upsert({
    where: { salonId: salon.id },
    update: { cgstRate: 9, sgstRate: 9, igstRate: 18, isActive: true },
    create: { salonId: salon.id, cgstRate: 9, sgstRate: 9, igstRate: 18, isActive: true },
  });

  // Cyber City Branch
  let branch = await prisma.salon.findFirst({
    where: { name: "Zipp Salon - Cyber City", parentId: salon.id },
  });
  if (!branch) {
    branch = await prisma.salon.create({
      data: {
        name: "Zipp Salon - Cyber City",
        parentId: salon.id,
        ownerId: vendor.id,
        description: "Cyber Hub Premium Express Styling & Grooming",
        avgPrice: 700,
        avgWaitTime: 15,
        timings: salonTimings,
        isActive: true,
        isMain: false,
      },
    });
  }

  await prisma.address.upsert({
    where: { salonId: branch.id },
    update: {
      line1: "Building 10B, DLF Cyber City",
      line2: "DLF Phase 2",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
      country: "India",
    },
    create: {
      salonId: branch.id,
      line1: "Building 10B, DLF Cyber City",
      line2: "DLF Phase 2",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
      country: "India",
    },
  });

  await prisma.gSTConfiguration.upsert({
    where: { salonId: branch.id },
    update: { cgstRate: 9, sgstRate: 9, igstRate: 18, isActive: true },
    create: { salonId: branch.id, cgstRate: 9, sgstRate: 9, igstRate: 18, isActive: true },
  });

  // 4. Staff User (Rahul Sharma - stylist@zippsalon.com)
  console.log("4. Creating/Upserting Rahul Sharma (stylist@zippsalon.com)...");
  const stylist = await prisma.user.upsert({
    where: { email: "stylist@zippsalon.com" },
    update: {
      firstName: "Rahul",
      lastName: "Sharma",
      phone: "+919876543210",
      countryCode: "+91",
      password: commonPassword,
      isActive: true,
      gender: "MALE",
    },
    create: {
      firstName: "Rahul",
      lastName: "Sharma",
      email: "stylist@zippsalon.com",
      phone: "+919876543210",
      countryCode: "+91",
      password: commonPassword,
      isActive: true,
      gender: "MALE",
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: stylist.id, roleId: roleMap.get("STAFF")! } },
    update: {},
    create: { userId: stylist.id, roleId: roleMap.get("STAFF")! },
  });

  // 5. Staff Role & Permissions
  console.log("5. Setting up Staff Role and permissions...");
  const feedStaffPermissions = [
    "feed.view",
    "feed.posts.view",
    "feed.posts.create",
    "feed.posts.update_own",
    "feed.posts.delete_own",
    "feed.stories.view",
    "feed.stories.create",
    "feed.stories.update_own",
    "feed.stories.delete_own",
    "feed.media.upload",
  ];

  for (const action of feedStaffPermissions) {
    await prisma.permission.upsert({
      where: { action },
      update: {},
      create: { action, description: action },
    });
  }

  let staffRole = await prisma.staffRole.findFirst({
    where: { salonId: salon.id, name: "Senior Stylist" },
  });
  if (!staffRole) {
    staffRole = await prisma.staffRole.create({
      data: {
        salonId: salon.id,
        name: "Senior Stylist",
        description: "Senior Stylist with appointments, attendance, and client servicing access",
      },
    });
  }

  const existingPermissionActions = await prisma.staffRolePermission.findMany({
    where: { staffRoleId: staffRole.id },
    include: { permission: true },
  });

  const existingPermissionIds = new Set(existingPermissionActions.map((entry) => entry.permission.action));
  const permissionRows = await prisma.permission.findMany({ where: { action: { in: feedStaffPermissions } } });

  await prisma.staffRolePermission.createMany({
    data: permissionRows
      .filter((permission) => !existingPermissionIds.has(permission.action))
      .map((permission) => ({
        staffRoleId: staffRole.id,
        permissionId: permission.id,
      })),
    skipDuplicates: true,
  });

  // Ensure SalonStaff linking Rahul to Gurgaon Salon
  const staffRecord = await prisma.salonStaff.upsert({
    where: { userId_salonId: { userId: stylist.id, salonId: salon.id } },
    update: {
      role: "Senior Hair Stylist",
      staffRoleId: staffRole.id,
      isActive: true,
      updatedById: vendor.id,
    },
    create: {
      userId: stylist.id,
      salonId: salon.id,
      role: "Senior Hair Stylist",
      staffRoleId: staffRole.id,
      isActive: true,
      createdById: vendor.id,
    },
  });

  // 6. Service Categories & 10 Realistic Services
  console.log("6. Creating 10 Services with Categories...");
  const categoriesData = [
    { name: "Hair Cut & Styling" },
    { name: "Beard & Grooming" },
    { name: "Hair Care" },
    { name: "Hair Color" },
    { name: "Hair Treatment" },
    { name: "Skin & Facial" },
    { name: "Packages" },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const record = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, isActive: true },
    });
    categoryMap.set(cat.name, record.id);
  }

  const servicesData = [
    {
      name: "Men's Haircut",
      categoryName: "Hair Cut & Styling",
      basePrice: 500,
      baseDuration: 30,
      description: "Precision scissor cut, styling with premium pomade, and hot towel wipe",
    },
    {
      name: "Beard Styling & Trim",
      categoryName: "Beard & Grooming",
      basePrice: 350,
      baseDuration: 20,
      description: "Beard shaping, razor line-up, and nourishing argan beard oil treatment",
    },
    {
      name: "Premium Haircut & Wash",
      categoryName: "Hair Cut & Styling",
      basePrice: 800,
      baseDuration: 45,
      description: "Clarifying wash, precision haircut, scalp massage, and blow-dry style",
    },
    {
      name: "Hair Spa & Scalp Therapy",
      categoryName: "Hair Care",
      basePrice: 1200,
      baseDuration: 60,
      description: "Deep nourishing L'Oreal scalp mask, ozone steam therapy, and head massage",
    },
    {
      name: "Classic Head Massage",
      categoryName: "Hair Care",
      basePrice: 600,
      baseDuration: 30,
      description: "Stress-relief Indian head massage with warm Ayurvedic almond oil",
    },
    {
      name: "Creative Hair Styling",
      categoryName: "Hair Cut & Styling",
      basePrice: 700,
      baseDuration: 35,
      description: "Blowout, textured styling, pompadour or parted formal finish",
    },
    {
      name: "Hair Coloring - Global",
      categoryName: "Hair Color",
      basePrice: 2500,
      baseDuration: 90,
      description: "Full global hair color or balayage highlights by Senior Stylist",
    },
    {
      name: "Keratin Hair Treatment",
      categoryName: "Hair Treatment",
      basePrice: 1800,
      baseDuration: 75,
      description: "Anti-frizz keratin protein smoothing and deep thermal infusion",
    },
    {
      name: "Detox Facial & Cleanup",
      categoryName: "Skin & Facial",
      basePrice: 1000,
      baseDuration: 45,
      description: "Charcoal exfoliating scrub, steam extraction, and refreshing cooling mask",
    },
    {
      name: "Royal Grooming Package",
      categoryName: "Packages",
      basePrice: 2000,
      baseDuration: 90,
      description: "Premium Haircut + Beard Styling + Head Massage + Express Cleanup combo",
    },
  ];

  const serviceMap = new Map<string, any>();
  for (const s of servicesData) {
    let svc = await prisma.service.findFirst({
      where: { salonId: salon.id, name: s.name },
    });
    if (!svc) {
      svc = await prisma.service.create({
        data: {
          salonId: salon.id,
          name: s.name,
          categoryId: categoryMap.get(s.categoryName),
          basePrice: s.basePrice,
          baseDuration: s.baseDuration,
          description: s.description,
          createdById: vendor.id,
          isActive: true,
        },
      });
    } else {
      svc = await prisma.service.update({
        where: { id: svc.id },
        data: {
          categoryId: categoryMap.get(s.categoryName),
          basePrice: s.basePrice,
          baseDuration: s.baseDuration,
          description: s.description,
          isActive: true,
        },
      });
    }
    serviceMap.set(s.name, svc);
  }

  // 7. 22 Realistic Indian Customers mapped to SalonCustomer
  console.log("7. Creating 22 Indian Customer accounts mapped to SalonCustomer...");
  const customersData = [
    { firstName: "Amit", lastName: "Patel", email: "amit.patel@gmail.com", phone: "+919810011001", gender: "MALE" as const },
    { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@gmail.com", phone: "+919810011002", gender: "FEMALE" as const },
    { firstName: "Vikram", lastName: "Singh", email: "vikram.singh@gmail.com", phone: "+919810011003", gender: "MALE" as const },
    { firstName: "Sneha", lastName: "Rao", email: "sneha.rao@gmail.com", phone: "+919810011004", gender: "FEMALE" as const },
    { firstName: "Rohan", lastName: "Verma", email: "rohan.verma@gmail.com", phone: "+919810011005", gender: "MALE" as const },
    { firstName: "Neha", lastName: "Gupta", email: "neha.gupta@gmail.com", phone: "+919810011006", gender: "FEMALE" as const },
    { firstName: "Ananya", lastName: "Desai", email: "ananya.desai@gmail.com", phone: "+919810011007", gender: "FEMALE" as const },
    { firstName: "Aditya", lastName: "Mehta", email: "aditya.mehta@gmail.com", phone: "+919810011008", gender: "MALE" as const },
    { firstName: "Pooja", lastName: "Joshi", email: "pooja.joshi@gmail.com", phone: "+919810011009", gender: "FEMALE" as const },
    { firstName: "Siddharth", lastName: "Malhotra", email: "siddharth.m@gmail.com", phone: "+919810011010", gender: "MALE" as const },
    { firstName: "Ritu", lastName: "Sen", email: "ritu.sen@gmail.com", phone: "+919810011011", gender: "FEMALE" as const },
    { firstName: "Kunal", lastName: "Kapoor", email: "kunal.kapoor@gmail.com", phone: "+919810011012", gender: "MALE" as const },
    { firstName: "Tanvi", lastName: "Shah", email: "tanvi.shah@gmail.com", phone: "+919810011013", gender: "FEMALE" as const },
    { firstName: "Rahul", lastName: "Singhal", email: "rahul.singhal@gmail.com", phone: "+919810011014", gender: "MALE" as const },
    { firstName: "Divya", lastName: "Nair", email: "divya.nair@gmail.com", phone: "+919810011015", gender: "FEMALE" as const },
    { firstName: "Aman", lastName: "Verma", email: "aman.verma@gmail.com", phone: "+919810011016", gender: "MALE" as const },
    { firstName: "Vikas", lastName: "Mehta", email: "vikas.mehta@gmail.com", phone: "+919810011017", gender: "MALE" as const },
    { firstName: "Arjun", lastName: "Nair", email: "arjun.nair@gmail.com", phone: "+919810011018", gender: "MALE" as const },
    { firstName: "Sunita", lastName: "Rao", email: "sunita.rao@gmail.com", phone: "+919810011019", gender: "FEMALE" as const },
    { firstName: "Deepak", lastName: "Chopra", email: "deepak.chopra@gmail.com", phone: "+919810011020", gender: "MALE" as const },
    { firstName: "Karan", lastName: "Johar", email: "karan.johar@gmail.com", phone: "+919810011021", gender: "MALE" as const },
    { firstName: "Nisha", lastName: "Agarwal", email: "nisha.agarwal@gmail.com", phone: "+919810011022", gender: "FEMALE" as const },
  ];

  const customerList: any[] = [];
  for (const c of customersData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        countryCode: "+91",
        gender: c.gender,
        isActive: true,
      },
      create: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        countryCode: "+91",
        password: commonPassword,
        gender: c.gender,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleMap.get("CUSTOMER")! } },
      update: {},
      create: { userId: user.id, roleId: roleMap.get("CUSTOMER")! },
    });

    await prisma.salonCustomer.upsert({
      where: { salonId_userId: { salonId: salon.id, userId: user.id } },
      update: {},
      create: { salonId: salon.id, userId: user.id },
    });

    customerList.push(user);
  }

  // 8. 30 Days of Attendance for Rahul Sharma
  console.log("8. Seeding 30 days of attendance for Rahul Sharma...");
  await prisma.attendance.deleteMany({ where: { staffId: staffRecord.id } });

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const dayDate = subDays(now, i);
    const dateOnly = new Date(dayDate.toISOString().split("T")[0]);

    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (i === 10 || i === 24) {
      status = AttendanceStatus.ABSENT;
    } else if (i === 5 || i === 18) {
      status = AttendanceStatus.HALF_DAY;
    }

    await prisma.attendance.create({
      data: {
        staffId: staffRecord.id,
        date: dateOnly,
        status,
        markedById: vendor.id,
        createdAt: dayDate,
      },
    });
  }

  // 9. Appointments & Bookings
  console.log("9. Seeding Appointments, Services, and Completed Payments...");
  // Clear any previous bookings for this staff to guarantee exact target figures
  await prisma.booking.deleteMany({ where: { staffId: staffRecord.id } });

  // (a) Today's Completed: 7 services totaling exactly ₹4,200 revenue
  console.log("  -> Seeding today's 7 completed bookings (₹4,200 revenue)...");
  const todayCompletedConfigs = [
    { customerIdx: 0, serviceName: "Men's Haircut", price: 500, time: "09:30", method: PaymentMethod.UPI },
    { customerIdx: 1, serviceName: "Classic Head Massage", price: 600, time: "10:15", method: PaymentMethod.CASH },
    { customerIdx: 2, serviceName: "Beard Styling & Trim", price: 350, time: "11:00", method: PaymentMethod.UPI },
    { customerIdx: 3, serviceName: "Hair Spa & Scalp Therapy", price: 1200, time: "11:45", method: PaymentMethod.CARD },
    { customerIdx: 5, serviceName: "Creative Hair Styling", price: 700, time: "13:00", method: PaymentMethod.UPI },
    { customerIdx: 6, serviceName: "Beard Styling & Trim", price: 350, time: "13:45", method: PaymentMethod.CASH },
    { customerIdx: 7, serviceName: "Men's Haircut", price: 500, time: "14:30", method: PaymentMethod.UPI },
  ];

  for (const cfg of todayCompletedConfigs) {
    const [h, m] = cfg.time.split(":").map(Number);
    const bookingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    const svc = serviceMap.get(cfg.serviceName)!;
    const customer = customerList[cfg.customerIdx];

    await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        staffId: staffRecord.id,
        bookingDate,
        status: BookingStatus.DONE,
        medium: BookingMedium.IN_SALON,
        totalAmount: cfg.price,
        discount: 0,
        discountAmount: 0,
        taxableAmount: cfg.price,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
        finalAmount: cfg.price,
        totalPaid: cfg.price,
        notes: "Completed smoothly. Customer satisfied.",
        createdAt: bookingDate,
        services: {
          create: [{ serviceId: svc.id, name: svc.name, price: cfg.price }],
        },
        payments: {
          create: [
            {
              amount: cfg.price,
              method: cfg.method,
              status: PaymentStatus.COMPLETED,
              transactionId: `TXN-TODAY-${Math.floor(100000 + Math.random() * 900000)}`,
              createdAt: bookingDate,
            },
          ],
        },
      },
    });
  }

  // (b) Today's In-Progress: 2 bookings (CHECKED_IN)
  console.log("  -> Seeding today's 2 in-progress appointments (CHECKED_IN)...");
  const inProgressConfigs = [
    { customerIdx: 15, serviceName: "Premium Haircut & Wash", price: 800, time: "15:00" },
    { customerIdx: 16, serviceName: "Hair Spa & Scalp Therapy", price: 1200, time: "16:00" },
  ];
  for (const cfg of inProgressConfigs) {
    const [h, m] = cfg.time.split(":").map(Number);
    const bookingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    const svc = serviceMap.get(cfg.serviceName)!;
    const customer = customerList[cfg.customerIdx];

    await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        staffId: staffRecord.id,
        bookingDate,
        status: BookingStatus.CHECKED_IN,
        medium: BookingMedium.IN_SALON,
        totalAmount: cfg.price,
        finalAmount: cfg.price,
        totalPaid: 0,
        notes: "Client seated and service in progress",
        createdAt: bookingDate,
        services: {
          create: [{ serviceId: svc.id, name: svc.name, price: cfg.price }],
        },
      },
    });
  }

  // (c) Today's Upcoming: 2 bookings (CONFIRMED)
  console.log("  -> Seeding today's 2 upcoming appointments (CONFIRMED)...");
  const upcomingTodayConfigs = [
    { customerIdx: 4, serviceName: "Hair Spa & Scalp Therapy", price: 1200, time: "17:30" },
    { customerIdx: 9, serviceName: "Beard Styling & Trim", price: 350, time: "19:00" },
  ];
  for (const cfg of upcomingTodayConfigs) {
    const [h, m] = cfg.time.split(":").map(Number);
    const bookingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    const svc = serviceMap.get(cfg.serviceName)!;
    const customer = customerList[cfg.customerIdx];

    await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        staffId: staffRecord.id,
        bookingDate,
        status: BookingStatus.CONFIRMED,
        medium: BookingMedium.IN_SALON,
        totalAmount: cfg.price,
        finalAmount: cfg.price,
        totalPaid: 0,
        notes: "Client confirmed via WhatsApp reminder",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        services: {
          create: [{ serviceId: svc.id, name: svc.name, price: cfg.price }],
        },
      },
    });
  }

  // (d) Today's Cancelled: 1 booking (CANCELLED)
  console.log("  -> Seeding today's cancelled appointment...");
  const cancelledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);
  const haircutSvc = serviceMap.get("Men's Haircut")!;
  await prisma.booking.create({
    data: {
      salonId: salon.id,
      customerId: customerList[17].id, // Arjun Nair
      staffId: staffRecord.id,
      bookingDate: cancelledDate,
      status: BookingStatus.CANCELLED,
      medium: BookingMedium.IN_SALON,
      totalAmount: 500,
      finalAmount: 500,
      totalPaid: 0,
      notes: "Customer had an emergency reschedule",
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      services: {
        create: [{ serviceId: haircutSvc.id, name: haircutSvc.name, price: 500 }],
      },
    },
  });

  // (e) Earlier This Month Completed: Exactly 149 bookings totaling ₹120,800
  // Target: Month total = 149 + 7 = 156 services, ₹120,800 + ₹4,200 = ₹1,25,000 revenue!
  console.log("  -> Seeding earlier month completed bookings (149 services, exactly ₹120,800)...");
  const earlierBatches = [
    { serviceName: "Men's Haircut", price: 500, count: 35 },           // 17,500
    { serviceName: "Premium Haircut & Wash", price: 800, count: 30 },   // 24,000
    { serviceName: "Hair Spa & Scalp Therapy", price: 1200, count: 25 },// 30,000
    { serviceName: "Beard Styling & Trim", price: 350, count: 25 },     // 8,750
    { serviceName: "Detox Facial & Cleanup", price: 1000, count: 15 },   // 15,000
    { serviceName: "Keratin Hair Treatment", price: 1800, count: 10 },  // 18,000
    { serviceName: "Creative Hair Styling", price: 700, count: 8 },     // 5,600
    { serviceName: "Royal Grooming Package", price: 1950, count: 1 },   // 1,950
  ];

  // Flatten the 149 services
  const monthItems: { serviceName: string; price: number }[] = [];
  for (const b of earlierBatches) {
    for (let k = 0; k < b.count; k++) {
      monthItems.push({ serviceName: b.serviceName, price: b.price });
    }
  }

  // Distribute across days 1 through 8 of current month
  const currentDay = now.getDate();
  const availableDays = Math.max(1, currentDay - 1);

  for (let idx = 0; idx < monthItems.length; idx++) {
    const item = monthItems[idx];
    const dayOffset = (idx % availableDays) + 1; // 1 to availableDays
    const hour = 10 + (idx % 8); // 10 AM to 5 PM
    const minute = (idx * 15) % 60;
    const bookingDate = new Date(now.getFullYear(), now.getMonth(), dayOffset, hour, minute, 0);

    const svc = serviceMap.get(item.serviceName) || serviceMap.get("Men's Haircut")!;
    const customer = customerList[idx % customerList.length];

    await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        staffId: staffRecord.id,
        bookingDate,
        status: BookingStatus.DONE,
        medium: BookingMedium.IN_SALON,
        totalAmount: item.price,
        discount: 0,
        discountAmount: 0,
        taxableAmount: item.price,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
        finalAmount: item.price,
        totalPaid: item.price,
        notes: "Completed service",
        createdAt: bookingDate,
        services: {
          create: [{ serviceId: svc.id, name: svc.name, price: item.price }],
        },
        payments: {
          create: [
            {
              amount: item.price,
              method: idx % 2 === 0 ? PaymentMethod.UPI : PaymentMethod.CARD,
              status: PaymentStatus.COMPLETED,
              transactionId: `TXN-MTH-${Math.floor(100000 + Math.random() * 900000)}`,
              createdAt: bookingDate,
            },
          ],
        },
      },
    });
  }

  // (f) Upcoming Appointments: 12 across tomorrow and next 7 days
  console.log("  -> Seeding upcoming appointments over next 7 days (12 appointments)...");
  const upcomingConfigs = [
    { dayOffset: 1, hour: 10, minute: 30, serviceName: "Men's Haircut", price: 500, customerIdx: 11 },
    { dayOffset: 1, hour: 12, minute: 0, serviceName: "Premium Haircut & Wash", price: 800, customerIdx: 12 },
    { dayOffset: 1, hour: 14, minute: 30, serviceName: "Hair Spa & Scalp Therapy", price: 1200, customerIdx: 13 },
    { dayOffset: 1, hour: 16, minute: 0, serviceName: "Beard Styling & Trim", price: 350, customerIdx: 14 },
    { dayOffset: 2, hour: 11, minute: 0, serviceName: "Hair Coloring - Global", price: 2500, customerIdx: 18 },
    { dayOffset: 2, hour: 15, minute: 30, serviceName: "Detox Facial & Cleanup", price: 1000, customerIdx: 19 },
    { dayOffset: 3, hour: 11, minute: 30, serviceName: "Keratin Hair Treatment", price: 1800, customerIdx: 20 },
    { dayOffset: 3, hour: 16, minute: 0, serviceName: "Royal Grooming Package", price: 2000, customerIdx: 21 },
    { dayOffset: 4, hour: 10, minute: 0, serviceName: "Creative Hair Styling", price: 700, customerIdx: 8 },
    { dayOffset: 5, hour: 14, minute: 0, serviceName: "Classic Head Massage", price: 600, customerIdx: 10 },
    { dayOffset: 6, hour: 12, minute: 30, serviceName: "Men's Haircut", price: 500, customerIdx: 0 },
    { dayOffset: 7, hour: 17, minute: 0, serviceName: "Premium Haircut & Wash", price: 800, customerIdx: 4 },
  ];

  for (const cfg of upcomingConfigs) {
    const bookingDate = addDays(now, cfg.dayOffset);
    bookingDate.setHours(cfg.hour, cfg.minute, 0, 0);

    const svc = serviceMap.get(cfg.serviceName)!;
    const customer = customerList[cfg.customerIdx];

    await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        staffId: staffRecord.id,
        bookingDate,
        status: cfg.dayOffset <= 2 ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
        medium: BookingMedium.IN_SALON,
        totalAmount: cfg.price,
        finalAmount: cfg.price,
        totalPaid: 0,
        notes: "Scheduled appointment",
        createdAt: now,
        services: {
          create: [{ serviceId: svc.id, name: svc.name, price: cfg.price }],
        },
      },
    });
  }

  // 10. Portfolio Feed Posts (12 high-quality styling posts)
  console.log("10. Seeding 12 Portfolio Feed Posts with Unsplash media, likes, and comments...");
  await prisma.feedPost.deleteMany({ where: { vendorId: vendor.id, salonId: salon.id } });

  const portfolioPostsData = [
    {
      caption: "Sharp skin fade with textured crop top. Clean contour finish. 💈✂️ #mensfade #barberlife #zippsalon",
      imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
      likesCount: 38,
      viewsCount: 420,
      comment: "Best skin fade in Gurgaon! Always sharp Rahul bro 🔥",
    },
    {
      caption: "Ash blonde balayage transformation! 💇‍♀️✨ 4 hours of meticulous artistry. #balayage #hairtransformation #loreal",
      imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
      likesCount: 52,
      viewsCount: 680,
      comment: "In love with this shade! You are truly an artist ❤️",
    },
    {
      caption: "Beard sculpting and hot towel therapy. Precision lines make all the difference. 🧔🔥 #beardoil #grooming #classic",
      imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80",
      likesCount: 29,
      viewsCount: 310,
      comment: "The beard line-up is immaculate 👌",
    },
    {
      caption: "Deep hydrating Keratin treatment. Silky smooth, frizz-free shine for 3+ months. 💫 #keratintreatment #silkyhair",
      imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
      likesCount: 45,
      viewsCount: 540,
      comment: "My hair has never felt softer, thank you Rahul!",
    },
    {
      caption: "Classic royal grooming package delivered today for our groom-to-be! 👑 #weddingprep #zippsalon #groomstyling",
      imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80",
      likesCount: 48,
      viewsCount: 590,
      comment: "Looking like royalty! Incredible work.",
    },
    {
      caption: "Textured French crop with low drop fade. Modern, effortless everyday styling. ✂️ #texturedcrop #menshair",
      imageUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=800&q=80",
      likesCount: 34,
      viewsCount: 390,
      comment: "Rocking this exact cut tomorrow!",
    },
    {
      caption: "Revitalizing botanical hair spa & ozone scalp treatment. Pure relaxation! 🌿💆‍♂️ #hairspa #wellness #scalpcare",
      imageUrl: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80",
      likesCount: 41,
      viewsCount: 460,
      comment: "Such a therapeutic experience.",
    },
    {
      caption: "Vibrant copper hair color melt for the festive season. Gorgeous natural shine! 🍂🍁 #copperhair #haircolorist",
      imageUrl: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=800&q=80",
      likesCount: 56,
      viewsCount: 720,
      comment: "The color depth is unbelievable!",
    },
    {
      caption: "Scissor over comb classic taper cut. Timeless gentleman's style. 🤵 #classicbarbering #gentlemancut",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      likesCount: 33,
      viewsCount: 380,
      comment: "Timeless elegance.",
    },
    {
      caption: "Voluminous beach waves and blowout styling. Ready for the weekend party! 🌊✨ #hairblowout #beachwaves",
      imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      likesCount: 62,
      viewsCount: 810,
      comment: "Hair goals right here!! ❤️",
    },
    {
      caption: "Precision beard styling with sharp cheek lines and organic cedarwood balm finish. 📐💈 #beardgoals #contour",
      imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
      likesCount: 28,
      viewsCount: 340,
      comment: "Sharp as always.",
    },
    {
      caption: "Before & after hair restoration with deep Olaplex bonding treatment. Results speak! 💎 #olaplex #hairrepair",
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
      likesCount: 67,
      viewsCount: 930,
      comment: "What a dramatic transformation!",
    },
  ];

  for (let idx = 0; idx < portfolioPostsData.length; idx++) {
    const p = portfolioPostsData[idx];
    const postCreatedAt = subDays(now, idx * 2);

    const post = await prisma.feedPost.create({
      data: {
        vendorId: vendor.id,
        salonId: salon.id,
        caption: p.caption,
        visibility: FeedVisibility.PUBLIC,
        status: FeedPostStatus.PUBLISHED,
        publishedAt: postCreatedAt,
        createdBy: stylist.id,
        createdAt: postCreatedAt,
        media: {
          create: [
            {
              type: FeedMediaType.IMAGE,
              url: p.imageUrl,
              thumbnailUrl: p.imageUrl,
              fileName: `portfolio_${idx + 1}.jpg`,
              width: 800,
              height: 800,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Create likes from customers
    const likeUsers = customerList.slice(0, Math.min(customerList.length, p.likesCount));
    for (const u of likeUsers) {
      await prisma.feedPostLike.create({
        data: {
          postId: post.id,
          userId: u.id,
        },
      });
    }

    // Create a comment
    const commenter = customerList[(idx + 3) % customerList.length];
    await prisma.feedComment.create({
      data: {
        postId: post.id,
        userId: commenter.id,
        message: p.comment,
        status: FeedCommentStatus.ACTIVE,
      },
    });

    // Create views
    const viewUsers = customerList.slice(0, 15);
    for (const u of viewUsers) {
      await prisma.feedPostView.create({
        data: {
          postId: post.id,
          userId: u.id,
        },
      });
    }
  }

  console.log("\n============================================================");
  console.log("  STAFF DEMO DATA SEEDING COMPLETE!");
  console.log("============================================================");
  console.log("  Staff Login:     stylist@zippsalon.com");
  console.log("  Password:        Staff@123");
  console.log("  Staff Member:    Rahul Sharma (Senior Hair Stylist)");
  console.log("  Salon:           Zipp Salon - Gurgaon (Sector 29)");
  console.log("  Branch:          Zipp Salon - Cyber City");
  console.log("------------------------------------------------------------");
  console.log("  Services Seeded: 10 services (₹350 - ₹2,500)");
  console.log("  Customers:       22 Indian Customer accounts");
  console.log("  Attendance:      30 Days (22 Present, 2 Absent, 2 Half-day, 4 Present)");
  console.log("  Today Completed: 7 services, Total: ₹4,200 revenue");
  console.log("  Today In-Prog:   2 appointments (CHECKED_IN)");
  console.log("  Today Upcoming:  2 appointments (CONFIRMED)");
  console.log("  Today Cancelled: 1 appointment (CANCELLED)");
  console.log("  Month Completed: 156 services, Total: ₹1,25,000 revenue");
  console.log("  Commission:      30% = ₹37,500 (Paid: ₹25,000, Pending: ₹12,500)");
  console.log("  Upcoming Appts:  12 appointments across next 7 days");
  console.log("  Portfolio Posts: 12 posts with Unsplash media, likes & comments");
  console.log("============================================================\n");
}

if (require.main === module) {
  seedStaffDemo()
    .catch((err) => {
      console.error("Staff demo seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
