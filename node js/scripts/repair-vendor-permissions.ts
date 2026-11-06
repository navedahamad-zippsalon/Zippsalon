import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { cacheInvalidate } from "../src/infrastructure/redis/cache";

const prisma = new PrismaClient();

const vendorPermissionDescriptions: Record<string, string> = {
  "feed.view": "View Feed",
  "feed.create": "Create Feed content",
  "feed.edit": "Edit Feed content",
  "feed.delete": "Delete Feed content",
  "feed.navbar": "Show Feed in navigation",
  "feed.posts.view": "View feed posts",
  "feed.posts.create": "Create feed posts",
  "feed.posts.update_own": "Update own feed posts",
  "feed.posts.delete_own": "Delete own feed posts",
  "feed.stories.view": "View feed stories",
  "feed.stories.create": "Create feed stories",
  "feed.stories.update_own": "Update own feed stories",
  "feed.stories.delete_own": "Delete own feed stories",
  "feed.media.upload": "Upload feed media",
  "whatsapp.view": "View WhatsApp",
  "whatsapp.create": "Create WhatsApp records",
  "whatsapp.edit": "Edit WhatsApp records",
  "whatsapp.delete": "Delete WhatsApp records",
  "whatsapp.navbar": "Show WhatsApp in navigation",
  "inventory.view": "View Inventory",
  "inventory.create": "Create Inventory records",
  "inventory.edit": "Edit Inventory records",
  "inventory.delete": "Delete Inventory records",
  "inventory.navbar": "Show Inventory in navigation",
  "payment-gateway.view": "View payment gateway configuration",
  "payment-gateway.manage": "Manage payment gateway configuration",
  "payment-gateway.navbar": "Show Payment Integration in navigation",
  "subscriptions.view": "View subscription management",
  "reports.view": "View Reports & Analytics",
  "reports.overview": "View Overview",
  "reports.revenue": "View Revenue",
  "reports.customers": "View Customers",
  "reports.services": "View Services",
  "reports.staff": "View Staff Performance",
  "reports.bookings": "View Bookings",
  "reports.reviews": "View Reviews",
  "reports.export": "Export Reports",
  "reports.revenue.view": "View Revenue Reports",
  "reports.customers.view": "View Customer Reports",
  "reports.services.view": "View Service Reports",
  "reports.staff.view": "View Staff Reports",
  "reports.bookings.view": "View Booking Reports",
  "reports.reviews.view": "View Review Reports",
};

const adminPermissionDescriptions: Record<string, string> = {
  "subscriptions.manage": "Manage subscription plans and subscribers",
};

const moduleMenus: Array<{
  label: string;
  path: string;
  icon: string;
  order: number;
  permission: string;
  children: Array<[string, string, string, number]>;
}> = [
  { label: "Feed", path: "/feed", icon: "Newspaper", order: 2, permission: "feed.view", children: [
    ["Posts", "/feed/posts", "Images", 1],
    ["Stories", "/feed/stories", "CirclePlay", 2],
  ] },
  { label: "WhatsApp", path: "/whatsapp", icon: "MessageCircle", order: 3, permission: "whatsapp.view", children: [
    ["WhatsApp Dashboard", "/whatsapp", "LayoutDashboard", 1],
    ["Connections", "/whatsapp/connections", "Wifi", 2],
    ["Campaigns", "/whatsapp/campaigns", "Send", 3],
    ["Templates", "/whatsapp/templates", "FileText", 4],
    ["Contacts", "/whatsapp/contacts", "Users", 5],
    ["Messages", "/whatsapp/messages", "MessageSquare", 6],
    ["Automation", "/whatsapp/automation", "Zap", 7],
    ["Usage", "/whatsapp/usage", "ChartNoAxesCombined", 8],
    ["Settings", "/whatsapp/settings", "Settings", 9],
  ] },
  { label: "Inventory", path: "/inventory", icon: "Package", order: 4, permission: "inventory.view", children: [
    ["Products", "/inventory/products", "Package", 1],
    ["Categories", "/inventory/categories", "Tags", 2],
    ["Stock", "/inventory/stock", "Warehouse", 3],
    ["Reports", "/inventory/reports", "ChartNoAxesCombined", 4],
  ] },
  { label: "Subscription", path: "/subscriptions", icon: "CreditCard", order: 5, permission: "subscriptions.view", children: [] },
  { label: "Reports & Analytics", path: "/reports-analytics", icon: "BarChart3", order: 14, permission: "reports.view", children: [
  { label: "Reports & Analytics", path: "/reports-analytics", icon: "BarChart3", order: 14, permission: "reports.view", children: [] },
];

async function main() {
  const vendorRole = await prisma.role.findUnique({ where: { name: "VENDOR" } });
  if (!vendorRole) throw new Error("VENDOR role does not exist");

  const permissions = await Promise.all(
    Object.entries(vendorPermissionDescriptions).map(([action, description]) =>
      prisma.permission.upsert({
        where: { action },
        update: { description },
        create: { action, description },
      })
    )
  );

  const result = await prisma.$transaction(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: vendorRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: vendorRole.id, permissionId: permission.id },
      })
    )
  );

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  await Promise.all(
    Object.entries(adminPermissionDescriptions).map(([action, description]) =>
      prisma.permission.upsert({ where: { action }, update: { description }, create: { action, description } })
    )
  );
  if (adminRole) {
    const adminPermissions = await prisma.permission.findMany({ select: { id: true } });
    await prisma.$transaction(
      adminPermissions.map(({ id }) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: id },
        })
      )
    );
  }

  for (const moduleMenu of moduleMenus) {
    const permission = await prisma.permission.findUnique({ where: { action: moduleMenu.permission } });
    if (!permission) throw new Error(`Missing menu permission: ${moduleMenu.permission}`);

    let parent = await prisma.menu.findFirst({ where: { path: moduleMenu.path, parentId: null } });
    if (!parent) {
      parent = await prisma.menu.create({
        data: {
          label: moduleMenu.label,
          path: moduleMenu.path,
          icon: moduleMenu.icon,
          order: moduleMenu.order,
          menuPermissions: { create: { permissionId: permission.id } },
        },
      });
    } else {
      await prisma.menuPermission.upsert({
        where: { menuId_permissionId: { menuId: parent.id, permissionId: permission.id } },
        update: {},
        create: { menuId: parent.id, permissionId: permission.id },
      });
    }

    if (moduleMenu.label === "Reports & Analytics") {
      await prisma.menu.deleteMany({ where: { parentId: parent.id } });
    }

    for (const [label, path, icon, order] of moduleMenu.children) {
      const child = await prisma.menu.findFirst({ where: { path, parentId: parent.id } });
      if (!child) {
        await prisma.menu.create({ data: { label, path, icon, order, parentId: parent.id } });
      }
    }
  }

  const adminSubscriptionPermission = await prisma.permission.findUnique({ where: { action: "subscriptions.manage" } });
  if (adminSubscriptionPermission && !await prisma.menu.findFirst({ where: { path: "/admin/subscriptions", parentId: null } })) {
    await prisma.menu.create({
      data: {
        label: "Subscription Plans",
        path: "/admin/subscriptions",
        icon: "CreditCard",
        order: 90,
        menuPermissions: { create: { permissionId: adminSubscriptionPermission.id } },
      },
    });
  }

  await cacheInvalidate("rbac:perms:*");
  await cacheInvalidate("menus:*");
  console.log(`Vendor permissions repaired: ${result.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    throw error;
  })
  .finally(() => prisma.$disconnect());