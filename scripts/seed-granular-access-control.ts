import { PrismaClient } from "@prisma/client";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING GRANULAR ACCESS CONTROL DATA ===");

  // 1. Ensure permissions exist
  const permissionsToEnsure = [
    { action: "inventory.view", description: "View Inventory" },
    { action: "inventory.create", description: "Create Inventory" },
    { action: "inventory.edit", description: "Edit Inventory" },
    { action: "inventory.delete", description: "Delete Inventory" },
    { action: "inventory.manage", description: "Manage Inventory" },
    { action: "inventory.export", description: "Export Inventory" },

    { action: "customers.view", description: "View Customers" },
    { action: "customers.create", description: "Create Customers" },
    { action: "customers.edit", description: "Edit Customers" },
    { action: "customers.delete", description: "Delete Customers" },
    { action: "customers.manage", description: "Manage Customers" },
    { action: "customers.export", description: "Export Customers" },

    { action: "services.view", description: "View Services" },
    { action: "services.create", description: "Create Services" },
    { action: "services.edit", description: "Edit Services" },
    { action: "services.delete", description: "Delete Services" },
    { action: "services.manage", description: "Manage Services" },
    { action: "services.export", description: "Export Services" },

    { action: "bookings.view", description: "View Bookings" },
    { action: "bookings.create", description: "Create Bookings" },
    { action: "bookings.edit", description: "Edit Bookings" },
    { action: "bookings.delete", description: "Delete Bookings" },
    { action: "bookings.manage", description: "Manage Bookings" },
    { action: "bookings.export", description: "Export Bookings" },

    { action: "staff.view", description: "View Staff" },
    { action: "staff.create", description: "Create Staff" },
    { action: "staff.edit", description: "Edit Staff" },
    { action: "staff.delete", description: "Delete Staff" },
    { action: "staff.manage", description: "Manage Staff" },
    { action: "staff.export", description: "Export Staff" },

    { action: "salons.view", description: "View Salons" },
    { action: "salons.create", description: "Create Salons" },
    { action: "salons.edit", description: "Edit Salons" },
    { action: "salons.delete", description: "Delete Salons" },

    { action: "branch.view", description: "View Branch" },
    { action: "branch.create", description: "Create Branch" },
    { action: "branch.edit", description: "Edit Branch" },
    { action: "branch.delete", description: "Delete Branch" },

    { action: "attendance.view", description: "View Attendance" },
    { action: "attendance.create", description: "Create Attendance" },
    { action: "attendance.edit", description: "Edit Attendance" },
    { action: "attendance.delete", description: "Delete Attendance" },
    { action: "attendance.manage", description: "Manage Attendance" },

    { action: "dashboard.view", description: "View Dashboard" },

    { action: "coupons.view", description: "View Coupons" },
    { action: "coupons.create", description: "Create Coupons" },
    { action: "coupons.edit", description: "Edit Coupons" },
    { action: "coupons.delete", description: "Delete Coupons" },
    { action: "coupons.manage", description: "Manage Coupons" },
    { action: "coupons.export", description: "Export Coupons" },

    { action: "feed.view", description: "View Feed" },
    { action: "feed.create", description: "Create Feed" },
    { action: "feed.edit", description: "Edit Feed" },
    { action: "feed.delete", description: "Delete Feed" },
    { action: "feed.manage", description: "Manage Feed" },

    { action: "whatsapp.view", description: "View WhatsApp" },
    { action: "whatsapp.create", description: "Create WhatsApp" },
    { action: "whatsapp.edit", description: "Edit WhatsApp" },
    { action: "whatsapp.delete", description: "Delete WhatsApp" },

    { action: "settings.view", description: "View Settings" },
    { action: "settings.create", description: "Create Settings" },
    { action: "settings.edit", description: "Edit Settings" },
    { action: "settings.delete", description: "Delete Settings" },

    { action: "reports.view", description: "View Reports" },
    { action: "reports.export", description: "Export Reports" },
  ];

  for (const perm of permissionsToEnsure) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      update: { description: perm.description },
      create: { action: perm.action, description: perm.description },
    });
  }
  console.log("Permissions upserted successfully.");

  // 2. Link permissions to menus in MenuPermission
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.action, p.id]));

  const menus = await prisma.menu.findMany();

  const menuActionMapping: Record<string, string[]> = {
    Dashboard: ["dashboard.view"],
    Customers: ["customers.view", "customers.create", "customers.edit", "customers.delete", "customers.manage", "customers.export"],
    Inventory: ["inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.manage", "inventory.export"],
    Products: ["inventory.view", "inventory.create", "inventory.edit", "inventory.delete"],
    Categories: ["services.view", "services.create", "services.edit", "services.delete"],
    Stock: ["inventory.view", "inventory.create", "inventory.edit", "inventory.delete"],
    Services: ["services.view", "services.create", "services.edit", "services.delete", "services.manage", "services.export"],
    Bookings: ["bookings.view", "bookings.create", "bookings.edit", "bookings.delete", "bookings.manage", "bookings.export"],
    Staff: ["staff.view", "staff.create", "staff.edit", "staff.delete", "staff.manage", "staff.export"],
    Salons: ["salons.view", "salons.create", "salons.edit", "salons.delete"],
    Branches: ["branch.view", "branch.create", "branch.edit", "branch.delete"],
    Attendance: ["attendance.view", "attendance.create", "attendance.edit", "attendance.delete", "attendance.manage"],
    Coupons: ["coupons.view", "coupons.create", "coupons.edit", "coupons.delete", "coupons.manage", "coupons.export"],
    Feed: ["feed.view", "feed.create", "feed.edit", "feed.delete", "feed.manage"],
    Posts: ["feed.view", "feed.create", "feed.edit", "feed.delete"],
    Stories: ["feed.view", "feed.create", "feed.edit", "feed.delete"],
    WhatsApp: ["whatsapp.view", "whatsapp.create", "whatsapp.edit", "whatsapp.delete"],
    Settings: ["settings.view", "settings.create", "settings.edit", "settings.delete"],
    "Reports & Analytics": ["reports.view", "reports.export"],
    Reports: ["reports.view", "reports.export"],
    Overview: ["reports.view"],
    Revenue: ["reports.view", "reports.export"],
  };

  for (const menu of menus) {
    const actions = menuActionMapping[menu.label];
    if (actions) {
      for (const act of actions) {
        const permId = permMap.get(act);
        if (permId) {
          await prisma.menuPermission.upsert({
            where: {
              menuId_permissionId: {
                menuId: menu.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              menuId: menu.id,
              permissionId: permId,
            },
          });
        }
      }
    }
  }
  console.log("Menu permissions linked successfully.");

  // 3. Ensure Vendor and Staff roles exist
  const basicPlan = await prisma.subscriptionPlan.findFirst({
    where: { slug: "BASIC" },
  });

  // Vendor Roles
  const vendorRolesToEnsure = [
    { name: "VENDOR", description: "Primary Salon Owner / Vendor" },
    { name: "Vendor Manager", description: "Vendor Operations Manager" },
    { name: "Vendor Staff", description: "Vendor Assistant / Associate" },
  ];

  for (const r of vendorRolesToEnsure) {
    const existing = await prisma.role.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.role.create({
        data: {
          name: r.name,
          isActive: true,
          subscriptionPlanId: basicPlan?.id || null,
        },
      });
      console.log(`Created Vendor role: ${r.name}`);
    }
  }

  // Staff Roles
  const staffRolesToEnsure = [
    { name: "Staff Manager", description: "Salon Staff Manager" },
    { name: "Senior Stylist", description: "Senior Stylist / Specialist" },
    { name: "Stylist", description: "General Salon Stylist" },
  ];

  for (const sr of staffRolesToEnsure) {
    const existing = await prisma.staffRole.findFirst({ where: { name: sr.name } });
    if (!existing) {
      await prisma.staffRole.create({
        data: {
          name: sr.name,
          description: sr.description,
        },
      });
      console.log(`Created Staff role: ${sr.name}`);
    }
  }

  // Also ensure ADMIN has permissions
  const adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });
  if (adminRole) {
    const perms = await prisma.permission.findMany({ select: { id: true } });
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // Clear redis cache
  await cacheInvalidate("menus:*");
  await cacheInvalidate("rbac:*");
  await cacheInvalidate("subscription:*");

  console.log("=== SEED COMPLETED SUCCESSFULLY ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
