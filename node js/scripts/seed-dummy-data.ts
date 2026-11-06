import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, FeedMediaType, FeedVisibility, FeedPostStatus, ProductType, ProductStatus, ListingStatus, InventoryEntityStatus, AttendanceStatus } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: Refusing to run seed:dummy in production environment!");
}

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("  SEEDING RICH DUMMY DATA FOR TESTING");
  console.log("  (Inventory, Feed, Stories, Customers, Bookings)");
  console.log("=================================================\n");

  const passwordHash = await bcrypt.hash("Admin@12345", 10);

  // 1. Ensure Roles
  const roles = await Promise.all(
    ["ADMIN", "VENDOR", "STAFF", "CUSTOMER"].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  // 2. Ensure Vendor/Owner and Salons exist
  let vendor = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "VENDOR" } } } },
  });

  if (!vendor) {
    vendor = await prisma.user.upsert({
      where: { email: "owner@example.test" },
      update: {},
      create: {
        firstName: "Salon",
        lastName: "Owner",
        email: "owner@example.test",
        phone: "+919810000002",
        countryCode: "+91",
        password: passwordHash,
      },
    });
    const vendorRoleId = roleMap.get("VENDOR")!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: vendor.id, roleId: vendorRoleId } },
      update: {},
      create: { userId: vendor.id, roleId: vendorRoleId },
    });
  }

  // Ensure Admin
  let admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN" } } } },
  });
  if (!admin) {
    admin = await prisma.user.upsert({
      where: { email: "admin@example.test" },
      update: {},
      create: {
        firstName: "System",
        lastName: "Admin",
        email: "admin@example.test",
        phone: "+919810000001",
        countryCode: "+91",
        password: passwordHash,
      },
    });
    const adminRoleId = roleMap.get("ADMIN")!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
      update: {},
      create: { userId: admin.id, roleId: adminRoleId },
    });
  }

  // Ensure Head Office Salon
  let salon = await prisma.salon.findFirst({ where: { parentId: null } });
  if (!salon) {
    salon = await prisma.salon.create({
      data: {
        name: "Luxe Glamour Salon HO",
        ownerId: vendor.id,
        description: "Flagship Luxury Salon & Academy",
        avgPrice: 550,
        avgWaitTime: 15,
        timings: {},
        isActive: true,
      },
    });
  }

  // Ensure Branch Salon
  let branch = await prisma.salon.findFirst({ where: { parentId: salon.id } });
  if (!branch) {
    branch = await prisma.salon.create({
      data: {
        name: "Luxe Glamour - Connaught Place",
        parentId: salon.id,
        ownerId: vendor.id,
        description: "Central Delhi branch outlet",
        avgPrice: 500,
        avgWaitTime: 15,
        timings: {},
        isActive: true,
      },
    });
  }

  // Ensure GST Config
  await prisma.gSTConfiguration.upsert({
    where: { salonId: salon.id },
    update: {},
    create: {
      salonId: salon.id,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      isActive: true,
    },
  });
  await prisma.gSTConfiguration.upsert({
    where: { salonId: branch.id },
    update: {},
    create: {
      salonId: branch.id,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      isActive: true,
    },
  });

  // -------------------------------------------------------------
  // 3. SEED INVENTORY: Categories, Brands, Products, Stocks
  // -------------------------------------------------------------
  console.log("1. Seeding Inventory Catalog (Categories, Brands, Products)...");

  const categoriesData = [
    { name: "Hair Care", slug: "hair-care", description: "Shampoos, conditioners, and treatment masks" },
    { name: "Skin Care", slug: "skin-care", description: "Facial cleansers, serums, and moisturisers" },
    { name: "Hair Styling", slug: "hair-styling", description: "Sprays, clays, waxes, and pomades" },
    { name: "Beard & Grooming", slug: "beard-grooming", description: "Oils, balms, and precision shaving creams" },
    { name: "Spa & Body", slug: "spa-body", description: "Essential oils, body scrubs, and massage creams" },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categoriesData) {
    const cat = await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        status: InventoryEntityStatus.ACTIVE,
        vendorId: vendor.id,
        salonId: salon.id,
      },
    });
    categoryMap.set(c.slug, cat.id);
  }

  const brandsData = [
    { name: "L'Oréal Professionnel", slug: "loreal-professionnel", description: "Parisian salon hair care & color" },
    { name: "Schwarzkopf Professional", slug: "schwarzkopf-professional", description: "German precision hair cosmetics" },
    { name: "Olaplex", slug: "olaplex", description: "Bond building hair repair technology" },
    { name: "Moroccanoil", slug: "moroccanoil", description: "Argan oil infused beauty formulas" },
    { name: "Forest Essentials", slug: "forest-essentials", description: "Luxurious Ayurvedic skincare & wellness" },
    { name: "Beardo", slug: "beardo", description: "Men's premium grooming and styling" },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.productBrand.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        status: InventoryEntityStatus.ACTIVE,
        vendorId: vendor.id,
        salonId: salon.id,
      },
    });
    brandMap.set(b.slug, brand.id);
  }

  const productsData = [
    {
      name: "L'Oréal Serie Expert Absolut Repair Shampoo",
      slug: "loreal-absolut-repair-shampoo",
      description: "Infused with gold quinoa and protein to resurface damaged hair without weighing it down.",
      shortDescription: "Damaged hair restructuring shampoo",
      categorySlug: "hair-care",
      brandSlug: "loreal-professionnel",
      gstRate: 18,
      hsnCode: "330510",
      variants: [
        { name: "300 ml", sku: "LOR-AR-SH-300", barcode: "890100010001", mrp: 750, costPrice: 450, sellingPrice: 699, qty: 18, reorder: 5 },
        { name: "500 ml", sku: "LOR-AR-SH-500", barcode: "890100010002", mrp: 1100, costPrice: 680, sellingPrice: 999, qty: 3, reorder: 8 }, // Low stock!
      ],
    },
    {
      name: "L'Oréal Serie Expert Absolut Repair Golden Hair Mask",
      slug: "loreal-absolut-repair-mask",
      description: "Intense nourishing mask for instantly restored, shiny and soft hair.",
      shortDescription: "Restructuring golden treatment mask",
      categorySlug: "hair-care",
      brandSlug: "loreal-professionnel",
      gstRate: 18,
      hsnCode: "330590",
      variants: [
        { name: "250 ml", sku: "LOR-AR-MSK-250", barcode: "890100010003", mrp: 950, costPrice: 580, sellingPrice: 880, qty: 12, reorder: 4 },
      ],
    },
    {
      name: "Olaplex No. 3 Hair Perfector",
      slug: "olaplex-no-3-hair-perfector",
      description: "Global best-selling at-home treatment that reduces breakage and visibly strengthens hair.",
      shortDescription: "Bond building treatment",
      categorySlug: "hair-care",
      brandSlug: "olaplex",
      gstRate: 18,
      hsnCode: "330590",
      variants: [
        { name: "100 ml", sku: "OLA-NO3-100", barcode: "890100020001", mrp: 2950, costPrice: 1800, sellingPrice: 2800, qty: 15, reorder: 5 },
        { name: "250 ml", sku: "OLA-NO3-250", barcode: "890100020002", mrp: 5500, costPrice: 3400, sellingPrice: 5200, qty: 2, reorder: 4 }, // Low stock!
      ],
    },
    {
      name: "Moroccanoil Treatment Original",
      slug: "moroccanoil-treatment-original",
      description: "The pioneering argan oil formula that conditions, styles and finishes hair with brilliant shine.",
      shortDescription: "Argan oil hair treatment",
      categorySlug: "hair-styling",
      brandSlug: "moroccanoil",
      gstRate: 18,
      hsnCode: "330590",
      variants: [
        { name: "50 ml", sku: "MOR-TRT-050", barcode: "890100030001", mrp: 2250, costPrice: 1350, sellingPrice: 2100, qty: 20, reorder: 5 },
        { name: "100 ml", sku: "MOR-TRT-100", barcode: "890100030002", mrp: 3800, costPrice: 2300, sellingPrice: 3500, qty: 10, reorder: 3 },
      ],
    },
    {
      name: "Forest Essentials Tejasvi Facial Emulsion",
      slug: "forest-essentials-tejasvi-emulsion",
      description: "Infused with pure cow's Ghee and precious herbs to boost collagen and natural radiance.",
      shortDescription: "Ayurvedic brightening face emulsion",
      categorySlug: "skin-care",
      brandSlug: "forest-essentials",
      gstRate: 18,
      hsnCode: "330499",
      variants: [
        { name: "50 g", sku: "FE-TEJ-050", barcode: "890100040001", mrp: 3450, costPrice: 2100, sellingPrice: 3300, qty: 8, reorder: 2 },
      ],
    },
    {
      name: "Beardo Godfather Beard Oil & Softener",
      slug: "beardo-godfather-oil",
      description: "Non-greasy nourishing beard oil enriched with almond oil and Vitamin E.",
      shortDescription: "Premium beard grooming oil",
      categorySlug: "beard-grooming",
      brandSlug: "beardo",
      gstRate: 18,
      hsnCode: "330590",
      variants: [
        { name: "30 ml", sku: "BRD-GDF-030", barcode: "890100050001", mrp: 450, costPrice: 220, sellingPrice: 399, qty: 35, reorder: 10 },
      ],
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        categoryId: categoryMap.get(p.categorySlug),
        brandId: brandMap.get(p.brandSlug),
        productType: ProductType.RETAIL,
        status: ProductStatus.ACTIVE,
        gstRate: p.gstRate,
        hsnCode: p.hsnCode,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          name: `${p.name} - ${v.name}`,
          sku: v.sku,
          barcode: v.barcode,
          mrp: v.mrp,
          costPrice: v.costPrice,
          sellingPrice: v.sellingPrice,
          status: ProductStatus.ACTIVE,
        },
      });

      // Create VendorProduct listing for the head office salon
      const vendorProduct = await prisma.vendorProduct.upsert({
        where: {
          vendorId_productId_salonId_branchId: {
            vendorId: vendor.id,
            productId: product.id,
            salonId: salon.id,
            branchId: branch.id,
          },
        },
        update: {},
        create: {
          vendorId: vendor.id,
          productId: product.id,
          salonId: salon.id,
          branchId: branch.id,
          vendorPrice: v.costPrice,
          sellingPrice: v.sellingPrice,
          discount: 5,
          isListed: true,
          listingStatus: ListingStatus.APPROVED,
        },
      });

      // Create InventoryStock record
      await prisma.inventoryStock.upsert({
        where: {
          vendorProductId_variantId_salonId_branchId: {
            vendorProductId: vendorProduct.id,
            variantId: variant.id,
            salonId: salon.id,
            branchId: branch.id,
          },
        },
        update: {},
        create: {
          vendorProductId: vendorProduct.id,
          variantId: variant.id,
          salonId: salon.id,
          branchId: branch.id,
          quantity: v.qty,
          reservedQuantity: 0,
          reorderLevel: v.reorder,
        },
      });
    }
  }

  console.log("  -> Seeded 5 Categories, 6 Brands, 6 Products, 9 Variants, and Stocks with Low-Stock alerts.");

  // -------------------------------------------------------------
  // 4. SEED CUSTOMERS
  // -------------------------------------------------------------
  console.log("\n2. Seeding Customers & Salon Mappings...");

  const customersList = [
    { firstName: "Aarav", lastName: "Mehta", email: "aarav.mehta@example.test", phone: "+919811010001", gender: "MALE" as const },
    { firstName: "Diya", lastName: "Kapoor", email: "diya.kapoor@example.test", phone: "+919811010002", gender: "FEMALE" as const },
    { firstName: "Ishaan", lastName: "Sharma", email: "ishaan.sharma@example.test", phone: "+919811010003", gender: "MALE" as const },
    { firstName: "Ananya", lastName: "Iyer", email: "ananya.iyer@example.test", phone: "+919811010004", gender: "FEMALE" as const },
    { firstName: "Rohan", lastName: "Verma", email: "rohan.verma@example.test", phone: "+919811010005", gender: "MALE" as const },
    { firstName: "Pooja", lastName: "Deshmukh", email: "pooja.d@example.test", phone: "+919811010006", gender: "FEMALE" as const },
    { firstName: "Kabir", lastName: "Bhatia", email: "kabir.bhatia@example.test", phone: "+919811010007", gender: "MALE" as const },
    { firstName: "Tara", lastName: "Nambiar", email: "tara.nambiar@example.test", phone: "+919811010008", gender: "FEMALE" as const },
  ];

  const customerRoleId = roleMap.get("CUSTOMER") || roleMap.get("USER")!;
  const seededCustomerUsers = [];

  for (const c of customersList) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        countryCode: "+91",
        password: passwordHash,
        gender: c.gender,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: customerRoleId } },
      update: {},
      create: { userId: user.id, roleId: customerRoleId },
    });

    // Map customer to salon & branch
    await prisma.salonCustomer.upsert({
      where: { salonId_userId: { salonId: salon.id, userId: user.id } },
      update: {},
      create: { salonId: salon.id, userId: user.id },
    });
    await prisma.salonCustomer.upsert({
      where: { salonId_userId: { salonId: branch.id, userId: user.id } },
      update: {},
      create: { salonId: branch.id, userId: user.id },
    });

    seededCustomerUsers.push(user);
  }

  console.log(`  -> Seeded ${seededCustomerUsers.length} Customers mapped to salons.`);

  // -------------------------------------------------------------
  // 3. SEED STAFF MEMBERS WITH GRANULAR ACCESS CONTROL LIMITS
  // -------------------------------------------------------------
  console.log("\n3. Seeding Staff Members with Granular Access Control Limits...");

  const staffPassword = "Staff@123";
  const staffPasswordHash = await bcrypt.hash(staffPassword, 10);
  const staffRoleId = roleMap.get("STAFF")!;

  const staffDefinitions = [
    {
      firstName: "Priya",
      lastName: "Sharma",
      email: "receptionist@zippsalon.com",
      phone: "+919820010001",
      password: staffPassword,
      title: "Front Desk Receptionist",
      roleName: "Front Desk Receptionist",
      roleDescription: "Front-desk reception: Client bookings, check-ins, customer management, walk-in inquiries. Forbidden from inventory and salon settings.",
      permissions: [
        "bookings.view",
        "bookings.create",
        "bookings.edit",
        "customers.view",
        "customers.create",
        "customers.edit",
        "attendance.view",
        "attendance.create",
        "services.view",
        "categories.view",
        "leads.view",
        "leads.create",
        "leads.edit",
      ],
      allowedSummary: "Bookings (View, Create, Edit), Customers (View, Create, Edit), Attendance, Services, Leads",
      deniedSummary: "Inventory (No access), Salon Settings, Staff Management, Role Management, Bookings (Delete forbidden)",
    },
    {
      firstName: "Vikram",
      lastName: "Malhotra",
      email: "stylist@zippsalon.com",
      phone: "+919820010002",
      password: staffPassword,
      title: "Senior Hair Stylist",
      roleName: "Senior Hair Stylist",
      roleDescription: "Salon floor specialist: Views assigned bookings, service recipes, logs attendance, publishes styling showcases to Feed. Forbidden from customer CRM and inventory.",
      permissions: [
        "bookings.view",
        "services.view",
        "categories.view",
        "attendance.view",
        "attendance.create",
        "feed.view",
        "feed.create",
        "feed.navbar",
        "feed.posts.view",
        "feed.posts.create",
        "feed.posts.update_own",
        "feed.posts.delete_own",
        "feed.stories.view",
        "feed.stories.create",
        "feed.stories.update_own",
        "feed.stories.delete_own",
        "feed.media.upload",
      ],
      allowedSummary: "Bookings (View Schedule), Services Menu, Attendance, Feed (View & Post Showcases)",
      deniedSummary: "Customer CRM (No access), Inventory (No access), Bookings (Create/Edit/Delete forbidden), Staff Admin",
    },
    {
      firstName: "Rahul",
      lastName: "Verma",
      email: "inventory@zippsalon.com",
      phone: "+919820010003",
      password: staffPassword,
      title: "Store & Inventory Manager",
      roleName: "Inventory Manager",
      roleDescription: "Back-office inventory specialist: Full product stock tracking, variant management, low-stock reorders. Forbidden from bookings and customer CRM.",
      permissions: [
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.navbar",
        "attendance.view",
        "attendance.create",
      ],
      allowedSummary: "Inventory (Full View, Create, Edit products & stocks), Low-Stock Tracking, Attendance",
      deniedSummary: "Bookings & Calendar (No access), Customer CRM (No access), Feed (No access), Staff Admin",
    },
    {
      firstName: "Ananya",
      lastName: "Joshi",
      email: "trainee@zippsalon.com",
      phone: "+919820010004",
      password: staffPassword,
      title: "Junior Apprentice",
      roleName: "Junior Apprentice",
      roleDescription: "Trainee assistant: View-only service price & treatment guides, clocking personal attendance. Strictly restricted from all operational and client data.",
      permissions: [
        "attendance.view",
        "attendance.create",
        "services.view",
        "categories.view",
      ],
      allowedSummary: "Attendance (View & Log personal attendance), Services Catalog (View-only for learning)",
      deniedSummary: "Bookings (Forbidden), Customers (Forbidden), Inventory (Forbidden), Feed (Forbidden), Staff Admin (Forbidden)",
    },
  ];

  const seededStaff = [];

  for (const item of staffDefinitions) {
    // 1. Create or update StaffRole for this salon
    let staffRole = await prisma.staffRole.findFirst({
      where: { salonId: salon.id, name: item.roleName },
    });

    if (!staffRole) {
      staffRole = await prisma.staffRole.create({
        data: {
          salonId: salon.id,
          name: item.roleName,
          description: item.roleDescription,
        },
      });
    } else {
      staffRole = await prisma.staffRole.update({
        where: { id: staffRole.id },
        data: { description: item.roleDescription },
      });
    }

    // 2. Set exact permissions for this StaffRole
    await prisma.staffRolePermission.deleteMany({
      where: { staffRoleId: staffRole.id },
    });

    for (const action of [...item.permissions, "staff_bank_details.view", "staff_bank_details.create", "staff_bank_details.update", "staff_bank_details.delete", "staff_bank_details.qr"]) {
      const perm = await prisma.permission.findUnique({ where: { action } });
      if (perm) {
        await prisma.staffRolePermission.create({
          data: {
            staffRoleId: staffRole.id,
            permissionId: perm.id,
          },
        });
      }
    }

    // 3. Create or update User with password
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.phone,
        password: staffPasswordHash,
        isActive: true,
      },
      create: {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        countryCode: "+91",
        password: staffPasswordHash,
        isActive: true,
      },
    });

    // 4. Assign system STAFF role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: staffRoleId } },
      update: {},
      create: { userId: user.id, roleId: staffRoleId },
    });

    // 5. Link to SalonStaff with staffRoleId
    const staffRecord = await prisma.salonStaff.upsert({
      where: { userId_salonId: { userId: user.id, salonId: salon.id } },
      update: {
        role: item.title,
        staffRoleId: staffRole.id,
        isActive: true,
      },
      create: {
        userId: user.id,
        salonId: salon.id,
        role: item.title,
        staffRoleId: staffRole.id,
        isActive: true,
        createdById: vendor.id,
      },
    });

    // Also link to branch
    await prisma.salonStaff.upsert({
      where: { userId_salonId: { userId: user.id, salonId: branch.id } },
      update: {
        role: item.title,
        staffRoleId: staffRole.id,
        isActive: true,
      },
      create: {
        userId: user.id,
        salonId: branch.id,
        role: item.title,
        staffRoleId: staffRole.id,
        isActive: true,
        createdById: vendor.id,
      },
    });

    // 6. Seed today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.attendance.upsert({
      where: { staffId_date: { staffId: staffRecord.id, date: today } },
      update: { status: AttendanceStatus.PRESENT },
      create: {
        staffId: staffRecord.id,
        date: today,
        status: AttendanceStatus.PRESENT,
        markedById: vendor.id,
      },
    });

    seededStaff.push({
      email: item.email,
      password: item.password,
      role: item.title,
      allowed: item.allowedSummary,
      denied: item.deniedSummary,
    });

    console.log(`  -> Staff [${item.title}]: ${item.email} | Password: ${item.password}`);
    console.log(`     Allowed: ${item.allowedSummary}`);
    console.log(`     Restricted: ${item.deniedSummary}`);
  }

  // -------------------------------------------------------------
  // 4. SEED FEED: Posts, Media, Likes, Comments, Stories
  // -------------------------------------------------------------
  console.log("\n4. Seeding Salon Feed & 24h Stories...");

  const feedPostsData = [
    {
      caption: "✨ Fresh Sun-Kissed Balayage & Blowout! Crafted with L'Oreal Serie Expert care. Book your weekend transformation at our Saket branch now! #Balayage #HairGoals #LuxeSalon",
      visibility: FeedVisibility.PUBLIC,
      media: [
        {
          url: "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1080&q=80",
          type: FeedMediaType.IMAGE,
          fileName: "balayage-sun-kissed.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1350,
        },
      ],
      comments: [
        "Loving this dimension! How long did the session take?",
        "Do you have Saturday morning availability for balayage?",
        "Simply stunning work! 😍",
      ],
    },
    {
      caption: "Bridal Glow Season is here! 🌸 24k Gold Radiance Facial + Ayurvedic herbal compress. Reveal your most luminous skin for the big day.",
      visibility: FeedVisibility.PUBLIC,
      media: [
        {
          url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1080&q=80",
          type: FeedMediaType.IMAGE,
          fileName: "bridal-facial.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1350,
        },
      ],
      comments: [
        "What facial brand products do you use for sensitive skin?",
        "Booked this for next Friday, excited!",
      ],
    },
    {
      caption: "✂️ Classic Scissor Fade & Hot Towel Beard Sculpting by our Master Barber at Connaught Place. Clean lines, zero compromise.",
      visibility: FeedVisibility.PUBLIC,
      media: [
        {
          url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1080&q=80",
          type: FeedMediaType.IMAGE,
          fileName: "barber-scissor-fade.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1350,
        },
      ],
      comments: [
        "Best fade in Central Delhi hands down 🔥",
        "Does the beard package include the ozone steamer?",
      ],
    },
    {
      caption: "🌟 Product Alert: Olaplex No. 3 Hair Perfector & Moroccanoil treatments just restocked at our retail counter! Grab yours before they run out.",
      visibility: FeedVisibility.PUBLIC,
      media: [
        {
          url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1080&q=80",
          type: FeedMediaType.IMAGE,
          fileName: "salon-retail-shelf.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1080,
        },
      ],
      comments: [
        "Can I purchase this through the app for home delivery?",
      ],
    },
    {
      caption: "Deep Tissue Aromatherapy Massage: 60 minutes of pure bliss with organic lavender & eucalyptus essential oils. Release tension today 💆‍♂️",
      visibility: FeedVisibility.PUBLIC,
      media: [
        {
          url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1080&q=80",
          type: FeedMediaType.IMAGE,
          fileName: "spa-aromatherapy.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1350,
        },
      ],
      comments: [
        "Are male and female therapists available?",
        "Heavenly experience, visited yesterday!",
      ],
    },
  ];

  for (const p of feedPostsData) {
    const post = await prisma.feedPost.create({
      data: {
        vendorId: vendor.id,
        salonId: salon.id,
        branchId: branch.id,
        caption: p.caption,
        visibility: p.visibility,
        status: FeedPostStatus.PUBLISHED,
        publishedAt: new Date(),
        createdBy: vendor.id,
        media: {
          create: p.media.map((m) => ({
            type: m.type,
            url: m.url,
            fileName: m.fileName,
            mimeType: m.mimeType,
            width: m.width,
            height: m.height,
          })),
        },
      },
    });

    // Add Likes from customers
    for (let i = 0; i < seededCustomerUsers.length; i++) {
      if (i % 2 === 0) {
        await prisma.feedPostLike.upsert({
          where: { postId_userId: { postId: post.id, userId: seededCustomerUsers[i].id } },
          update: {},
          create: { postId: post.id, userId: seededCustomerUsers[i].id },
        });
      }
    }

    // Add Comments
    for (let idx = 0; idx < p.comments.length; idx++) {
      const commenter = seededCustomerUsers[idx % seededCustomerUsers.length];
      await prisma.feedComment.create({
        data: {
          postId: post.id,
          userId: commenter.id,
          message: p.comments[idx],
        },
      });
    }

    // Add Post Views
    for (const cUser of seededCustomerUsers) {
      await prisma.feedPostView.upsert({
        where: { postId_userId: { postId: post.id, userId: cUser.id } },
        update: {},
        create: { postId: post.id, userId: cUser.id },
      });
    }
  }

  // Seed 24-Hour Stories
  const now = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const storiesData = [
    {
      caption: "Morning coffee & clipper sanitization ✂️ Ready to welcome you!",
      url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1080&q=80",
    },
    {
      caption: "Only 2 VIP slots left for bridal trials this afternoon! DM to book 🌸",
      url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1080&q=80",
    },
    {
      caption: "New Moroccanoil treatment sets arrived in stock today 📦",
      url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1080&q=80",
    },
  ];

  for (const s of storiesData) {
    const story = await prisma.feedStory.create({
      data: {
        vendorId: vendor.id,
        salonId: salon.id,
        branchId: branch.id,
        caption: s.caption,
        publishedAt: now,
        expiresAt: tomorrow,
        createdBy: vendor.id,
        media: {
          create: [
            {
              type: FeedMediaType.IMAGE,
              url: s.url,
              mimeType: "image/jpeg",
              width: 1080,
              height: 1920,
            },
          ],
        },
      },
    });

    // Add views
    for (let i = 0; i < 4; i++) {
      await prisma.feedStoryView.upsert({
        where: { storyId_userId: { storyId: story.id, userId: seededCustomerUsers[i].id } },
        update: {},
        create: { storyId: story.id, userId: seededCustomerUsers[i].id },
      });
    }
  }

  console.log(`  -> Seeded ${feedPostsData.length} Posts (with Likes, Comments, Views) and ${storiesData.length} Active 24h Stories.`);

  console.log("\n=================================================");
  console.log("  TEST DUMMY DATA SEEDING COMPLETED!");
  console.log("=================================================");
  console.log("  Summary of newly available test data:");
  console.log("  - Staff (with Granular Access Control Limits):");
  for (const s of seededStaff) {
    console.log(`    * [${s.role}]`);
    console.log(`      Email:      ${s.email}`);
    console.log(`      Password:   ${s.password}`);
    console.log(`      ALLOWED:    ${s.allowed}`);
    console.log(`      RESTRICTED: ${s.denied}\n`);
  }
  console.log("  - Inventory: 5 Categories, 6 Brands, 6 Products, 9 Variants, Stock & Low-Stock items");
  console.log("  - Feed: 5 Rich Posts with Likes & Comments, 3 Active 24h Stories");
  console.log("  - Customers: 8 Mapped Customer profiles");
  console.log("  - Ready for API test calls via Swagger UI at http://localhost:4000/api-docs/");
  console.log("=================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
